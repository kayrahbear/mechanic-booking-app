data "google_project" "this" {}

resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  timeouts {
    create = "5m"
    update = "5m"
  }
}

module "service_accounts" {
  source         = "./modules/service-accounts"
  cloud_build_sa = "${data.google_project.this.number}@cloudbuild.gserviceaccount.com"
}

/*
 * These services are already defined directly in run.tf
 * Commenting out to prevent conflicts

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
*/

module "secrets" {
  source     = "./modules/secrets"
  names      = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "firebase-web-config", "calendar-sync-sa", "SMTP2GO_USERNAME", "SMTP2GO_PASSWORD", "FROM_EMAIL", "SERVICE_AREA_ZIPS", "BOOKING_URL"]
  project_id = var.project_id
}
