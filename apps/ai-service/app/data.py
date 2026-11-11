"""Loads and validates the taxonomy and role files, so bad data fails at start-up."""

import json
from functools import lru_cache
from pathlib import Path

from app.config import DATA_DIR
from app.schemas import RoleCatalogue, Taxonomy


class DataError(ValueError):
    pass


def validate(taxonomy: Taxonomy, roles: RoleCatalogue) -> None:
    ids = [s.id for s in taxonomy.skills]
    if len(ids) != len(set(ids)):
        raise DataError("duplicate skill ids in taxonomy")

    seen: dict[str, str] = {}
    for skill in taxonomy.skills:
        for phrase in {skill.name, *skill.aliases, *skill.exact_case, *skill.context_required}:
            key = phrase.lower()
            if seen.setdefault(key, skill.id) != skill.id:
                raise DataError(f"'{phrase}' belongs to both {seen[key]} and {skill.id}")

    known = set(ids)
    role_ids = [r.id for r in roles.roles]
    if len(role_ids) != len(set(role_ids)):
        raise DataError("duplicate role ids")
    for role in roles.roles:
        listed = [rs.skill for rs in role.skills]
        if len(listed) != len(set(listed)):
            raise DataError(f"role {role.id} lists a skill twice")
        for skill_id in listed:
            if skill_id not in known:
                raise DataError(f"role {role.id} references unknown skill {skill_id}")
    if set(roles.importance_weights) != {"core", "important", "bonus"}:
        raise DataError("importance_weights must define core, important and bonus")


def load_taxonomy(path: Path | None = None) -> Taxonomy:
    return Taxonomy.model_validate(
        json.loads((path or DATA_DIR / "skills_taxonomy.json").read_text(encoding="utf-8"))
    )


def load_roles(path: Path | None = None) -> RoleCatalogue:
    return RoleCatalogue.model_validate(
        json.loads((path or DATA_DIR / "roles.json").read_text(encoding="utf-8"))
    )


@lru_cache(maxsize=1)
def load_data() -> tuple[Taxonomy, RoleCatalogue]:
    taxonomy, roles = load_taxonomy(), load_roles()
    validate(taxonomy, roles)
    return taxonomy, roles
