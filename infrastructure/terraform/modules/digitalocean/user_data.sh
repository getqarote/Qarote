#!/bin/bash
set -e

# Update system
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

# Install required packages
apt-get install -y curl gnupg apt-transport-https

# Add RabbitMQ repository
curl -1sLf "https://keys.openpgp.org/vks/v1/by-fingerprint/0A9AF2115F4687BD29803A206B73A36E6026DFCA" | gpg --dearmor | tee /usr/share/keyrings/com.rabbitmq.team.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/com.rabbitmq.team.gpg] https://ppa1.novemberain.com/rabbitmq/rabbitmq-erlang/ubuntu jammy main" | tee /etc/apt/sources.list.d/rabbitmq.list
echo "deb [signed-by=/usr/share/keyrings/com.rabbitmq.team.gpg] https://ppa1.novemberain.com/rabbitmq/rabbitmq-server/ubuntu jammy main" | tee -a /etc/apt/sources.list.d/rabbitmq.list

# Install RabbitMQ
apt-get update
apt-get install -y rabbitmq-server

# Enable RabbitMQ management plugin
rabbitmq-plugins enable rabbitmq_management

# Start RabbitMQ
systemctl start rabbitmq-server
systemctl enable rabbitmq-server

# Wait for RabbitMQ to be ready
sleep 10

# Create admin user
rabbitmqctl add_user "${rabbitmq_admin_user}" "${rabbitmq_admin_password}"
rabbitmqctl set_user_tags "${rabbitmq_admin_user}" administrator
rabbitmqctl set_permissions -p / "${rabbitmq_admin_user}" ".*" ".*" ".*"

# Delete default guest user for security
rabbitmqctl delete_user guest

# Configure RabbitMQ
cat > /etc/rabbitmq/rabbitmq.conf <<EOF
# Management UI
management.tcp.port = 15672
management.tcp.ip = 0.0.0.0

# AMQP port
listeners.tcp.default = 5672

# Enable management UI
management.listener.port = 15672
management.listener.ssl = false
EOF

# Restart RabbitMQ to apply configuration
systemctl restart rabbitmq-server

# Log completion
echo "RabbitMQ installation and configuration completed successfully" >> /var/log/rabbitmq-setup.log
