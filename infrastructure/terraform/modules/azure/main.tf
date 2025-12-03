terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
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

# Resource Group
resource "azurerm_resource_group" "rabbitmq" {
  name     = "rabbitmq-${random_id.instance_id.hex}"
  location = var.location

  tags = var.tags
}

# Virtual Network
resource "azurerm_virtual_network" "rabbitmq" {
  name                = "rabbitmq-vnet-${random_id.instance_id.hex}"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rabbitmq.location
  resource_group_name = azurerm_resource_group.rabbitmq.name

  tags = var.tags
}

# Subnet
resource "azurerm_subnet" "rabbitmq" {
  name                 = "rabbitmq-subnet-${random_id.instance_id.hex}"
  resource_group_name  = azurerm_resource_group.rabbitmq.name
  virtual_network_name = azurerm_virtual_network.rabbitmq.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Public IP
resource "azurerm_public_ip" "rabbitmq" {
  name                = "rabbitmq-pip-${random_id.instance_id.hex}"
  location            = azurerm_resource_group.rabbitmq.location
  resource_group_name = azurerm_resource_group.rabbitmq.name
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = var.tags
}

# Network Security Group
resource "azurerm_network_security_group" "rabbitmq" {
  name                = "rabbitmq-nsg-${random_id.instance_id.hex}"
  location            = azurerm_resource_group.rabbitmq.location
  resource_group_name = azurerm_resource_group.rabbitmq.name

  security_rule {
    name                       = "SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "RabbitMQ-AMQP"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5672"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "RabbitMQ-Management"
    priority                   = 1003
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "15672"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "RabbitMQ-Clustering"
    priority                   = 1004
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "4369"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "RabbitMQ-Clustering-2"
    priority                   = 1005
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "25672"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = var.tags
}

# Network Interface
resource "azurerm_network_interface" "rabbitmq" {
  name                = "rabbitmq-nic-${random_id.instance_id.hex}"
  location            = azurerm_resource_group.rabbitmq.location
  resource_group_name = azurerm_resource_group.rabbitmq.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.rabbitmq.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.rabbitmq.id
  }

  tags = var.tags
}

# Associate NSG with NIC
resource "azurerm_network_interface_security_group_association" "rabbitmq" {
  network_interface_id      = azurerm_network_interface.rabbitmq.id
  network_security_group_id = azurerm_network_security_group.rabbitmq.id
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

# Store SSH key locally if generated
resource "local_file" "private_key" {
  count           = var.ssh_public_key == "" ? 1 : 0
  content         = tls_private_key.rabbitmq[0].private_key_pem
  filename        = "${path.module}/../../.ssh/azure_rabbitmq_key.pem"
  file_permission = "0600"
}

# Virtual Machine
resource "azurerm_linux_virtual_machine" "rabbitmq" {
  name                = "rabbitmq-vm-${random_id.instance_id.hex}"
  location            = azurerm_resource_group.rabbitmq.location
  resource_group_name = azurerm_resource_group.rabbitmq.name
  size                = var.instance_type
  admin_username      = "azureuser"

  network_interface_ids = [
    azurerm_network_interface.rabbitmq.id,
  ]

  admin_ssh_key {
    username   = "azureuser"
    public_key = var.ssh_public_key != "" ? var.ssh_public_key : tls_private_key.rabbitmq[0].public_key_openssh
  }

  os_disk {
    name                 = "rabbitmq-osdisk-${random_id.instance_id.hex}"
    caching              = "ReadWrite"
    storage_account_type = var.instance_type == "Standard_A1_v2" ? "Standard_LRS" : "Premium_LRS"
    disk_size_gb         = 30
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = var.instance_type == "Standard_A1_v2" ? "22_04-lts" : "22_04-lts-gen2"
    version   = "latest"
  }

  custom_data = base64encode(templatefile("${path.module}/user_data.sh", {
    rabbitmq_admin_user     = var.rabbitmq_admin_user
    rabbitmq_admin_password = var.rabbitmq_admin_password
  }))

  tags = var.tags
}

# Outputs
output "public_ip" {
  value       = azurerm_public_ip.rabbitmq.ip_address
  description = "Public IP address of the RabbitMQ instance"
}

output "private_ip" {
  value       = azurerm_network_interface.rabbitmq.private_ip_address
  description = "Private IP address of the RabbitMQ instance"
}

output "resource_group_name" {
  value       = azurerm_resource_group.rabbitmq.name
  description = "Resource group name"
}

output "ssh_key_path" {
  value       = var.ssh_public_key == "" ? abspath("${path.module}/../../.ssh/azure_rabbitmq_key.pem") : null
  description = "Path to the private SSH key (if generated)"
}

output "ssh_user" {
  value       = "azureuser"
  description = "SSH username for the instance"
}
