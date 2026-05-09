# Setup guide

Concrete one-time steps to bring this from clone to running in production. Items in **(you)** require your own credentials.

## 1. Accounts & credentials (you)

| Service | What to do | Output |
|---|---|---|
| **Neon** ([console.neon.tech](https://console.neon.tech)) | Create a project, region close to your Vercel/Cloud Run region | `DATABASE_URL` (use the *pooled* connection string) |
| **Cloudflare R2** ([dash.cloudflare.com](https://dash.cloudflare.com)) | Create a bucket (e.g. `document-repo`); create an API token with **Object Read & Write** scoped to that bucket | `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` |
| **Google OAuth** ([console.cloud.google.com](https://console.cloud.google.com)) | Create OAuth 2.0 Web client. Authorized redirects: `http://localhost:3000/api/auth/callback/google` and `https://<your-vercel-domain>/api/auth/callback/google` | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` |
| **Anthropic** ([console.anthropic.com](https://console.anthropic.com)) | Create API key. Set monthly budget alert ~$5 | `ANTHROPIC_API_KEY` |
| **Resend** ([resend.com](https://resend.com)) | Create API key. For v1 you can use the onboarding domain (`onboarding@resend.dev`); later, verify your own domain | `RESEND_API_KEY`, optional `RESEND_FROM` |
| **Google Cloud (Cloud Run)** | Create a project; enable: Cloud Run, Artifact Registry, Secret Manager, Cloud Build APIs. Set a $1 billing alert | project id |

Generate two random secrets locally:
```bash
openssl rand -base64 32        # → AUTH_SECRET
openssl rand -hex 32           # → PROCESSOR_SECRET
openssl rand -hex 32           # → CRON_SECRET
```

## 2. Database

```bash
npm install
cp .env.example apps/web/.env.local
# Fill apps/web/.env.local with everything from §1

cd apps/web
npm run db:migrate
```

This creates `documents`, `document_fields`, `reminders` tables in Neon.

## 3. Cloud Run secrets

Push secrets to Secret Manager once (one per name). Replace `MY_PROJECT`:
```bash
PROJECT=MY_PROJECT
for name in DATABASE_URL ANTHROPIC_API_KEY R2_ACCOUNT_ID R2_BUCKET \
            R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY PROCESSOR_SECRET; do
  read -s -p "$name: " val; echo
  printf '%s' "$val" | gcloud secrets create "$name" --project="$PROJECT" --data-file=- 2>/dev/null \
    || printf '%s' "$val" | gcloud secrets versions add "$name" --project="$PROJECT" --data-file=-
done
```

## 4. Deploy processor

In the Cloud Run console, create the service from the GitHub repo with a Cloud Build trigger on `services/processor/**`. Bind the secrets above via "Variables & Secrets". Note the printed URL — set `PROCESSOR_URL=<url>/process` in Vercel.

## 5. Vercel

1. Import the repo. Set **root directory** = `apps/web`.
2. Add env vars from `.env.example` (everything in the Vercel block).
3. Deploy. The cron in `apps/web/vercel.json` registers automatically.

## 6. Smoke test

1. Visit your Vercel URL; sign in with the allowlisted Google account.
2. From iPhone Safari, open the site → tap **Take photo** → snap a warranty receipt.
3. Wait ~15s; document detail page should show extracted fields.
4. Manually trigger the cron:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://<your-vercel-domain>/api/cron/check-reminders
   ```
   You should receive a digest email.

## Troubleshooting

- **`OWNER_EMAIL not set; rejecting all sign-ins`** in logs → add `OWNER_EMAIL` to Vercel env and redeploy.
- **Document stuck on `processing`** → check Cloud Run logs (`gcloud run services logs read processor --region us-central1`). Most common cause: missing secret, or Anthropic API key invalid.
- **R2 PUT 403** → token missing the bucket in its scope, or wrong `R2_ACCOUNT_ID`.
- **HEIC fails to decode** → check the processor container has `libheif1` installed (it does in the provided Dockerfile).
- **Cron not firing** → Vercel registers crons only on production deployments, not previews.
