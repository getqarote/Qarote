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
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

# Data source for latest Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security Group for RabbitMQ
resource "aws_security_group" "rabbitmq" {
  name        = "rabbitmq-${random_id.instance_id.hex}"
  description = "Security group for RabbitMQ instance"
  vpc_id      = data.aws_vpc.default.id

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # RabbitMQ AMQP
  ingress {
    from_port   = 5672
    to_port     = 5672
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # RabbitMQ Management UI (HTTP)
  ingress {
    from_port   = 15672
    to_port     = 15672
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS for Management UI
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP (for Let's Encrypt verification and redirect)
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Ephemeral ports for clustering
  ingress {
    from_port   = 4369
    to_port     = 4369
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 25672
    to_port     = 25672
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "rabbitmq-sg"
  })
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
resource "random_id" "instance_id" {
  byte_length = 4
}

# SSH Key
resource "tls_private_key" "rabbitmq" {
  count     = var.ssh_public_key == "" ? 1 : 0
  algorithm = "RSA"
  rsa_bits  = 4096
}

# AWS Key Pair
resource "aws_key_pair" "rabbitmq" {
  count      = var.ssh_public_key == "" && var.key_name == "" ? 1 : 0
  key_name   = "rabbitmq-key-${random_id.instance_id.hex}"
  public_key = tls_private_key.rabbitmq[0].public_key_openssh

  tags = merge(var.tags, {
    Name = "rabbitmq-key"
  })
}

# Store SSH key locally if generated
resource "local_file" "private_key" {
  count           = var.ssh_public_key == "" ? 1 : 0
  content         = tls_private_key.rabbitmq[0].private_key_pem
  filename        = abspath("${path.module}/../../.ssh/aws_rabbitmq_key.pem")
  file_permission = "0600"
}

# EC2 Instance
resource "aws_instance" "rabbitmq" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.rabbitmq.id]
  subnet_id              = data.aws_subnets.default.ids[0]
  key_name               = var.key_name != "" ? var.key_name : (var.ssh_public_key == "" ? aws_key_pair.rabbitmq[0].key_name : null)
  
  user_data = templatefile("${path.module}/user_data.sh", {
    rabbitmq_admin_user     = var.rabbitmq_admin_user
    rabbitmq_admin_password = var.rabbitmq_admin_password
    domain_name             = var.domain_name
  })

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }

  tags = merge(var.tags, {
    Name = "rabbitmq-aws-${random_id.instance_id.hex}"
  })
}

# Route 53 A Record (optional - only if domain_name is provided)
resource "aws_route53_record" "rabbitmq" {
  count   = var.domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 300
  records = [aws_instance.rabbitmq.public_ip]
}

# Outputs
output "public_ip" {
  value       = aws_instance.rabbitmq.public_ip
  description = "Public IP address of the RabbitMQ instance"
}

output "private_ip" {
  value       = aws_instance.rabbitmq.private_ip
  description = "Private IP address of the RabbitMQ instance"
}

output "instance_id" {
  value       = aws_instance.rabbitmq.id
  description = "EC2 instance ID"
}

output "ssh_key_path" {
  value       = var.ssh_public_key == "" ? abspath("${path.module}/../../.ssh/aws_rabbitmq_key.pem") : null
  description = "Path to the private SSH key (if generated)"
}

output "ssh_user" {
  value       = "ubuntu"
  description = "SSH username for the instance"
}

output "hostname" {
  value       = var.domain_name != "" ? var.domain_name : aws_instance.rabbitmq.public_ip
  description = "Hostname or IP address of the RabbitMQ instance"
}

output "fqdn" {
  value       = var.domain_name != "" ? var.domain_name : null
  description = "Fully qualified domain name (if domain_name is provided)"
}
