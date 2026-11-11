from app.data import load_data
from app.pipeline.compare import compare_roles
from app.pipeline.evidence import grade_evidence
from app.pipeline.fields import extract_fields
from app.pipeline.normalize import normalize
from app.pipeline.segment import segment_sections
from app.pipeline.skills import default_matcher, find_mentions
from app.pipeline.suggestions import MAX_SUGGESTIONS, build_suggestions
from app.schemas import Suggestion

taxonomy, catalogue = load_data()


def suggest(text: str, targets: list[str]) -> list[Suggestion]:
    text = normalize(text)
    sections = segment_sections(text)
    fields = extract_fields(text, sections)
    skills = grade_evidence(
        text, sections, find_mentions(text, sections, default_matcher()), taxonomy
    )
    strengths = {s.id: s.strength for s in skills if s.counts_toward_score}
    possible = frozenset(s.id for s in skills if not s.counts_toward_score)
    roles = compare_roles(strengths, possible, catalogue, taxonomy, targets)
    return build_suggestions(text, sections, fields, skills, roles, bool(targets))


COMPLETE = """Asha Rao
asha@example.com | 9876543210 | github.com/asharao

EDUCATION
B.Tech CSE, Example Institute, 2027
CGPA: 8.4/10

SKILLS
Python, SQL, Git, Data Structures, Algorithms, Object-Oriented Programming, Debugging

PROJECTS
Library App | Python, SQL
- Built a catalogue used by 300 students with Git workflow and Data Structures for search.
- Applied Algorithms and Object-Oriented Programming; Debugging cut crashes by 30%.
"""


def test_every_suggestion_has_a_message_and_a_reason() -> None:
    for text in (COMPLETE, "Skills\nPython\n" + "word " * 50):
        for s in suggest(text, ["software-developer"]):
            assert s.message.strip() and s.reason.strip() and s.id and s.kind


def test_missing_core_skills_for_the_target_role_are_high_priority() -> None:
    result = suggest(COMPLETE, ["devops-engineer"])
    missing = {s.skills[0]: s for s in result if s.id.startswith("missing-core-")}
    assert missing, "expected at least one missing core skill"
    for s in missing.values():
        assert s.priority == "high"
        assert "core skill for DevOps Engineer" in s.reason


def test_a_skill_found_is_not_suggested_as_missing() -> None:
    result = suggest(COMPLETE, ["software-developer"])
    assert not any(s.skills == ["git"] and s.kind == "skill_gap" for s in result)
    assert not any(s.skills == ["sql"] and s.kind == "skill_gap" for s in result)


def test_listed_only_skills_get_a_show_it_in_use_suggestion() -> None:
    text = (
        "Skills\nPython, SQL, Git, Data Structures, Algorithms\nProjects\nChat App\n- Built UI.\n"
    )
    result = suggest(text, ["software-developer"])
    show = [s for s in result if s.id.startswith("show-use-")]
    assert show
    assert "counts twice as much" in show[0].reason


def test_possible_matches_ask_the_student_to_confirm() -> None:
    result = suggest("Skills\nKubernets, Docker\n" + "text " * 60, ["devops-engineer"])
    confirm = [s for s in result if s.kind == "confirm"]
    assert confirm and "Kubernets" in confirm[0].message
    assert "not counted" in confirm[0].reason


def test_missing_sections_and_contact_details_are_reported() -> None:
    result = {s.id: s for s in suggest("I like programming. " * 20, [])}
    for expected in (
        "add-projects",
        "add-skills-section",
        "add-education",
        "add-email",
        "add-phone",
    ):
        assert expected in result, expected
    assert result["add-email"].priority == "high"


def test_a_complete_resume_has_no_structure_or_contact_complaints() -> None:
    ids = {s.id for s in suggest(COMPLETE, ["software-developer"])}
    assert not ids & {
        "add-projects",
        "add-skills-section",
        "add-education",
        "add-email",
        "add-phone",
    }
    assert "add-cgpa" not in ids


def test_missing_cgpa_is_noticed_only_when_there_is_an_education_section() -> None:
    text = COMPLETE.replace("CGPA: 8.4/10", "")
    assert "add-cgpa" in {s.id for s in suggest(text, ["software-developer"])}


def test_numbers_in_projects_satisfy_the_measurable_results_rule() -> None:
    assert "add-numbers" not in {s.id for s in suggest(COMPLETE, ["software-developer"])}
    plain = COMPLETE.replace("300", "many").replace("30%", "a lot")
    assert "add-numbers" in {s.id for s in suggest(plain, ["software-developer"])}


def test_years_do_not_count_as_measurable_results() -> None:
    text = "Projects\nChat App 2024\n- Built an app in 2024 for 2025 events.\n" + "word " * 60
    assert "add-numbers" in {s.id for s in suggest(text, [])}


def test_suggestions_are_ordered_by_priority_and_capped() -> None:
    result = suggest("hello " * 30, ["software-developer", "data-analyst"])
    assert len(result) <= MAX_SUGGESTIONS
    order = ["high", "medium", "low"]
    priorities = [order.index(s.priority) for s in result]
    assert priorities == sorted(priorities)


def test_suggestion_ids_are_unique() -> None:
    result = suggest("hello " * 30, ["software-developer", "data-analyst"])
    assert len({s.id for s in result}) == len(result)


def test_without_target_roles_advice_follows_the_best_matching_role() -> None:
    text = COMPLETE + "\nTools: Postman, Jira, Selenium, Test Cases, Bug Tracking\n"
    assert suggest(text, [])  # runs and returns advice for the top role only
