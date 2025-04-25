#!/bin/bash
# Script to deploy only the frontend to a development environment

# Exit on error
set -e

# Get the current branch name
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

# Check if we're on a development branch
if [[ "$BRANCH_NAME" != "main" && "$BRANCH_NAME" != "develop" ]]; then
  echo "You're on branch '$BRANCH_NAME'. This script is intended for development branches."
  read -p "Do you want to continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Get the project ID from gcloud config
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
  echo "Error: Could not determine project ID. Please run 'gcloud config set project YOUR_PROJECT_ID' first."
  exit 1
fi

echo "Deploying frontend to development environment for project: $PROJECT_ID"

# Trigger the development build
gcloud builds submit --config=cloudbuild.dev.yaml --substitutions=_REGION=us-central1

echo "Deployment completed. Your development frontend should be available at:"
echo "https://frontend-dev-us-central1.a.run.app" 