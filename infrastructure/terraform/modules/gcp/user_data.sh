#!/bin/bash
set -e

# Log all output
exec > >(tee -a /var/log/rabbitmq-setup.log) 2>&1

# Update system
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

# Install required packages
apt-get install -y curl gnupg apt-transport-https nginx certbot python3-certbot-nginx

# Add RabbitMQ repository (using correct official repository URLs)
curl -1sLf "https://keys.openpgp.org/vks/v1/by-fingerprint/0A9AF2115F4687BD29803A206B73A36E6026DFCA" | gpg --dearmor | tee /usr/share/keyrings/com.rabbitmq.team.gpg > /dev/null
tee /etc/apt/sources.list.d/rabbitmq.list <<EOF
## RabbitMQ Erlang Repository
deb [signed-by=/usr/share/keyrings/com.rabbitmq.team.gpg] https://deb.rabbitmq.com/rabbitmq-erlang/debian jammy main
## RabbitMQ Server Repository
deb [signed-by=/usr/share/keyrings/com.rabbitmq.team.gpg] https://deb.rabbitmq.com/rabbitmq-server/debian jammy main
EOF

# Install RabbitMQ
apt-get update
apt-get install -y rabbitmq-server

# Start and enable RabbitMQ
systemctl start rabbitmq-server
systemctl enable rabbitmq-server

# Wait for RabbitMQ to be fully ready (with retries)
echo "Waiting for RabbitMQ to be ready..."
for i in {1..30}; do
  if rabbitmqctl status > /dev/null 2>&1; then
    echo "RabbitMQ is ready!"
    break
  fi
  echo "Waiting for RabbitMQ... attempt $i/30"
  sleep 2
done

# Enable RabbitMQ management plugin
rabbitmq-plugins enable rabbitmq_management

# Wait a bit more for plugin to be enabled
sleep 5

# Create admin user (with error handling - user might already exist)
if ! rabbitmqctl list_users | grep -q "^${rabbitmq_admin_user}"; then
  rabbitmqctl add_user "${rabbitmq_admin_user}" "${rabbitmq_admin_password}" || true
fi
rabbitmqctl set_user_tags "${rabbitmq_admin_user}" administrator || true
rabbitmqctl set_permissions -p / "${rabbitmq_admin_user}" ".*" ".*" ".*" || true

# Delete default guest user for security (ignore if already deleted)
rabbitmqctl delete_user guest 2>/dev/null || true

# Configure RabbitMQ
cat > /etc/rabbitmq/rabbitmq.conf <<EOF
# AMQP listener
listeners.tcp.default = 5672

# Management UI listener (binds to all interfaces by default)
management.listener.port = 15672
EOF

# Restart RabbitMQ to apply configuration
systemctl restart rabbitmq-server

# Wait for RabbitMQ to be ready after restart
sleep 10
for i in {1..20}; do
  if rabbitmqctl status > /dev/null 2>&1; then
    break
  fi
  sleep 2
done

# Configure Nginx as reverse proxy for RabbitMQ Management UI
if [ -n "${domain_name}" ]; then
  echo "Configuring Nginx and SSL for ${domain_name}..."
  
  # Create webroot for Let's Encrypt
  mkdir -p /var/www/html
  
  # Configure Nginx initially with HTTP only (certbot will add HTTPS)
  cat > /etc/nginx/sites-available/rabbitmq <<EOF
server {
    listen 80;
    server_name ${domain_name};
    
    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Proxy to RabbitMQ Management UI (HTTP for now, certbot will add HTTPS)
    location / {
        proxy_pass http://localhost:15672;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

  # Enable the site
  ln -sf /etc/nginx/sites-available/rabbitmq /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  
  # Test Nginx configuration
  nginx -t || {
    echo "Nginx configuration test failed"
    exit 1
  }
  
  # Start Nginx
  systemctl restart nginx
  systemctl enable nginx
  
  # Verify nginx is running
  if ! systemctl is-active --quiet nginx; then
    echo "Nginx failed to start"
    systemctl status nginx
    exit 1
  fi
  
  # Wait for DNS to propagate (give it a moment)
  echo "Waiting for DNS to propagate..."
  sleep 60
  
  # Obtain SSL certificate (certbot will automatically add HTTPS server block and redirect)
  certbot --nginx -d ${domain_name} --non-interactive --agree-tos --email tessierhuort@gmail.com --redirect --no-eff-email || {
    echo "Certbot failed. You can retry manually later with: sudo certbot --nginx -d ${domain_name}"
    echo "HTTP will work for now at http://${domain_name}"
  }
  
  # Set up automatic renewal
  systemctl enable certbot.timer
  systemctl start certbot.timer
  
  echo "HTTPS configured for ${domain_name}"
else
  echo "No domain name provided, skipping HTTPS setup"
fi

# Log completion
echo "RabbitMQ installation and configuration completed successfully at $(date)" >> /var/log/rabbitmq-setup.log
rabbitmqctl status >> /var/log/rabbitmq-setup.log
