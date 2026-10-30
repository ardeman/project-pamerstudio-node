#!/usr/bin/env bash
# Builds the render image with Cloud Build (no Docker needed here) and points
# the Cloud Run Job `render` at it. The first run also turns on the APIs and
# makes the image repository and the job's service account. Usage:
#   cloud/build.sh          # build, then update the job
#   gcloud run jobs execute render --region asia-southeast2 --wait   # runs cloud/check.mjs
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT=pamer-studio
REGION=asia-southeast2
IMAGE="$REGION-docker.pkg.dev/$PROJECT/render/render"
SA="render-job@$PROJECT.iam.gserviceaccount.com"
g() { gcloud --project "$PROJECT" --quiet "$@"; }

g services enable artifactregistry.googleapis.com cloudbuild.googleapis.com run.googleapis.com
g artifacts repositories describe render --location "$REGION" >/dev/null 2>&1 ||
  g artifacts repositories create render --location "$REGION" --repository-format docker \
    --description 'Pamer Studio render image'
# Keep only the newest images, so old ones don't add to Storage costs.
g artifacts repositories set-cleanup-policies render --location "$REGION" --policy /dev/stdin <<'EOF'
[{"name": "keep-3", "action": {"type": "Keep"}, "mostRecentVersions": {"keepCount": 3}},
 {"name": "delete-rest", "action": {"type": "Delete"}, "condition": {"tagState": "ANY"}}]
EOF
# No roles yet: the job reads nothing until its inputs are in Storage.
g iam service-accounts describe "$SA" >/dev/null 2>&1 ||
  g iam service-accounts create render-job --display-name 'Pamer Studio render job'

g builds submit --region "$REGION" --config cloud/cloudbuild.yaml --substitutions "_IMAGE=$IMAGE" .

if g run jobs describe render --region "$REGION" >/dev/null 2>&1; then
  g run jobs update render --region "$REGION" --image "$IMAGE"
else
  g run jobs create render --region "$REGION" --image "$IMAGE" --service-account "$SA" \
    --cpu 2 --memory 4Gi --task-timeout 1h --max-retries 0
fi
