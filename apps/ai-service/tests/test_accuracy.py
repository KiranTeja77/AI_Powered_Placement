"""Accuracy on 15 synthetic resumes whose skills were labelled by hand (tests/fixtures/labels.json).

The resumes and labels were written by the people who wrote the engine and a few aliases were tuned
while labelling, so these numbers show the engine is consistent and regression-safe, not how it
will score on real resumes. See docs/resume-analyzer.md.
"""

import json
from collections import defaultdict
from functools import cache
from pathlib import Path

import pytest

from app.data import load_data
from app.pipeline.analyze import analyze
from app.schemas import AnalyzeResponse

FIXTURES = Path(__file__).parent / "fixtures"
LABELS = json.loads((FIXTURES / "labels.json").read_text(encoding="utf-8"))["resumes"]
TAXONOMY, CATALOGUE = load_data()
ID_BY_NAME = {s.name: s.id for s in TAXONOMY.skills}
SKILL = {s.id: s for s in TAXONOMY.skills}
MIN_SCORE = 0.9


def text_of(key: str) -> str:
    return (FIXTURES / "resumes" / f"{key}.txt").read_text(encoding="utf-8")


@cache
def result_of(key: str) -> AnalyzeResponse:
    return analyze(text_of(key), [])


def expected_grades(key: str) -> dict[str, str]:
    label = LABELS[key]
    return {
        **{ID_BY_NAME[n]: "applied" for n in label.get("applied", [])},
        **{ID_BY_NAME[n]: "listed" for n in label.get("listed", [])},
    }


def detected_grades(key: str) -> dict[str, str]:
    return {s.id: s.grade for s in result_of(key).skills if s.status == "detected"}


def scores(keys: list[str]) -> tuple[float, float, list[str]]:
    tp = fp = fn = 0
    notes: list[str] = []
    for key in keys:
        expected, found = set(expected_grades(key)), set(detected_grades(key))
        tp += len(expected & found)
        fp += len(found - expected)
        fn += len(expected - found)
        if found != expected:
            notes.append(
                f"{key}: extra={sorted(found - expected)} missed={sorted(expected - found)}"
            )
    precision = tp / (tp + fp) if tp + fp else 1.0
    recall = tp / (tp + fn) if tp + fn else 1.0
    return precision, recall, notes


def test_there_are_fifteen_resumes_and_every_label_names_a_real_skill() -> None:
    assert len(LABELS) == 15
    for key, label in LABELS.items():
        assert (FIXTURES / "resumes" / f"{key}.txt").exists()
        names = [n for k in ("applied", "listed", "possible", "absent") for n in label.get(k, [])]
        unknown = [n for n in names if n not in ID_BY_NAME]
        assert not unknown, f"{key}: unknown skill names {unknown}"


def test_each_branch_has_at_least_two_resumes() -> None:
    per_branch: dict[str, int] = defaultdict(int)
    for label in LABELS.values():
        per_branch[label["branch"]] += 1
    for branch in ("CSE/IT", "ECE", "EEE", "Mechanical", "Civil", "Non-technical"):
        assert per_branch[branch] >= 2, branch


def test_precision_and_recall_are_at_least_point_nine_overall() -> None:
    precision, recall, notes = scores(list(LABELS))
    assert precision >= MIN_SCORE and recall >= MIN_SCORE, (
        f"precision={precision:.3f} recall={recall:.3f}\n" + "\n".join(notes)
    )


@pytest.mark.parametrize("branch", ["CSE/IT", "ECE", "EEE", "Mechanical", "Civil", "Non-technical"])
def test_precision_and_recall_hold_for_every_branch(branch: str) -> None:
    keys = [k for k, label in LABELS.items() if label["branch"] == branch]
    precision, recall, notes = scores(keys)
    assert precision >= MIN_SCORE and recall >= MIN_SCORE, (
        f"{branch}: precision={precision:.3f} recall={recall:.3f}\n" + "\n".join(notes)
    )


@pytest.mark.parametrize("key", sorted(LABELS))
def test_no_single_resume_is_much_worse_than_the_average(key: str) -> None:
    precision, recall, notes = scores([key])
    assert precision >= 0.85 and recall >= 0.85, f"{key}: {precision:.2f}/{recall:.2f} {notes}"


def test_evidence_grades_agree_with_the_labels() -> None:
    agree = total = 0
    for key in LABELS:
        found = detected_grades(key)
        for skill_id, grade in expected_grades(key).items():
            if skill_id in found:
                total += 1
                agree += found[skill_id] == grade
    assert total > 250
    assert agree / total >= 0.95, f"{agree}/{total}"


@pytest.mark.parametrize("key", sorted(LABELS))
def test_possible_matches_are_exactly_the_labelled_ones(key: str) -> None:
    possible = {s.name for s in result_of(key).skills if s.status == "possible"}
    assert possible == set(LABELS[key].get("possible", []))


