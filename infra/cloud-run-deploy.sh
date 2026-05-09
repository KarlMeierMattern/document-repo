#!/usr/bin/env bash
# Deploy services/processor to Google Cloud Run.
#
# Requires:
#   - gcloud installed and `gcloud auth login` done
#   - secrets pre-created in Secret Manager:
#       DATABASE_URL, ANTHROPIC_API_KEY, R2_ACCOUNT_ID, R2_BUCKET,
#       R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, PROCESSOR_SECRET
#
# Usage:  GCP_PROJECT=my-project REGION=us-central1 ./infra/cloud-run-deploy.sh
set -euo pipefail

PROJECT="${GCP_PROJECT:?set GCP_PROJECT}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-processor}"

cd "$(dirname "$0")/../services/processor"

# Grant Secret Manager access to the Cloud Run runtime service account
# (default Compute Engine SA). Idempotent.
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
echo "→ granting secretmanager.secretAccessor to $RUNTIME_SA"
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None \
  --quiet >/dev/null

echo "→ deploying $SERVICE to project=$PROJECT region=$REGION"

gcloud run deploy "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --source . \
  --no-allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --concurrency 4 \
  --timeout 300 \
  --max-instances 3 \
  --min-instances 0 \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest" \
  --set-secrets "ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest" \
  --set-secrets "R2_ACCOUNT_ID=R2_ACCOUNT_ID:latest" \
  --set-secrets "R2_BUCKET=R2_BUCKET:latest" \
  --set-secrets "R2_ACCESS_KEY_ID=R2_ACCESS_KEY_ID:latest" \
  --set-secrets "R2_SECRET_ACCESS_KEY=R2_SECRET_ACCESS_KEY:latest" \
  --set-secrets "PROCESSOR_SECRET=PROCESSOR_SECRET:latest"

# Allow Vercel to invoke /process. Cloud Run requires either OIDC token
# (recommended) or unauthenticated. We use a shared-secret header at the app
# layer, so it's safe to allow public ingress here.
gcloud run services add-iam-policy-binding "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --member="allUsers" \
  --role="roles/run.invoker"

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
echo "✓ deployed: $URL"
echo "  PROCESSOR_URL=$URL/process  (set this in Vercel env)"
