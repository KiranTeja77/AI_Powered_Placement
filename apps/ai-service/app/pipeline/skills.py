"""Stage 4: find skills in the text.

Two passes, and neither can add a skill that is not literally written in the resume:

1. Exact pass (spaCy PhraseMatcher). The taxonomy gives every skill a name and aliases. The matcher
   looks for those exact words (ignoring capitalisation) in the text. Short or ordinary-looking
   names ("C", "Go", "React", "Excel") have stricter rules so they do not match everyday words.
2. Fuzzy pass (RapidFuzz). Words that are very close to, but not exactly, a skill name ("Kubernets")
   are reported as "possible" for the student to confirm. They are never counted automatically.

Every match keeps the exact characters it came from, as a start and end position in the text.
"""

import re
from collections import defaultdict
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

import spacy
from rapidfuzz import fuzz, process
from spacy.matcher import PhraseMatcher
from spacy.tokens import Doc, Span
from spacy.util import filter_spans

from app.config import FUZZY_THRESHOLD
from app.data import load_data
from app.pipeline.segment import section_at
from app.schemas import Section, Taxonomy

Via = Literal["exact", "fuzzy"]

# Fuzzy matching only applies to words of 8 or more letters. On shorter names a one-letter slip is
# a large share of the word, and "testing" would be taken for "TestNG".
_MIN_FUZZY_LEN = 8
_MAX_NGRAM = 3
# A list-like neighbour: comma, semicolon, pipe, slash, bullets, brackets, colon, dash.
_DELIMITERS = set(",;|/()[]:-•·")
# Words that introduce a tool in a sentence ("using Excel") and ordinary words that follow a verb.
_TOOL_PREPOSITIONS = frozenset({"using", "with", "via", "in", "on", "through", "use", "used"})
_VERB_FOLLOWERS = frozenset({"to", "at", "in", "of", "for"})
_TOOL_NOUNS = frozenset(
    {"sheet", "sheets", "spreadsheet", "spreadsheets", "macro", "macros", "formula", "formulas"}
)


@dataclass(frozen=True)
class Mention:
    skill_id: str
    start: int
    end: int
    text: str
    via: Via
    similarity: float | None = None


class SkillMatcher:
    """Everything needed to look for skills, built once from the taxonomy."""

    def __init__(self, taxonomy: Taxonomy) -> None:
        self.nlp = spacy.blank("en")  # tokenizer only; no statistical model is loaded
        self.matcher = PhraseMatcher(self.nlp.vocab, attr="LOWER")
        # skill id -> the spellings that must match with exactly this capitalisation
        self.exact_case: dict[str, set[str]] = defaultdict(set)
        self.context_required: dict[str, set[str]] = defaultdict(set)
        # lower-case alias -> skill id, for the fuzzy pass (case-insensitive aliases only)
        self.fuzzy_choices: dict[str, str] = {}
        self.all_phrases: set[str] = set()
        self.canonical_names: set[str] = {skill.name.lower() for skill in taxonomy.skills}

        for skill in taxonomy.skills:
            strict = set(skill.exact_case) | set(skill.context_required)
            self.exact_case[skill.id].update(skill.exact_case)
            self.context_required[skill.id].update(skill.context_required)
            loose = [p for p in {skill.name, *skill.aliases} if p not in strict]
            self._add(f"ci|{skill.id}", loose)
            self._add(f"ex|{skill.id}", sorted(skill.exact_case))
            self._add(f"cx|{skill.id}", sorted(skill.context_required))
            for phrase in loose:
                key = phrase.lower()
                self.all_phrases.add(key)
                if len(key) >= _MIN_FUZZY_LEN:
                    self.fuzzy_choices[key] = skill.id
            for phrase in strict:
                self.all_phrases.add(phrase.lower())

        self.choices_by_letter: dict[str, list[str]] = defaultdict(list)
        for key in self.fuzzy_choices:
            self.choices_by_letter[key[0]].append(key)

    def _add(self, label: str, phrases: list[str]) -> None:
        if phrases:
            self.matcher.add(label, [self.nlp.make_doc(p) for p in phrases])


@lru_cache(maxsize=1)
def default_matcher() -> SkillMatcher:
    return SkillMatcher(load_data()[0])


_WORDS = re.compile(r"[a-z0-9]+")
_AMPERSAND_ABBREVIATION_DOT = re.compile(r"(?<=[A-Za-z]&[A-Za-z])\.")


def _for_tokenizer(text: str) -> str:
    """The same text, one character per character, with a quirk of spaCy's tokenizer removed.

    spaCy keeps "GD&T." (an ampersand abbreviation followed by a full stop) as one token, so the
    skill "GD&T" would be missed at the end of a sentence. The full stop becomes a space for
    tokenising only; every position still refers to the original text.
    """
    return _AMPERSAND_ABBREVIATION_DOT.sub(" ", text)


def _squash(value: str) -> str:
    return " ".join(value.split())


def _in_list_context(text: str, start: int, end: int, section: str) -> bool:
    """True when a short ambiguous name sits in a skills list rather than in a sentence."""
    if section == "skills":
        return True
    line_start = text.rfind("\n", 0, start) + 1
    line_end = text.find("\n", end)
    line_end = len(text) if line_end == -1 else line_end
    before = text[line_start:start].rstrip()
    after = text[end:line_end].lstrip()
    before_ok = not before or before[-1] in _DELIMITERS
    after_ok = not after or after[0] in _DELIMITERS
    if before_ok and after_ok:
        return True
    # A tool named in a sentence: "using Excel", "in R", "Excel sheets". The word before must be a
    # preposition that introduces a tool, and the next word must not turn it into a verb phrase.
    previous = re.search(r"([A-Za-z]+)$", before)
    following = re.match(r"([A-Za-z]+)", after)
    after_word = following.group(1).lower() if following else ""
    if previous and previous.group(1).lower() in _TOOL_PREPOSITIONS:
        return after_word not in _VERB_FOLLOWERS
    return after_word in _TOOL_NOUNS


