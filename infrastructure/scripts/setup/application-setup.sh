#!/bin/bash

set -e

echo "🚀 Starting Application Server setup..."

# Test network connectivity
echo "🌐 Testing network connectivity..."
ping -c 1 8.8.8.8
nslookup google.com

# Update system (idempotent)
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install dependencies (idempotent)
echo "📦 Installing dependencies..."
apt-get install -y curl wget git ufw dnsutils

# Configure firewall for application server (idempotent)
echo "🔒 Configuring firewall for application server..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Install Dokku (idempotent check)
echo "🚀 Installing Dokku..."
if ! command -v dokku &> /dev/null; then
    echo "Testing Dokku endpoint accessibility..."
    curl -s --max-time 30 https://dokku.com/install/v0.35.20/bootstrap.sh | head -n 1
    
    echo "Downloading and installing Dokku..."
    wget -NP . https://dokku.com/install/v0.35.20/bootstrap.sh
    DOKKU_TAG=v0.35.20 bash bootstrap.sh
    echo "Dokku installed successfully"
else
    echo "Dokku already installed, skipping..."
fi

# Wait a moment for Dokku to be fully ready
echo "⏳ Waiting for Dokku to be fully ready..."
sleep 10

# Install Let's Encrypt plugin (idempotent)
echo "🔐 Installing Let's Encrypt plugin..."
if ! dokku plugin:list | grep -q "letsencrypt"; then
    echo "Testing GitHub connectivity..."
    curl -s --max-time 30 https://github.com/dokku/dokku-letsencrypt.git | head -n 1
    
    echo "Installing Let's Encrypt plugin..."
    dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git letsencrypt
    echo "Let's Encrypt plugin installed"
else
    echo "Let's Encrypt plugin already installed, skipping..."
fi

# Install maintenance plugin (idempotent)
echo "🔧 Installing maintenance plugin..."
if ! dokku plugin:list | grep -q "maintenance"; then
    echo "Installing maintenance plugin..."
    dokku plugin:install https://github.com/dokku/dokku-maintenance.git maintenance
    echo "Maintenance plugin installed"
else
    echo "Maintenance plugin already installed, skipping..."
fi

# Configure Let's Encrypt (idempotent)
echo "🔐 Configuring Let's Encrypt..."
if ! dokku config:get --global DOKKU_LETSENCRYPT_EMAIL | grep -q "@"; then
    dokku config:set --global DOKKU_LETSENCRYPT_EMAIL=tessierhuort@gmail.com
    echo "Let's Encrypt email configured"
else
    echo "Let's Encrypt email already configured, skipping..."
fi

# Create a swap file for application server (idempotent)
echo "💾 Creating swap file for application server..."
if [ ! -f /swapfile ]; then
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap file created and activated"
else
    echo "Swap file already exists, checking if active..."
    if ! swapon --show | grep -q "/swapfile"; then
        swapon /swapfile
        echo "Swap file activated"
    else
        echo "Swap file already active"
    fi
fi

# Store database server IP for later use (idempotent)
# This will be replaced with actual IP by the setup script
echo "🔗 Configuring database connection..."
DB_SERVER_IP="{{DB_SERVER_IP}}"
if [ ! -f /etc/rabbithq-config ] || ! grep -q "DB_SERVER_IP=${DB_SERVER_IP}" /etc/rabbithq-config; then
    echo "DB_SERVER_IP=${DB_SERVER_IP}" > /etc/rabbithq-config
    echo "Database connection configured to: ${DB_SERVER_IP}"
else
    echo "Database connection already configured, skipping..."
fi

echo "✅ Application server setup complete!"
echo ""
echo "Application server is ready for deployment"
echo "Database connection configured to: ${DB_SERVER_IP}"
echo "🎉 Application server is ready!"
