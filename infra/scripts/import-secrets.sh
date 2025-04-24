#!/bin/bash
# Script to import existing secrets into Terraform state
set -e

# Get args
PROJECT_ID=$1
REGION=$2
# Simplify dir calculation to avoid syntax issues
TERRAFORM_DIR="/workspace/infra"

cd $TERRAFORM_DIR

# Secrets to import - space separated list instead of array
SECRETS="SENDGRID_KEY TWILIO_SID STRIPE_SK GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET firebase-web-config"

echo "Starting secret imports..."

# Import secrets in module
for secret in $SECRETS; do
  echo "Importing $secret..."
  
  # Check if secret exists in Google Cloud
  if gcloud secrets describe "$secret" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "Secret $secret exists in GCP"
    
    # Check if it's already in Terraform state
    if ! terraform state list "module.secrets.google_secret_manager_secret.this[\"$secret\"]" >/dev/null 2>&1; then
      echo "Secret $secret not in Terraform state, importing..."
      terraform import "module.secrets.google_secret_manager_secret.this[\"$secret\"]" "projects/$PROJECT_ID/secrets/$secret" || echo "Import failed, will be created by apply"
    else
      echo "Secret $secret already in Terraform state, skipping import"
    fi
  else
    echo "Secret $secret doesn't exist in GCP yet, will be created by apply"
  fi
done

# Import calendar-sync-sa if it exists
if gcloud secrets describe "calendar-sync-sa" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "calendar-sync-sa exists in GCP"
  if ! terraform state list "google_secret_manager_secret.calendar_sa_key" >/dev/null 2>&1; then
    echo "Importing calendar-sync-sa..."
    terraform import "google_secret_manager_secret.calendar_sa_key" "projects/$PROJECT_ID/secrets/calendar-sync-sa" || echo "Import failed, will be handled by lifecycle rules"
  else
    echo "calendar-sync-sa already in Terraform state, skipping import"
  fi
else
  echo "calendar-sync-sa doesn't exist in GCP yet, will be created by apply"
fi

echo "Secret imports completed" 