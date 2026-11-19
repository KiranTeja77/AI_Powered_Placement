# Milestone 1 status

This is every feature in the project overview, and what exists today. Nothing is hidden: if a
feature is not built, it says so.

| Status | Meaning |
| --- | --- |
| **Done (real)** | Works end to end. A real backend, a real database, tested. |
| **UI only** | The screen is built, validated and responsive, but there is no backend behind it. It shows a designed empty state, and any action says "Saving isn't available yet". No sample data is shown anywhere in the app. |
| **Future** | Not built in this milestone. |

Section numbers refer to the project overview PDF.

## The four connected capabilities (section 1)

| Capability | Status | What exists |
| --- | --- | --- |
| Personalized preparation | Part real | Career interests and the resume skill gap are real. The training paths, lessons and roadmap are UI only. |
| Secure assessments and feedback | UI only | Consent, device check, full-screen prompt, the test player and results layouts. No scoring and no event capture. |
| College monitoring and mentoring | Part real | Role-based access and the admin user tools are real. Faculty and T&P dashboards are UI only. |
| Smart recruitment support | UI only | Drive form, eligibility layout, CSV validation and shortlist screens. |

## Who uses the system (section 2)

| Role | Status | Real | UI only |
| --- | --- | --- | --- |
| Student | Part real | Registration, sign-in, resume analysis, career interests, account settings | Profile edits, roadmap, training, assessments, results, progress, interviews, drives, feedback |
| Faculty / mentor | UI only | Sign-in, role guard | Students, student 360 view, mentoring log, question bank, assessment builder, proctoring review |
| T&P head | UI only | Sign-in, role guard | Analytics, drives, drive form, eligibility, shortlist, academic import, placements |
| College administrator | Done (real) for accounts | Create and deactivate accounts, resend invites, overview counts, read-only permission matrix, department list | Department editing, audit log, settings |
| Recruiter | UI only | Sign-in, role guard | Overview and approved candidates for a drive |

The access principle holds: students see their own information, faculty will see assigned students,
T&P will see authorized placement information, and recruiters will see only approved profiles. The
API enforces role rules today (see the permission matrix in the admin area); the data those rules
will protect does not exist yet for faculty, T&P and recruiters.

## Training for every department (section 3)

| Feature | Status |
| --- | --- |
| Technical, non-technical and combined paths | UI only (track pages with progress per topic) |
| Department-aware technical content | UI only; the content itself is Future |
| A department never restricts the career a student can prepare for | Done (career interests and resume roles are open to every student) |

## Student journey (section 4)

| Step | Status | Notes |
| --- | --- | --- |
| Profile | Part real | Account details come from registration. Education and contact edits are UI only. |
| Resume, typed text | Done (real) | Paste text; the analyzer returns sections, contact details, education, CGPA and project titles. |
| Resume, uploaded files and OCR | Future | PDF and image upload, scanned pages. |
| Extract skills, with the words they came from | Done (real) | 453 skills; every skill points to the exact sentence and offsets. Close spellings are "possible" until confirmed. |
| Review and correct extracted data | Done (real) | Confirm, remove or add skills; scores and suggestions are recalculated. |
| Career interests | Done (real) | Mark roles as interests; the resume form starts from them. |
| Skill-gap analysis against a role | Done (real) | 14 roles; readiness shown with its full breakdown. Assessment performance is not included yet (Future). |
| Personalized roadmap | UI only | Weekly plan layout with priority, reason and time. |
| Continuous updates after learning and tests | Future | |

## Automatic evaluation and improvement (section 7)

| Feature | Status |
| --- | --- |
| Score, accuracy, time, topic-wise results, answer review | UI only (result page layout) |
| Question explanations and suggested practice | UI only |
| Student improvement tracker, with "no recent activity" instead of an assumed low score | UI only |
| Faculty view of gaps, feedback and practice assignment | UI only |
| Question bank and automatic scoring | Future |

## Secure assessments (section 8)

| Control | Status | Notes |
| --- | --- | --- |
| Clear disclosure and consent before monitoring | UI only | Lists exactly what is monitored; consent is required to start. |
| Camera and microphone permission and check | UI only | A local preview and sound check. Nothing is recorded, stored or sent. |
| Full-screen request and exit warning | UI only | The prompt and the warning work in the browser. No event is logged. |
| Tab visibility, window focus, copy and paste events | Future | |
| Camera and microphone signals, event log | Future | |
| Review queue and timeline | UI only | Layout with review outcomes and notes. |
| Fairness rule: alerts are for review, not proof | Done | Stated on the test, the review screens and the assessment settings. |

