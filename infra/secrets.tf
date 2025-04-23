/* 
 * These secrets are already defined in the secrets module in main.tf
 * Commenting out to prevent conflicts
resource "google_secret_manager_secret" "sendgrid" {
  secret_id = "SENDGRID_KEY"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "twilio" {
  secret_id = "TWILIO_SID"
  replication {
    auto {}
  }
}
*/

# Allow backend runtime SA to access payload latest version
resource "google_secret_manager_secret_iam_member" "back_read_sendgrid" {
  # Reference the secret by its full resource ID from the module output
  secret_id = module.secrets.secret_ids["SENDGRID_KEY"]
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "back_read_twilio" {
  # Reference the secret by its full resource ID from the module output
  secret_id = module.secrets.secret_ids["TWILIO_SID"]
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_sa.email}"
}

# Firebase Web Config Secret for frontend
resource "google_secret_manager_secret" "firebase_web_config" {
  secret_id = "firebase-web-config"

  replication {
    auto {}
  }

  labels = {
    environment = "production"
    project     = var.project_id
  }
}

# IAM binding to allow Cloud Build to access the secret
resource "google_secret_manager_secret_iam_binding" "firebase_web_config_binding" {
  secret_id = google_secret_manager_secret.firebase_web_config.id
  role      = "roles/secretmanager.secretAccessor"
  members = [
    "serviceAccount:${var.cloud_build_sa}"
  ]
}
