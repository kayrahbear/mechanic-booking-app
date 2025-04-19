terraform {
  required_version = ">= 1.4.2, < 1.8.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.20"   # current LTS as of Apr 2025
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
