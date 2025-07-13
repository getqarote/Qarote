#!/bin/bash

set -e

echo "🗄️  Starting Database Server setup..."

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

# Configure firewall for database server (idempotent)
echo "🔒 Configuring firewall for database server..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 5432/tcp  # PostgreSQL port
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

# Install PostgreSQL plugin (idempotent)
echo "🔌 Installing PostgreSQL plugin..."
if ! dokku plugin:list | grep -q "postgres"; then
    echo "Testing GitHub connectivity..."
    curl -s --max-time 30 https://github.com/dokku/dokku-postgres.git | head -n 1
    
    echo "Installing PostgreSQL plugin..."
    dokku plugin:install https://github.com/dokku/dokku-postgres.git postgres
    echo "PostgreSQL plugin installed"
else
    echo "PostgreSQL plugin already installed, skipping..."
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

# Create a swap file for database server (idempotent)
echo "💾 Creating swap file for database server..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
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

# Create the main database (idempotent)
echo "🗄️  Creating main database..."
if ! dokku postgres:list | grep -q "rabbit-hq-db"; then
    dokku postgres:create rabbit-hq-db
    echo "Database 'rabbit-hq-db' created successfully"
else
    echo "Database 'rabbit-hq-db' already exists, skipping creation..."
fi

# Configure PostgreSQL for external connections (idempotent)
echo "🔗 Configuring PostgreSQL for external connections..."
if ! dokku postgres:info rabbit-hq-db | grep -q "Exposed ports.*5432"; then
    dokku postgres:expose rabbit-hq-db 5432
    echo "PostgreSQL exposed on port 5432"
else
    echo "PostgreSQL already exposed on port 5432, skipping..."
fi

echo "✅ Database server setup complete!"
echo ""
echo "Database is ready and accessible on port 5432"
echo "🎉 Database server is ready!"
