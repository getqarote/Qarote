variable "location" {
  description = "Azure location"
  type        = string
}

variable "instance_type" {
  description = "Azure VM size"
  type        = string
  default     = "Standard_B2s"
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
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
