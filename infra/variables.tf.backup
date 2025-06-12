variable "project_id" {
  description = "GCP project id where resources are created"
  type        = string
}

variable "region" {
  description = "Default region for regional resources"
  type        = string
  default     = "us-central1"
}

variable "image_tag" {
  description = "Tag for the container images"
  type        = string
  default     = "latest"
}

variable "cloud_build_sa" {
  description = "Cloud Build service account email"
  type        = string
  default     = "" # Will be overridden by Cloud Build
}
