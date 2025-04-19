data "google_project" "this" {}

resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  lifecycle {
    ignore_changes = [all]
  }
}

module "service_accounts" {
  source         = "./modules/service-accounts"
  cloud_build_sa = "${data.google_project.this.number}@cloudbuild.gserviceaccount.com"
}

# Back‑end Cloud Run service
module "backend_service" {
  source = "./modules/run-service"

  name                  = "backend-api"
  image                 = "${var.region}-docker.pkg.dev/${var.project_id}/backend-repo/backend:${var.image_tag}"
  region                = var.region
  service_account_email = module.service_accounts.backend_email

  env = {
    FIRESTORE_EMULATOR_HOST = ""
  }
}

# Front‑end Cloud Run service
module "frontend_service" {
  source = "./modules/run-service"

  name                  = "frontend-ssr"
  image                 = "${var.region}-docker.pkg.dev/${var.project_id}/frontend-repo/frontend:${var.image_tag}"
  region                = var.region
  service_account_email = module.service_accounts.frontend_email

  env = {
    NEXT_PUBLIC_API_BASE = module.backend_service.url
  }
}

module "queue" {
  source     = "./modules/cloud-tasks"
  project_id = var.project_id
  region     = var.region
}

module "secrets" {
  source = "./modules/secrets"
  names  = ["SENDGRID_KEY", "TWILIO_SID", "STRIPE_SK"]
}