_LIST_SEPARATORS = (",", ";", "|")


def _is_category_label(text: str, start: int, end: int) -> bool:
    """True for a heading-like label that introduces a list: "Operating Systems: Linux, Windows".

    The label names a group of skills; the skills are the items after the colon. A line such as
    "Python: advanced" (no list follows) is a claim about the skill and is kept.
    """
    line_start = text.rfind("\n", 0, start) + 1
    line_end = text.find("\n", end)
    line_end = len(text) if line_end == -1 else line_end
    if text[line_start:start].strip(" \t-*>•·"):
        return False  # something other than a bullet comes before it on the line
    rest = text[end:line_end].lstrip()
    return rest.startswith(":") and any(sep in rest for sep in _LIST_SEPARATORS)


def _exact_mentions(
    text: str, doc: Doc, sections: list[Section], matcher: SkillMatcher
) -> list[Mention]:
    candidates: list[Span] = []
    for match_id, token_start, token_end in matcher.matcher(doc):
        rule, _, skill_id = matcher.nlp.vocab.strings[match_id].partition("|")
        span = Span(doc, token_start, token_end, label=matcher.nlp.vocab.strings[match_id])
        spelled = _squash(span.text)
        if rule == "ex" and spelled not in matcher.exact_case[skill_id]:
            continue
        if rule == "cx":
            if spelled not in matcher.context_required[skill_id]:
                continue
            if not _in_list_context(
                text, span.start_char, span.end_char, section_at(sections, span.start_char)
            ):
                continue
        if _is_category_label(text, span.start_char, span.end_char):
            continue
        candidates.append(span)

    # Several matches can overlap ("AWS" inside "AWS Lambda"): keep the longest.
    mentions: list[Mention] = []
    for span in filter_spans(candidates):
        skill_id = matcher.nlp.vocab.strings[span.label].partition("|")[2]
        mentions.append(Mention(skill_id, span.start_char, span.end_char, span.text, "exact"))
    return mentions


def _differs_only_by_plural(candidate: str, choice: str) -> bool:
    """'microservice' vs 'microservices': the same word, singular or plural."""
    short, long_ = sorted((candidate, choice), key=len)
    return long_ in (short + "s", short + "es")


def _is_singular_of_plural_name(candidate: str, choice: str) -> bool:
    """The text has the singular of a plural skill name ('algorithm' for 'Algorithms').

    Names that merely end in "-ics" are subjects, not plurals ('Robotics', 'Statistics')."""
    return (
        _differs_only_by_plural(candidate, choice)
        and len(candidate) < len(choice)
        and (not choice.endswith("ics"))
    )


def _fuzzy_mentions(
    text: str, doc: Doc, taken: list[Mention], matcher: SkillMatcher
) -> list[Mention]:
    covered = [(m.start, m.end) for m in taken]
    found_skills = {m.skill_id for m in taken}
    tokens = [t for t in doc if t.text.strip()]

    # 1. Score every short run of words against the known names.
    scored: list[Mention] = []
    for i in range(len(tokens)):
        for n in range(1, _MAX_NGRAM + 1):
            if i + n > len(tokens):
                break
            first, last = tokens[i], tokens[i + n - 1]
            start, end = first.idx, last.idx + len(last)
            if "\n" in text[start:end]:
                break  # never join words across lines
            if first.is_punct or last.is_punct:
                continue
            candidate = text[start:end].lower()
            if len(candidate) < _MIN_FUZZY_LEN or not candidate[0].isalpha():
                continue
            if candidate in matcher.all_phrases:
                continue  # a real name that the exact pass rejected on purpose
            if any(start < b and a < end for a, b in covered):
                continue
            pool = matcher.choices_by_letter.get(candidate[0], [])
            hit = process.extractOne(
                candidate, pool, scorer=fuzz.ratio, score_cutoff=FUZZY_THRESHOLD
            )
            if hit is None:
                continue
            choice, score, _ = hit
            skill_id = matcher.fuzzy_choices[choice]
            if skill_id in found_skills:
                continue
            if len(_WORDS.findall(candidate)) != len(_WORDS.findall(choice)):
                continue  # "objective" is not "objective c"
            if _differs_only_by_plural(candidate, choice) and not (
                choice in matcher.canonical_names and _is_singular_of_plural_name(candidate, choice)
            ):
                # A singular or plural of a mere alias ("inverters") is not evidence of the skill.
                continue
            scored.append(Mention(skill_id, start, end, text[start:end], "fuzzy", score))

    # 2. Keep the best-scoring candidates that do not overlap each other (higher score first).
    accepted: list[Mention] = []
    for mention in sorted(scored, key=lambda m: (-(m.similarity or 0), m.start, m.end)):
        if not any(mention.start < a.end and a.start < mention.end for a in accepted):
            accepted.append(mention)

    return sorted(accepted, key=lambda m: m.start)


def find_mentions(text: str, sections: list[Section], matcher: SkillMatcher) -> list[Mention]:
    """All skill mentions in the text, sorted by position. Pure: same input, same output."""
    doc = matcher.nlp.make_doc(_for_tokenizer(text))
    exact = _exact_mentions(text, doc, sections, matcher)
    fuzzy = _fuzzy_mentions(text, doc, exact, matcher)
    return sorted([*exact, *fuzzy], key=lambda m: (m.start, m.end))


__all__ = ["Mention", "SkillMatcher", "default_matcher", "find_mentions"]
