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

# Allow backend runtime SA to access payload  latest version
resource "google_secret_manager_secret_iam_member" "back_read_sendgrid" {
  secret_id = google_secret_manager_secret.sendgrid.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "back_read_twilio" {
  secret_id = google_secret_manager_secret.twilio.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_sa.email}"
}
