# Personal Documents Tracking App

Drop images of warranties, prescriptions, insurance cards, invoices, lab results, and more — Claude vision OCR's and itemizes them, the dashboard surfaces upcoming reminders, and a daily email digest nags you about what's expiring.

Single-user. Persistent free-tier stack: Vercel + Neon + Cloudflare R2 + Google Cloud Run + Resend + Anthropic Claude.

See `/Users/alexander/.claude/plans/help-create-a-plan-sprightly-brook.md` for the full plan and execution checklist.

## Architecture

```
iPhone / Browser
   │
   ▼
Vercel (Next.js)  ── presigned PUT ──►  Cloudflare R2
   │
   └─ POST /process ──► Google Cloud Run (Python + Claude vision)
                                │
                                ▼
                          Neon Postgres

Vercel Cron (daily) ──► /api/cron/check-reminders ──► Resend digest
```

## Repo layout

```
apps/web/             Next.js 15 app (Vercel)
services/processor/   FastAPI service (Google Cloud Run)
infra/                Deploy scripts
.github/workflows/    CI for processor deploy
```

## Local development

Requires Node 20+, npm, Python 3.11+, Docker (for processor).

```bash
# 1. Install web deps
npm install

# 2. Copy env template and fill in values
cp .env.example apps/web/.env.local
# (See .env.example for which vars come from which service)

# 3. Run migrations against Neon
npm run db:migrate

# 4. Start web app
npm run dev
# → http://localhost:3000

# 5. (Separate terminal) Run processor locally
cd services/processor
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../../.env.example .env
# (Fill processor section)
uvicorn main:app --reload --port 8080
```

Point `PROCESSOR_URL` in `apps/web/.env.local` at `http://localhost:8080/process` for end-to-end local testing.

## Deploy

- **Web**: push to `main` → Vercel deploys automatically (set env vars in Vercel dashboard).
- **Processor**: GitHub Actions workflow on push to `main` when `services/processor/**` changes. See `infra/cloud-run-deploy.sh` for manual deploy.

## License

Private / personal use.
