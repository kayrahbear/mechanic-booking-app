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

# The following IAM bindings are commented out because the referenced secrets don't exist yet
# Uncomment and adjust when you create these secrets

/*
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
*/

# Allow backend SA to access Google OAuth client secrets (if needed)
resource "google_secret_manager_secret_iam_member" "back_read_google_client_id" {
  secret_id = module.secrets.secret_ids["GOOGLE_CLIENT_ID"]
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "back_read_google_client_secret" {
  secret_id = module.secrets.secret_ids["GOOGLE_CLIENT_SECRET"]
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_sa.email}"
}

# Allow backend SA to access the calendar-sync-sa secret 
# Commenting this out to avoid duplicate bindings
/*
resource "google_secret_manager_secret_iam_member" "back_read_calendar_sa" {
  secret_id = module.secrets.secret_ids["calendar-sync-sa"]
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_sa.email}"
}
*/

# The calendar-sync-sa secret is now managed through the secrets module in main.tf
