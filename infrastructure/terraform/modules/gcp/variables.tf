variable "region" {
  description = "GCP region"
  type        = string
}

variable "zone" {
  description = "GCP zone"
  type        = string
}

variable "instance_type" {
  description = "GCP machine type"
  type        = string
  default     = "e2-medium"
}

variable "rabbitmq_admin_user" {
  description = "RabbitMQ admin username"
  type        = string
  sensitive   = true
}

variable "rabbitmq_admin_password" {
  description = "RabbitMQ admin password"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key content"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags/labels to apply to resources"
  type        = map(string)
  default     = {}
}

variable "domain_name" {
  description = "Domain name for the RabbitMQ instance (e.g., rabbitmq-gcp.example.com). If provided, a Cloud DNS A record will be created."
  type        = string
  default     = ""
}

variable "dns_zone_name" {
  description = "GCP Cloud DNS managed zone name where the DNS record will be created. Required if domain_name is provided."
  type        = string
  default     = ""
}
