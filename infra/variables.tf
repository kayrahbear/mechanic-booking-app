variable "project_id" {
  description = "GCP project id where resources are created"
  type        = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project ID must be 6-30 chars, lowercase letters, digits, and hyphens."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "region" {
  description = "Default region for regional resources"
  type        = string
  default     = "us-central1"
  validation {
    condition     = can(regex("^[a-z]+-[a-z0-9]+$", var.region))
    error_message = "Region must be a valid GCP region format."
  }
}

variable "image_tag" {
  description = "Tag for the container images"
  type        = string
  default     = "latest"
}

variable "common_labels" {
  description = "Common labels to apply to all resources"
  type        = map(string)
  default = {
    project    = "mechanic-booking"
    managed-by = "terraform"
  }
}

variable "cloud_run_config" {
  description = "Cloud Run service configuration"
  type = object({
    cpu_limit     = string
    memory_limit  = string
    min_instances = number
    max_instances = number
  })
  default = {
    cpu_limit     = "1000m"
    memory_limit  = "512Mi"
    min_instances = 0
    max_instances = 10
  }
}

variable "cloud_build_sa" {
  description = "Cloud Build service account email"
  type        = string
}