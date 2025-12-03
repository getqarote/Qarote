variable "region" {
  description = "AWS region"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
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

variable "key_name" {
  description = "AWS key pair name (optional, will use ssh_public_key if not provided)"
  type        = string
  default     = ""
}

# Note: AWS module doesn't create key pairs automatically
# You need to either:
# 1. Create a key pair in AWS console and provide key_name
# 2. Or use an existing key pair

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "domain_name" {
  description = "Domain name for the RabbitMQ instance (e.g., rabbitmq-aws.example.com). If provided, a Route 53 A record will be created."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID where the DNS record will be created. Required if domain_name is provided."
  type        = string
  default     = ""
}
