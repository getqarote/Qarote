terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Get default VPC
data "aws_vpc" "default" {
  default = true
}

# Get default subnets
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Random ID for unique resource naming
resource "random_id" "broker_id" {
  byte_length = 4
}

# Security Group for Amazon MQ
resource "aws_security_group" "mq" {
  name        = "rabbitmq-mq-${random_id.broker_id.hex}"
  description = "Security group for Amazon MQ RabbitMQ broker"
  vpc_id      = data.aws_vpc.default.id

  # AMQPS (encrypted AMQP)
  ingress {
    from_port   = 5671
    to_port     = 5671
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "AMQPS - encrypted AMQP"
  }

  # AMQP (unencrypted, if publicly accessible)
  ingress {
    from_port   = 5672
    to_port     = 5672
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "AMQP - unencrypted"
  }

  # HTTPS for Management Console
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS - Management Console"
  }

  # Management API (if needed)
  ingress {
    from_port   = 15671
    to_port     = 15671
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Management API"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "rabbitmq-mq-sg"
  })
}

# Amazon MQ Broker
resource "aws_mq_broker" "rabbitmq" {
  broker_name         = "rabbitmq-mq-${random_id.broker_id.hex}"
  engine_type         = "RabbitMQ"
  engine_version      = "3.13"  # Valid versions: 3.13 or 4.2
  host_instance_type = var.instance_type
  deployment_mode     = "SINGLE_INSTANCE" # mq.t3.micro doesn't support Active/Standby
  publicly_accessible = var.publicly_accessible

  # Subnet IDs - Amazon MQ requires at least one subnet
  # For single-instance, we can use one subnet
  subnet_ids = length(var.subnet_ids) > 0 ? var.subnet_ids : [data.aws_subnets.default.ids[0]]

  # Security groups can only be specified for non-publicly accessible brokers
  # Publicly accessible brokers use AWS-managed security
  security_groups = var.publicly_accessible ? [] : [aws_security_group.mq.id]

  # User credentials
  user {
    username = var.rabbitmq_admin_user
    password = var.rabbitmq_admin_password
  }

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Maintenance window (default: Sunday 03:00-04:00 UTC)
  maintenance_window_start_time {
    day_of_week = "SUNDAY"
    time_of_day = "03:00"
    time_zone   = "UTC"
  }

  # Note: RabbitMQ doesn't support storage_type parameter (only ActiveMQ does)

  tags = merge(var.tags, {
    Name = "rabbitmq-mq-broker"
  })
}

# Route 53 CNAME record for Amazon MQ endpoint
# Note: Amazon MQ provides DNS endpoints, not IPs, so we use CNAME
# For RabbitMQ, the endpoint is in instances[0].endpoints[0]
# The endpoint includes protocol prefix (amqps://) and port, so we need to extract just the hostname
locals {
  mq_endpoint = aws_mq_broker.rabbitmq.instances[0].endpoints[0]
  # Extract hostname from endpoint (remove amqps:// or amqp:// prefix and :port suffix)
  mq_hostname = replace(replace(local.mq_endpoint, "/^amqps?:\\/\\//", ""), "/:[0-9]+$/", "")
}

resource "aws_route53_record" "mq" {
  count   = var.domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "CNAME"
  ttl     = 300
  records = [local.mq_hostname]
}
