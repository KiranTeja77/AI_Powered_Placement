import pytest

from app.data import load_data
from app.pipeline.compare import UnknownRoleError, compare_role, compare_roles

taxonomy, catalogue = load_data()
ROLES = {r.id: r for r in catalogue.roles}
NAMES = {s.id: s.name for s in taxonomy.skills}
WEIGHTS = catalogue.importance_weights


def role_max(role_id: str) -> int:
    return sum(WEIGHTS[s.importance] for s in ROLES[role_id].skills)


def score(role_id: str, strengths: dict[str, float], possible: frozenset[str] = frozenset()):
    return compare_role(ROLES[role_id], WEIGHTS, strengths, possible, NAMES)


def test_no_skills_scores_zero_with_everything_missing() -> None:
    result = score("data-analyst", {})
    assert result.score == 0.0
    assert result.earned == 0.0
    assert all(i.status == "missing" for i in result.items)
    assert result.maximum == role_max("data-analyst")


def test_every_skill_applied_scores_one_hundred() -> None:
    strengths = {s.skill: 1.0 for s in ROLES["qa-engineer"].skills}
    result = score("qa-engineer", strengths)
    assert result.score == 100.0
    assert all(i.status == "matched" for i in result.items)


def test_listed_skills_count_half() -> None:
    strengths = {s.skill: 0.5 for s in ROLES["qa-engineer"].skills}
    result = score("qa-engineer", strengths)
    assert result.score == 50.0
    assert all(i.status == "partial" for i in result.items)


def test_weights_follow_core_3_important_2_bonus_1() -> None:
    role = ROLES["frontend-developer"]
    core = next(s.skill for s in role.skills if s.importance == "core")
    important = next(s.skill for s in role.skills if s.importance == "important")
    bonus = next(s.skill for s in role.skills if s.importance == "bonus")
    maximum = role_max("frontend-developer")

    assert score("frontend-developer", {core: 1.0}).earned == 3
    assert score("frontend-developer", {important: 1.0}).earned == 2
    assert score("frontend-developer", {bonus: 1.0}).earned == 1
    assert score("frontend-developer", {core: 0.5}).earned == 1.5
    assert score("frontend-developer", {core: 1.0}).score == round(3 / maximum * 100, 1)


def test_the_score_is_exactly_the_formula_applied_to_the_breakdown() -> None:
    strengths = {s.skill: [1.0, 0.5, 0.0][i % 3] for i, s in enumerate(ROLES["ml-engineer"].skills)}
    result = score("ml-engineer", strengths)
    by_hand = sum(i.weight * i.strength for i in result.items) / sum(i.weight for i in result.items)
    assert result.score == round(by_hand * 100, 1)
    assert result.earned == pytest.approx(sum(g.earned for g in result.by_importance))
    assert result.maximum == sum(g.maximum for g in result.by_importance)


def test_breakdown_counts_add_up_per_importance_level() -> None:
    role = ROLES["devops-engineer"]
    first_core = next(s.skill for s in role.skills if s.importance == "core")
    result = score("devops-engineer", {first_core: 1.0})
    core = next(g for g in result.by_importance if g.importance == "core")
    total_core = sum(1 for s in role.skills if s.importance == "core")
    assert core.matched == 1
    assert core.matched + core.partial + core.possible + core.missing == total_core
    assert core.weight == 3


def test_possible_skills_are_flagged_but_score_nothing() -> None:
    kubernetes = "kubernetes"
    result = score("devops-engineer", {}, frozenset({kubernetes}))
    item = next(i for i in result.items if i.skill_id == kubernetes)
    assert item.status == "possible"
    assert item.points == 0
    assert result.score == 0.0


def test_items_are_ordered_core_first_then_by_strength() -> None:
    strengths = {s.skill: 1.0 for s in ROLES["qa-engineer"].skills if s.importance == "bonus"}
    items = score("qa-engineer", strengths).items
    order = [i.importance for i in items]
    assert order == sorted(order, key=["core", "important", "bonus"].index)


def test_requested_roles_keep_their_order_and_duplicates_collapse() -> None:
    results = compare_roles(
        {}, frozenset(), catalogue, taxonomy, ["qa-engineer", "data-analyst", "qa-engineer"]
    )
    assert [r.role_id for r in results] == ["qa-engineer", "data-analyst"]


def test_with_no_target_every_role_is_returned_best_first() -> None:
    strengths = {s.skill: 1.0 for s in ROLES["vlsi-design-engineer"].skills}
    results = compare_roles(strengths, frozenset(), catalogue, taxonomy, [])
    assert len(results) == 14
    assert results[0].role_id == "vlsi-design-engineer"
    assert [r.score for r in results] == sorted((r.score for r in results), reverse=True)


def test_unknown_roles_are_rejected_by_name() -> None:
    with pytest.raises(UnknownRoleError) as error:
        compare_roles({}, frozenset(), catalogue, taxonomy, ["qa-engineer", "astronaut"])
    assert error.value.role_ids == ["astronaut"]
