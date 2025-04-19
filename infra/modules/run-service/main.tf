variable "name" {
  type = string
}
variable "image" {
  type = string
}
variable "region" {
  type = string
}
variable "service_account_email" {
  type = string
}
variable "env" {
  type    = map(string)
  default = {}
}

resource "google_cloud_run_service" "this" {
  name     = var.name
  location = var.region

  template {
    spec {
      service_account_name = var.service_account_email
      containers {
        image = var.image

        dynamic "env" {
          for_each = var.env
          content {
            name  = env.key
            value = env.value
          }
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "10"
      }
    }
  }
}

# make service public
resource "google_cloud_run_service_iam_member" "all_users" {
  location = var.region
  service  = google_cloud_run_service.this.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "url" {
  value = google_cloud_run_service.this.status[0].url
}
