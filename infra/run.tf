locals {
  region         = var.region
  project_id     = var.project_id
  backend_image  = "${local.region}-docker.pkg.dev/${local.project_id}/backend-repo/backend:${var.image_tag}"
  frontend_image = "${local.region}-docker.pkg.dev/${local.project_id}/frontend-repo/frontend:${var.image_tag}"
  worker_image   = "${local.region}-docker.pkg.dev/${local.project_id}/backend-repo/worker:${var.image_tag}"
}

# IMPORTANT: These v2 Cloud Run resources take precedence over any similar resources 
# defined in modules. The cloudbuild pipeline is configured to import these resources.
# Backend API ---------------------------------------------------------------
resource "google_cloud_run_v2_service" "backend" {
  name     = "backend-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

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
      env {
        name  = "WORKER_SERVICE_URL"
        value = google_cloud_run_v2_service.worker.uri
      }
      env {
        name  = "GOOGLE_APPLICATION_CREDENTIALS"
        value = "/var/secrets/calendar/key.json"
      }
      env {
        name  = "CALENDAR_ID"
        value = "primary"
      }
      volume_mounts {
        name       = "calendar-sa-key"
        mount_path = "/var/secrets/calendar"
      }
    }

    # ───── volumes ─────
    volumes {
      name = "calendar-sa-key"
      secret {
        secret = module.secrets.secret_ids["calendar-sync-sa"]
        items {
          path    = "key.json"
          version = "latest"
        }
      }
    }
  }

  timeouts {
    create = "3m"
    update = "3m"
    delete = "2m"
  }

  # This depends_on is needed to avoid circular dependency
  depends_on = [
    google_cloud_run_v2_service.worker
  ]
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
  ingress  = "INGRESS_TRAFFIC_ALL" # public

  template {
    service_account = google_service_account.frontend_sa.email
    containers {
      image = local.frontend_image
      env {
        name  = "NEXT_PUBLIC_API_BASE"
        value = google_cloud_run_v2_service.backend.uri
      }
    }
  }

  timeouts {
    create = "3m"
    update = "3m"
    delete = "2m"
  }
}

# Make frontend publicly invokable
resource "google_cloud_run_service_iam_member" "all_users_frontend" {
  location = google_cloud_run_v2_service.frontend.location
  service  = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Worker Service (Notification Processor) -----------------------------------
resource "google_cloud_run_v2_service" "worker" {
  name     = "notification-worker"
  location = local.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY" # Only Cloud Tasks should call this

  template {
    service_account = google_service_account.backend_sa.email

    # ───── container ─────
    containers {
      image = local.worker_image

      # normal envs …
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "REGION"
        value = var.region
      }

      # tell Google libs where to find credentials
      env {
        name  = "GOOGLE_APPLICATION_CREDENTIALS"
        value = "/var/secrets/calendar/key.json"
      }

      # optional: which calendar to write to
      env {
        name  = "CALENDAR_ID"
        value = "primary" # or an explicit calendarId
      }

      # mount the secret as a file
      volume_mounts {
        name       = "calendar-sa-key"
        mount_path = "/var/secrets/calendar"
      }
    }

    # ───── volumes ─────
    volumes {
      name = "calendar-sa-key"
      secret {
        secret = module.secrets.secret_ids["calendar-sync-sa"]
        items {
          path    = "key.json"
          version = "latest"
        }
      }
    }
  }

  timeouts {
    create = "3m"
    update = "3m"
    delete = "2m"
  }

  # Just depend on worker, we no longer need to depend on module.secrets
  # since it's now using data sources instead of creating resources
  depends_on = [
    google_cloud_run_v2_service.worker
  ]
}

# Allow Cloud Tasks to invoke the worker (unauthenticated since it's internal-only)
resource "google_cloud_run_service_iam_member" "cloudtasks_calls_worker" {
  location = google_cloud_run_v2_service.worker.location
  service  = google_cloud_run_v2_service.worker.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
