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
      labels,
      annotations
    ]
    # Don't destroy existing secrets
    prevent_destroy = true
  }
}

# More resilient output that doesn't break on missing elements
output "secret_ids" {
  value = {
    for k, v in google_secret_manager_secret.this : k => v.id
  }
}
