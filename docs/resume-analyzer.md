# Resume analyzer

This document explains how the resume analyzer works, in plain language. It is written so that
someone who did not build it can understand the design and defend it at a review.

- Code: `apps/ai-service` (Python, FastAPI). The Spring Boot API calls it; browsers never do.
- Data it reads: `apps/ai-service/data/skills_taxonomy.json` and `apps/ai-service/data/roles.json`.
- Engine version: `1.0.0` (returned with every result).

## What it does, in one paragraph

A student pastes the text of their resume. The analyzer finds which known skills the resume
actually mentions, works out how strongly each one is supported, compares them with what each job
role expects, and gives a readiness score for each role together with the working that produced it,
plus plain suggestions with the reason for each. It does this with fixed rules and word lists.
There is no language model and nothing is guessed: every skill it reports points to the exact words
in the resume it came from.

## Why rules and word lists, not a language model

| Question | Answer |
| --- | --- |
| Can it make a skill up? | No. A skill can only be reported if its name or a listed alias is found in the text (or, for "possible" matches, a word within a few letters of it, clearly labelled). |
| Can we explain every result? | Yes. Each skill shows the sentence it came from. Each score is a sum anyone can recompute. Each suggestion states its reason. |
| Is it repeatable? | Yes. The same resume always gives the same result. |
| Does it send resumes to a third party? | No. It runs inside our own network and never calls an outside service. |
| Can we change it? | Yes. To teach it a new skill or change what a role expects, edit a JSON file. |

The trade-off is that it only knows the skills in its word list, and it can miss a skill written in
an unusual way. See "Limits" below.

## The eight steps

The analyzer is a chain of small functions. Each one takes the output of the one before it.

```
resume text
   1. normalize        tidy the characters, change nothing else
   2. segment          find the sections (Skills, Projects, ...)
   3. extract fields   email, phone, links, degree, CGPA, project titles
   4. find skills      look for known skills in the text
   5. grade evidence   was the skill used, or only listed?
   6. compare roles    what does each role need, and what is missing?
   7. score            readiness 0 to 100, with the breakdown
   8. suggest          what to do next, and why
```

### 1. Normalize

PDF copies and web pages leave odd characters in text: non-breaking spaces, invisible characters,
curly quotes, Windows line endings, emoji. This step replaces them with plain equivalents.

One rule matters more than the rest: **the cleaned text is always exactly as long as the original,
character for character.** Nothing is deleted or inserted, so every position reported later
(for example "characters 795 to 801") is correct in the text the student typed. Emoji become a
space so that a position means the same thing in Python and in the browser's JavaScript.

### 2. Segment into sections

Resumes are organised under headings. A line is treated as a heading when it is short and its words
match a known heading ("Technical Skills", "PROJECTS", "Work Experience", "Internship", and so on).
Headings can be upper case, have a colon, or be decorated (`=== EDUCATION ===`).

Some care is taken so ordinary lines are not mistaken for headings: a bullet is never a heading,
sub-labels such as `Languages:` or `Tools:` inside the skills list are not headings, and a project's
`Tools and Technologies: React, Node` line does not start a new skills section.

Sections matter in step 5, because *where* a skill appears says how strongly it is supported.

### 3. Extract fields

Plain pattern matching (regular expressions) finds: email addresses, phone numbers (Indian formats
and international numbers), LinkedIn and GitHub links, degrees (B.Tech, B.E., M.Tech, Diploma, ...),
CGPA (for example `CGPA: 8.62/10`, `GPA 3.7/4.0`, `8.4/10 CGPA`) or a percentage, and the title of
each project. Impossible values (a CGPA of 12.5 out of 10) are ignored. Every item keeps its
position in the text.

### 4. Find skills

This step has two passes.

**The exact pass** uses spaCy's `PhraseMatcher`. The word list (`skills_taxonomy.json`) gives every
skill a name and aliases, for example *Node.js* is also written `nodejs`, `node js`; *Machine
Learning* is also `ML`. The matcher scans the text for these phrases, ignoring capitalisation, and
keeps the longest match when several overlap (so `AWS Lambda` is one skill, not `AWS` plus
something else).

Some names are also ordinary words, so they get stricter rules:

| Kind | Rule | Examples |
| --- | --- | --- |
| Normal | any capitalisation | Python, SQL, Docker |
| Exact case | must be written exactly like this | `React` (not the verb "react"), `Swift`, `Rust` |
| Needs a list context | exact case, and must be in a skills list or clearly named as a tool | `C`, `R`, `Go`, `Excel`, `ML` |

