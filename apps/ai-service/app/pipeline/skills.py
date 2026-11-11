"""Stage 4: find skills in the text.

Two passes, and neither can add a skill that is not literally written in the resume:

1. Exact pass (spaCy PhraseMatcher). The taxonomy gives every skill a name and aliases. The matcher
   looks for those exact words (ignoring capitalisation) in the text. Short or ordinary-looking
   names ("C", "Go", "React", "Excel") have stricter rules so they do not match everyday words.
2. Fuzzy pass (RapidFuzz). Words that are very close to, but not exactly, a skill name ("Kubernets")
   are reported as "possible" for the student to confirm. They are never counted automatically.

Every match keeps the exact characters it came from, as a start and end position in the text.
"""

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

Via = Literal["exact", "variant", "fuzzy"]

# Fuzzy matching ignores very short names: two letters of difference would be most of the word.
_MIN_FUZZY_LEN = 6
_MAX_NGRAM = 3
# A list-like neighbour: comma, semicolon, pipe, slash, bullets, brackets, colon, dash.
_DELIMITERS = set(",;|/()[]:-•·")


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
    return before_ok and after_ok


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
        candidates.append(span)

    # Several matches can overlap ("AWS" inside "AWS Lambda"): keep the longest.
    mentions: list[Mention] = []
    for span in filter_spans(candidates):
        skill_id = matcher.nlp.vocab.strings[span.label].partition("|")[2]
        mentions.append(Mention(skill_id, span.start_char, span.end_char, span.text, "exact"))
    return mentions


def _is_plural_variant(candidate: str, choice: str) -> bool:
    """'microservice' vs 'microservices': the same word, singular or plural."""
    short, long_ = sorted((candidate, choice), key=len)
    return long_ in (short + "s", short + "es") and len(short) >= _MIN_FUZZY_LEN - 1


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
            kind: Via = "variant" if _is_plural_variant(candidate, choice) else "fuzzy"
            scored.append(Mention(skill_id, start, end, text[start:end], kind, score))

    # 2. Keep the best-scoring candidates that do not overlap each other (higher score first).
    accepted: list[Mention] = []
    for mention in sorted(scored, key=lambda m: (-(m.similarity or 0), m.start, m.end)):
        if not any(mention.start < a.end and a.start < mention.end for a in accepted):
            accepted.append(mention)

    # 3. A skill is either a plural/singular variant or a fuzzy match, decided by its first hit.
    chosen: dict[str, Via] = {}
    results: list[Mention] = []
    for mention in sorted(accepted, key=lambda m: m.start):
        if chosen.setdefault(mention.skill_id, mention.via) == mention.via:
            results.append(mention)
    return results


def find_mentions(text: str, sections: list[Section], matcher: SkillMatcher) -> list[Mention]:
    """All skill mentions in the text, sorted by position. Pure: same input, same output."""
    doc = matcher.nlp.make_doc(text)
    exact = _exact_mentions(text, doc, sections, matcher)
    fuzzy = _fuzzy_mentions(text, doc, exact, matcher)
    return sorted([*exact, *fuzzy], key=lambda m: (m.start, m.end))


__all__ = ["Mention", "SkillMatcher", "default_matcher", "find_mentions"]
