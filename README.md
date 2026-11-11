# PlaceWise

AI-powered placement preparation and recruitment system. See [CLAUDE.md](CLAUDE.md) for scope,
design system and conventions.

## Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | 22+ |
| pnpm | 12 |
| JDK | 21 (Temurin) with `JAVA_HOME` set |
| uv | 0.10+ (installs Python 3.12 for `apps/ai-service`) |
| Docker Desktop | running, for Postgres, Mailpit and Testcontainers |

## Setup

```sh
cp .env.example .env        # then fill in every value
```

## Run

Infrastructure (Postgres, Mailpit):

```sh
docker compose up -d postgres mailpit
```

Each app, in its own terminal:

```sh
# web  -> http://localhost:5173
cd apps/web && pnpm install && pnpm dev

# api  -> http://localhost:8080/api/v1/health
cd apps/api && ./mvnw spring-boot:run

# ai-service -> http://localhost:8000/health
cd apps/ai-service && uv sync && uv run uvicorn app.main:app --port 8000
```

Or the full backend stack: `docker compose up --build`. The AI service is on an internal network
and is reachable only from the API container.

Mailpit UI: http://localhost:8025

## Checks

```sh
cd apps/web && pnpm lint && pnpm typecheck && pnpm test
cd apps/api && ./mvnw verify
cd apps/ai-service && uv run ruff check . && uv run mypy app && uv run pytest
```

## API

- OpenAPI document: http://localhost:8080/v3/api-docs, Swagger UI: http://localhost:8080/swagger-ui.html
- The first admin is created at startup from `ADMIN_EMAIL` and `ADMIN_PASSWORD` if no such account exists.
- `JWT_SECRET` must be at least 32 bytes; the API refuses to start without it.
- The refresh cookie is `Secure`, so use `http://localhost` (browsers treat it as a secure context) or HTTPS.
- Rate limiting keys on the client IP as seen by the API. Behind a reverse proxy, configure forwarded headers first.

## Web

- `pnpm gen:api` regenerates `src/lib/api/schema.d.ts` from the running API's OpenAPI document.
- In development Vite proxies `/api` to `http://localhost:8080`, so the app and API share an origin.
- `pnpm e2e` runs the Playwright tests. They need the API and Postgres running
  (`docker compose up -d`) and install their browser once with `pnpm exec playwright install chromium`.
  `e2e/design-audit.spec.ts` also writes screenshots to `apps/web/e2e/screenshots` (not committed).
