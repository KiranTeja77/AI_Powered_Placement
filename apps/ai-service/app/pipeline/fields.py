"""Stage 3: pull out the structured facts: contact details, links, education, CGPA, project titles.

All of this is plain pattern matching (regular expressions). Every item carries the position it came
from, so it can be shown, checked and highlighted.
"""

import re

from app.pipeline.segment import section_at
from app.schemas import Cgpa, EducationEntry, Fields, Link, Section, Span

_EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}")
# Indian mobile numbers (10 digits starting 6-9, optional +91) and international "+CC ..." numbers.
_PHONE_IN = re.compile(r"(?<![\d.])(?:\+?91[\s\-]*)?[6-9]\d{4}[\s\-]?\d{5}(?!\d)")
_PHONE_INTL = re.compile(
    r"(?<![\w.])\+\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}(?!\d)"
)

_LINKEDIN = re.compile(
    r"(?:https?://)?(?:[a-z]{2,3}\.)?linkedin\.com/(?:in|pub)/[\w\-%]+/?", re.IGNORECASE
)
_GITHUB = re.compile(r"(?:https?://)?(?:www\.)?github\.com/[\w\-]+(?:/[\w.\-]+)?", re.IGNORECASE)
_URL = re.compile(r"https?://[^\s,;)\]>]+", re.IGNORECASE)

# Abbreviations are case-sensitive on purpose ("BE" the degree, not "be" the verb).
_DEGREE = re.compile(
    r"(?<![A-Za-z])(?:"
    r"B\.?\s?Tech|B\.?\s?E\.?|B\.?\s?Sc\.?|B\.?\s?Com\.?|B\.?\s?C\.?A\.?|B\.?B\.?A\.?"
    r"|M\.?\s?Tech|M\.?\s?E\.?|M\.?\s?Sc\.?|M\.?\s?B\.?A\.?|M\.?\s?C\.?A\.?|Ph\.?\s?D\.?"
    r"|Diploma|Intermediate|SSC|HSC|CBSE|ICSE"
    r"|Bachelor(?:'s)?\s+of\s+[A-Z][A-Za-z]+(?:\s+[A-Za-z]+){0,3}"
    r"|Master(?:'s)?\s+of\s+[A-Z][A-Za-z]+(?:\s+[A-Za-z]+){0,3}"
    r")(?![A-Za-z])"
)
_EDU_LINE_HINT = re.compile(r"\b(?:university|college|institute|school|cgpa|gpa)\b", re.IGNORECASE)

_CGPA_FORWARD = re.compile(
    r"(?:CGPA|C\.G\.P\.A\.?|GPA|CPI|SGPA|Grade Point Average)\s*(?:of|is)?\s*[:=\-]?\s*"
    r"(\d{1,2}(?:\.\d{1,2})?)(?:\s*(?:/|out of)\s*(10(?:\.0+)?|4(?:\.0+)?|5(?:\.0+)?))?",
    re.IGNORECASE,
)
_CGPA_BACKWARD = re.compile(
    r"(\d{1,2}(?:\.\d{1,2})?)\s*/\s*(10(?:\.0+)?|4(?:\.0+)?)\s*(?:CGPA|GPA|CPI)",
    re.IGNORECASE,
)
_PERCENT = re.compile(r"(\d{2,3}(?:\.\d{1,2})?)\s*%")
_PERCENT_CONTEXT = re.compile(r"percentage|aggregate|marks|b\.?\s?tech|b\.?\s?e\b|diploma", re.I)

_BULLET = re.compile(r"^\s*(?:[•·►▪●○◆■□▶>*]|-\s)")
_LABEL = re.compile(
    r"^\s*(?:tech(?:nology|nologies)?(?:\s+stack)?|tools?(?:\s+and\s+technologies)?|stack"
    r"|description|github|link|url|duration|role|team|environment|skills?|domain|guide|mentor)\s*:",
    re.IGNORECASE,
)
_DATE_ONLY = re.compile(
    r"^\W*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?\d{4}"
    r"(?:\s*[-to]+\s*(?:present|\d{4}|[a-z]+\s+\d{4}))?\W*$",
    re.IGNORECASE,
)
_TITLE_SPLIT = re.compile(r"\s+[|\-]\s+|\s*\|\s*|:\s+|\s+\(")
_MAX_TITLE = 100


def _spans(pattern: re.Pattern[str], text: str) -> list[Span]:
    return [Span(start=m.start(), end=m.end(), text=m.group()) for m in pattern.finditer(text)]


def extract_emails(text: str) -> list[Span]:
    return _spans(_EMAIL, text)


def extract_phones(text: str) -> list[Span]:
    found = _spans(_PHONE_IN, text)
    for span in _spans(_PHONE_INTL, text):
        if not any(span.start < f.end and f.start < span.end for f in found):
            found.append(span)
    return sorted(found, key=lambda s: s.start)


def _trim_url(start: int, text: str) -> tuple[int, str]:
    trimmed = text.rstrip(".,;:!?")
    return start + len(trimmed), trimmed


