locals {
  # Naming conventions
  name_prefix = "${var.environment}-mechanic-booking"

  # Common labels for all resources
  common_labels = merge(var.common_labels, {
    environment = var.environment
    region      = var.region
    created-by  = "terraform"
  })

  # Image URIs
  registry_base = "${var.region}-docker.pkg.dev/${var.project_id}"
  images = {
    backend  = "${local.registry_base}/backend-repo/backend:${var.image_tag}"
    frontend = "${local.registry_base}/frontend-repo/frontend:${var.image_tag}"
    worker   = "${local.registry_base}/backend-repo/worker:${var.image_tag}"
  }

  # Service account emails
  service_accounts = {
    backend  = google_service_account.backend_sa.email
    frontend = google_service_account.frontend_sa.email
  }

  # Network and security settings
  ingress_settings = {
    public   = "INGRESS_TRAFFIC_ALL"
    internal = "INGRESS_TRAFFIC_INTERNAL_ONLY"
  }
}