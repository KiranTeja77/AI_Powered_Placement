# PlaceWise — AI-Powered Placement Preparation & Recruitment System

A centralized platform where college students (every department) prepare for technical and
non-technical placements, take secure assessments, see their weak areas, get faculty guidance,
and are matched to campus recruitment drives. Faculty mentor assigned students, the T&P (Training
& Placement) team manages drives and shortlists, admins manage users, and recruiters see only
approved candidates.

"PlaceWise" is a working name. Rename freely.

---

## Milestone 1 scope (current) — read before every task

| Area             | What to build now                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend         | **Every screen for every role**, responsive (375 / 768 / 1280+), light + dark                                                                                      |
| Authentication   | **Complete and real**: student registration, login, logout, refresh tokens, forgot/reset password, change password, role-based route guards and API authorization  |
| Resume analyzer  | **Real backend** (text input only): sections, skills with evidence, skill gap per target role, suggestions, history. The page also explains how the analysis works |
| Role catalogue   | Real (seeded in DB, served by API)                                                                                                                                 |
| Admin users list | Real (lists users from DB)                                                                                                                                         |
| Everything else  | **UI only. No mock or fake data.** Screens render zero records with a designed empty state                                                                         |
| Proctoring       | **UI only**: consent screen, device-check layout, full-screen prompt, monitoring banner, review-queue layout. No event logging, recording or upload                |

Out of scope now: PDF/image resume upload and OCR, question bank logic, scoring, proctoring logic,
eligibility engine, exports, recruiter access control, notifications delivery.

### The "no mock data" rule

- Never create fixture files, fake students, fake scores, fake companies or placeholder charts.
- A screen whose backend does not exist yet uses a hook from `apps/web/src/lib/api/pending.ts`
  that returns an empty result (`[]`, `null`, or `{ items: [], total: 0 }`) **without a network call**,
  with a `// TODO(api): GET /api/v1/...` comment naming the intended endpoint and response type.
- Stat cards show `—` (em dash), never `0%` or invented numbers.
- Charts with no data render the empty state, not an empty axis.
- Forms (e.g. "Create drive", "New question") are fully built and validated with Zod; on submit
  they show a toast "Saving isn't available yet" and do not pretend to succeed.

---

## Repo layout

```
apps/
  web/          React 19 + TypeScript + Vite
  api/          Spring Boot 4.1, Java 21 — core API, auth, resume endpoints
  ai-service/   Python 3.12 FastAPI — resume analyzer (internal only)
docs/           architecture.md, api.md, design-system.md, resume-analyzer.md, decisions/
docker-compose.yml   postgres:18, mailpit, api, ai-service
.github/workflows/ci.yml
```

## Stack (pinned — do not add libraries without asking)

- **Web**: TypeScript (strict), Vite 7, pnpm, React 19, React Router 7, Tailwind CSS v4,
  shadcn/ui (Radix), TanStack Query, TanStack Table, React Hook Form + Zod, Recharts,
  lucide-react, Monaco editor (coding screen only), sonner (toasts). Fonts: Inter, JetBrains Mono.
