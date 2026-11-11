import logging

import pytest
from fastapi.testclient import TestClient

from app.config import ENGINE_VERSION
from app.main import app

RESUME = """Kiran Teja
kiran@example.com | 9876543210 | github.com/kiranteja

EDUCATION
B.Tech in Computer Science, Example Institute of Technology, 2027
CGPA: 8.5/10

SKILLS
Python, Java, SQL, Git, Docker, Kubernets

PROJECTS
Campus Placement Portal | React, Node.js, MySQL
- Built a REST API with Node.js and MySQL used by 300 students.
- Wrote unit tests and set up CI/CD with GitHub Actions and Docker.
"""
SECRET_MARKER = "zq7-unmistakable-marker"


@pytest.fixture(scope="module")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_analyze_returns_the_full_result_with_engine_version(client: TestClient) -> None:
    response = client.post("/analyze", json={"text": RESUME, "target_roles": ["backend-developer"]})
    assert response.status_code == 200
    body = response.json()
    assert body["engine_version"] == ENGINE_VERSION
    assert body["taxonomy_version"]
    assert body["text_length"] == len(RESUME)
    assert {s["name"] for s in body["skills"]} >= {"Python", "Java", "SQL", "Docker", "Node.js"}
    assert [r["role_id"] for r in body["roles"]] == ["backend-developer"]
    assert body["fields"]["emails"][0]["text"] == "kiran@example.com"
    assert body["suggestions"]


def test_every_reported_skill_points_at_text_that_is_really_there(client: TestClient) -> None:
    body = client.post("/analyze", json={"text": RESUME}).json()
    assert body["skills"]
    for skill in body["skills"]:
        assert skill["evidence"], skill["name"]
        for e in skill["evidence"]:
            assert RESUME[e["start"] : e["end"]] == e["matched_text"]
            assert e["matched_text"] in e["snippet"]


def test_possible_matches_are_labelled_and_not_scored(client: TestClient) -> None:
    body = client.post("/analyze", json={"text": RESUME}).json()
    possible = [s for s in body["skills"] if s["status"] == "possible"]
    assert [s["name"] for s in possible] == ["Kubernetes"]
    assert possible[0]["counts_toward_score"] is False


def test_without_target_roles_all_fourteen_are_scored_best_first(client: TestClient) -> None:
    roles = client.post("/analyze", json={"text": RESUME}).json()["roles"]
    assert len(roles) == 14
    assert [r["score"] for r in roles] == sorted((r["score"] for r in roles), reverse=True)


def test_the_response_never_contains_more_resume_than_snippets(client: TestClient) -> None:
    text = RESUME + "\nNOTES\nThis sentence has no skills and should not be echoed anywhere.\n"
    raw = client.post("/analyze", json={"text": text}).text
    assert "should not be echoed anywhere" not in raw


def test_short_and_oversized_text_is_rejected_without_echoing_it(client: TestClient) -> None:
    short = client.post("/analyze", json={"text": SECRET_MARKER})
    assert short.status_code == 422
    assert SECRET_MARKER not in short.text
    assert "at least 200" in short.text

    too_long = client.post("/analyze", json={"text": SECRET_MARKER + "x" * 20_001})
    assert too_long.status_code == 422
    assert SECRET_MARKER not in too_long.text
    assert "at most 20000" in too_long.text


def test_exactly_the_limits_are_accepted(client: TestClient) -> None:
    assert client.post("/analyze", json={"text": "a" * 200}).status_code == 200
    assert client.post("/analyze", json={"text": "a" * 20_000}).status_code == 200
    assert client.post("/analyze", json={"text": "a" * 199}).status_code == 422


def test_unknown_roles_are_a_422_naming_the_role(client: TestClient) -> None:
    response = client.post("/analyze", json={"text": RESUME, "target_roles": ["astronaut"]})
    assert response.status_code == 422
    assert "astronaut" in response.text


def test_malformed_bodies_do_not_echo_input(client: TestClient) -> None:
    response = client.post("/analyze", json={"text": 12345, "extra": SECRET_MARKER})
    assert response.status_code == 422
    assert SECRET_MARKER not in response.text


def test_resume_text_is_never_logged(client: TestClient, caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.DEBUG)
    marked = RESUME + f"\nHOBBIES\n{SECRET_MARKER}\n"
    client.post("/analyze", json={"text": marked, "target_roles": ["backend-developer"]})
    client.post("/analyze", json={"text": SECRET_MARKER})
    client.post("/analyze", json={"text": marked, "target_roles": ["nonexistent"]})
    assert SECRET_MARKER not in caplog.text


def test_unexpected_failures_return_a_generic_500_and_log_only_the_error_type(
    client: TestClient, caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch
) -> None:
    def boom(*_: object, **__: object) -> None:
        raise RuntimeError(f"failed while reading {SECRET_MARKER}")

    monkeypatch.setattr("app.main.analyze", boom)
    quiet = TestClient(app, raise_server_exceptions=False)
    response = quiet.post("/analyze", json={"text": RESUME})
    assert response.status_code == 500
    assert SECRET_MARKER not in response.text
    assert SECRET_MARKER not in caplog.text


def test_compare_recomputes_the_gap_from_a_skill_list(client: TestClient) -> None:
    payload = {
        "skills": [
            {"skill_id": "git", "strength": 1.0},
            {"skill_id": "not-in-taxonomy", "strength": 1.0},
        ],
        "target_roles": ["devops-engineer"],
    }
    body = client.post("/compare", json=payload).json()
    role = body["roles"][0]
    git = next(i for i in role["items"] if i["skill_id"] == "git")
    assert git["status"] == "matched" and git["points"] == 3
    assert role["score"] > 0
    assert body["engine_version"] == ENGINE_VERSION


def test_compare_rejects_out_of_range_strengths(client: TestClient) -> None:
    payload = {"skills": [{"skill_id": "git", "strength": 1.5}], "target_roles": []}
    assert client.post("/compare", json=payload).status_code == 422


def test_health(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok"}
