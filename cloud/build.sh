#!/usr/bin/env bash
# Builds the render/sync image with Cloud Build (no Docker needed here) and
# points the Cloud Run Jobs `render` and `sync` at it, then deploys the
# functions that start them for the web page, plus a Cloud Scheduler cron for
# Dashboard freshness. The first run also turns on the APIs and makes the image
# repository, the service accounts and secrets (from .env / .secrets; never
# printed). Usage:
#   cloud/build.sh          # build, then update jobs, triggers and scheduler
# Ask before running: this changes cloud (image, jobs, triggers, secrets).
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT=pamer-studio
REGION=asia-southeast2
IMAGE="$REGION-docker.pkg.dev/$PROJECT/render/render"
SA="render-job@$PROJECT.iam.gserviceaccount.com"
TRIGGER_SA="render-trigger@$PROJECT.iam.gserviceaccount.com"
SYNC_TRIGGER_SA="sync-trigger@$PROJECT.iam.gserviceaccount.com"
SCHEDULER_SA="sync-scheduler@$PROJECT.iam.gserviceaccount.com"
g() { gcloud --project "$PROJECT" --quiet "$@"; }

# Read a value from .env without printing it.
env_val() {
  local var=$1
  grep "^$var=" .env 2>/dev/null | cut -d= -f2- | tr -d '"'"'"'\n' || true
}

# Create a secret from stdin if missing; always grant the render/sync SA access.
ensure_secret() {
  local secret=$1
  if ! g secrets describe "$secret" >/dev/null 2>&1; then
    g secrets create "$secret" --replication-policy automatic --data-file -
  else
    cat >/dev/null
  fi
  g secrets add-iam-policy-binding "$secret" --member "serviceAccount:$SA" --role roles/secretmanager.secretAccessor >/dev/null
}

# Seed a secret from .env when the secret does not exist yet.
seed_env_secret() {
  local secret=$1 var=$2
  local val
  val=$(env_val "$var")
  if [[ -z "$val" ]]; then
    echo "skip $secret ($var empty in .env)"
    return 0
  fi
  if g secrets describe "$secret" >/dev/null 2>&1; then
    g secrets add-iam-policy-binding "$secret" --member "serviceAccount:$SA" --role roles/secretmanager.secretAccessor >/dev/null
    return 0
  fi
  printf '%s' "$val" | ensure_secret "$secret"
  echo "created $secret from .env"
}

# Seed a secret from a file path (Mac path or value of an env var that is a path).
seed_file_secret() {
  local secret=$1 path=$2
  if [[ -z "$path" || ! -f "$path" ]]; then
    echo "skip $secret (file missing)"
    return 0
  fi
  if g secrets describe "$secret" >/dev/null 2>&1; then
    g secrets add-iam-policy-binding "$secret" --member "serviceAccount:$SA" --role roles/secretmanager.secretAccessor >/dev/null
    return 0
  fi
  ensure_secret "$secret" < "$path"
  echo "created $secret from file"
}

g services enable artifactregistry.googleapis.com cloudbuild.googleapis.com run.googleapis.com \
  secretmanager.googleapis.com cloudfunctions.googleapis.com eventarc.googleapis.com \
  cloudscheduler.googleapis.com
g artifacts repositories describe render --location "$REGION" >/dev/null 2>&1 ||
  g artifacts repositories create render --location "$REGION" --repository-format docker \
    --description 'Pamer Studio render image'
# Keep only the newest images, so old ones don't add to Storage costs.
g artifacts repositories set-cleanup-policies render --location "$REGION" --policy /dev/stdin <<'EOF'
[{"name": "keep-3", "action": {"type": "Keep"}, "mostRecentVersions": {"keepCount": 3}},
 {"name": "delete-rest", "action": {"type": "Delete"}, "condition": {"tagState": "ANY"}}]
EOF
g iam service-accounts describe "$SA" >/dev/null 2>&1 ||
  g iam service-accounts create render-job --display-name 'Pamer Studio render/sync job'
