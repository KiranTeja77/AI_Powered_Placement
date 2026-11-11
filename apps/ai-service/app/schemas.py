"""Pydantic models: the data files, the pipeline's intermediate results and the HTTP contract."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.config import MAX_TEXT_CHARS, MIN_TEXT_CHARS

SectionName = Literal[
    "header",
    "summary",
    "skills",
    "projects",
    "experience",
    "education",
    "certifications",
    "achievements",
    "activities",
    "interests",
    "languages",
    "publications",
    "other",
]
Importance = Literal["core", "important", "bonus"]
Grade = Literal["applied", "listed"]
SkillStatus = Literal["detected", "possible"]
GapStatus = Literal["matched", "partial", "missing", "possible"]
Priority = Literal["high", "medium", "low"]


class Frozen(BaseModel):
    model_config = ConfigDict(frozen=True)


# --------------------------------------------------------------------------- data files


class TaxonomySkill(Frozen):
    id: str
    name: str
    category: str
    aliases: list[str] = []
    # Matched only with this exact capitalisation (e.g. "React", so the verb "react" is ignored).
    exact_case: list[str] = []
    # Exact capitalisation AND a list-like context (e.g. "C", "Go", "R").
    context_required: list[str] = []


class Taxonomy(Frozen):
    version: str
    skills: list[TaxonomySkill]


class RoleSkill(Frozen):
    skill: str
    importance: Importance


class RoleDefinition(Frozen):
    id: str
    name: str
    branches: list[str]
    summary: str
    skills: list[RoleSkill]


class RoleCatalogue(Frozen):
    version: str
    importance_weights: dict[Importance, int]
    roles: list[RoleDefinition]


# --------------------------------------------------------------------------- pipeline results


class Section(Frozen):
    name: SectionName
    heading: str | None
    start: int
    end: int


class Span(Frozen):
    """A piece of the resume with its position. text == resume[start:end]."""

    start: int
    end: int
    text: str


class Link(Frozen):
    kind: Literal["linkedin", "github", "other"]
    start: int
    end: int
    text: str


class EducationEntry(Frozen):
    degree: str
    start: int
    end: int
    line: str


class Cgpa(Frozen):
    kind: Literal["cgpa", "percentage"]
    value: float
    scale: float
    start: int
    end: int
    text: str


class Fields(Frozen):
    emails: list[Span]
    phones: list[Span]
    links: list[Link]
    education: list[EducationEntry]
    cgpa: Cgpa | None
    project_titles: list[Span]


class Evidence(Frozen):
    """One place a skill was found. resume[start:end] == matched_text."""

    start: int
    end: int
    matched_text: str
    section: SectionName
    snippet: str
    snippet_start: int


class DetectedSkill(Frozen):
    id: str
    name: str
    category: str
    status: SkillStatus
    grade: Grade
    strength: float
    # False for "possible" matches: they are shown for confirmation but never scored.
    counts_toward_score: bool
    mention_count: int
    evidence: list[Evidence]
    # For "possible" matches only: how similar the text was to the skill name (0-100).
    similarity: float | None = None


class ImportanceBreakdown(Frozen):
    importance: Importance
    weight: int
    matched: int
    partial: int
    possible: int
    missing: int
    earned: float
    maximum: float


class GapItem(Frozen):
    skill_id: str
    name: str
    importance: Importance
    weight: int
    status: GapStatus
    strength: float
    points: float


class RoleReadiness(Frozen):
    role_id: str
    name: str
    score: float
    earned: float
    maximum: float
    by_importance: list[ImportanceBreakdown]
    items: list[GapItem]


class Suggestion(Frozen):
    id: str
    kind: Literal["skill_gap", "evidence", "confirm", "structure", "contact", "impact"]
    priority: Priority
    message: str
    reason: str
    skills: list[str] = []


# --------------------------------------------------------------------------- HTTP contract


class AnalyzeRequest(BaseModel):
    text: str
    target_roles: list[str] = Field(default_factory=list, max_length=14)

    @field_validator("text")
    @classmethod
    def check_length(cls, value: str) -> str:
        if len(value.strip()) < MIN_TEXT_CHARS:
            raise ValueError(f"Resume text must be at least {MIN_TEXT_CHARS} characters")
        if len(value) > MAX_TEXT_CHARS:
            raise ValueError(f"Resume text must be at most {MAX_TEXT_CHARS} characters")
        return value


class AnalyzeResponse(BaseModel):
    engine_version: str
    taxonomy_version: str
    text_length: int
    sections: list[Section]
    fields: Fields
    skills: list[DetectedSkill]
    roles: list[RoleReadiness]
    suggestions: list[Suggestion]


class SkillStrength(BaseModel):
    skill_id: str
    strength: float = Field(ge=0.0, le=1.0)


class CompareRequest(BaseModel):
    """Recompute the skill gap from a (possibly edited) list of skills, without the resume text."""

    skills: list[SkillStrength] = Field(max_length=1000)
    target_roles: list[str] = Field(default_factory=list, max_length=14)


class CompareResponse(BaseModel):
    engine_version: str
    taxonomy_version: str
    roles: list[RoleReadiness]


class EffectiveSkill(Frozen):
    """A skill that counts toward the scores after the student's edits, and where it came from."""

    id: str
    name: str
    category: str
    strength: float
    grade: Grade
    source: Literal["detected", "confirmed", "added"]


class ReviseRequest(AnalyzeRequest):
    """The resume text and the student's edits, always relative to the analyzer's own answer.

    confirmed: possible matches the student confirmed. removed: skills that were found and that
    the student removed. added: skills from the taxonomy added by hand (counted as listed).
    """

    confirmed_skill_ids: list[str] = Field(default_factory=list, max_length=200)
    removed_skill_ids: list[str] = Field(default_factory=list, max_length=500)
    added_skill_ids: list[str] = Field(default_factory=list, max_length=200)


class ReviseResponse(BaseModel):
    engine_version: str
    taxonomy_version: str
    skills: list[EffectiveSkill]
    roles: list[RoleReadiness]
    suggestions: list[Suggestion]
