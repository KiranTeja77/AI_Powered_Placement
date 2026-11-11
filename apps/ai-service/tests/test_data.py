import json
from collections import Counter

import pytest

from app.config import DATA_DIR
from app.data import DataError, load_data, load_roles, load_taxonomy, validate

EXPECTED_ROLES = {
    "software-developer",
    "frontend-developer",
    "backend-developer",
    "data-analyst",
    "ml-engineer",
    "qa-engineer",
    "devops-engineer",
    "business-analyst",
    "embedded-systems-engineer",
    "vlsi-design-engineer",
    "electrical-design-engineer",
    "mechanical-design-cad",
    "site-structural-engineer",
    "graduate-engineer-trainee",
}


def test_data_files_load_and_pass_validation() -> None:
    taxonomy, roles = load_data()
    assert taxonomy.version and roles.version


def test_taxonomy_has_about_four_hundred_skills_across_all_branches() -> None:
    taxonomy, _ = load_data()
    assert 380 <= len(taxonomy.skills) <= 500
    categories = Counter(s.category for s in taxonomy.skills)
    for expected in (
        "Programming languages",
        "Embedded and electronics",
        "VLSI and chip design",
        "Electrical engineering",
        "Mechanical design and manufacturing",
        "Civil and structural engineering",
        "Professional skills",
        "Business and analysis",
    ):
        assert categories[expected] >= 10, expected


def test_every_skill_has_a_name_category_and_unique_id() -> None:
    taxonomy, _ = load_data()
    assert all(s.name and s.category for s in taxonomy.skills)
    assert len({s.id for s in taxonomy.skills}) == len(taxonomy.skills)


def test_fourteen_roles_with_weighted_skills() -> None:
    _, roles = load_data()
    assert {r.id for r in roles.roles} == EXPECTED_ROLES
    assert roles.importance_weights == {"core": 3, "important": 2, "bonus": 1}
    for role in roles.roles:
        levels = Counter(rs.importance for rs in role.skills)
        assert levels["core"] >= 4, role.id
        assert levels["important"] >= 5, role.id
        assert levels["bonus"] >= 5, role.id


def test_every_role_skill_exists_in_the_taxonomy() -> None:
    taxonomy, roles = load_data()
    known = {s.id for s in taxonomy.skills}
    assert all(rs.skill in known for r in roles.roles for rs in r.skills)


def test_each_branch_is_served_by_at_least_two_roles() -> None:
    _, roles = load_data()
    for branch in ("CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"):
        assert sum(branch in r.branches for r in roles.roles) >= 2, branch


def test_validation_rejects_an_alias_shared_by_two_skills() -> None:
    taxonomy, roles = load_data()
    first, second = taxonomy.skills[0], taxonomy.skills[1]
    clash = second.model_copy(update={"aliases": [first.name.lower()]})
    broken = taxonomy.model_copy(update={"skills": [first, clash]})
    with pytest.raises(DataError, match="belongs to both"):
        validate(broken, roles)


def test_validation_rejects_a_role_with_an_unknown_skill() -> None:
    taxonomy, roles = load_data()
    role = roles.roles[0]
    extra = {"skill": "no-such-skill", "importance": "core"}
    bad_role = role.model_copy(
        update={"skills": [*role.skills, type(role.skills[0]).model_validate(extra)]}
    )
    broken = roles.model_copy(update={"roles": [bad_role]})
    with pytest.raises(DataError, match="unknown skill"):
        validate(taxonomy, broken)


def test_files_are_valid_json_with_aliases_lower_case() -> None:
    raw = json.loads((DATA_DIR / "skills_taxonomy.json").read_text(encoding="utf-8"))
    assert all(a == a.lower() for s in raw["skills"] for a in s["aliases"])
    assert load_taxonomy().skills
    assert load_roles().roles
