from app.pipeline.normalize import normalize

# Code points are spelled out with chr() so invisible characters are visible in the source.
NBSP = chr(0x00A0)
ZWSP = chr(0x200B)
BOM = chr(0xFEFF)
LINE_SEP = chr(0x2028)
PARA_SEP = chr(0x2029)
ROCKET = chr(0x1F680)
LIGATURE_FI = chr(0xFB01)
FULLWIDTH_P = chr(0xFF30)
CIRCLED_ONE = chr(0x2460)
LEFT_DQ, RIGHT_DQ = chr(0x201C), chr(0x201D)
LEFT_SQ, RIGHT_SQ = chr(0x2018), chr(0x2019)
EN_DASH, EM_DASH, MINUS = chr(0x2013), chr(0x2014), chr(0x2212)


def test_never_changes_length() -> None:
    text = (
        f"Name\r\nSkills:\tPython{NBSP}Java{ZWSP}\rEmoji {ROCKET} end{LINE_SEP}x{LIGATURE_FI} "
        f"{RIGHT_SQ}q{RIGHT_SQ}"
    )
    assert len(normalize(text)) == len(text)


def test_line_endings_become_single_newlines_without_shifting() -> None:
    assert normalize("a\r\nb") == "a \nb"
    assert normalize("a\rb") == "a\nb"
    assert normalize(f"a{LINE_SEP}b{PARA_SEP}c") == "a\nb\nc"


def test_odd_whitespace_and_invisible_characters_become_spaces() -> None:
    assert normalize(f"a\tb{NBSP}c{ZWSP}d{BOM}e") == "a b c d e"
    assert normalize(f"x{chr(0)}y{chr(7)}z") == "x y z"


def test_emoji_become_one_space_so_positions_match_javascript() -> None:
    result = normalize(f"Built {ROCKET} apps")
    assert result == "Built   apps"
    assert len(result.encode("utf-16-le")) // 2 == len(result)


def test_typographic_punctuation_is_ascii() -> None:
    assert (
        normalize(f"{LEFT_DQ}quoted{RIGHT_DQ} {LEFT_SQ}it{RIGHT_SQ}s{RIGHT_SQ}")
        == "\"quoted\" 'it's'"
    )
    assert normalize(f"A{EN_DASH}B{EM_DASH}C{MINUS}D") == "A-B-C-D"


def test_compatibility_characters_fold_to_plain_ones() -> None:
    assert normalize(f"{FULLWIDTH_P}ython {CIRCLED_ONE}") == "Python 1"


def test_ligatures_that_would_change_length_are_left_alone() -> None:
    assert normalize(f"{LIGATURE_FI}le") == f"{LIGATURE_FI}le"


def test_newlines_are_kept() -> None:
    assert normalize("a\n\nb") == "a\n\nb"
