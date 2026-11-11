import logging
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.pipeline.analyze import analyze
from app.pipeline.revise import InvalidEditsError, revise

RESUME = """Kiran Teja
kiran.teja@example.com | 9876543210 | github.com/kiranteja | linkedin.com/in/kiran-teja

EDUCATION
B.Tech in Computer Science and Engineering, Example Institute of Technology, 2021 - 2025
CGPA: 8.5/10

SKILLS
Python, Java, SQL, Git, Docker, Kubernets, Communication skills

PROJECTS
Campus Placement Portal | Python, SQL, Docker
- Built a REST API with Python and SQL used by 300 students and tested it with Postman.
- Packaged the service with Docker and wrote unit tests.

INTERNSHIP
Backend Intern, Example Labs (Jun 2024 - Aug 2024)
- Wrote SQL reports and used Git for code reviews with the team.
"""
FIXTURES = Path(__file__).parent / "fixtures" / "resumes"
MARKER = "zq7-unmistakable-marker"


def ids(response) -> dict[str, object]:
    return {s.id: s for s in response.skills}


def suggestion_ids(response) -> set[str]:
    return {s.id for s in response.suggestions}


def score(response, role_id: str) -> float:
    return next(r.score for r in response.roles if r.role_id == role_id)


def test_with_no_edits_the_scores_and_suggestions_are_the_analyzers_own() -> None:
    original = analyze(RESUME, ["backend-developer"])
    revised = revise(RESUME, ["backend-developer"], [], [], [])
    assert revised.roles == original.roles
    assert revised.suggestions == original.suggestions
    counted = {s.id for s in original.skills if s.counts_toward_score}
    assert set(ids(revised)) == counted
    assert all(s.source == "detected" for s in revised.skills)


@pytest.mark.parametrize("path", sorted(FIXTURES.glob("*.txt")), ids=lambda p: p.stem)
def test_no_edits_reproduce_the_original_analysis_for_every_fixture(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    original = analyze(text, [])
    revised = revise(text, [], [], [], [])
    assert revised.roles == original.roles
    assert revised.suggestions == original.suggestions


def test_confirming_a_possible_match_counts_it_and_drops_the_confirm_suggestion() -> None:
    before = revise(RESUME, ["devops-engineer"], [], [], [])
    assert "kubernetes" not in ids(before)
    assert "confirm-kubernetes" in suggestion_ids(before)

    after = revise(RESUME, ["devops-engineer"], ["kubernetes"], [], [])
    kubernetes = ids(after)["kubernetes"]
    assert kubernetes.source == "confirmed"
    assert kubernetes.grade == "listed" and kubernetes.strength == 0.5
    assert score(after, "devops-engineer") > score(before, "devops-engineer")
    assert "confirm-kubernetes" not in suggestion_ids(after)


def test_removing_a_skill_lowers_the_score_and_can_create_a_gap_suggestion() -> None:
    before = revise(RESUME, ["devops-engineer"], [], [], [])
    assert "missing-core-docker" not in suggestion_ids(before)

    after = revise(RESUME, ["devops-engineer"], [], ["docker"], [])
    assert "docker" not in ids(after)
    assert score(after, "devops-engineer") < score(before, "devops-engineer")
    assert "missing-core-docker" in suggestion_ids(after)


def test_a_skill_added_by_hand_counts_as_listed_and_is_labelled() -> None:
    after = revise(RESUME, ["backend-developer"], [], [], ["database-design"])
    added = ids(after)["database-design"]
    assert (added.source, added.grade, added.strength) == ("added", "listed", 0.5)
    assert added.name == "Database Design"


def test_suggestions_follow_the_edits() -> None:
    before = revise(RESUME, ["backend-developer"], [], [], [])
    assert "missing-core-database-design" in suggestion_ids(before)
    assert "show-use-database-design" not in suggestion_ids(before)

    after = revise(RESUME, ["backend-developer"], [], [], ["database-design"])
    # No longer missing, but counted as listed only, so the advice changes to "show it in use".
    assert "missing-core-database-design" not in suggestion_ids(after)
    assert "show-use-database-design" in suggestion_ids(after)


def test_edits_are_relative_to_the_original_so_repeating_them_changes_nothing() -> None:
    args = (RESUME, ["backend-developer"], ["kubernetes"], ["git"], ["typescript"])
    assert revise(*args) == revise(*args)


def test_duplicate_ids_are_ignored() -> None:
    once = revise(RESUME, [], ["kubernetes"], [], [])
    twice = revise(RESUME, [], ["kubernetes", "kubernetes"], [], [])
    assert once == twice


def test_edits_that_do_not_fit_the_analysis_are_rejected_by_field() -> None:
    with pytest.raises(InvalidEditsError) as error:
        revise(RESUME, [], ["git"], ["kubernetes"], ["python", "not-a-skill"])
    assert error.value.errors == {
        "confirmed_skill_ids": ["git"],
        "removed_skill_ids": ["kubernetes"],
        "added_skill_ids": ["python", "not-a-skill"],
    }


client = TestClient(app)


def post(body: dict) -> object:
    return client.post("/revise", json=body)


def test_the_endpoint_returns_effective_skills_roles_and_suggestions() -> None:
    response = post(
        {
            "text": RESUME,
            "target_roles": ["backend-developer"],
            "confirmed_skill_ids": ["kubernetes"],
            "removed_skill_ids": ["git"],
            "added_skill_ids": ["typescript"],
        }
    )
    assert response.status_code == 200
    body = response.json()
    by_id = {s["id"]: s for s in body["skills"]}
    assert by_id["kubernetes"]["source"] == "confirmed"
    assert by_id["typescript"]["source"] == "added"
    assert "git" not in by_id
    assert body["roles"][0]["role_id"] == "backend-developer"
    assert body["suggestions"]
    assert body["engine_version"]


def test_the_endpoint_rejects_bad_edits_without_echoing_the_text() -> None:
    text = RESUME + f"\nHOBBIES\n{MARKER}\n"
    response = post({"text": text, "removed_skill_ids": ["kubernetes"]})
    assert response.status_code == 422
    assert "removed_skill_ids" in response.text
    assert MARKER not in response.text


def test_the_endpoint_validates_text_and_roles_like_analyze() -> None:
    assert post({"text": "short"}).status_code == 422
    assert post({"text": RESUME, "target_roles": ["astronaut"]}).status_code == 422
    assert post({"text": RESUME, "confirmed_skill_ids": "kubernetes"}).status_code == 422


def test_revising_never_logs_the_text(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.DEBUG)
    text = RESUME + f"\nHOBBIES\n{MARKER}\n"
    post({"text": text, "confirmed_skill_ids": ["kubernetes"]})
    post({"text": text, "removed_skill_ids": ["kubernetes"]})
    post({"text": text, "target_roles": ["nope"]})
    assert MARKER not in caplog.text