## Automated progress tracking and company matching (section 9)

| Feature | Status |
| --- | --- |
| T&P enters company, role, date, stages, criteria and source | UI only (validated drive form) |
| Skills picked from the real skill catalogue | Done (the list comes from the API) |
| Eligibility from an imported spreadsheet | UI only: the CSV is read, mapped and checked in the browser. Nothing is uploaded or stored. Matching to registered students is Future. |
| Official eligibility kept separate from role fit; missing data marked unknown | UI only (met, not met and unknown look different) |
| Explainable match summary per student | UI only |
| T&P review and approval, with confirmation | UI only |
| Student consent before sharing | UI only |
| Approved pack, Excel and PDF export | Future (the buttons say so) |
| Recruitment stages and outcomes | UI only |

## Company portal (section 10)

| Item | Status |
| --- | --- |
| Recruiter account and sign-in | Done (real) |
| Recruiter overview and approved-candidate table | UI only |
| Approved Excel/PDF candidate list | Future |
| Resume downloads, stage updates, offer tracking | Future |

## Data design (section 11)

| Entity | Status |
| --- | --- |
| Student, user account, department, roles | Done (real tables) |
| Resume analysis and skill catalogue | Done (real tables, JSONB) |
| CareerInterest | Done (real table) |
| FacultyAssignment | Table exists; no screens write to it yet |
| AcademicRecord, LearningActivity, Assessment, Question, AssessmentAttempt, ProctoringEvent, ProgressSnapshot, MentoringRecord, Company and RecruitmentDrive, CandidateMatch and ShortlistApproval, Consent, PlacementOutcome, AuditLog | Future |

## Privacy, security and responsible use (section 12)

| Principle | Status |
| --- | --- |
| Permission before camera and microphone; explain what is monitored and why | UI only (consent page, browser permission) |
| Monitor only during the assessment and show when monitoring is active | UI only (banner during the test) |
| Collect only what is necessary; prefer events to recordings | Done by design: nothing is recorded |
| Retention periods and deletion | Part real: a student can delete an analysis and its resume text. Retention settings are UI only. |
| Restrict access by role, secure authentication, audit logs | Done for roles and authentication (BCrypt, short-lived tokens, rotating refresh cookies, rate limiting, security headers, Content-Security-Policy). The audit log is UI only. |
| Consent before sharing resumes | UI only |
| Review of alerts and correction of records | UI only |
| AI alerts are not proof and not the sole basis for decisions | Done in the product copy |
| Resume text is never written to logs | Done (tested) |

## Technology (section 13)

| Layer | Proposal | Built |
| --- | --- | --- |
| Frontend | React, Bootstrap or Tailwind, Chart.js | React 19, TypeScript, Tailwind CSS, Recharts |
| Backend | Java Spring Boot, REST | Spring Boot 4, Java 21, REST with OpenAPI |
| AI and processing | Python, NLP | Python 3.12, FastAPI, spaCy and RapidFuzz (rules and word lists, no language model) |
| Database | MySQL, optional MongoDB | PostgreSQL 18 (see the README for why) |
| Infrastructure | Redis, Docker | Docker Compose; no Redis was needed |

## Implementation roadmap (section 14)

| Phase | Status |
| --- | --- |
| 1. Foundation: authentication, departments, profiles, roles and permissions | Done (editing permissions is Future) |
| 2. Training | UI only, plus real career interests |
| 3. Assessments | UI only |
| 4. Improvement | UI only |
| 5. Secure tests | UI only |
| 6. T&P automation | UI only |
| 7. Recruiter sharing | UI only |

Section 15 (why the project is useful) and section 16 (glossary) describe goals and terms, not
features.

## Summary

- **Done (real):** accounts and authentication, role-based access, the admin user tools, the
  resume analyzer with skill gaps and editing, career interests, the role and skill catalogue,
  department list, security hardening.
- **UI only:** every other screen for every role, built to the design system, with loading, empty
  and error states and no invented data.
- **Future:** question bank and scoring, proctoring events, academic records and eligibility,
  drives, shortlists and exports, notifications, audit log, PDF and image resume upload.