- **API**: Java 21, Spring Boot 4.1, Spring Web, Spring Security, Spring Data JPA, Flyway,
  Bean Validation, springdoc-openapi, JJWT (or Spring's resource-server JWT), Testcontainers.
- **AI service**: Python 3.12, FastAPI, Pydantic v2, spaCy (PhraseMatcher), RapidFuzz, pytest. uv for deps.
- **DB**: PostgreSQL 18. UUID primary keys `DEFAULT uuidv7()`. All schema changes via Flyway.
- **Dev**: Docker Compose, Mailpit for emails, GitHub Actions.

---

## Design system — mandatory

The product must look like a professional enterprise tool (reference feel: Linear, Stripe
Dashboard, GitHub, Atlassian). It must NOT look AI-generated.

### Banned

- Gradients of any kind, gradient text, glassmorphism, glows, blurred blobs, background patterns
- Purple/indigo/violet anywhere; Tailwind's default palette classes (`indigo-500`, `slate-*`, etc.)
- Emoji in UI; sparkle icons for "AI"; "Welcome back! 👋" style greetings; exclamation marks in UI copy
- Heavy shadows; `rounded-2xl`/`rounded-3xl`; wrapping every section in its own card
- Hero banners inside the app; centred dashboard layouts
- Marketing copy ("Unlock your potential", "Supercharge", "Seamless", "Revolutionize")
- Animated counters, bouncing/pulsing elements, transitions over 200 ms
- Hard-coded hex colours in components — **use the tokens below only**

### Tokens (`apps/web/src/styles/tokens.css`, mapped into Tailwind v4 `@theme`)

| Token              | Light                                           | Dark           | Use                                            |
| ------------------ | ----------------------------------------------- | -------------- | ---------------------------------------------- |
| `--bg`             | #FAFAF9                                         | #111210        | Page background                                |
| `--surface`        | #FFFFFF                                         | #1A1B19        | Cards, tables, sidebar                         |
| `--surface-muted`  | #F4F4F2                                         | #222320        | Table header, hover row                        |
| `--border`         | #E6E5E1                                         | #2C2D2A        | All dividers and outlines                      |
| `--text`           | #1A1A18                                         | #ECECE9        | Primary text                                   |
| `--text-muted`     | #6B6A65                                         | #9C9B95        | Secondary text                                 |
| `--primary`        | #1F5A7A                                         | #5FA3C7        | Primary buttons, links, active nav, focus ring |
| `--primary-hover`  | #184963                                         | #7AB6D6        | Hover                                          |
| `--primary-subtle` | #E8F1F6                                         | #16303D        | Active nav background, selected rows           |
| `--success`        | #1E7A4C                                         | #4FBF86        | Eligible, matched, passed                      |
| `--warning`        | #A85B0A                                         | #E0A24A        | Partial, needs review, unknown                 |
| `--danger`         | #B42318                                         | #F07167        | Missing, not eligible, errors                  |
| `--chart-1..6`     | #1F5A7A #4C8F6B #C98A3A #7D5BA6 #B5524A #6A7A8C | +10% lightness | Max 6 series                                   |

### Type, spacing, shape

- Inter 400/500/600 with `font-feature-settings: "tnum", "cv11"`. JetBrains Mono for roll numbers, IDs, code.
- Sizes: 12 / 13 / 14 (base) / 16 / 20 / 24 px. Nothing above 24 px inside the app (auth pages may use 28).
- 4 px spacing grid. Radius: 6 px (cards, buttons), 4 px (inputs, badges).
- Borders separate things; shadow only on popovers/dialogs (`0 4px 16px rgb(0 0 0 / 0.08)`).

### Layout

- App shell: 240 px left sidebar (role-specific nav, collapsible to 64 px icons), 56 px top bar
  (global search, notifications, theme toggle, account menu).
- Page header: breadcrumb → title (20 px, 600) → optional one-line description; at most ONE primary
  action, right-aligned. Content max width 1280 px, left-aligned.
- Tables: 40 px rows, sticky header, numbers right-aligned with tabular figures.
- Mobile: sidebar becomes a sheet; tables become stacked rows below 768 px.

### Components and states

- Restyle shadcn primitives to the tokens; keep them in `components/ui`.
- Shared composites in `components/`: `PageHeader`, `DataTable`, `StatCard`, `FilterBar`,
  `EmptyState`, `ErrorState`, `ChartCard`, `StatusBadge`, `SectionTabs`.
- Status = `StatusBadge` (small dot + sentence-case label). Never colour alone — always a label.
- Every data view has three designed states: loading (skeleton matching layout), empty, error.
- `EmptyState`: a 20 px lucide icon in `--text-muted`, a short title ("No assessments yet"), one
  plain sentence on what will appear here, and an action button only if the user can act now.
- Accessibility: visible focus ring (`--primary`, 2 px), labels on every input, keyboard-navigable
  menus and dialogs, contrast AA.

### Copy

- Sentence case everywhere. Labels are nouns ("Skill gap"), buttons are verbs ("Analyze resume").
- Plain and specific. Explain limitations honestly (e.g. proctoring alerts are "for review, not proof").

---

## Authentication spec (must be complete)

- Roles: `STUDENT`, `FACULTY`, `TP_HEAD`, `ADMIN`, `RECRUITER`.
- Students self-register (name, college email, roll no, department, graduation year, password).
  Other roles are created by an admin; first admin comes from seed/env.
- Passwords: BCrypt (strength 12); min 8 chars with a letter and a number.
- Access token: JWT, 15 min, held in memory on the client (not localStorage).
- Refresh token: opaque random, 7 days, **httpOnly Secure SameSite=Strict cookie**, stored hashed
  in `refresh_token` table, rotated on every refresh, revoked on logout; reuse of a revoked token
  revokes the whole family.
- Endpoints: `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout`, `/forgot-password`,
  `/reset-password`; `GET /api/v1/me`; `POST /api/v1/me/password`.
- Reset tokens: single-use, 30 min, stored hashed; email sent via SMTP (Mailpit in dev).
  `forgot-password` always returns 202 (no account enumeration).
- Login rate-limit: 5 failed attempts per 15 min per account+IP → 429.
- Web: `AuthProvider` + silent refresh on load and on 401 (one retry); route guards by role;
  each role lands on its home (`/s`, `/f`, `/tp`, `/admin`, `/r`); wrong role → `/403`.
- Errors use RFC 9457 problem+json; the UI maps them to field errors or a toast.

## Resume analyzer spec

Full design in `docs/resume-analyzer.md`. Summary:

1. Normalize text (200–20,000 chars). 2. Segment sections by heading synonyms.
2. Extract contact, education, CGPA, project titles (regex).
3. Extract skills with spaCy PhraseMatcher over `ai-service/data/skills_taxonomy.json`
   (canonical name, category, aliases); RapidFuzz ≥ 90 → marked `possible`.
4. Evidence strength: `listed` (skills section only, 0.5) or `applied` (used in project/experience, 1.0).
5. Compare with `roles.json` (role → skills with importance core 3 / important 2 / bonus 1).
6. Readiness = Σ(weight × strength) ÷ Σ(weight) × 100, always shown with its breakdown.
7. Rule-based suggestions, each with a reason.

- **Never invent a skill.** Every reported skill carries the snippet and character offsets it came from.
- Resume text is never logged.
- Spring Boot exposes `POST /api/v1/resumes/analyze`, `GET /api/v1/resumes/analyses`,
  `GET /api/v1/resumes/analyses/{id}`, `PATCH /api/v1/resumes/analyses/{id}/skills`, `GET /api/v1/roles`;
  it calls the FastAPI service on the internal network and stores results in `resume_analysis` (JSONB).

---

## Conventions

- **Web**: feature folders under `src/features/<domain>`; API calls only through `src/lib/api`
  - TanStack Query hooks; types generated from the API's OpenAPI spec (`pnpm gen:api`).
    No `any`. Components < 200 lines; split otherwise.
- **API**: package by feature (`auth`, `user`, `student`, `resume`, `role`, `common`); DTOs are
  records; validation with Bean Validation; no entities in responses; service-layer tests + one
  Testcontainers integration test per controller.
- **AI service**: pure functions per pipeline stage; Pydantic schemas in `schemas.py`;
  fixture-based tests in `tests/fixtures`.
- Secrets only from env vars; `.env.example` lists every variable with no values.

## Git workflow

- Never commit to `main` directly after the initial scaffold: work on `feat/<scope>-<topic>` branches.
- Conventional Commits: `type(scope): imperative summary` (≤ 72 chars).
  Types: feat, fix, refactor, style, test, docs, chore, ci. Scopes: web, api, ai, db, docs, ci.
- Commit after every working unit (a component, a page, an endpoint, a migration) — small commits.
- Before each commit: web `pnpm lint && pnpm typecheck && pnpm test`; api `./mvnw verify`;
  ai `uv run pytest`. Fix failures before committing.

## Definition of done (every task)

1. Matches the design system above (re-read "Banned").
2. Loading, empty and error states exist.
3. Works at 375 px and 1280 px, light and dark.
4. Lint, typecheck and tests pass.
5. Committed with a Conventional Commit message; summarize what changed and what's next.
