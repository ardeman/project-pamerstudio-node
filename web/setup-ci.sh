#!/usr/bin/env bash
# One-time setup for .github/workflows/web.yml: a service account that may
# only deploy Hosting and rules, which GitHub Actions of this repo alone can
# act as (Workload Identity Federation, so no key exists). Free; safe to re-run.
set -euo pipefail
P=pamer-studio
N=1095331486954
R=ardeman/project-pamerstudio-node
SA=github-deploy@$P.iam.gserviceaccount.com
POOL=projects/$N/locations/global/workloadIdentityPools/github

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project $P

gcloud iam service-accounts describe $SA --project $P >/dev/null 2>&1 ||
  gcloud iam service-accounts create github-deploy --project $P --display-name 'GitHub Actions deploy (web/)'

for role in firebasehosting.admin firebaserules.admin serviceusage.serviceUsageConsumer firebase.viewer; do
  gcloud projects add-iam-policy-binding $P --member serviceAccount:$SA --role roles/$role --condition None >/dev/null
  echo "granted $role"
done

gcloud iam workload-identity-pools describe github --project $P --location global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create github --project $P --location global --display-name GitHub

# Only tokens from this repo are accepted.
gcloud iam workload-identity-pools providers describe github --project $P --location global \
  --workload-identity-pool github >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc github --project $P --location global \
    --workload-identity-pool github --issuer-uri https://token.actions.githubusercontent.com \
    --attribute-mapping google.subject=assertion.sub,attribute.repository=assertion.repository \
    --attribute-condition "assertion.repository == '$R'"

gcloud iam service-accounts add-iam-policy-binding $SA --project $P --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/$POOL/attribute.repository/$R" >/dev/null
echo "GitHub Actions in $R can now deploy as $SA"
