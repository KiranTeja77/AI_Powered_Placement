import pytest

from app.pipeline.fields import (
    extract_cgpa,
    extract_education,
    extract_emails,
    extract_fields,
    extract_links,
    extract_phones,
    extract_project_titles,
)
from app.pipeline.segment import segment_sections

TEXT = """Asha Rao
asha.rao@college.edu | +91 98765 43210 | linkedin.com/in/asha-rao | github.com/asharao

EDUCATION
B.Tech in Computer Science, Example Institute of Technology, 2023 - 2027
CGPA: 8.62/10
Intermediate (MPC), Sri Example Junior College, 94.2%

PROJECTS
Library Management System | Java, MySQL
- Built a catalogue with search.
- Reduced lookup time by 40%.

Smart Attendance (Face Recognition)
Tech Stack: Python, OpenCV
- Marked attendance automatically.

2024 - 2025
"""


def test_emails_and_phones_carry_exact_positions() -> None:
    emails = extract_emails(TEXT)
    phones = extract_phones(TEXT)
    assert [e.text for e in emails] == ["asha.rao@college.edu"]
    assert TEXT[emails[0].start : emails[0].end] == "asha.rao@college.edu"
    assert [p.text.strip() for p in phones] == ["+91 98765 43210"]
    assert TEXT[phones[0].start : phones[0].end] == phones[0].text


@pytest.mark.parametrize(
    "value",
    ["9876543210", "98765-43210", "+919876543210", "+91-98765-43210"],
)
def test_indian_phone_formats(value: str) -> None:
    assert [p.text for p in extract_phones(f"Call {value} today")] == [value]


def test_does_not_mistake_other_numbers_for_phones() -> None:
    assert extract_phones("CGPA 8.62, year 2027, pin 560001, roll 21CS001234") == []


def test_links_are_classified_and_trimmed() -> None:
    text = "see https://www.linkedin.com/in/asha-rao/, github.com/asharao/repo. and https://asha.dev/blog)."
    links = extract_links(text)
    assert [(link.kind, link.text) for link in links] == [
        ("linkedin", "https://www.linkedin.com/in/asha-rao/"),
        ("github", "github.com/asharao/repo"),
        ("other", "https://asha.dev/blog"),
    ]
    for link in links:
        assert text[link.start : link.end] == link.text


def test_education_found_only_inside_the_education_section() -> None:
    text = (
        "Summary\nI will BE ready.\nEducation\nB.E. in ECE, Example College\nSkills\nM.Tech notes\n"
    )
    entries = extract_education(text, segment_sections(text))
    assert [e.degree for e in entries] == ["B.E."]
    assert "Example College" in entries[0].line


def test_education_without_a_section_needs_an_institution_line() -> None:
    text = "Studied B.Tech at Example University.\nBE careful with this line.\n"
    entries = extract_education(text, segment_sections(text))
    assert [e.degree for e in entries] == ["B.Tech"]


def test_cgpa_with_scale_and_position() -> None:
    cgpa = extract_cgpa(TEXT, segment_sections(TEXT))
    assert cgpa is not None
    assert (cgpa.kind, cgpa.value, cgpa.scale) == ("cgpa", 8.62, 10.0)
    assert TEXT[cgpa.start : cgpa.end] == cgpa.text


@pytest.mark.parametrize(
    ("snippet", "value", "scale"),
    [
        ("CGPA - 9.1", 9.1, 10.0),
        ("GPA: 3.7/4.0", 3.7, 4.0),
        ("8.4/10 CGPA", 8.4, 10.0),
        ("CPI of 7.95", 7.95, 10.0),
    ],
)
def test_cgpa_variants(snippet: str, value: float, scale: float) -> None:
    text = f"Education\nB.Tech, Example College\n{snippet}\n"
    cgpa = extract_cgpa(text, segment_sections(text))
    assert cgpa is not None
    assert (cgpa.value, cgpa.scale) == (value, scale)


def test_impossible_cgpa_is_ignored() -> None:
    assert extract_cgpa("CGPA: 12.5/10", []) is None
    assert extract_cgpa("nothing here", []) is None


def test_percentage_is_used_only_when_there_is_no_cgpa() -> None:
    text = "Education\nB.Tech aggregate: 78.5%\n"
    cgpa = extract_cgpa(text, segment_sections(text))
    assert cgpa is not None
    assert (cgpa.kind, cgpa.value, cgpa.scale) == ("percentage", 78.5, 100.0)


def test_project_titles_from_the_projects_section() -> None:
    titles = extract_project_titles(TEXT, segment_sections(TEXT))
    assert [t.text for t in titles] == ["Library Management System", "Smart Attendance"]
    for title in titles:
        assert TEXT[title.start : title.end] == title.text


def test_bullets_labels_and_dates_are_not_titles() -> None:
    text = "Projects\nChat App\n- Built it\nTech Stack: React\nDescription: A chat app\n2023\n"
    titles = extract_project_titles(text, segment_sections(text))
    assert [t.text for t in titles] == ["Chat App"]


def test_no_projects_section_gives_no_titles() -> None:
    assert extract_project_titles("Skills\nPython\n", segment_sections("Skills\nPython\n")) == []


def test_extract_fields_collects_everything() -> None:
    fields = extract_fields(TEXT, segment_sections(TEXT))
    assert fields.emails and fields.phones and fields.links
    assert fields.cgpa is not None
    assert len(fields.education) >= 2
    assert len(fields.project_titles) == 2
