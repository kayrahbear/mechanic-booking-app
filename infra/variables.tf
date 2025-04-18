variable "project_id" {
  description = "GCP project id where resources are created"
  type        = string
}

variable "region" {
  description = "Default region for regional resources"
  type        = string
  default     = "us-central1"
}
