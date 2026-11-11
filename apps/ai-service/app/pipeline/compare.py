"""Stages 6 and 7: compare the skills with each role and compute the readiness score.

readiness = sum(weight x strength) / sum(weight) x 100

where weight is 3 for a core skill, 2 for an important one and 1 for a bonus one, and strength is
0 (not found), 0.5 (listed) or 1 (applied). The result is always returned with the per-skill
breakdown it was calculated from, so the number can be checked by hand.
"""

from collections.abc import Mapping

from app.schemas import (
    GapItem,
    GapStatus,
    Importance,
    ImportanceBreakdown,
    RoleCatalogue,
    RoleDefinition,
    RoleReadiness,
    Taxonomy,
)

_LEVELS: tuple[Importance, ...] = ("core", "important", "bonus")


class UnknownRoleError(ValueError):
    def __init__(self, role_ids: list[str]) -> None:
        super().__init__("Unknown role: " + ", ".join(role_ids))
        self.role_ids = role_ids


def _status(strength: float, possible: bool) -> GapStatus:
    if strength >= 1.0:
        return "matched"
    if strength > 0.0:
        return "partial"
    return "possible" if possible else "missing"


def compare_role(
    role: RoleDefinition,
    weights: Mapping[Importance, int],
    strengths: Mapping[str, float],
    possible_ids: frozenset[str],
    names: Mapping[str, str],
) -> RoleReadiness:
    """Score one role. `strengths` holds only skills that count; unlisted skills count as 0."""
    items: list[GapItem] = []
    for role_skill in role.skills:
        weight = weights[role_skill.importance]
        strength = strengths.get(role_skill.skill, 0.0)
        items.append(
            GapItem(
                skill_id=role_skill.skill,
                name=names[role_skill.skill],
                importance=role_skill.importance,
                weight=weight,
                status=_status(strength, role_skill.skill in possible_ids),
                strength=strength,
                points=round(weight * strength, 2),
            )
        )

    breakdown: list[ImportanceBreakdown] = []
    for level in _LEVELS:
        group = [i for i in items if i.importance == level]
        breakdown.append(
            ImportanceBreakdown(
                importance=level,
                weight=weights[level],
                matched=sum(i.status == "matched" for i in group),
                partial=sum(i.status == "partial" for i in group),
                possible=sum(i.status == "possible" for i in group),
                missing=sum(i.status == "missing" for i in group),
                earned=round(sum(i.points for i in group), 2),
                maximum=float(sum(i.weight for i in group)),
            )
        )

    earned = round(sum(i.points for i in items), 2)
    maximum = float(sum(i.weight for i in items))
    score = round(earned / maximum * 100, 1) if maximum else 0.0
    order = {"core": 0, "important": 1, "bonus": 2}
    items.sort(key=lambda i: (order[i.importance], -i.strength, i.name))
    return RoleReadiness(
        role_id=role.id,
        name=role.name,
        score=score,
        earned=earned,
        maximum=maximum,
        by_importance=breakdown,
        items=items,
    )


def compare_roles(
    strengths: Mapping[str, float],
    possible_ids: frozenset[str],
    catalogue: RoleCatalogue,
    taxonomy: Taxonomy,
    target_roles: list[str],
) -> list[RoleReadiness]:
    """Readiness for the requested roles (in the order asked), or for every role, best first."""
    known = {r.id: r for r in catalogue.roles}
    unknown = [r for r in target_roles if r not in known]
    if unknown:
        raise UnknownRoleError(unknown)

    names = {s.id: s.name for s in taxonomy.skills}
    selected = [known[r] for r in dict.fromkeys(target_roles)] or list(known.values())
    results = [
        compare_role(role, catalogue.importance_weights, strengths, possible_ids, names)
        for role in selected
    ]
    if not target_roles:
        results.sort(key=lambda r: (-r.score, r.name))
    return results