# Reads its inputs and writes new clips back (cloud/inputs.mjs).
g storage buckets add-iam-policy-binding gs://pamer-studio.firebasestorage.app \
  --member "serviceAccount:$SA" --role roles/storage.objectUser >/dev/null
# Reads/writes Firestore (renders, dashboard, services, syncs, projects).
g projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$SA" --role roles/datastore.user --condition None >/dev/null
# List secret versions for Services age chips.
g projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$SA" --role roles/secretmanager.viewer --condition None >/dev/null

# --- Secrets (created once from .env / .secrets; later updates: gcloud secrets versions add) ---
for pair in elevenlabs-api-key:ELEVENLABS_API_KEY fal-api-key:FAL_API_KEY; do
  secret=${pair%%:*} var=${pair#*:}
  seed_env_secret "$secret" "$var"
done

seed_env_secret admob-oauth-client-id ADMOB_OAUTH_CLIENT_ID
seed_env_secret admob-oauth-client-secret ADMOB_OAUTH_CLIENT_SECRET
seed_env_secret admob-publisher-id ADMOB_PUBLISHER_ID
if [[ -f .secrets/admob-token.json ]]; then
  refresh=$(node -e "const t=require('./.secrets/admob-token.json'); process.stdout.write(t.refresh_token||'')")
  if [[ -n "$refresh" ]]; then
    if ! g secrets describe admob-refresh-token >/dev/null 2>&1; then
      printf '%s' "$refresh" | ensure_secret admob-refresh-token
      echo "created admob-refresh-token from .secrets/"
    else
      g secrets add-iam-policy-binding admob-refresh-token --member "serviceAccount:$SA" --role roles/secretmanager.secretAccessor >/dev/null
    fi
  fi
else
  echo "skip admob-refresh-token (.secrets/admob-token.json missing — run node shared/cloud.mjs admob-login)"
fi

seed_env_secret asc-issuer-id ASC_ISSUER_ID
seed_env_secret asc-key-id ASC_KEY_ID
seed_env_secret asc-vendor-number ASC_VENDOR_NUMBER
seed_env_secret asc-app-ids ASC_APP_IDS
asc_path=$(env_val ASC_PRIVATE_KEY_PATH)
if [[ -n "$asc_path" && ! "$asc_path" = /* ]]; then asc_path="$PWD/$asc_path"; fi
seed_file_secret asc-private-key "${asc_path:-}"

seed_env_secret play-package-names PLAY_PACKAGE_NAMES
seed_env_secret play-earnings-bucket PLAY_EARNINGS_BUCKET
play_path=$(env_val PLAY_SERVICE_ACCOUNT_JSON)
if [[ -n "$play_path" && "$play_path" != \{* ]]; then
  if [[ ! "$play_path" = /* ]]; then play_path="$PWD/$play_path"; fi
  seed_file_secret play-service-account-json "$play_path"
elif [[ -n "$play_path" && "$play_path" = \{* ]]; then
  if ! g secrets describe play-service-account-json >/dev/null 2>&1; then
    printf '%s' "$play_path" | ensure_secret play-service-account-json
    echo "created play-service-account-json from .env inline JSON"
  else
    g secrets add-iam-policy-binding play-service-account-json --member "serviceAccount:$SA" --role roles/secretmanager.secretAccessor >/dev/null
  fi
else
  echo "skip play-service-account-json"
fi

# Midtrans (Dahlunas): optional cross-project read. Fails softly if you have no access.
g projects add-iam-policy-binding dah-lunas --member "serviceAccount:$SA" --role roles/datastore.viewer --condition None >/dev/null 2>&1 \
  && echo "granted datastore.viewer on dah-lunas" \
  || echo "note: could not grant dah-lunas access to $SA (grant manually for Midtrans sync)"

g builds submit --region "$REGION" --config cloud/cloudbuild.yaml --substitutions "_IMAGE=$IMAGE" .

# Secrets mounted into both jobs. Optional ones are omitted when missing.
SECRETS="ELEVENLABS_API_KEY=elevenlabs-api-key:latest,FAL_API_KEY=fal-api-key:latest"
add_secret_env() {
  local env_name=$1 secret=$2
  if g secrets describe "$secret" >/dev/null 2>&1; then
    SECRETS="$SECRETS,$env_name=$secret:latest"
  fi
}
add_secret_env ADMOB_OAUTH_CLIENT_ID admob-oauth-client-id
add_secret_env ADMOB_OAUTH_CLIENT_SECRET admob-oauth-client-secret
add_secret_env ADMOB_PUBLISHER_ID admob-publisher-id
add_secret_env ADMOB_REFRESH_TOKEN admob-refresh-token
add_secret_env ASC_ISSUER_ID asc-issuer-id
add_secret_env ASC_KEY_ID asc-key-id
add_secret_env ASC_PRIVATE_KEY asc-private-key
add_secret_env ASC_VENDOR_NUMBER asc-vendor-number
add_secret_env ASC_APP_IDS asc-app-ids
add_secret_env PLAY_SERVICE_ACCOUNT_JSON play-service-account-json
add_secret_env PLAY_PACKAGE_NAMES play-package-names
add_secret_env PLAY_EARNINGS_BUCKET play-earnings-bucket

upsert_job() {
  local name=$1 memory=$2 timeout=$3
  if g run jobs describe "$name" --region "$REGION" >/dev/null 2>&1; then
    g run jobs update "$name" --region "$REGION" --image "$IMAGE" --set-secrets "$SECRETS" \
      --memory "$memory" --task-timeout "$timeout"
  else
    g run jobs create "$name" --region "$REGION" --image "$IMAGE" --service-account "$SA" \
      --cpu 1 --memory "$memory" --task-timeout "$timeout" --max-retries 0 --set-secrets "$SECRETS"
  fi
}

# Render needs Chrome + more RAM; sync is lighter.
if g run jobs describe render --region "$REGION" >/dev/null 2>&1; then
  g run jobs update render --region "$REGION" --image "$IMAGE" --set-secrets "$SECRETS" \
    --cpu 2 --memory 4Gi --task-timeout 1h
else
  g run jobs create render --region "$REGION" --image "$IMAGE" --service-account "$SA" \
    --cpu 2 --memory 4Gi --task-timeout 1h --max-retries 0 --set-secrets "$SECRETS"
fi
upsert_job sync 1Gi 15m
# Default sync entry when Scheduler runs the job with no overrides.
g run jobs update sync --region "$REGION" --args=node,cloud/sync.mjs >/dev/null

# --- Render trigger (unchanged pattern) ---
g iam service-accounts describe "$TRIGGER_SA" >/dev/null 2>&1 ||
  g iam service-accounts create render-trigger --display-name 'Pamer Studio render trigger'
for role in roles/datastore.user roles/eventarc.eventReceiver; do
  g projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$TRIGGER_SA" --role "$role" --condition None >/dev/null
done
g run jobs add-iam-policy-binding render --region "$REGION" --member "serviceAccount:$TRIGGER_SA" --role roles/run.developer >/dev/null
g iam service-accounts add-iam-policy-binding "$SA" --member "serviceAccount:$TRIGGER_SA" --role roles/iam.serviceAccountUser >/dev/null
g functions deploy render-trigger --gen2 --region "$REGION" --runtime nodejs22 --source cloud/trigger \
  --entry-point trigger --service-account "$TRIGGER_SA" --trigger-service-account "$TRIGGER_SA" \
  --trigger-location "$REGION" --trigger-event-filters type=google.cloud.firestore.document.v1.written \
  --trigger-event-filters database='(default)' --trigger-event-filters-path-pattern document='renders/{id}' \
  --memory 256Mi --max-instances 1 --concurrency 1 --no-allow-unauthenticated
g run services add-iam-policy-binding render-trigger --region "$REGION" --member "serviceAccount:$TRIGGER_SA" --role roles/run.invoker >/dev/null

# Wait until a newly created SA is usable for IAM bindings (eventual consistency).
await_sa() {
  local email=$1 i=0
  until g iam service-accounts describe "$email" >/dev/null 2>&1; do
    i=$((i + 1))
    if [[ $i -gt 30 ]]; then echo "service account $email not ready"; return 1; fi
    sleep 2
  done
  # Extra beat so project IAM accepts the member.
  sleep 5
}

# --- Sync trigger (on-demand Refresh from the web) ---
if ! g iam service-accounts describe "$SYNC_TRIGGER_SA" >/dev/null 2>&1; then
  g iam service-accounts create sync-trigger --display-name 'Pamer Studio sync trigger'
  await_sa "$SYNC_TRIGGER_SA"
fi
for role in roles/datastore.user roles/eventarc.eventReceiver; do
  g projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$SYNC_TRIGGER_SA" --role "$role" --condition None >/dev/null
done
g run jobs add-iam-policy-binding sync --region "$REGION" --member "serviceAccount:$SYNC_TRIGGER_SA" --role roles/run.developer >/dev/null
g iam service-accounts add-iam-policy-binding "$SA" --member "serviceAccount:$SYNC_TRIGGER_SA" --role roles/iam.serviceAccountUser >/dev/null
g functions deploy sync-trigger --gen2 --region "$REGION" --runtime nodejs22 --source cloud/sync-trigger \
  --entry-point trigger --service-account "$SYNC_TRIGGER_SA" --trigger-service-account "$SYNC_TRIGGER_SA" \
  --trigger-location "$REGION" --trigger-event-filters type=google.cloud.firestore.document.v1.written \
  --trigger-event-filters database='(default)' --trigger-event-filters-path-pattern document='syncs/{id}' \
  --memory 256Mi --max-instances 1 --concurrency 1 --no-allow-unauthenticated
g run services add-iam-policy-binding sync-trigger --region "$REGION" --member "serviceAccount:$SYNC_TRIGGER_SA" --role roles/run.invoker >/dev/null

# --- Scheduler: every 4 hours, no SYNC_ID (scheduled refresh) ---
if ! g iam service-accounts describe "$SCHEDULER_SA" >/dev/null 2>&1; then
  g iam service-accounts create sync-scheduler --display-name 'Pamer Studio sync scheduler'
  await_sa "$SCHEDULER_SA"
fi
g run jobs add-iam-policy-binding sync --region "$REGION" --member "serviceAccount:$SCHEDULER_SA" --role roles/run.developer >/dev/null
g iam service-accounts add-iam-policy-binding "$SA" --member "serviceAccount:$SCHEDULER_SA" --role roles/iam.serviceAccountUser >/dev/null
if g scheduler jobs describe sync-account --location "$REGION" >/dev/null 2>&1; then
  g scheduler jobs update http sync-account --location "$REGION" \
    --schedule='0 */4 * * *' --time-zone='Asia/Jakarta' \
    --uri="https://run.googleapis.com/v2/projects/$PROJECT/locations/$REGION/jobs/sync:run" \
    --http-method=POST \
    --oauth-service-account-email="$SCHEDULER_SA" \
    --message-body='{}'
else
  g scheduler jobs create http sync-account --location "$REGION" \
    --schedule='0 */4 * * *' --time-zone='Asia/Jakarta' \
    --uri="https://run.googleapis.com/v2/projects/$PROJECT/locations/$REGION/jobs/sync:run" \
    --http-method=POST \
    --oauth-service-account-email="$SCHEDULER_SA" \
    --message-body='{}'
fi

echo "done: render + sync jobs, triggers, scheduler (every 4h Asia/Jakarta)"
