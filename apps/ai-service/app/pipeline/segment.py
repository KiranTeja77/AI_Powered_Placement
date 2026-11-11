"""Stage 2: split the resume into sections by their headings.

A heading is a short line whose words match a known heading ("Technical Skills", "PROJECTS",
"Work Experience") or a short "Heading: content" line for headings that are often written inline
("Skills: Python, Java"). Everything before the first heading is the header (name and contact).
"""

import re
from bisect import bisect_right

from app.schemas import Section, SectionName

_HEADINGS: dict[SectionName, tuple[str, ...]] = {
    "summary": (
        "summary",
        "professional summary",
        "career summary",
        "objective",
        "career objective",
        "profile",
        "professional profile",
        "about me",
        "personal statement",
    ),
    "skills": (
        "skills",
        "technical skills",
        "key skills",
        "core skills",
        "core competencies",
        "technical proficiency",
        "technical expertise",
        "areas of expertise",
        "it skills",
        "skills and tools",
        "technical skills and tools",
        "tools and technologies",
        "skills and technologies",
        "skill set",
        "skillset",
        "software skills",
        "professional skills",
        "strengths",
        "personal strengths",
        "soft skills",
        "personal skills",
    ),
    "projects": (
        "projects",
        "academic projects",
        "personal projects",
        "key projects",
        "major projects",
        "project work",
        "project experience",
        "mini projects",
        "major project",
        "mini project",
        "technical projects",
        "selected projects",
        "project details",
    ),
    "experience": (
        "experience",
        "work experience",
        "professional experience",
        "internships",
        "internship",
        "internship experience",
        "employment history",
        "work history",
        "industrial training",
        "industrial experience",
        "training",
        "relevant experience",
        "employment",
        "industry experience",
        "internships and training",
        "training and internships",
        "industrial internship",
        "industrial internships",
    ),
    "education": (
        "education",
        "academic qualifications",
        "academics",
        "educational background",
        "academic background",
        "educational qualifications",
        "qualifications",
        "academic details",
        "education details",
    ),
    "certifications": (
        "certifications",
        "certificates",
        "licenses and certifications",
        "courses",
        "courses and certifications",
        "certifications and courses",
        "online courses",
        "training and certifications",
        "professional certifications",
    ),
    "achievements": (
        "achievements",
        "awards",
        "honors",
        "honours",
        "awards and achievements",
        "achievements and awards",
        "accomplishments",
        "awards and honors",
        "scholarships",
    ),
    "activities": (
        "activities",
        "extracurricular activities",
        "extra curricular activities",
        "extracurriculars",
        "co curricular activities",
        "positions of responsibility",
        "leadership and activities",
        "volunteering",
        "volunteer experience",
        "club activities",
    ),
    "interests": ("interests", "hobbies", "hobbies and interests", "personal interests"),
    "languages": (
        "languages known",
        "language proficiency",
        "spoken languages",
        "linguistic skills",
    ),
    "other": ("declaration", "references", "personal details", "personal information"),
    "publications": ("publications", "research papers", "publications and patents"),
}

_LOOKUP: dict[str, SectionName] = {
    phrase: name for name, phrases in _HEADINGS.items() for phrase in phrases
}
# "Skills: Python, Java" style lines are accepted for these headings only.
_INLINE_OK: frozenset[SectionName] = frozenset(
    {"skills", "certifications", "achievements", "interests", "languages", "summary"}
)
# Common as a label inside a project block ("Tools and Technologies: React, Node"), so these only
# count as headings when they stand alone on their line.
_STANDALONE_ONLY = frozenset(
    {
        "tools and technologies",
        "skills and technologies",
        "skills and tools",
        "technical skills and tools",
    }
)
_DECORATION = " \t-=_*#|:•·►▪●○◆■□▶>~."
_MAX_HEADING_CHARS = 40
_MAX_HEADING_WORDS = 5


def _key(text: str) -> str:
    """Lower-case, with '&' as 'and', hyphens as spaces and only letters and single spaces left."""
    lowered = text.lower().replace("&", " and ").replace("-", " ")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z ]", " ", lowered)).strip()


_BULLET = re.compile(r"^\s*(?:[•·►▪●○◆■□▶>*]|-\s)")


def _heading_name(line: str) -> SectionName | None:
    if _BULLET.match(line):
        return None  # a bullet is list content, never a heading
    stripped = line.strip(_DECORATION)
    if not stripped or len(stripped) > 90:
        return None
    # Whole line is a heading: "TECHNICAL SKILLS", "Projects:", "-- Education --"
    whole = _key(stripped)
    if len(stripped) <= _MAX_HEADING_CHARS and len(whole.split()) <= _MAX_HEADING_WORDS:
        name = _LOOKUP.get(whole)
        if name:
            return name
    # Inline heading: "Skills: Python, Java"
    if ":" in stripped:
        left = _key(stripped.split(":", 1)[0])
        name = _LOOKUP.get(left)
        if (
            name in _INLINE_OK
            and left not in _STANDALONE_ONLY
            and len(left.split()) <= _MAX_HEADING_WORDS
        ):
            return name
    return None


def segment_sections(text: str) -> list[Section]:
    """Split text into sections that together cover it completely, in order."""
    found: list[tuple[int, SectionName, str]] = []
    offset = 0
    for line in text.split("\n"):
        name = _heading_name(line)
        if name:
            found.append((offset, name, line.strip()))
        offset += len(line) + 1

    if not found:
        return [Section(name="other", heading=None, start=0, end=len(text))]

    sections: list[Section] = []
    if found[0][0] > 0 and text[: found[0][0]].strip():
        sections.append(Section(name="header", heading=None, start=0, end=found[0][0]))
    for i, (start, name, heading) in enumerate(found):
        end = found[i + 1][0] if i + 1 < len(found) else len(text)
        sections.append(Section(name=name, heading=heading, start=start, end=end))
    return sections


def section_at(sections: list[Section], offset: int) -> SectionName:
    """The name of the section containing a character position."""
    starts = [s.start for s in sections]
    index = bisect_right(starts, offset) - 1
    if index < 0:
        return "header"
    return sections[index].name
