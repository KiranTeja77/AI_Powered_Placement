"""Stage 5: decide how strongly the resume supports each skill.

A skill that appears in a project or a job/internship is "applied": there is evidence it was used.
A skill that appears only anywhere else (a skills list, the summary, a certificate title) is
"listed": the student says they have it, but nothing shows it in use. Applied counts fully (1.0)
and listed counts half (0.5).
"""

from collections import defaultdict

from app.config import STRENGTH_APPLIED, STRENGTH_LISTED
from app.pipeline.segment import section_at
from app.pipeline.skills import Mention
from app.schemas import DetectedSkill, Evidence, Section, SectionName, Taxonomy

APPLIED_SECTIONS: frozenset[SectionName] = frozenset({"projects", "experience"})
MAX_EVIDENCE = 3
SNIPPET_CHARS = 160
_BULLET_CHARS = " \t-*>•·►▪●○◆■□▶"


def make_snippet(text: str, start: int, end: int) -> tuple[str, int]:
    """The line a mention is on (or a 160-character window of it), and where that begins."""
    line_start = text.rfind("\n", 0, start) + 1
    line_end = text.find("\n", end)
    line_end = len(text) if line_end == -1 else line_end

    snippet_start, snippet_end = line_start, line_end
    if snippet_end - snippet_start > SNIPPET_CHARS:
        margin = (SNIPPET_CHARS - (end - start)) // 2
        snippet_start = max(line_start, start - margin)
        snippet_end = min(line_end, snippet_start + SNIPPET_CHARS)
        snippet_start = max(line_start, snippet_end - SNIPPET_CHARS)
    # Trim bullets and indentation without ever cutting into the matched words.
    while snippet_start < start and text[snippet_start] in _BULLET_CHARS:
        snippet_start += 1
    while snippet_end > end and text[snippet_end - 1] in " \t":
        snippet_end -= 1
    return text[snippet_start:snippet_end], snippet_start


def _evidence(text: str, sections: list[Section], mention: Mention) -> Evidence:
    snippet, snippet_start = make_snippet(text, mention.start, mention.end)
    return Evidence(
        start=mention.start,
        end=mention.end,
        matched_text=mention.text,
        section=section_at(sections, mention.start),
        snippet=snippet,
        snippet_start=snippet_start,
    )


def grade_evidence(
    text: str, sections: list[Section], mentions: list[Mention], taxonomy: Taxonomy
) -> list[DetectedSkill]:
    """One entry per skill found, with its grade, strength and up to three pieces of evidence."""
    by_skill: dict[str, list[Mention]] = defaultdict(list)
    for mention in mentions:
        by_skill[mention.skill_id].append(mention)
    catalogue = {s.id: s for s in taxonomy.skills}

    detected: list[DetectedSkill] = []
    for skill_id, found in by_skill.items():
        skill = catalogue[skill_id]
        evidence = [_evidence(text, sections, m) for m in sorted(found, key=lambda m: m.start)]
        applied = any(e.section in APPLIED_SECTIONS for e in evidence)
        # Show the strongest proof first: uses in projects or jobs, then the rest in text order.
        evidence.sort(key=lambda e: (e.section not in APPLIED_SECTIONS, e.start))

        is_possible = all(m.via == "fuzzy" for m in found)
        similarity = max((m.similarity or 0.0) for m in found) if is_possible else None
        detected.append(
            DetectedSkill(
                id=skill.id,
                name=skill.name,
                category=skill.category,
                status="possible" if is_possible else "detected",
                grade="applied" if applied else "listed",
                strength=STRENGTH_APPLIED if applied else STRENGTH_LISTED,
                counts_toward_score=not is_possible,
                mention_count=len(found),
                evidence=evidence[:MAX_EVIDENCE],
                similarity=round(similarity, 1) if similarity is not None else None,
            )
        )
    return sorted(detected, key=lambda s: (s.status == "possible", s.category, s.name))
