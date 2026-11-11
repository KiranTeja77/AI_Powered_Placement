"""Stage 8: turn the findings into advice, using fixed rules.

There is no language model here. Each rule looks at a specific fact (a core skill is missing, a
skill is only listed, the email is absent) and produces one suggestion with the reason that
triggered it, so the student can see why it was given and the team can explain every line.
"""

import re

from app.pipeline.segment import section_at
from app.schemas import (
    DetectedSkill,
    Fields,
    Priority,
    RoleReadiness,
    Section,
    SectionName,
    Suggestion,
)

MAX_SUGGESTIONS = 12
_PRIORITY_ORDER: dict[Priority, int] = {"high": 0, "medium": 1, "low": 2}
_NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?%?")
_YEAR = re.compile(r"(?:19|20)\d{2}")
_MIN_WORDS = 120


def _names(items: list[str]) -> str:
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + " and " + items[-1]


def _focus_roles(roles: list[RoleReadiness], targeted: bool) -> list[RoleReadiness]:
    """Advice follows the roles the student chose, or the best-matching role if none was chosen."""
    return roles[:2] if targeted else roles[:1]


def _skill_gap_suggestions(focus: list[RoleReadiness]) -> list[Suggestion]:
    # skill id -> (name, importance, roles that need it)
    missing: dict[str, tuple[str, str, list[str]]] = {}
    listed: dict[str, tuple[str, str, list[str]]] = {}
    for role in focus:
        for item in role.items:
            if item.importance == "bonus":
                continue
            target = (
                missing
                if item.status == "missing"
                else listed
                if item.status == "partial"
                else None
            )
            if target is not None:
                target.setdefault(item.skill_id, (item.name, item.importance, []))[2].append(
                    role.name
                )

    out: list[Suggestion] = []
    core_missing = [(sid, v) for sid, v in missing.items() if v[1] == "core"][:4]
    for skill_id, (name, _, role_names) in core_missing:
        out.append(
            Suggestion(
                id=f"missing-core-{skill_id}",
                kind="skill_gap",
                priority="high",
                message=f"Learn {name} and show it in a project.",
                reason=f"{name} is a core skill for {_names(role_names)} and was not found in "
                "your resume.",
                skills=[skill_id],
            )
        )
    important_missing = [(sid, v) for sid, v in missing.items() if v[1] == "important"][:3]
    for skill_id, (name, _, role_names) in important_missing:
        out.append(
            Suggestion(
                id=f"missing-important-{skill_id}",
                kind="skill_gap",
                priority="medium",
                message=f"Add {name} if you have used it, or plan to learn it.",
                reason=f"{name} is an important skill for {_names(role_names)} and was not found "
                "in your resume.",
                skills=[skill_id],
            )
        )
    for skill_id, (name, importance, role_names) in list(listed.items())[:3]:
        out.append(
            Suggestion(
                id=f"show-use-{skill_id}",
                kind="evidence",
                priority="high" if importance == "core" else "medium",
                message=f"Show {name} in a project or internship, not only in a list.",
                reason=f"{name} appears only in a list. Use in a project or job counts twice as "
                f"much toward {_names(role_names)} as a mention in a list.",
                skills=[skill_id],
            )
        )
    return out


def _confirm_suggestions(skills: list[DetectedSkill]) -> list[Suggestion]:
    out: list[Suggestion] = []
    for skill in skills:
        if skill.status != "possible":
            continue
        typed = skill.evidence[0].matched_text
        out.append(
            Suggestion(
                id=f"confirm-{skill.id}",
                kind="confirm",
                priority="medium",
                message=f'Check whether "{typed}" means {skill.name}, and fix the spelling.',
                reason=f'"{typed}" is close to {skill.name} but not an exact match, so it was not '
                "counted toward your score.",
                skills=[skill.id],
            )
        )
    return out[:4]


def _section_text(text: str, sections: list[Section], names: set[SectionName]) -> str:
    return "\n".join(text[s.start : s.end] for s in sections if s.name in names)