def extract_links(text: str) -> list[Link]:
    links: list[Link] = []
    taken: list[tuple[int, int]] = []

    def add(kind: str, match: re.Match[str]) -> None:
        end, value = _trim_url(match.start(), match.group())
        if any(match.start() < b and a < end for a, b in taken):
            return
        taken.append((match.start(), end))
        links.append(Link(kind=kind, start=match.start(), end=end, text=value))  # type: ignore[arg-type]

    for match in _LINKEDIN.finditer(text):
        add("linkedin", match)
    for match in _GITHUB.finditer(text):
        add("github", match)
    for match in _URL.finditer(text):
        add("other", match)
    return sorted(links, key=lambda link: link.start)


def _line_bounds(text: str, index: int) -> tuple[int, int]:
    start = text.rfind("\n", 0, index) + 1
    end = text.find("\n", index)
    return start, len(text) if end == -1 else end


def extract_education(text: str, sections: list[Section]) -> list[EducationEntry]:
    education = [s for s in sections if s.name == "education"]
    entries: list[EducationEntry] = []
    seen_lines: set[tuple[int, str]] = set()
    for match in _DEGREE.finditer(text):
        in_education = any(s.start <= match.start() < s.end for s in education)
        line_start, line_end = _line_bounds(text, match.start())
        line = text[line_start:line_end].strip()
        # Without an education section, only trust lines that look like an institution line.
        if not education and not _EDU_LINE_HINT.search(line):
            continue
        if education and not in_education:
            continue
        key = (line_start, match.group().strip())
        if key in seen_lines:
            continue
        seen_lines.add(key)
        entries.append(
            EducationEntry(
                degree=re.sub(r"\s+", " ", match.group()).strip(),
                start=match.start(),
                end=match.end(),
                line=line[:200],
            )
        )
    return entries


def _scale(value: float, stated: str | None) -> float:
    if stated:
        return float(stated)
    return 10.0 if value > 4.0 else 4.0


def extract_cgpa(text: str, sections: list[Section]) -> Cgpa | None:
    candidates: list[Cgpa] = []
    for pattern, value_group, scale_group in ((_CGPA_FORWARD, 1, 2), (_CGPA_BACKWARD, 1, 2)):
        for m in pattern.finditer(text):
            value = float(m.group(value_group))
            scale = _scale(value, m.group(scale_group))
            if 0 < value <= scale:
                candidates.append(
                    Cgpa(
                        kind="cgpa",
                        value=value,
                        scale=scale,
                        start=m.start(),
                        end=m.end(),
                        text=m.group(),
                    )
                )
    if candidates:
        # Prefer one inside the education section, then the earliest in the text.
        edu = [s for s in sections if s.name == "education"]
        candidates.sort(key=lambda c: (not any(s.start <= c.start < s.end for s in edu), c.start))
        return candidates[0]

    for m in _PERCENT.finditer(text):
        line_start, line_end = _line_bounds(text, m.start())
        value = float(m.group(1))
        if value <= 100 and _PERCENT_CONTEXT.search(text[line_start:line_end]):
            return Cgpa(
                kind="percentage",
                value=value,
                scale=100.0,
                start=m.start(),
                end=m.end(),
                text=m.group(),
            )
    return None


def extract_project_titles(text: str, sections: list[Section]) -> list[Span]:
    titles: list[Span] = []
    for section in sections:
        if section.name != "projects":
            continue
        previous_blank_or_heading = True
        previous_was_bullet = False
        offset = section.start
        for index, line in enumerate(text[section.start : section.end].split("\n")):
            stripped = line.strip()
            is_bullet = bool(_BULLET.match(line))
            if index > 0 and stripped and not is_bullet and not _LABEL.match(line):
                begins_like_title = stripped[0].isupper() or stripped[0].isdigit()
                follows_boundary = previous_blank_or_heading or previous_was_bullet
                if (
                    begins_like_title
                    and follows_boundary
                    and 3 <= len(stripped) <= _MAX_TITLE
                    and not _DATE_ONLY.match(stripped)
                    and not stripped.endswith(".")
                ):
                    lead = len(line) - len(line.lstrip())
                    head = _TITLE_SPLIT.split(stripped, maxsplit=1)[0].strip(" -|:")
                    if len(head) >= 3:
                        start = offset + lead
                        titles.append(Span(start=start, end=start + len(head), text=head))
            # The heading line (index 0) and blank lines both mark the start of a new block.
            previous_blank_or_heading = index == 0 or not stripped
            previous_was_bullet = is_bullet
            offset += len(line) + 1
    return titles


def extract_fields(text: str, sections: list[Section]) -> Fields:
    return Fields(
        emails=extract_emails(text),
        phones=extract_phones(text),
        links=extract_links(text),
        education=extract_education(text, sections),
        cgpa=extract_cgpa(text, sections),
        project_titles=extract_project_titles(text, sections),
    )


__all__ = [
    "extract_cgpa",
    "extract_education",
    "extract_emails",
    "extract_fields",
    "extract_links",
    "extract_phones",
    "extract_project_titles",
    "section_at",
]