So `Go to market with ideas` and `Grade C` do not produce skills, while `Skills: C, C++, Go, R` and
`using Excel` do. A label that only introduces a list, such as `Operating Systems: Linux, Windows`,
is not counted as a skill claim (the items after the colon are).

**The fuzzy pass** uses RapidFuzz to catch spelling slips. If a word is at least 90% similar to a
skill name but is not an exact match, for example `Kubernets` for *Kubernetes* or `Javascipt` for
*JavaScript*, the skill is reported as **possible**. A possible skill:

- is shown to the student so they can confirm it or fix the spelling,
- is **never counted in any score** until it is confirmed.

The fuzzy pass is deliberately cautious. It only looks at words of 8 or more letters (on shorter
names one wrong letter is too large a share of the word and causes false matches), it compares only
words and phrases of the same length in words, and it never fires for a skill the resume already
mentions exactly.

### 5. Grade the evidence

A resume that lists "Docker" under Skills says something different from a resume that says
"Containerised the app using Docker and deployed on AWS". Each skill is graded by where it appears:

| Grade | Where the skill appears | Strength |
| --- | --- | --- |
| **applied** | in a Projects, Experience, Internship or Training section | 1.0 |
| **listed** | anywhere else (a skills list, summary, education, certificates, achievements) | 0.5 |

If a skill appears in both places, the stronger grade wins. For every skill the result keeps up to
three pieces of evidence (the strongest first), each with the matched words, their position, the
section, and the line they came from, so the interface can highlight them.

### 6 and 7. Compare with roles and score

`roles.json` defines 14 roles. For each role it lists skills and how much each matters:

| Importance | Weight |
| --- | --- |
| core | 3 |
| important | 2 |
| bonus | 1 |

**Readiness = (sum of weight x strength) / (sum of weights) x 100**

where strength is 0 (not found), 0.5 (listed) or 1 (applied). Each skill in the role is then
labelled **matched** (applied), **partial** (listed), **possible** (an unconfirmed spelling match,
worth 0) or **missing**.

Worked example, from a real run on one of the test resumes against *Backend Developer*:

| Importance | Matched | Partial | Missing | Points earned | Maximum |
| --- | --- | --- | --- | --- | --- |
| core (weight 3) | 2 | 3 | 1 | 2 x 3 + 3 x 1.5 = 10.5 | 18 |
| important (weight 2) | 5 | 2 | 5 | 5 x 2 + 2 x 1 = 12.0 | 24 |
| bonus (weight 1) | 2 | 0 | 8 | 2.0 | 10 |
| **Total** | | | | **24.5** | **52** |

Readiness = 24.5 / 52 x 100 = **47.1%**. The score is never shown without this breakdown, so a
student can see exactly which missing skill would raise it most (a missing core skill is worth 3
points, a bonus one only 1).

If no target roles are given, all 14 roles are scored and returned best first. The skill gap can
also be recomputed after a student confirms, removes or adds a skill (`POST /revise`, below), so the
scores and the suggestions always describe the skill list the student has confirmed.

### 8. Suggestions

Fixed rules, each producing one suggestion and the reason it fired. Examples:

| If this is true | The suggestion says | The reason says |
| --- | --- | --- |
| a core skill for the target role is not found | Learn X and show it in a project | X is a core skill for the role and was not found in your resume |
| a role skill is only listed | Show X in a project or internship | Use in a project or job counts twice as much as a mention in a list |
| a possible match exists | Check whether "Kubernets" means Kubernetes | It is close but not an exact match, so it was not counted |
| there is no projects or experience section | Add a projects or internship section | Every skill is otherwise graded as listed and counts half |
| there is no CGPA in the education section | Add your CGPA | Many drives set a minimum |
| no email, phone or profile link | Add the missing detail | Recruiters need a way to reach you |
| projects contain no numbers | Add measurable results | No numbers or percentages were found |

Suggestions are ordered high, medium, low and capped at twelve. Suggestions about skills follow the
roles the student chose, or the best-matching role if none was chosen. After a student edits the
skill list the suggestions are rebuilt from the edited list: a skill they removed is no longer
"found", so advice that depended on it comes back, and a skill they added counts as listed.

## "Never invent a skill": how this is enforced

1. Skills come only from the word list, and a skill is reported only when one of its listed
   spellings is found in the text.
2. Every skill carries the evidence it came from: the matched words, their position, and the line.
3. Automated tests check, for all 15 test resumes, that every reported skill's position really
   contains those words and that the words are a listed spelling of that skill.
4. Close-but-not-exact words are labelled "possible" and are excluded from every score until the
   student confirms them.
5. The response contains only short snippets of the resume, never the whole text.

## Privacy

