"""Runs the whole pipeline. Every stage is a pure function, so this is just the wiring.

    normalize -> segment sections -> extract fields -> find skills -> grade evidence
              -> compare with roles (+ readiness score) -> suggestions

Nothing here logs, stores or sends the resume anywhere; the text lives only for this call.
"""

from collections.abc import Sequence

from app.config import ENGINE_VERSION
from app.data import load_data
from app.pipeline.compare import compare_roles
from app.pipeline.evidence import grade_evidence
from app.pipeline.fields import extract_fields
from app.pipeline.normalize import normalize
from app.pipeline.segment import segment_sections
from app.pipeline.skills import SkillMatcher, default_matcher, find_mentions
from app.pipeline.suggestions import build_suggestions
from app.schemas import (
    AnalyzeResponse,
    CompareResponse,
    DetectedSkill,
    RoleCatalogue,
    SkillStrength,
    Taxonomy,
)


def scoring_inputs(skills: Sequence[DetectedSkill]) -> tuple[dict[str, float], frozenset[str]]:
    """Strength per counted skill, and the ids of possible matches (shown but not scored)."""
    strengths = {s.id: s.strength for s in skills if s.counts_toward_score}
    possible = frozenset(s.id for s in skills if not s.counts_toward_score)
    return strengths, possible


def analyze(
    text: str,
    target_roles: list[str],
    taxonomy: Taxonomy | None = None,
    catalogue: RoleCatalogue | None = None,
    matcher: SkillMatcher | None = None,
) -> AnalyzeResponse:
    if taxonomy is None or catalogue is None:
        taxonomy, catalogue = load_data()
    matcher = matcher or default_matcher()

    clean = normalize(text)  # same length as `text`, so every position is valid in the original
    sections = segment_sections(clean)
    fields = extract_fields(clean, sections)
    mentions = find_mentions(clean, sections, matcher)
    skills = grade_evidence(clean, sections, mentions, taxonomy)

    strengths, possible = scoring_inputs(skills)
    roles = compare_roles(strengths, possible, catalogue, taxonomy, target_roles)
    suggestions = build_suggestions(clean, sections, fields, skills, roles, bool(target_roles))

    return AnalyzeResponse(
        engine_version=ENGINE_VERSION,
        taxonomy_version=taxonomy.version,
        text_length=len(text),
        sections=sections,
        fields=fields,
        skills=skills,
        roles=roles,
        suggestions=suggestions,
    )


def compare_skills(
    skills: list[SkillStrength],
    target_roles: list[str],
    taxonomy: Taxonomy | None = None,
    catalogue: RoleCatalogue | None = None,
) -> CompareResponse:
    """Recompute the gap from an edited skill list (a student confirmed or removed a skill)."""
    if taxonomy is None or catalogue is None:
        taxonomy, catalogue = load_data()
    known = {s.id for s in taxonomy.skills}
    strengths = {s.skill_id: s.strength for s in skills if s.skill_id in known}
    roles = compare_roles(strengths, frozenset(), catalogue, taxonomy, target_roles)
    return CompareResponse(
        engine_version=ENGINE_VERSION, taxonomy_version=taxonomy.version, roles=roles
    )
