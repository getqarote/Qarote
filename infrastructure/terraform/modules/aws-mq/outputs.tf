output "broker_id" {
  value       = aws_mq_broker.rabbitmq.id
  description = "Amazon MQ broker ID"
}

output "broker_arn" {
  value       = aws_mq_broker.rabbitmq.arn
  description = "Amazon MQ broker ARN"
}

output "broker_name" {
  value       = aws_mq_broker.rabbitmq.broker_name
  description = "Amazon MQ broker name"
}

output "amqp_endpoint" {
  value       = try(aws_mq_broker.rabbitmq.instances[0].endpoints[0], null)
  description = "AMQP endpoint URL (hostname)"
}

output "amqps_endpoint" {
  value       = try(aws_mq_broker.rabbitmq.instances[0].endpoints[0], null)
  description = "AMQPS (encrypted) endpoint URL (hostname)"
}

output "management_endpoint" {
  value       = try(aws_mq_broker.rabbitmq.instances[0].endpoints[0], null)
  description = "Management console endpoint (hostname only, use HTTPS on port 443)"
}

output "broker_endpoint" {
  value       = try(aws_mq_broker.rabbitmq.instances[0].endpoints[0], null)
  description = "Primary broker endpoint (hostname)"
}

output "fqdn" {
  value       = var.domain_name != "" ? var.domain_name : null
  description = "Fully qualified domain name (if domain_name is provided)"
}

output "connection_urls" {
  value = {
    amqp  = try("amqp://${var.rabbitmq_admin_user}:${var.rabbitmq_admin_password}@${aws_mq_broker.rabbitmq.instances[0].endpoints[0]}:5672", null)
    amqps = try("amqps://${var.rabbitmq_admin_user}:${var.rabbitmq_admin_password}@${aws_mq_broker.rabbitmq.instances[0].endpoints[0]}:5671", null)
    management = try("https://${aws_mq_broker.rabbitmq.instances[0].endpoints[0]}:443", null)
  }
  description = "Connection URLs for AMQP, AMQPS, and Management Console"
  sensitive   = true
}
