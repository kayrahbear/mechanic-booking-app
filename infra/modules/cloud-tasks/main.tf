resource "google_app_engine_application" "default" {
  project     = var.project_id
  location_id = var.region
}

resource "google_cloud_tasks_queue" "notifications" {
  name     = "notification-tasks"
  location = var.region

  app_engine_routing_override {
    service  = "backend-api"      # will target backend endpoints
  }
}
