#!/bin/bash
set -e

# Log all output
exec > >(tee -a /var/log/rabbitmq-setup.log) 2>&1

# Update system
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

# Install required packages
apt-get install -y curl gnupg apt-transport-https

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

# Log completion
echo "RabbitMQ installation and configuration completed successfully at $(date)" >> /var/log/rabbitmq-setup.log
rabbitmqctl status >> /var/log/rabbitmq-setup.log
