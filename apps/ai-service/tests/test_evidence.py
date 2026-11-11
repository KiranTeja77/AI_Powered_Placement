from app.data import load_data
from app.pipeline.evidence import grade_evidence, make_snippet
from app.pipeline.normalize import normalize
from app.pipeline.segment import segment_sections
from app.pipeline.skills import default_matcher, find_mentions
from app.schemas import DetectedSkill

RESUME = """Asha Rao
asha@example.com

SKILLS
Python, Java, SQL, Kubernets, Git

PROJECTS
Library App | Java, MySQL
- Built a catalogue using Python and Flask with 40% faster search.

EXPERIENCE
Intern, Acme Corp
- Wrote SQL reports for the sales team.

CERTIFICATIONS
Docker Fundamentals
"""


def analyse(text: str) -> dict[str, DetectedSkill]:
    text = normalize(text)
    sections = segment_sections(text)
    mentions = find_mentions(text, sections, default_matcher())
    skills = grade_evidence(text, sections, mentions, load_data()[0])
    return {s.id: s for s in skills}


def test_used_in_a_project_or_job_is_applied_and_counts_fully() -> None:
    skills = analyse(RESUME)
    for skill_id in ("python", "java", "sql", "flask", "mysql"):
        assert skills[skill_id].grade == "applied", skill_id
        assert skills[skill_id].strength == 1.0


def test_only_listed_or_mentioned_elsewhere_is_listed_and_counts_half() -> None:
    skills = analyse(RESUME)
    assert skills["git"].grade == "listed" and skills["git"].strength == 0.5
    assert skills["docker"].grade == "listed"  # a certificate title is not proof of use


def test_a_skill_in_both_places_is_applied_and_shows_the_stronger_evidence_first() -> None:
    python = analyse(RESUME)["python"]
    assert python.mention_count == 2
    assert python.evidence[0].section == "projects"
    assert python.evidence[1].section == "skills"


def test_every_skill_carries_evidence_with_exact_offsets() -> None:
    text = normalize(RESUME)
    for skill in analyse(RESUME).values():
        assert skill.evidence, skill.id
        for e in skill.evidence:
            assert text[e.start : e.end] == e.matched_text
            assert e.snippet == text[e.snippet_start : e.snippet_start + len(e.snippet)]
            assert e.snippet_start <= e.start and e.end <= e.snippet_start + len(e.snippet)


def test_possible_matches_are_marked_and_never_counted() -> None:
    skill = analyse(RESUME)["kubernetes"]
    assert skill.status == "possible"
    assert skill.counts_toward_score is False
    assert skill.similarity is not None and skill.similarity >= 90
    assert skill.evidence[0].matched_text == "Kubernets"


def test_detected_skills_count_toward_the_score() -> None:
    assert all(s.counts_toward_score for s in analyse(RESUME).values() if s.status == "detected")


def test_at_most_three_pieces_of_evidence_are_returned_but_all_are_counted() -> None:
    text = "Projects\n" + "\n".join(f"- Wrote Python scripts for task {i}" for i in range(6))
    python = analyse(text)["python"]
    assert python.mention_count == 6
    assert len(python.evidence) == 3


def test_snippet_is_the_line_without_its_bullet() -> None:
    text = "Projects\n- Built a catalogue using Python and Flask\n"
    start = text.index("Python")
    snippet, snippet_start = make_snippet(text, start, start + len("Python"))
    assert snippet == "Built a catalogue using Python and Flask"
    assert text[snippet_start : snippet_start + len(snippet)] == snippet


def test_long_lines_are_windowed_around_the_match() -> None:
    text = "x " * 300 + "Python" + " y" * 300
    start = text.index("Python")
    snippet, snippet_start = make_snippet(text, start, start + 6)
    assert len(snippet) <= 160
    assert "Python" in snippet
    assert text[snippet_start : snippet_start + len(snippet)] == snippet
