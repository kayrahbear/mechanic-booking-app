variable "names" { type = list(string) }
variable "project_id" { type = string }

# Use data sources to reference existing secrets that must already exist
data "google_secret_manager_secret" "existing" {
  for_each  = toset(var.names)
  project   = var.project_id
  secret_id = each.value
}

# Output the IDs of the secrets
output "secret_ids" {
  value = {
    for name in var.names : name => data.google_secret_manager_secret.existing[name].id
  }
}
