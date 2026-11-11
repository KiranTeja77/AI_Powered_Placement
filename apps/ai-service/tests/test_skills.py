import time

import pytest

from app.pipeline.normalize import normalize
from app.pipeline.segment import segment_sections
from app.pipeline.skills import Mention, default_matcher, find_mentions


def mentions(text: str) -> list[Mention]:
    text = normalize(text)
    return find_mentions(text, segment_sections(text), default_matcher())


def ids(text: str, via: str | None = None) -> set[str]:
    return {m.skill_id for m in mentions(text) if via is None or m.via == via}


def test_every_mention_points_at_the_exact_characters_it_came_from() -> None:
    text = "Skills\nPython, JAVA, node.js and Machine Learning.\nBuilt with Spring Boot."
    for m in mentions(text):
        assert text[m.start : m.end] == m.text


def test_matching_ignores_capitalisation_and_uses_aliases() -> None:
    assert {"python", "java", "node-js", "machine-learning", "spring-boot"} <= ids(
        "PYTHON3, java 8, Node JS, machine learning, springboot"
    )


def test_the_longest_name_wins() -> None:
    found = ids("Deployed with AWS Lambda and Spring Boot")
    assert "aws-lambda" in found and "spring-boot" in found
    assert "aws" not in found


def test_cpp_is_not_c() -> None:
    assert "cpp" in ids("Skills\nC++, Java")
    assert "c" not in ids("Worked in C++ and Java for the project")


def test_short_names_need_a_list_context() -> None:
    assert {"c", "r", "go"} <= ids("Skills\nC, R, Go, SQL")
    assert {"c", "r", "go"} <= ids("Projects\nTools: C, R, Go, Git")
    prose = "Grade C student who wants to Go to market with R&D budget and a C level view"
    assert not ids(prose) & {"c", "r", "go"}


def test_exact_case_names_do_not_match_ordinary_words() -> None:
    assert "react" in ids("Built the UI in React for the admin panel")
    assert "react" not in ids("Learned to react to customer feedback calmly")
    assert "swift" not in ids("Swift delivery of the event was my focus")


def test_ambiguous_tools_match_only_where_they_are_clearly_listed() -> None:
    assert "microsoft-excel" in ids("Skills\nExcel, Word")
    assert "microsoft-excel" in ids("Used MS Excel and Advanced Excel for reports")
    assert "microsoft-excel" not in ids("I excel in teamwork and Excel in whatever I do")


def test_abbreviations_in_lists_expand_to_the_skill() -> None:
    assert "machine-learning" in ids("Skills: ML, SQL, Git")
    assert "machine-learning" not in ids("The ML department met on Tuesday")


def test_phrases_do_not_match_across_line_breaks() -> None:
    assert "machine-learning" not in ids("Machine\nLearning")
    assert "machine-learning" in ids("Machine Learning")


def test_skills_inside_urls_and_emails_are_ignored() -> None:
    assert not ids("see github.com/user/python-app or mail python@java.example.com")


def test_text_with_no_skills_reports_none() -> None:
    text = "I enjoy walking in the park, reading novels and cooking with my family on weekends."
    assert mentions(text) == []


def test_possible_matches_come_from_close_misspellings() -> None:
    found = {m.skill_id: m for m in mentions("Skills\nKubernets, Javascipt, Postgre")}
    assert found["kubernetes"].via == "fuzzy"
    assert found["javascript"].via == "fuzzy"
    assert (found["kubernetes"].similarity or 0) >= 90
    assert "Kubernets" == found["kubernetes"].text


def test_short_misspellings_are_not_guessed() -> None:
    # Too few letters for a 90% match: better to say nothing than to invent a skill.
    assert "python" not in ids("Skills\nPyhton, Phyton")


def test_a_skill_found_exactly_is_never_also_reported_as_possible() -> None:
    found = mentions("Skills\nKubernetes\nProjects\nUsed Kubernets in a lab")
    assert {m.via for m in found if m.skill_id == "kubernetes"} == {"exact"}


def test_singular_and_plural_forms_count_as_the_same_word() -> None:
    found = {m.skill_id: m for m in mentions("Skills\nMicroservice, Algorithm")}
    assert found["microservices"].via == "variant"
    assert found["algorithms"].via == "variant"


def test_possible_matches_never_overlap_real_ones() -> None:
    found = mentions("Skills\nMachine Learning, Kubernets")
    spans = sorted((m.start, m.end) for m in found)
    assert all(a_end <= b_start for (_, a_end), (b_start, _) in zip(spans, spans[1:], strict=False))


def test_the_same_input_always_gives_the_same_output() -> None:
    text = "Skills\nPython, C, Go, Kubernets\nProjects\nBuilt an app with React and Node.js"
    assert mentions(text) == mentions(text)


@pytest.mark.parametrize("repeat", [200])
def test_a_maximum_size_resume_is_analysed_quickly(repeat: int) -> None:
    block = "Skills\nPython, Java, Kubernets\nProjects\nBuilt apps with React and Django.\n"
    text = (block * repeat)[:20_000]
    started = time.perf_counter()
    found = mentions(text)
    elapsed = time.perf_counter() - started
    assert found
    assert elapsed < 5.0
