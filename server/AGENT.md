# AGENT.md (server)

Applies to `server/`. Root `AGENTS.md` rules apply first; this file tightens them for the
backend package.

## 1. Architecture

This is a Hono (TypeScript) HTTP API backed by Drizzle ORM.

Layers:

- `src/config/`    Load and validate all env vars (zod). No other file reads `process.env`.
- `src/db/`        Drizzle schema, migration scripts, query helpers. No business logic here.
- `src/services/`  Business logic: sentence import, full-text search, tokenization (kuromoji).
- `src/routes/`    Thin Hono handlers: validate input, call a service, return JSON. Max 30 lines each.
- `src/lib/`       Generic helpers (logger, error classes). No domain knowledge.

Dependency direction (hard rule):

```
lib  <-- db  <-- services  <-- routes
```

`routes` must never call `db` directly. `db` must never call `services`.

## 2. Project layout

```
server/
  src/
    config/
      env.ts           — zod env schema, validated at startup
    db/
      schema.ts        — Drizzle table definitions (single source of truth)
      client.ts        — db connection singleton
      migrate.ts       — migration runner entrypoint
      seed.ts          — optional seed data
    routes/
      sentences.ts     — GET /api/v1/sentences, POST /api/v1/sentences/import
      index.ts         — Hono app assembly and route registration
      types.ts         — request/response interface types (mirrored in src/types/api.ts)
    services/
      sentenceService.ts   — CRUD and import logic
      searchService.ts     — FTS query building
    lib/
      logger.ts
      errors.ts
  tests/
    sentences.test.ts
  package.json
  tsconfig.json
```

## 3. File size limits

- No file over 200 lines. Route files target 30-50 lines.
- No function over 40 lines. Extract helpers.

## 4. Route handler rules

A route handler must only:

1. Parse and validate the request (zod).
2. Call exactly one service method.
3. Return a typed JSON response.

If a handler needs more, move the logic into a service.

## 5. Database rules

- Drizzle schema in `db/schema.ts` is the single source of truth.
- Schema changes require a migration file — never hand-edit the SQLite file directly.
- SQLite for local dev; same Drizzle schema works with PostgreSQL driver for production.
- No raw SQL outside `db/`. Use Drizzle query builder everywhere.

## 6. Sentence import format

The `.txt` import format is JP/EN paired lines (same format the frontend Reader already
understands). The import service must use the same `parsePairs` logic from `src/lib/reader.ts`
or a copy of it — do not duplicate the parsing logic with different behavior.

## 7. Search

- SQLite FTS5 virtual table for full-text search across `japanese` and `english` columns.
- Kuromoji (already in the repo as a web worker asset) may be loaded server-side for
  morphological tokenization of search queries. Keep it behind `services/searchService.ts`.

## 8. Testing expectations

- All `services/` must have unit tests with a real (in-memory) SQLite database.
- Route tests use `app.request(...)` (Hono test helper) — no live HTTP server.
- No test may touch the filesystem or network.

## 9. PR acceptance checklist

A server PR is not acceptable unless:

- No `process.env` calls outside `config/env.ts`.
- No raw SQL outside `db/`.
- Route handlers call exactly one service.
- New service logic has unit tests.
- `npm run build` and `npm run test` in `server/` pass clean.
- `types.ts` in `routes/` and `src/types/api.ts` in the frontend are kept in sync.
