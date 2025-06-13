terraform {
  backend "gcs" {
    bucket = "tfstate-auto-mech-booking-0418"
    prefix = "live" # state file path: live/default.tfstate
  }
}

# Service account used BY the backend container
resource "google_service_account" "backend_sa" {
  account_id   = "backend-service"
  display_name = "Backend Cloud Run runtime"
}

# Service account used BY the frontend container
resource "google_service_account" "frontend_sa" {
  account_id   = "frontend-service"
  display_name = "Frontend Cloud Run runtime"
}

# Cloud Build already has artifactregistry.writer etc. from Task 4.
# Give it permission to act-as (deploy) the runtime SAs
resource "google_service_account_iam_member" "cb_impersonate_backend" {
  service_account_id = google_service_account.backend_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${data.google_project.this.number}@cloudbuild.gserviceaccount.com"
}

resource "google_service_account_iam_member" "cb_impersonate_frontend" {
  service_account_id = google_service_account.frontend_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${data.google_project.this.number}@cloudbuild.gserviceaccount.com"
}

# Backend SA needs to read/write Firestore and publish tasks
resource "google_project_iam_member" "backend_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_project_iam_member" "backend_tasks_publisher" {
  project = var.project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "calendar_sa_reader" {
  secret_id = module.secrets.secret_ids["calendar-sync-sa"]
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_sa.email}"
}

# Allow backend SA to impersonate Cloud Tasks service account for OIDC authentication
resource "google_service_account_iam_member" "backend_impersonate_cloudtasks" {
  service_account_id = "service-${data.google_project.this.number}@gcp-sa-cloudtasks.iam.gserviceaccount.com"
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.backend_sa.email}"
}
