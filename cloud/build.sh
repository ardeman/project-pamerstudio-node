#!/usr/bin/env bash
# Builds the render image with Cloud Build (no Docker needed here) and points
# the Cloud Run Job `render` at it, then deploys the function that starts it
# for the web page (cloud/trigger). The first run also turns on the APIs and
# makes the image repository, the service accounts and the ElevenLabs key's
# secret (from .env; never printed). Usage:
#   cloud/build.sh          # build, then update the job and the trigger
#   gcloud run jobs execute render --region asia-southeast2 --wait   # runs cloud/check.mjs
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT=pamer-studio
REGION=asia-southeast2
IMAGE="$REGION-docker.pkg.dev/$PROJECT/render/render"
SA="render-job@$PROJECT.iam.gserviceaccount.com"
TRIGGER_SA="render-trigger@$PROJECT.iam.gserviceaccount.com"
g() { gcloud --project "$PROJECT" --quiet "$@"; }

g services enable artifactregistry.googleapis.com cloudbuild.googleapis.com run.googleapis.com \
  secretmanager.googleapis.com cloudfunctions.googleapis.com eventarc.googleapis.com
g artifacts repositories describe render --location "$REGION" >/dev/null 2>&1 ||
  g artifacts repositories create render --location "$REGION" --repository-format docker \
    --description 'Pamer Studio render image'
# Keep only the newest images, so old ones don't add to Storage costs.
g artifacts repositories set-cleanup-policies render --location "$REGION" --policy /dev/stdin <<'EOF'
[{"name": "keep-3", "action": {"type": "Keep"}, "mostRecentVersions": {"keepCount": 3}},
 {"name": "delete-rest", "action": {"type": "Delete"}, "condition": {"tagState": "ANY"}}]
EOF
g iam service-accounts describe "$SA" >/dev/null 2>&1 ||
  g iam service-accounts create render-job --display-name 'Pamer Studio render job'
# Reads its inputs and writes new clips back (cloud/inputs.mjs).
g storage buckets add-iam-policy-binding gs://pamer-studio.firebasestorage.app \
  --member "serviceAccount:$SA" --role roles/storage.objectUser >/dev/null
# Reads the request and writes its price, status and files (cloud/render.mjs).
g projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$SA" --role roles/datastore.user --condition None >/dev/null
# The ElevenLabs key, read by the job only. Catat Saja's renders call no fal.ai.
if ! g secrets describe elevenlabs-api-key >/dev/null 2>&1; then
  grep '^ELEVENLABS_API_KEY=' .env | cut -d= -f2- | tr -d '"'"'"'\n' |
    g secrets create elevenlabs-api-key --replication-policy automatic --data-file -
fi
g secrets add-iam-policy-binding elevenlabs-api-key --member "serviceAccount:$SA" --role roles/secretmanager.secretAccessor >/dev/null

g builds submit --region "$REGION" --config cloud/cloudbuild.yaml --substitutions "_IMAGE=$IMAGE" .

SECRETS=ELEVENLABS_API_KEY=elevenlabs-api-key:latest
if g run jobs describe render --region "$REGION" >/dev/null 2>&1; then
  g run jobs update render --region "$REGION" --image "$IMAGE" --set-secrets "$SECRETS"
else
  g run jobs create render --region "$REGION" --image "$IMAGE" --service-account "$SA" \
    --cpu 2 --memory 4Gi --task-timeout 1h --max-retries 0 --set-secrets "$SECRETS"
fi

# The trigger: Firestore (asia-southeast2, like the database) calls it on every
# write to renders/<id>; it claims the request and starts the job.
g iam service-accounts describe "$TRIGGER_SA" >/dev/null 2>&1 ||
  g iam service-accounts create render-trigger --display-name 'Pamer Studio render trigger'
for role in roles/datastore.user roles/eventarc.eventReceiver; do
  g projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$TRIGGER_SA" --role "$role" --condition None >/dev/null
done
# Starts the job with its own variables, as the job's account.
g run jobs add-iam-policy-binding render --region "$REGION" --member "serviceAccount:$TRIGGER_SA" --role roles/run.developer >/dev/null
g iam service-accounts add-iam-policy-binding "$SA" --member "serviceAccount:$TRIGGER_SA" --role roles/iam.serviceAccountUser >/dev/null
g functions deploy render-trigger --gen2 --region "$REGION" --runtime nodejs22 --source cloud/trigger \
  --entry-point trigger --service-account "$TRIGGER_SA" --trigger-service-account "$TRIGGER_SA" \
  --trigger-location "$REGION" --trigger-event-filters type=google.cloud.firestore.document.v1.written \
  --trigger-event-filters database='(default)' --trigger-event-filters-path-pattern document='renders/{id}' \
  --memory 256Mi --max-instances 1 --concurrency 1 --no-allow-unauthenticated
g run services add-iam-policy-binding render-trigger --region "$REGION" --member "serviceAccount:$TRIGGER_SA" --role roles/run.invoker >/dev/null
