terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.20"   # current LTS as of Apr 2025
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
