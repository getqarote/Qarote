variable "region" {
  description = "Digital Ocean region"
  type        = string
}

variable "instance_type" {
  description = "Digital Ocean droplet size slug"
  type        = string
  default     = "s-2vcpu-4gb"
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
  description = "SSH public key content (not used directly, use ssh_key_id instead)"
  type        = string
  default     = ""
}

variable "ssh_key_id" {
  description = "Digital Ocean SSH key ID or name (optional)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
