resource "google_service_account" "backend" {
  account_id   = "backend-sa"
  display_name = "Backend runtime SA"
}

resource "google_service_account" "frontend" {
  account_id   = "frontend-sa"
  display_name = "Frontend runtime SA"
}

# allow Cloud Build executor SA to actAs these
resource "google_service_account_iam_member" "cb_backend_impersonate" {
  service_account_id = google_service_account.backend.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.cloud_build_sa}"
}

resource "google_service_account_iam_member" "cb_frontend_impersonate" {
  service_account_id = google_service_account.frontend.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.cloud_build_sa}"
}
