terraform {
  backend "gcs" {
    bucket = "tfstate-auto-mech-booking-0418"
    prefix = "live"                 # state file path: live/default.tfstate
  }
}