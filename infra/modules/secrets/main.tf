variable "names" { type = list(string) }
variable "project_id" { type = string }

# Simpler, more reliable approach using data sources
resource "google_secret_manager_secret" "this" {
  for_each  = toset(var.names)
  secret_id = each.value
  replication {
    auto {}
  }

  lifecycle {
    # Prevent errors when secrets already exist
    ignore_changes = [
      replication,
    ]
    # Don't destroy existing secrets
    prevent_destroy = true
  }
}

# Don't create versions automatically - use the console or API for this
# This prevents errors from trying to create versions on existing secrets
output "secret_ids" {
  value = {
    for name in var.names : name => google_secret_manager_secret.this[name].id
  }
}
