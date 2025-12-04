variable "region" {
  description = "AWS region"
  type        = string
}

variable "instance_type" {
  description = "Amazon MQ instance type"
  type        = string
  default     = "mq.t3.micro"
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

variable "domain_name" {
  description = "Domain name for the Amazon MQ broker (e.g., managed.aws-rabbithq.com). If provided, a Route 53 CNAME record will be created."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID where the DNS record will be created. Required if domain_name is provided."
  type        = string
  default     = ""
}

variable "publicly_accessible" {
  description = "Whether the broker should be publicly accessible"
  type        = bool
  default     = true
}

variable "subnet_ids" {
  description = "List of subnet IDs for the broker. If not provided, uses default VPC subnets."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
