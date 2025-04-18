resource "google_cloud_tasks_queue" "notifications" {
  name     = "notification-tasks"
  project  = var.project_id
  location = var.region

  rate_limits {
    max_dispatches_per_second = 10
  }
  retry_config {
    max_attempts = 5
  }
}