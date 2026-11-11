"""Constants shared across the analyzer."""

from pathlib import Path

# Bump when the pipeline's behaviour changes, so stored results can be told apart.
ENGINE_VERSION = "1.0.0"

MIN_TEXT_CHARS = 200
MAX_TEXT_CHARS = 20_000

# Fuzzy matches below this RapidFuzz ratio are ignored; at or above it they are "possible" only.
FUZZY_THRESHOLD = 90.0

# Strength of evidence. A skill used in a project or job counts fully; one only listed counts half.
STRENGTH_APPLIED = 1.0
STRENGTH_LISTED = 0.5

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
