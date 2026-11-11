from app.pipeline.segment import section_at, segment_sections

RESUME = """Asha Rao
asha@example.com | 9876543210

SUMMARY
Final year student.

TECHNICAL SKILLS
Languages: Python, Java

Projects:
Library App | Tech Stack: React, Node
- Built a catalogue.

Work Experience
Intern at Acme

Education
B.Tech CSE, 2027
"""


def names(text: str) -> list[str]:
    return [s.name for s in segment_sections(text)]


def test_finds_sections_in_order_with_a_header() -> None:
    assert names(RESUME) == [
        "header",
        "summary",
        "skills",
        "projects",
        "experience",
        "education",
    ]


def test_sections_cover_the_whole_text_without_gaps() -> None:
    sections = segment_sections(RESUME)
    assert sections[0].start == 0
    assert sections[-1].end == len(RESUME)
    for a, b in zip(sections, sections[1:], strict=False):
        assert a.end == b.start


def test_heading_text_and_offsets_point_at_the_heading_line() -> None:
    sections = {s.name: s for s in segment_sections(RESUME)}
    skills = sections["skills"]
    assert skills.heading == "TECHNICAL SKILLS"
    assert RESUME[skills.start :].startswith("TECHNICAL SKILLS")


def test_inline_heading_with_content_starts_a_section() -> None:
    text = "Name\nSkills: Python, Java, SQL\nProjects\nApp\n"
    assert names(text) == ["header", "skills", "projects"]
    skills = segment_sections(text)[1]
    assert "Python" in text[skills.start : skills.end]


def test_sub_labels_inside_skills_are_not_headings() -> None:
    text = "Skills\nLanguages: Python\nTools: Git\nFrameworks: Flask\nDatabases: MySQL\n"
    assert names(text) == ["skills"]


def test_project_tech_labels_do_not_open_a_skills_section() -> None:
    text = "Projects\nChat App\nTools and Technologies: React, Node\n- Built it\n"
    assert names(text) == ["projects"]


def test_bullets_are_never_headings() -> None:
    text = "Skills\n• Projects\n- Experience\n* Education\nPython\n"
    assert names(text) == ["skills"]


def test_decorated_and_uppercase_headings_are_found() -> None:
    text = "Name\n=== EDUCATION ===\nB.E.\n-- Work Experience --\nIntern\n# Skills\nPython\n"
    assert names(text) == ["header", "education", "experience", "skills"]


def test_ampersand_and_hyphen_variants() -> None:
    text = "Awards & Achievements\nWon\nCo-Curricular Activities\nClub\n"
    assert names(text) == ["achievements", "activities"]


def test_long_lines_that_start_with_a_heading_word_are_not_headings() -> None:
    text = "Experience\nExperience with Python and Java in building large web apps for clients\n"
    assert names(text) == ["experience"]


def test_no_headings_gives_a_single_other_section() -> None:
    sections = segment_sections("just some text without any headings at all")
    assert [s.name for s in sections] == ["other"]


def test_section_at_finds_the_containing_section() -> None:
    sections = segment_sections(RESUME)
    assert section_at(sections, RESUME.index("Python")) == "skills"
    assert section_at(sections, RESUME.index("Intern at")) == "experience"
    assert section_at(sections, 0) == "header"
