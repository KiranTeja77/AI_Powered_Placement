"""Apply a student's corrections to an analysis and recompute everything that depends on them.

The analyzer is deterministic, so reading the same text again gives the same skills. The edits are
then applied on top, and the role scores and the suggestions are rebuilt from the edited skill
list. That keeps one implementation of the scoring and of the advice rules: the API only stores
what comes back.
"""

from app.config import ENGINE_VERSION, STRENGTH_LISTED
from app.data import load_data
from app.pipeline.analyze import read_resume, scoring_inputs
from app.pipeline.compare import compare_roles
from app.pipeline.skills import SkillMatcher, default_matcher
from app.pipeline.suggestions import build_suggestions
from app.schemas import (
    DetectedSkill,
    EffectiveSkill,
    ReviseResponse,
    RoleCatalogue,
    Taxonomy,
)


class InvalidEditsError(ValueError):
    """The edits do not fit the analysis, for example confirming a skill that was not possible."""

    def __init__(self, errors: dict[str, list[str]]) -> None:
        super().__init__("Invalid edits: " + ", ".join(sorted(errors)))
        self.errors = errors


def _check_edits(
    skills: list[DetectedSkill],
    taxonomy: Taxonomy,
    confirmed: list[str],
    removed: list[str],
    added: list[str],
) -> None:
    found = {s.id: s for s in skills}
    known = {s.id for s in taxonomy.skills}
    errors: dict[str, list[str]] = {}
    bad_confirm = [i for i in confirmed if i not in found or found[i].status != "possible"]
    bad_remove = [i for i in removed if i not in found or found[i].status != "detected"]
    bad_add = [i for i in added if i not in known or i in found]
    if bad_confirm:
        errors["confirmed_skill_ids"] = bad_confirm
    if bad_remove:
        errors["removed_skill_ids"] = bad_remove
    if bad_add:
        errors["added_skill_ids"] = bad_add
    if errors:
        raise InvalidEditsError(errors)


def apply_edits(
    skills: list[DetectedSkill],
    taxonomy: Taxonomy,
    confirmed: list[str],
    removed: list[str],
    added: list[str],
) -> tuple[list[DetectedSkill], list[EffectiveSkill]]:
    """The skill list after the edits, and the subset that counts toward the scores."""
    _check_edits(skills, taxonomy, confirmed, removed, added)
    catalogue = {s.id: s for s in taxonomy.skills}
    edited: list[DetectedSkill] = []
    effective: list[EffectiveSkill] = []

    for skill in skills:
        if skill.id in removed:
            continue
        source = "detected"
        if skill.status == "possible" and skill.id in confirmed:
            skill = skill.model_copy(
                update={"status": "detected", "counts_toward_score": True, "similarity": None}
            )
            source = "confirmed"
        edited.append(skill)
        if skill.counts_toward_score:
            effective.append(
                EffectiveSkill(
                    id=skill.id,
                    name=skill.name,
                    category=skill.category,
                    strength=skill.strength,
                    grade=skill.grade,
                    source=source,  # type: ignore[arg-type]
                )
            )

    for skill_id in added:
        definition = catalogue[skill_id]
        # Added by hand, so there is no evidence in the text: it counts as listed.
        edited.append(
            DetectedSkill(
                id=definition.id,
                name=definition.name,
                category=definition.category,
                status="detected",
                grade="listed",
                strength=STRENGTH_LISTED,
                counts_toward_score=True,
                mention_count=0,
                evidence=[],
            )
        )
        effective.append(
            EffectiveSkill(
                id=definition.id,
                name=definition.name,
                category=definition.category,
                strength=STRENGTH_LISTED,
                grade="listed",
                source="added",
            )
        )
    return edited, effective


def revise(
    text: str,
    target_roles: list[str],
    confirmed: list[str],
    removed: list[str],
    added: list[str],
    taxonomy: Taxonomy | None = None,
    catalogue: RoleCatalogue | None = None,
    matcher: SkillMatcher | None = None,
) -> ReviseResponse:
    if taxonomy is None or catalogue is None:
        taxonomy, catalogue = load_data()
    reading = read_resume(text, taxonomy, matcher or default_matcher())
    edited, effective = apply_edits(
        reading.skills,
        taxonomy,
        list(dict.fromkeys(confirmed)),
        list(dict.fromkeys(removed)),
        list(dict.fromkeys(added)),
    )
    strengths, possible = scoring_inputs(edited)
    roles = compare_roles(strengths, possible, catalogue, taxonomy, target_roles)
    suggestions = build_suggestions(
        reading.text, reading.sections, reading.fields, edited, roles, bool(target_roles)
    )
    return ReviseResponse(
        engine_version=ENGINE_VERSION,
        taxonomy_version=taxonomy.version,
        skills=effective,
        roles=roles,
        suggestions=suggestions,
    )
