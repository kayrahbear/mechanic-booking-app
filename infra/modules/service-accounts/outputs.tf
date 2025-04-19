output "backend_email" {
  value = google_service_account.backend.email
}

output "frontend_email" {
  value = google_service_account.frontend.email
}
