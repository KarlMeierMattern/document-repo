# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app does

Single-user personal document tracker. Users drop images (JPEG, PNG, WEBP, HEIC, PDF) of documents like warranties, prescriptions, and insurance cards. Claude vision OCRs them, extracts structured fields, and surfaces upcoming reminders on a dashboard with a daily email digest.

## Repo structure

```
apps/web/          Next.js 15 app deployed to Vercel
services/processor/  FastAPI service deployed to Google Cloud Run
```

No shared packages — the two services communicate only over HTTP.

## Commands

### Web app (`apps/web/`)

```bash
# From repo root
npm install          # install all deps (root workspace + web)
npm run dev          # start Next.js dev server → http://localhost:3000
npm run build        # production build
npm run lint         # ESLint

# Database
npm run db:generate  # generate Drizzle migrations from schema changes
npm run db:migrate   # run migrations against Neon (uses DATABASE_URL)
npm run db:studio    # open Drizzle Studio UI
```

### Processor (`services/processor/`)

```bash
cd services/processor
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../../.env.example .env   # fill processor section
uvicorn main:app --reload --port 8080
```

Set `PROCESSOR_URL=http://localhost:8080/process` in `apps/web/.env.local` for end-to-end local testing.

## Architecture

### Upload & processing flow

1. Browser calls `POST /api/uploads/presign` → gets a presigned R2 PUT URL + `documentId`
2. Browser PUTs file directly to Cloudflare R2
3. Browser calls `POST /api/documents/[id]/process` → Next.js fires a request to the processor (15 s timeout, fire-and-forget)
4. Processor (`services/processor/main.py`) downloads from R2, runs two Claude vision calls (classify → extract), writes fields + reminders to Neon, sets `status = "processed"`
5. Browser polls `GET /api/documents/[id]` until status changes

### Processor extraction pipeline

`extractors/__init__.py:classify_and_extract` runs two sequential Claude tool-use calls:
1. **Classify** — `classifier.py` identifies the `doc_type` (one of 13 types)
2. **Extract** — the matching extractor module (e.g. `warranty.py`, `prescription.py`) runs with a type-specific system prompt and Anthropic tool definition

Each extractor module exports `NAME`, `SYSTEM_PROMPT`, `TOOL`, and `transform(parsed) → (fields, reminders)`. The `_common.py` helpers (`field()`, `reminder()`, `compact()`) build the dicts written to Neon.

`claude_client.py:call_vision_tool` sends prompt-cached system prompts and tool definitions to reduce cost on repeated same-type extractions.

### Database schema (Drizzle / Neon Postgres)

Three tables in `apps/web/drizzle/schema.ts`:
- `documents` — one row per uploaded file; `status` cycles: `uploaded → processing → processed | failed`
- `document_fields` — key/value rows extracted per document
- `reminders` — date-based reminders per document; `status`: `pending | sent | dismissed`

### Auth

Single-user: Next Auth v5 with Google OAuth. Only the email matching `OWNER_EMAIL` env var is allowed (`lib/auth.ts`). Middleware (`middleware.ts`) protects all routes except `/sign-in`, `/api/auth/*`, and `/api/cron/*`.

### Cron

Vercel cron fires `GET /api/cron/check-reminders` daily at 09:00 UTC. It sends a Resend email digest of upcoming/overdue reminders. Authenticated with `CRON_SECRET` header.

## Key environment variables

**Web (Vercel / `apps/web/.env.local`):**
- `DATABASE_URL` — Neon pooled connection string
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` — Google OAuth credentials
- `AUTH_SECRET` — NextAuth JWT secret (`openssl rand -base64 32`)
- `OWNER_EMAIL` — the single allowed sign-in email
- `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- `PROCESSOR_URL` — full URL to processor `/process` endpoint
- `PROCESSOR_SECRET` — shared secret for web→processor auth
- `CRON_SECRET` — secret for the Vercel cron route
- `RESEND_API_KEY`, `RESEND_FROM`

**Processor (Cloud Run secrets / `services/processor/.env`):**
- `DATABASE_URL`, `ANTHROPIC_API_KEY`, `PROCESSOR_SECRET`
- `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- `DEFAULT_MODEL` (default: `claude-haiku-4-5-20251001`), `HIGH_QUALITY_MODEL` (default: `claude-sonnet-4-6`)

## Adding a new document type

1. Create `services/processor/extractors/<type>.py` — define `NAME`, `SYSTEM_PROMPT`, `TOOL`, and `transform()`
2. Register it in `extractors/__init__.py` REGISTRY
3. Add the `NAME` string to `classifier.py`'s tool definition enum
4. Add it to `DOC_TYPES` in `apps/web/drizzle/schema.ts`

## Deployment

- **Web**: push `main` → Vercel auto-deploys (root dir = `apps/web`)
- **Processor**: Cloud Build trigger on `services/processor/**` changes → Cloud Run; secrets bound from Google Secret Manager
