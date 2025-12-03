terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
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

# Random ID for unique resource naming
resource "random_id" "instance_id" {
  byte_length = 4
}

# Convert tags to lowercase keys and values for GCP labels (GCP requires lowercase)
locals {
  gcp_labels = {
    for k, v in var.tags : lower(k) => lower(v)
  }
}

# SSH Key
resource "tls_private_key" "rabbitmq" {
  count     = var.ssh_public_key == "" ? 1 : 0
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Store SSH key locally if generated
resource "local_file" "private_key" {
  count           = var.ssh_public_key == "" ? 1 : 0
  content         = tls_private_key.rabbitmq[0].private_key_pem
  filename        = abspath("${path.module}/../../.ssh/gcp_rabbitmq_key.pem")
  file_permission = "0600"
}

# Compute Instance
resource "google_compute_instance" "rabbitmq" {
  name         = "rabbitmq-${random_id.instance_id.hex}"
  machine_type = var.instance_type
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-jammy-v20240110"
      size  = 20
      type  = "pd-ssd"
    }
  }

  network_interface {
    network = "default"
    access_config {
      // Ephemeral public IP
    }
  }

  metadata = {
    ssh-keys = var.ssh_public_key != "" ? "ubuntu:${var.ssh_public_key}" : "ubuntu:${tls_private_key.rabbitmq[0].public_key_openssh}"
  }

  metadata_startup_script = templatefile("${path.module}/user_data.sh", {
    rabbitmq_admin_user     = var.rabbitmq_admin_user
    rabbitmq_admin_password = var.rabbitmq_admin_password
    domain_name             = var.domain_name
  })

  tags = ["rabbitmq", "http-server", "https-server", "rabbitmq-https"]

  labels = local.gcp_labels
}

# Firewall rule for SSH
resource "google_compute_firewall" "ssh" {
  name    = "rabbitmq-ssh-${random_id.instance_id.hex}"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["rabbitmq"]
}

# Firewall rule for RabbitMQ AMQP
resource "google_compute_firewall" "rabbitmq_amqp" {
  name    = "rabbitmq-amqp-${random_id.instance_id.hex}"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["5672"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["rabbitmq"]
}

# Firewall rule for RabbitMQ Management
resource "google_compute_firewall" "rabbitmq_management" {
  name    = "rabbitmq-management-${random_id.instance_id.hex}"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["15672"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["rabbitmq"]
}

# Firewall rule for RabbitMQ Clustering
resource "google_compute_firewall" "rabbitmq_clustering" {
  name    = "rabbitmq-clustering-${random_id.instance_id.hex}"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["4369", "25672"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["rabbitmq"]
}

# Firewall rule for HTTPS (if not covered by https-server tag)
resource "google_compute_firewall" "https" {
  name    = "rabbitmq-https-${random_id.instance_id.hex}"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["rabbitmq-https"]
}

# Firewall rule for HTTP (for Let's Encrypt)
resource "google_compute_firewall" "http" {
  name    = "rabbitmq-http-${random_id.instance_id.hex}"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["rabbitmq-https"]
}

# Cloud DNS A Record (optional - only if domain_name is provided)
resource "google_dns_record_set" "rabbitmq" {
  count        = var.domain_name != "" && var.dns_zone_name != "" ? 1 : 0
  managed_zone = var.dns_zone_name
  name         = "${var.domain_name}."
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_instance.rabbitmq.network_interface[0].access_config[0].nat_ip]
}

# Outputs
output "public_ip" {
  value       = google_compute_instance.rabbitmq.network_interface[0].access_config[0].nat_ip
  description = "Public IP address of the RabbitMQ instance"
}

output "private_ip" {
  value       = google_compute_instance.rabbitmq.network_interface[0].network_ip
  description = "Private IP address of the RabbitMQ instance"
}

output "instance_name" {
  value       = google_compute_instance.rabbitmq.name
  description = "GCP instance name"
}

output "ssh_key_path" {
  value       = var.ssh_public_key == "" ? abspath("${path.module}/../../.ssh/gcp_rabbitmq_key.pem") : null
  description = "Path to the private SSH key (if generated)"
}

output "ssh_user" {
  value       = "ubuntu"
  description = "SSH username for the instance"
}

output "hostname" {
  value       = var.domain_name != "" ? var.domain_name : google_compute_instance.rabbitmq.network_interface[0].access_config[0].nat_ip
  description = "Hostname or IP address of the RabbitMQ instance"
}

output "fqdn" {
  value       = var.domain_name != "" ? var.domain_name : null
  description = "Fully qualified domain name (if domain_name is provided)"
}
