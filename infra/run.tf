locals {
  region         = var.region
  project_id     = var.project_id
  backend_image  = "${local.region}-docker.pkg.dev/${local.project_id}/backend-repo/backend:${var.image_tag}"
  frontend_image = "${local.region}-docker.pkg.dev/${local.project_id}/frontend-repo/frontend:${var.image_tag}"
}

# Backend API ---------------------------------------------------------------
resource "google_cloud_run_v2_service" "backend" {
  name     = "backend-api"
  location = local.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"   # only frontend should call

  template {
    service_account = google_service_account.backend_sa.email
    containers {
      image = local.backend_image
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "QUEUE_ID"
        value = google_cloud_tasks_queue.notifications.id
      }
      env {
        name  = "REGION"
        value = var.region
      }
    }
  }
}

# Allow the frontend SA to invoke backend
resource "google_cloud_run_service_iam_member" "frontend_calls_backend" {
  location = google_cloud_run_v2_service.backend.location
  service  = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.frontend_sa.email}"
}

# Frontend SSR --------------------------------------------------------------
resource "google_cloud_run_v2_service" "frontend" {
  name     = "frontend-ssr"
  location = local.region
  ingress  = "INGRESS_TRAFFIC_ALL"                    # public

  template {
    service_account = google_service_account.frontend_sa.email
    containers {
      image = local.frontend_image
      env {
        name  = "BACKEND_BASE_URL"
        value = google_cloud_run_v2_service.backend.uri
      }
    }
  }
}

# Make frontend publicly invokable
resource "google_cloud_run_service_iam_member" "all_users_frontend" {
  location = google_cloud_run_v2_service.frontend.location
  service  = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
