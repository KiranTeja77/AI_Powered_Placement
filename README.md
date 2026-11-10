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
