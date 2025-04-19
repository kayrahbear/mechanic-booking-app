variable "names" { type = list(string) }

resource "google_secret_manager_secret" "this" {
  for_each  = toset(var.names)
  secret_id = each.value
  replication {
    automatic = true
  }
}

# initial empty version (optionally skip)
resource "google_secret_manager_secret_version" "init" {
  for_each  = google_secret_manager_secret.this
  secret    = each.value.id
  secret_data = ""
}
