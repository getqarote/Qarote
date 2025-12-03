terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Random ID for unique resource naming
resource "random_id" "instance_id" {
  byte_length = 4
}

# SSH Key (if provided)
data "digitalocean_ssh_key" "existing" {
  count = var.ssh_key_id != "" ? 1 : 0
  name  = var.ssh_key_id
}

# Droplet
resource "digitalocean_droplet" "rabbitmq" {
  image    = "ubuntu-22-04-x64"
  name     = "rabbitmq-${random_id.instance_id.hex}"
  region   = var.region
  size     = var.instance_type
  ssh_keys = var.ssh_key_id != "" ? [data.digitalocean_ssh_key.existing[0].id] : []

  user_data = templatefile("${path.module}/user_data.sh", {
    rabbitmq_admin_user     = var.rabbitmq_admin_user
    rabbitmq_admin_password = var.rabbitmq_admin_password
  })

  tags = concat(
    [for k, v in var.tags : "${k}:${v}"],
    ["rabbitmq", "terraform"]
  )
}

# Firewall for SSH
resource "digitalocean_firewall" "rabbitmq" {
  name = "rabbitmq-${random_id.instance_id.hex}"

  droplet_ids = [digitalocean_droplet.rabbitmq.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "5672"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "15672"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "4369"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "25672"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

# Outputs
output "public_ip" {
  value       = digitalocean_droplet.rabbitmq.ipv4_address
  description = "Public IP address of the RabbitMQ instance"
}

output "private_ip" {
  value       = digitalocean_droplet.rabbitmq.ipv4_address_private
  description = "Private IP address of the RabbitMQ instance (if available)"
}

output "droplet_id" {
  value       = digitalocean_droplet.rabbitmq.id
  description = "Digital Ocean droplet ID"
}
