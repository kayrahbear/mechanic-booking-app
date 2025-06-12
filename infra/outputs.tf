output "service_urls" {
  description = "URLs of deployed services"
  value = {
    backend  = google_cloud_run_v2_service.backend.uri
    frontend = google_cloud_run_v2_service.frontend.uri
    worker   = google_cloud_run_v2_service.worker.uri
  }
}

output "service_accounts" {
  description = "Service account emails"
  value = {
    backend  = google_service_account.backend_sa.email
    frontend = google_service_account.frontend_sa.email
  }
}

output "database_info" {
  description = "Database configuration"
  value = {
    firestore_name = google_firestore_database.default.name
    project_id     = var.project_id
    region         = var.region
  }
}

output "cloud_tasks_queue" {
  description = "Cloud Tasks queue information"
  value = {
    name     = google_cloud_tasks_queue.notifications.name
    location = google_cloud_tasks_queue.notifications.location
  }
}

output "secrets" {
  description = "Secret Manager secret names"
  value       = module.secrets.secret_ids
  sensitive   = true
}

# For CI/CD use
output "artifact_registry" {
  description = "Artifact Registry information"
  value = {
    backend_repo  = "${var.region}-docker.pkg.dev/${var.project_id}/backend-repo"
    frontend_repo = "${var.region}-docker.pkg.dev/${var.project_id}/frontend-repo"
  }
}