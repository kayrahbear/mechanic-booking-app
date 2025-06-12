# Security and compliance configurations

# Enable audit logging
resource "google_project_iam_audit_config" "audit_logging" {
  project = var.project_id
  service = "allServices"

  audit_log_config {
    log_type = "ADMIN_READ"
  }
  audit_log_config {
    log_type = "DATA_READ"
  }
  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

# Organization policy constraints (if you have org-level access)
# Uncomment and modify based on your organization's requirements

# resource "google_project_organization_policy" "disable_service_account_key_creation" {
#   project    = var.project_id
#   constraint = "iam.disableServiceAccountKeyCreation"
#   
#   boolean_policy {
#     enforced = true
#   }
# }

# resource "google_project_organization_policy" "require_https_load_balancers" {
#   project    = var.project_id
#   constraint = "compute.requireSslOnlyLoadBalancers"
#   
#   boolean_policy {
#     enforced = true
#   }
# }

# Cloud Asset Inventory (optional - for compliance tracking)
# resource "google_cloud_asset_project_feed" "asset_feed" {
#   project      = var.project_id
#   feed_id      = "${var.environment}-asset-feed"
#   content_type = "RESOURCE"
#   
#   asset_types = [
#     "cloudrun.googleapis.com/Service",
#     "cloudsql.googleapis.com/Instance",
#     "storage.googleapis.com/Bucket"
#   ]
#   
#   feed_output_config {
#     pubsub_destination {
#       topic = google_pubsub_topic.asset_notifications.id
#     }
#   }
# }