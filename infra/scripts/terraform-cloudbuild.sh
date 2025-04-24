#!/bin/bash
# Script to handle Terraform operations in Cloud Build
set -e

PROJECT_ID=$1
REGION=$2
IMAGE_TAG=$3
CLOUD_BUILD_SA=$4

# Initialize terraform
terraform init \
  -backend-config="bucket=tfstate-${PROJECT_ID}" \
  -backend-config="prefix=live"

# List current state for debugging
echo "Current Terraform state:"
terraform state list || true

# Import Firestore database if not already in state
if terraform state list google_firestore_database.default &>/dev/null; then
  echo "Firestore DB already imported."
else
  terraform import google_firestore_database.default "projects/${PROJECT_ID}/databases/(default)" || true
fi

if terraform state list google_cloud_tasks_queue.notifications &>/dev/null; then
  echo "Cloud Tasks queue already imported."
else
  terraform import google_cloud_tasks_queue.notifications "projects/${PROJECT_ID}/locations/${REGION}/queues/notification-tasks" || true
fi

# Run the secret import script
echo "Running secret import script..."
sh /workspace/infra/scripts/import-secrets.sh "${PROJECT_ID}" "${REGION}"

# Apply changes with -refresh-only first to sync state
echo "Running refresh-only apply to synchronize state..."
terraform apply -refresh-only -auto-approve -input=false \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="image_tag=${IMAGE_TAG}" \
  -var="cloud_build_sa=${CLOUD_BUILD_SA}" \
  -parallelism=10

# Now apply the real changes
echo "Starting actual Terraform apply..."
TF_LOG=INFO terraform apply -auto-approve -input=false \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="image_tag=${IMAGE_TAG}" \
  -var="cloud_build_sa=${CLOUD_BUILD_SA}" \
  -parallelism=10 