- Resume text is never logged. Error responses never repeat it. FastAPI's default 422 response
  includes the offending input, so it is rewritten to carry only the field and the rule that failed.
  Automated tests send a unique marker through success, validation-error and crash paths and check
  that it appears in no log line and no error body.
- The service is only reachable from the API container (Docker's internal network). It has no
  public port.
- It stores nothing. The text exists only for the duration of one request.

## The data files

`skills_taxonomy.json`: 453 skills across 17 categories (programming languages, web, databases,
cloud and DevOps, data, machine learning, software engineering, testing, computer science
fundamentals, embedded and electronics, VLSI, communication systems, electrical, mechanical, civil,
business, and professional skills). Each skill has:

```json
{ "id": "node-js", "name": "Node.js", "category": "Web development",
  "aliases": ["node js", "nodejs"], "context_required": ["Node"] }
```

`roles.json`: 14 roles, each with a list of `{ "skill": <id>, "importance": core|important|bonus }`:
Software Developer, Frontend Developer, Backend Developer, Data Analyst, ML Engineer, QA Engineer,
DevOps Engineer, Business Analyst, Embedded Systems Engineer, VLSI Design Engineer, Electrical
Design Engineer, Mechanical Design/CAD Engineer, Site/Structural Engineer, Graduate Engineer Trainee.

Both files are checked when the service starts. It refuses to start if two skills share a spelling,
a role refers to a skill that does not exist, or a role lists a skill twice.

## The HTTP interface

Internal only.

| Request | Purpose |
| --- | --- |
| `POST /analyze` | Body: `{ "text": "...", "target_roles": ["backend-developer"] }`. Text must be 200 to 20,000 characters. Returns sections, fields, skills with evidence, role readiness with breakdown, suggestions, and `engine_version`. |
| `POST /compare` | Body: `{ "skills": [{ "skill_id": "git", "strength": 1.0 }], "target_roles": [...] }`. Recomputes the gap without the text. The API no longer uses it. |
| `POST /revise` | Body: the `/analyze` body plus `confirmed_skill_ids`, `removed_skill_ids`, `added_skill_ids`. Reads the text again, applies the edits, and returns the effective skills, role scores and suggestions. Ids that do not fit the analysis (confirming a skill that was not a possible match, removing one that was not found) give 422 `invalid_edit` naming ids only, never text. |
| `GET /health` | Liveness check. |

Unknown role ids return 422 naming the role. Positions are character offsets into the submitted
text and equal UTF-16 positions, so the browser can use them directly.

## How we know it works

`tests/` holds 219 automated tests: one group per pipeline step, the API behaviour and privacy
checks, and an evaluation on **15 synthetic resumes** (`tests/fixtures/resumes`) whose skills were
labelled by hand (`tests/fixtures/labels.json`), with at least two resumes for each of CSE/IT, ECE,
EEE, Mechanical, Civil and Non-technical, plus one resume made of traps.

| Measure | Required | Result on the fixtures |
| --- | --- | --- |
| Precision (reported skills that were right) | 0.90 | 1.00 |
| Recall (labelled skills that were found) | 0.90 | 1.00 |
| Same two figures per branch | 0.90 | 1.00 |
| Evidence grade agrees with the label | 0.95 | 1.00 |

**Read these numbers honestly.** The resumes and the labels were written by the same people who
built the engine, and while labelling, a few spellings were added to the word list and a few rules
were tightened after looking at mistakes (the commit history shows which). So the result shows that
the engine is consistent and that future changes cannot silently make it worse. It does **not**
show how it will score on real student resumes, which are messier. The first thing to do with real
resumes is to label a sample and measure again.

## Limits

- It knows only the skills in its word list. A skill written in an unusual way, or not in the list,
  is not found. (Adding it is a one-line change.)
- It cannot tell a claim from a negation. "No experience with Docker" still mentions Docker.
- Grades come from the section, not the sentence. A skill mentioned under Experience is "applied"
  even if the sentence only says the student read about it.
- Words that mean two things can still slip through. `Spring` the framework and the season are
  separated only because the framework is matched as `Spring Boot` or `Spring Framework`.
- Fuzzy matching does not apply to names shorter than 8 letters, so a typo in `Python` or `Git`
  is not suggested.
- Text only. PDF and image upload (and OCR) are out of scope for this milestone.
- English only.

## Changing it

| To do this | Edit |
| --- | --- |
| Teach it a new skill or spelling | `data/skills_taxonomy.json`, then add a line to a test resume if it matters |
| Change what a role expects | `data/roles.json` |
| Change how strongly applied vs listed count | `STRENGTH_APPLIED`, `STRENGTH_LISTED` in `app/config.py` |
| Change the fuzzy threshold | `FUZZY_THRESHOLD` in `app/config.py` |
| Add a heading name such as "Strengths" | `_HEADINGS` in `app/pipeline/segment.py` |

After any change, bump `ENGINE_VERSION` in `app/config.py` and run `uv run pytest`. The accuracy
tests fail with a list of exactly which skills were missed or wrongly added.

## Running it

```sh
cd apps/ai-service
uv sync
uv run uvicorn app.main:app --port 8000
uv run pytest           # 219 tests
uv run ruff check . && uv run mypy app
```

## How the API and the web app use it

The student never talks to the analyzer. The browser calls the Spring Boot API, and the API calls
the analyzer over the internal Docker network.

```
browser  ->  API (Spring Boot)  ->  analyzer (FastAPI, internal only)
                  |
              PostgreSQL
```

### Endpoints (all need a signed-in student, except `GET /roles` and `GET /skills`, which any signed-in user may read)

| Request | What it does |
| --- | --- |
| `GET /api/v1/roles` | The 14 roles with the skills each needs and how much each matters. |
| `GET /api/v1/skills` | All 453 skills, used by the "add a skill" picker. |
| `POST /api/v1/resumes/analyze` | `{ text, targetRoles }`. Checks the text (200 to 20,000 characters) and the role slugs, calls the analyzer, saves the result and returns it (201). |
| `GET /api/v1/resumes/analyses?page=&size=` | The student's own history, newest first. Small rows only: no resume text, no results. |
| `GET /api/v1/resumes/analyses/{id}` | One analysis. |
| `PATCH /api/v1/resumes/analyses/{id}/skills` | `{ confirmedSkillIds, removedSkillIds, addedSkillIds }`. The API sends the stored text and the confirmed skills to the analyzer's `/revise`, and saves the scores and suggestions that come back. The browser never sends the text again. An analysis made by an older analyzer version answers 409 `analysis_outdated`. |
| `DELETE /api/v1/resumes/analyses/{id}` | Deletes the analysis and the resume text stored with it (204). Only its owner can; this cannot be undone. |
| `GET /api/v1/me/career-interests` | The roles the student marked as interests, ordered by role name. |
| `PUT /api/v1/me/career-interests` | `{ roleSlugs }` replaces the whole list (at most 14, unknown roles give 400, duplicates are ignored). Students only. |

A student can only read or change their own analyses: another student's id gives 403, an unknown id
gives 404. Faculty and other roles get 403 on all of these for now.

### What is stored

One row per analysis in `resume_analysis`: the resume text exactly as submitted, the analyzer's full
answer (JSONB, with a GIN index), the student's edits and the recomputed result (JSONB), the engine
version, and a few summary columns so the history list never loads the large documents.

The analyzer's answer is never changed. Edits are stored next to it, so "Reset to analyzer result"
is always possible.

### Editing the skill list

Edits are always relative to the analyzer's original answer, so sending the same request twice
gives the same result and an empty request resets the analysis.

- **Confirm** a "possible" match: it then counts, with the strength its section earned.
- **Remove** a skill that was found: it stops counting.
- **Add** a skill from the list that was not in the text: it counts as *listed* (0.5), because there
  is no evidence for it. It is labelled "Added by you" so it is never mistaken for a finding.

The readiness scores and suggestions shown after a save come from the analyzer (`/revise`), not
from the web app or the API, so there is one implementation of the formula and of the advice.

### Career interests

A student can mark roles as interests on the career page. The resume form starts with those roles
selected as its target roles; the student can change the selection for a single analysis without
changing the saved interests.

### One catalogue, two services

The API's `skill`, `job_role` and `role_skill` tables are filled from the same two JSON files the
analyzer reads (`apps/ai-service/data`). The build copies them onto the API's classpath and a
repeatable database migration loads them. Its checksum comes from the files, so changing a file
re-runs the seed on the next start. Automated tests compare the database with the files, so the two
cannot disagree unnoticed.

### When the analyzer is down

The API waits at most 10 seconds. If the analyzer cannot be reached, is too slow or returns an
error, the API answers `503` (problem+json, `analysis_unavailable`, with `Retry-After`) and nothing
is saved. The web app shows "Resume analysis is temporarily unavailable" and keeps the student's text
and unsaved edits. Reading and listing existing analyses never needs the analyzer.

### Keeping the text out of the logs

The analyzer's own code never logs the text. In the API, the request, the outgoing call and the
response all print only a summary if a framework logs them, and Hibernate's entity logging is held
at INFO so debug logging cannot print a stored resume. A test turns on DEBUG for everything, runs
success and failure paths, and checks that a unique marker never appears in any log line.