@pytest.mark.parametrize("key", sorted(LABELS))
def test_possible_matches_are_never_scored(key: str) -> None:
    for skill in result_of(key).skills:
        assert skill.counts_toward_score == (skill.status == "detected")


def test_trap_words_never_become_skills() -> None:
    result = result_of("15_edge_cases")
    reported = {s.name for s in result.skills}
    assert not reported & set(LABELS["15_edge_cases"]["absent"])
    # "Go" is a skill here only because it is listed; "Go to market" must not add a mention.
    go = next(s for s in result.skills if s.id == "go")
    assert go.mention_count == 1 and go.grade == "listed"
    c = next(s for s in result.skills if s.id == "c")
    assert c.mention_count == 1  # not the "Grade C" in the summary


@pytest.mark.parametrize("key", sorted(LABELS))
def test_never_invent_a_skill_every_one_points_at_words_in_the_resume(key: str) -> None:
    text = text_of(key)
    for skill in result_of(key).skills:
        definition = SKILL[skill.id]
        spellings = {
            p.lower()
            for p in (
                definition.name,
                *definition.aliases,
                *definition.exact_case,
                *definition.context_required,
            )
        }
        assert skill.evidence, skill.id
        for e in skill.evidence:
            assert text[e.start : e.end] == e.matched_text
            assert e.snippet == text[e.snippet_start : e.snippet_start + len(e.snippet)]
            assert e.snippet_start <= e.start < e.end <= e.snippet_start + len(e.snippet)
            if skill.status == "detected":
                assert " ".join(e.matched_text.lower().split()) in spellings, (key, skill.id, e)
            else:
                assert (skill.similarity or 0) >= 90


@pytest.mark.parametrize("key", sorted(LABELS))
def test_windows_line_endings_give_the_same_skills(key: str) -> None:
    crlf = analyze(text_of(key).replace("\n", "\r\n"), [])
    plain = result_of(key)
    assert {(s.id, s.status, s.grade) for s in crlf.skills} == {
        (s.id, s.status, s.grade) for s in plain.skills
    }


def test_positions_hold_for_text_with_emoji_and_odd_spaces() -> None:
    rocket, nbsp = chr(0x1F680), chr(0x00A0)
    original = text_of("01_cse_fullstack").replace("Built a", f"Built {rocket} a")
    original = original.replace("Docker", f"Docker{nbsp}")
    result = analyze(original, [])
    assert result.text_length == len(original)
    for skill in result.skills:
        for e in skill.evidence:
            normalised = original[e.start : e.end]
            assert normalised.lower().split() == e.matched_text.lower().split()


FIELD_EXPECTATIONS = {
    "01_cse_fullstack": ("rahul.verma@example.com", 8.45, 10.0, "cgpa"),
    "02_cse_data_ml": ("ananya.iyer@example.com", 9.1, 10.0, "cgpa"),
    "08_eee_automation": ("lakshmi.prasad@example.com", 76.0, 100.0, "percentage"),
    "10_mech_production": ("neha.kulkarni@example.com", 72.4, 100.0, "percentage"),
}


@pytest.mark.parametrize(("key", "expected"), FIELD_EXPECTATIONS.items())
def test_contact_and_academic_fields_are_extracted(
    key: str, expected: tuple[str, float, float, str]
) -> None:
    email, value, scale, kind = expected
    fields = result_of(key).fields
    assert [e.text for e in fields.emails] == [email]
    assert fields.cgpa is not None
    assert (fields.cgpa.value, fields.cgpa.scale, fields.cgpa.kind) == (value, scale, kind)
    assert fields.education


def test_links_and_project_titles_are_extracted() -> None:
    fields = result_of("01_cse_fullstack").fields
    assert {link.kind for link in fields.links} == {"github", "linkedin"}
    assert [t.text for t in fields.project_titles] == ["Campus Marketplace", "Expense Tracker"]
    assert result_of("15_edge_cases").fields.cgpa is None


BEST_ROLE = {
    "03_it_devops": "devops-engineer",
    "04_it_qa": "qa-engineer",
    "05_ece_embedded": "embedded-systems-engineer",
    "06_ece_vlsi": "vlsi-design-engineer",
    "09_mech_cad": "mechanical-design-cad",
    "11_civil_structural": "site-structural-engineer",
    "13_business_analyst": "business-analyst",
}


@pytest.mark.parametrize(("key", "role"), BEST_ROLE.items())
def test_the_best_matching_role_is_the_one_for_that_background(key: str, role: str) -> None:
    roles = result_of(key).roles
    assert roles[0].role_id == role, [(r.role_id, r.score) for r in roles[:3]]
    assert roles[0].score >= 25


def test_scores_come_with_a_breakdown_that_adds_up() -> None:
    for role in result_of("05_ece_embedded").roles:
        assert role.earned == pytest.approx(sum(i.points for i in role.items), abs=0.01)
        assert role.score == round(role.earned / role.maximum * 100, 1)
        assert role.maximum == sum(g.maximum for g in role.by_importance)
