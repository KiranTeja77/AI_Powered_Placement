# v0.1.0: Milestone 1

Every screen for every role, and a real backend for accounts, the role catalogue and the resume
analyzer. Everything else is a finished screen with an honest empty state and no invented data.

## Real

- Student registration, sign-in, rotating refresh cookies, password reset, role-based guards and API
  authorization, login rate limiting, security headers and a Content-Security-Policy.
- Resume analyzer (text input): sections, skills with the words they came from, skill gap per role,
  suggestions with reasons, editing and history.
- Role and skill catalogue (14 roles, 453 skills) and career interests.
- Administration: create staff accounts by emailed invite, resend invites, deactivate, overview
  counts and a permission matrix built from the rules the API enforces.

## UI only

Training, assessments and the test player, results, faculty tools, T&P drives and eligibility
layouts, recruiter screens, notifications. Proctoring is consent, device check and layout only.

## Release checks

Web lint, typecheck, unit tests and build; API `verify`; analyzer tests; full Playwright suite
(flows, a design audit at 375, 768 and 1280 px in light and dark, axe on every route, keyboard-only
flows); production CSP check. See [milestone-1-status.md](milestone-1-status.md) and
[security.md](security.md).