def _structure_suggestions(
    text: str, sections: list[Section], skills: list[DetectedSkill], fields: Fields
) -> list[Suggestion]:
    present = {s.name for s in sections}
    out: list[Suggestion] = []

    if not present & {"projects", "experience"}:
        out.append(
            Suggestion(
                id="add-projects",
                kind="structure",
                priority="high",
                message="Add a projects or internship section.",
                reason="No projects or experience section was found, so every skill is graded as "
                "only listed and counts half.",
            )
        )
    if "skills" not in present:
        out.append(
            Suggestion(
                id="add-skills-section",
                kind="structure",
                priority="medium",
                message="Add a skills section that lists your tools and technologies.",
                reason="No skills section was found. Recruiters scan for one first.",
            )
        )
    if "education" not in present:
        out.append(
            Suggestion(
                id="add-education",
                kind="structure",
                priority="medium",
                message="Add an education section with your degree and graduation year.",
                reason="No education section was found, and campus drives check these details.",
            )
        )
    elif fields.cgpa is None:
        out.append(
            Suggestion(
                id="add-cgpa",
                kind="structure",
                priority="medium",
                message="Add your CGPA to the education section.",
                reason="No CGPA or percentage was found, and many drives set a minimum.",
            )
        )

    listed_only = [s for s in skills if s.status == "detected" and s.grade == "listed"]
    applied = [s for s in skills if s.status == "detected" and s.grade == "applied"]
    if len(listed_only) >= 8 and not applied:
        out.append(
            Suggestion(
                id="connect-skills",
                kind="evidence",
                priority="high",
                message="Connect your listed skills to the work you did with them.",
                reason=f"{len(listed_only)} skills are listed but none appear in a project or "
                "internship, so all of them count half.",
            )
        )

    work = _section_text(text, sections, {"projects", "experience"})
    if work.strip() and not [n for n in _NUMBER.findall(work) if not _YEAR.fullmatch(n)]:
        out.append(
            Suggestion(
                id="add-numbers",
                kind="impact",
                priority="low",
                message="Add measurable results, such as users, speed-ups or accuracy.",
                reason="No numbers or percentages were found in your projects or experience.",
            )
        )

    if len(text.split()) < _MIN_WORDS:
        out.append(
            Suggestion(
                id="short-resume",
                kind="structure",
                priority="low",
                message="Add more detail about what you built and which tools you used.",
                reason=f"The resume has fewer than {_MIN_WORDS} words, which leaves little to "
                "assess.",
            )
        )
    return out


def _contact_suggestions(fields: Fields) -> list[Suggestion]:
    out: list[Suggestion] = []
    if not fields.emails:
        out.append(
            Suggestion(
                id="add-email",
                kind="contact",
                priority="high",
                message="Add an email address.",
                reason="No email address was found, and recruiters need a way to reach you.",
            )
        )
    if not fields.phones:
        out.append(
            Suggestion(
                id="add-phone",
                kind="contact",
                priority="medium",
                message="Add a phone number.",
                reason="No phone number was found.",
            )
        )
    if not [link for link in fields.links if link.kind in ("linkedin", "github")]:
        out.append(
            Suggestion(
                id="add-profile-links",
                kind="contact",
                priority="low",
                message="Add your LinkedIn or GitHub link.",
                reason="No LinkedIn or GitHub link was found. Links let recruiters see more of "
                "your work.",
            )
        )
    return out


def build_suggestions(
    text: str,
    sections: list[Section],
    fields: Fields,
    skills: list[DetectedSkill],
    roles: list[RoleReadiness],
    targeted: bool,
) -> list[Suggestion]:
    """Suggestions for this resume, most important first, never more than twelve."""
    focus = _focus_roles(roles, targeted)
    candidates = [
        *_skill_gap_suggestions(focus),
        *_confirm_suggestions(skills),
        *_structure_suggestions(text, sections, skills, fields),
        *_contact_suggestions(fields),
    ]
    ordered = sorted(
        enumerate(candidates), key=lambda pair: (_PRIORITY_ORDER[pair[1].priority], pair[0])
    )
    return [s for _, s in ordered][:MAX_SUGGESTIONS]


__all__ = ["MAX_SUGGESTIONS", "build_suggestions", "section_at"]
