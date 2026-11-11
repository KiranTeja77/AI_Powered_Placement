"""Stage 1: clean up the text without moving anything.

The result is always exactly as long as the input, character for character in the same places. That
is what lets every later stage report positions that are valid in the text the student submitted.
"""

import unicodedata

# Characters replaced one-for-one with a plain ASCII equivalent (code points are spelled out so
# nothing invisible or look-alike hides in the source).
_PUNCTUATION = {
    chr(0x2018): "'",  # left single quotation mark
    chr(0x2019): "'",  # right single quotation mark
    chr(0x201A): "'",  # single low-9 quotation mark
    chr(0x201B): "'",  # single high-reversed-9 quotation mark
    chr(0x201C): '"',  # left double quotation mark
    chr(0x201D): '"',  # right double quotation mark
    chr(0x201E): '"',  # double low-9 quotation mark
    chr(0x2212): "-",  # minus sign
}
# Invisible: zero-width space, non-joiner, joiner, word joiner, byte-order mark, soft hyphen.
_ZERO_WIDTH = {chr(0x200B), chr(0x200C), chr(0x200D), chr(0x2060), chr(0xFEFF), chr(0x00AD)}
_LINE_SEPARATORS = {chr(0x2028), chr(0x2029)}


def normalize(text: str) -> str:
    """Return the text with the same length: tidy whitespace, quotes, dashes and odd characters.

    - Line endings: a Windows pair "\\r\\n" becomes " \\n" (so nothing shifts) and a lone "\\r"
      becomes "\\n".
    - Tabs, no-break spaces, zero-width characters and other control characters become spaces.
    - Characters outside the Basic Multilingual Plane (emoji, for example) become a space, so one
      character is also one UTF-16 unit and positions mean the same in Python and in JavaScript.
    """
    out: list[str] = []
    for i, ch in enumerate(text):
        out.append(_normalize_char(ch, text[i + 1] if i + 1 < len(text) else ""))
    return "".join(out)


def _normalize_char(ch: str, following: str) -> str:
    if ch == "\n":
        return ch
    if ch == "\r":
        return " " if following == "\n" else "\n"
    if ch in (" ", " "):
        return "\n"
    if ch in _ZERO_WIDTH or ord(ch) > 0xFFFF:
        return " "
    if ch in _PUNCTUATION:
        return _PUNCTUATION[ch]
    category = unicodedata.category(ch)
    if category in ("Cc", "Cf", "Zs", "Zl", "Zp"):
        return " "
    if category == "Pd":  # any dash
        return "-"
    # Compatibility forms (full-width letters, circled digits, ...) when they map to one character.
    folded = unicodedata.normalize("NFKC", ch)
    return folded if len(folded) == 1 else ch
