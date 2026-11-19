# Security notes

What the project does for security, what was checked for v0.1.0, and what a deployment must still do.

## Authentication and sessions

- Passwords are hashed with BCrypt at strength 12. The minimum is 8 characters with a letter and a number.
- Access tokens are JWTs that last 15 minutes and live in memory in the browser, never in storage.
- Refresh tokens are random, last 7 days, travel in an `httpOnly`, `Secure`, `SameSite=Strict`
  cookie, and are stored only as hashes. Each refresh rotates the token.
- Reusing a token that has already been rotated ends the whole session, because it means the token
  was copied. The one exception is a token rotated less than 10 seconds ago
  (`app.auth.refresh-grace`), which covers two tabs refreshing together. Reuse of a token that
  logout or a revocation killed, or for a deactivated account, always ends the session.
- Deactivating an account revokes all its refresh tokens, and a per-request check makes its access
  token stop working straight away.
- Reset and set-password links are single-use, stored hashed, and expire (30 minutes and 24 hours).
  An administrator never sees a password or a link.
- Five failed sign-ins in 15 minutes lock sign-in for that account and address.

## Authorization

The API's access rules are one list (`AccessRules`). The security configuration is built from it,
and so is the permission matrix on the admin roles screen, so the screen cannot disagree with what
is enforced. A test calls each rule once per role and checks that it lets the right roles through.

## Response headers

| Where | Header | Value |
| --- | --- | --- |
| API | `X-Content-Type-Options` | `nosniff` |
| API | `X-Frame-Options` | `DENY` |
| API | `Referrer-Policy` | `no-referrer` |
| API (`/api/**`) | `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` |
| Web build | `Content-Security-Policy` (meta tag in `index.html`) | see below |

The Swagger UI pages are not given the API policy, because they need their own scripts. Turn them
off in production (`springdoc.api-docs.enabled=false`, `springdoc.swagger-ui.enabled=false`).

### Web Content-Security-Policy

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self';
media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'
```

No inline scripts and no `eval`. The relaxations, and why:

- `style-src 'unsafe-inline'`: React, Radix, Recharts and the code editor set style attributes, which
  cannot carry a nonce.
- Google Fonts is the only third-party origin. Self-hosting Inter and JetBrains Mono would remove it.
- `worker-src blob:` is for the code editor's worker.

The policy is added to the production build only (the dev server needs inline scripts for hot
reload). `pnpm build && pnpm e2e:csp` serves the build and fails on any violation across a student's
screens (including the editor), the T&P charts and the admin screens. Checking it found two real
bugs that only appeared in production: the editor theme broke on a minified colour, and zod probed
for `eval` on every load.

### What the host must add

A `<meta>` tag cannot set `frame-ancestors`, `X-Frame-Options` or `Permissions-Policy`. When serving
the built web app, send these as response headers:

```
Content-Security-Policy: frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(self), microphone=(self), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Camera and microphone stay allowed for the app itself, because the pre-test device check needs them.
Serve everything over HTTPS; the refresh cookie is `Secure`.

## Dependency checks (v0.1.0)

| Ecosystem | Method | Result |
| --- | --- | --- |
| npm (web) | `pnpm audit` | See below |
| Maven (API) | 123 runtime artifacts, checked against the public OSV database | No known vulnerabilities |
| Python (analyzer) | 56 production packages, checked against OSV | No known vulnerabilities |

The OSV check was verified to find problems by also querying deliberately old versions (log4j 2.14.1,
an old Jinja2), which it flagged.

**npm findings and what was done**

| Package | Severity | Action |
| --- | --- | --- |
| `dompurify` (through `monaco-editor`) | critical, high, low | **Fixed.** `monaco-editor` pins 3.4.15; an override in `pnpm-workspace.yaml` uses 3.4.18. Remove it when Monaco updates. |
| `picomatch` (through Vite's file-globbing) | high (ReDoS) | **Not fixed: no patched version exists.** It runs only in build and dev tooling, on file patterns from our own config, never on user input and never in the shipped bundle. Re-check when a patch is published. |
| `minimatch` (through ESLint) | moderate (DoS) | **Not fixed.** Development tool only, not shipped. Clears with the next ESLint update. |

## Secrets in the repository

All 133 commits on every branch were searched. No `.env` file, key or certificate was ever
committed (only `.env.example`, which has no values), none of the real secret values from `.env`
appear anywhere in history, and no common token formats were found. The only literal passwords are
test-only values in tests (for example `Sup3rSecret`). `.env` is ignored by git.

## Known limits

- Rate limiting keys on the client address as the API sees it. Behind a reverse proxy, configure
  forwarded headers first.
- The audit log is a screen without a backend yet, so sensitive actions are not recorded for review.
- Camera and microphone are only checked locally; nothing is recorded or sent, by design.
