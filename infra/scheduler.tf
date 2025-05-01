resource "google_service_account" "availability_scheduler_sa" {
  account_id   = "availability-scheduler-sa"
  display_name = "Cloud Scheduler SA for weekly availability seeding"
}

# Allow SA to invoke backend-api Cloud Run service
resource "google_cloud_run_service_iam_member" "scheduler_invokes_backend" {
  location = google_cloud_run_v2_service.backend.location
  service  = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.availability_scheduler_sa.email}"
}

resource "google_cloud_scheduler_job" "availability_seed" {
  name        = "seed-availability"
  description = "Seed upcoming week's availability every Sunday 6pm MT"
  project     = var.project_id
  region      = var.region
  schedule    = "0 18 * * 0" # Sunday 18:00
  time_zone   = "America/Chicago"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.backend.uri}/availability/seed"

    oidc_token {
      service_account_email = google_service_account.availability_scheduler_sa.email
      audience              = google_cloud_run_v2_service.backend.uri
    }

    headers = {
      "Content-Type"     = "application/json"
      "X-CloudScheduler" = "true"
    }

    body = base64encode(jsonencode({}))
  }

  depends_on = [
    google_cloud_run_service_iam_member.scheduler_invokes_backend,
  ]
}

output "availability_seed_job_name" {
  description = "Cloud Scheduler job name"
  value       = google_cloud_scheduler_job.availability_seed.name
}
