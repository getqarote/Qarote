terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
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

# Provider configurations
provider "aws" {
  region = var.aws_region
}

provider "azurerm" {
  features {}
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
  zone    = var.gcp_zone
}

provider "digitalocean" {
  # Token should be set via DIGITALOCEAN_TOKEN environment variable
}

# Variables
variable "cloud_providers" {
  description = "List of cloud providers to deploy RabbitMQ to"
  type        = list(string)
  default     = ["aws", "azure", "gcp", "digitalocean"]
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "azure_location" {
  description = "Azure location"
  type        = string
  default     = "eastus"
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "gcp_zone" {
  description = "GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
  default     = ""
}

variable "do_region" {
  description = "Digital Ocean region"
  type        = string
  default     = "nyc1"
}

variable "aws_instance_type" {
  description = "AWS instance type for RabbitMQ servers"
  type        = string
  default     = "t3.micro" # Small instance for testing
}

variable "azure_instance_type" {
  description = "Azure VM size for RabbitMQ servers"
  type        = string
  default     = "Standard_B1s" # Small instance for testing
}

variable "gcp_instance_type" {
  description = "GCP machine type for RabbitMQ servers"
  type        = string
  default     = "e2-micro" # Small instance for testing
}

variable "rabbitmq_admin_user" {
  description = "RabbitMQ admin username"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "rabbitmq_admin_password" {
  description = "RabbitMQ admin password"
  type        = string
  sensitive   = true
}

variable "aws_domain_name" {
  description = "Domain name for AWS RabbitMQ instance (e.g., rabbitmq-aws.example.com). Leave empty to use IP address."
  type        = string
  default     = ""
}

variable "aws_route53_zone_id" {
  description = "Route 53 hosted zone ID for AWS DNS records. Required if aws_domain_name is provided."
  type        = string
  default     = ""
}

variable "gcp_domain_name" {
  description = "Domain name for GCP RabbitMQ instance (e.g., rabbitmq-gcp.example.com). Leave empty to use IP address."
  type        = string
  default     = ""
}

variable "gcp_dns_zone_name" {
  description = "GCP Cloud DNS managed zone name for DNS records. Required if gcp_domain_name is provided."
  type        = string
  default     = ""
}

variable "ssh_public_key" {
  description = "SSH public key for server access"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    Project     = "RabbitHQ"
    Environment = "testing"
    ManagedBy   = "Terraform"
  }
}

# Local values
locals {
  common_tags = var.tags
}

# AWS Configuration
module "aws_rabbitmq" {
  count  = contains(var.cloud_providers, "aws") ? 1 : 0
  source = "./modules/aws"

  region              = var.aws_region
  instance_type       = var.aws_instance_type
  rabbitmq_admin_user = var.rabbitmq_admin_user
  rabbitmq_admin_password = var.rabbitmq_admin_password
  ssh_public_key      = var.ssh_public_key
  domain_name         = var.aws_domain_name
  route53_zone_id     = var.aws_route53_zone_id
  tags                = local.common_tags
}

# Azure Configuration
module "azure_rabbitmq" {
  count  = contains(var.cloud_providers, "azure") ? 1 : 0
  source = "./modules/azure"

  location            = var.azure_location
  instance_type       = var.azure_instance_type
  rabbitmq_admin_user = var.rabbitmq_admin_user
  rabbitmq_admin_password = var.rabbitmq_admin_password
  ssh_public_key      = var.ssh_public_key
  tags                = local.common_tags
}

# GCP Configuration
module "gcp_rabbitmq" {
  count  = contains(var.cloud_providers, "gcp") ? 1 : 0
  source = "./modules/gcp"

  region              = var.gcp_region
  zone                = var.gcp_zone
  instance_type       = var.gcp_instance_type
  rabbitmq_admin_user = var.rabbitmq_admin_user
  rabbitmq_admin_password = var.rabbitmq_admin_password
  ssh_public_key      = var.ssh_public_key
  domain_name         = var.gcp_domain_name
  dns_zone_name       = var.gcp_dns_zone_name
  tags                = local.common_tags
}

# Digital Ocean Configuration
module "digitalocean_rabbitmq" {
  count  = contains(var.cloud_providers, "digitalocean") ? 1 : 0
  source = "./modules/digitalocean"

  region              = var.do_region
  instance_type       = "s-1vcpu-1gb" # Small instance for testing (if needed later)
  rabbitmq_admin_user = var.rabbitmq_admin_user
  rabbitmq_admin_password = var.rabbitmq_admin_password
  ssh_public_key      = var.ssh_public_key
  tags                = local.common_tags
}

# Outputs
output "aws_rabbitmq" {
  description = "AWS RabbitMQ instance details"
  value = try({
    public_ip     = module.aws_rabbitmq[0].public_ip
    private_ip    = module.aws_rabbitmq[0].private_ip
    hostname      = module.aws_rabbitmq[0].hostname
    fqdn          = module.aws_rabbitmq[0].fqdn
    management_url = module.aws_rabbitmq[0].fqdn != null ? "https://${module.aws_rabbitmq[0].fqdn}" : "http://${module.aws_rabbitmq[0].public_ip}:15672"
    amqp_url      = module.aws_rabbitmq[0].fqdn != null ? "amqp://${var.rabbitmq_admin_user}:${var.rabbitmq_admin_password}@${module.aws_rabbitmq[0].fqdn}:5672" : "amqp://${var.rabbitmq_admin_user}:${var.rabbitmq_admin_password}@${module.aws_rabbitmq[0].public_ip}:5672"
    ssh_key_path  = module.aws_rabbitmq[0].ssh_key_path
    ssh_user      = module.aws_rabbitmq[0].ssh_user
    instance_id   = module.aws_rabbitmq[0].instance_id
  }, null)
  sensitive = true
}

output "azure_rabbitmq" {
  description = "Azure RabbitMQ instance details"
  value = try({
    public_ip      = module.azure_rabbitmq[0].public_ip
    private_ip     = module.azure_rabbitmq[0].private_ip
    management_url = "http://${module.azure_rabbitmq[0].public_ip}:15672"
    amqp_url       = "amqp://${var.rabbitmq_admin_user}:${var.rabbitmq_admin_password}@${module.azure_rabbitmq[0].public_ip}:5672"
    ssh_key_path   = module.azure_rabbitmq[0].ssh_key_path
    ssh_user       = module.azure_rabbitmq[0].ssh_user
  }, null)
  sensitive = true
}

output "gcp_rabbitmq" {
  description = "GCP RabbitMQ instance details"
  value = try({
    public_ip      = module.gcp_rabbitmq[0].public_ip
    private_ip     = module.gcp_rabbitmq[0].private_ip
    hostname       = module.gcp_rabbitmq[0].hostname
    fqdn           = module.gcp_rabbitmq[0].fqdn
    management_url = module.gcp_rabbitmq[0].fqdn != null ? "https://${module.gcp_rabbitmq[0].fqdn}" : "http://${module.gcp_rabbitmq[0].public_ip}:15672"
    amqp_url       = module.gcp_rabbitmq[0].fqdn != null ? "amqp://${var.rabbitmq_admin_user}:${var.rabbitmq_admin_password}@${module.gcp_rabbitmq[0].fqdn}:5672" : "amqp://${var.rabbitmq_admin_user}:${var.rabbitmq_admin_password}@${module.gcp_rabbitmq[0].public_ip}:5672"
    ssh_key_path   = module.gcp_rabbitmq[0].ssh_key_path
    ssh_user       = module.gcp_rabbitmq[0].ssh_user
    instance_name  = module.gcp_rabbitmq[0].instance_name
  }, null)
  sensitive = true
}

output "digitalocean_rabbitmq" {
  description = "Digital Ocean RabbitMQ instance details"
  value = try({
    public_ip   = module.digitalocean_rabbitmq[0].public_ip
    private_ip  = module.digitalocean_rabbitmq[0].private_ip
    management_url = "http://${module.digitalocean_rabbitmq[0].public_ip}:15672"
    amqp_url    = "amqp://${var.rabbitmq_admin_user}:${var.rabbitmq_admin_password}@${module.digitalocean_rabbitmq[0].public_ip}:5672"
  }, null)
  sensitive = false
}

output "all_instances" {
  description = "Summary of all RabbitMQ instances"
  value = {
    aws = try(module.aws_rabbitmq[0].public_ip, null)
    azure = try(module.azure_rabbitmq[0].public_ip, null)
    gcp = try(module.gcp_rabbitmq[0].public_ip, null)
    digitalocean = try(module.digitalocean_rabbitmq[0].public_ip, null)
  }
}
