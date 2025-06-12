#!/bin/bash

# Wait for RabbitMQ to be ready
echo "Waiting for RabbitMQ to be ready..."
until rabbitmq-diagnostics -q ping; do
  echo "RabbitMQ is not ready yet. Waiting..."
  sleep 2
done

echo "RabbitMQ is ready. Populating with sample data..."

# RabbitMQ credentials
RABBITMQ_USER="admin"
RABBITMQ_PASS="admin123"
RABBITMQ_HOST="localhost"
RABBITMQ_PORT="15672"

# Function to publish messages
publish_message() {
  local exchange=$1
  local routing_key=$2
  local message=$3
  local count=${4:-1}
  
  for i in $(seq 1 $count); do
    rabbitmqadmin -H $RABBITMQ_HOST -P $RABBITMQ_PORT -u $RABBITMQ_USER -p $RABBITMQ_PASS \
      publish exchange="$exchange" routing_key="$routing_key" payload="$message"
    sleep 0.1
  done
}

# Enable rabbitmqadmin
rabbitmq-plugins enable rabbitmq_management

# Wait longer for management plugin to be ready
echo "Waiting for management API to be ready..."
sleep 10

# Test connection with debugging
echo "Testing rabbitmqadmin connection..."
echo "Trying to list users..."
rabbitmqadmin -H $RABBITMQ_HOST -P $RABBITMQ_PORT -u $RABBITMQ_USER -p $RABBITMQ_PASS list users

if [ $? -ne 0 ]; then
  echo "Failed to connect with admin credentials. Trying with guest..."
  rabbitmqadmin -H $RABBITMQ_HOST -P $RABBITMQ_PORT -u guest -p admin123 list users
  if [ $? -eq 0 ]; then
    echo "Using guest credentials instead"
    RABBITMQ_USER="guest"
  else
    echo "Failed to connect to RabbitMQ Management API. Checking what's available..."
    echo "Checking if management UI is accessible..."
    curl -u admin:admin123 http://localhost:15672/api/overview || echo "API not accessible"
    exit 1
  fi
fi

echo "Connection successful. Checking exchanges..."
rabbitmqadmin -H $RABBITMQ_HOST -P $RABBITMQ_PORT -u $RABBITMQ_USER -p $RABBITMQ_PASS list exchanges

echo "Starting data population..."

# Populate email notifications
echo "Publishing email notifications..."
publish_message "notifications.direct" "email" '{"type":"welcome","userId":"user123","email":"user@example.com","template":"welcome_email"}' 25
publish_message "notifications.direct" "email" '{"type":"password_reset","userId":"user456","email":"admin@example.com","template":"reset_password"}' 15
publish_message "notifications.direct" "email" '{"type":"order_confirmation","userId":"user789","email":"customer@example.com","orderId":"order123"}' 30

# Populate SMS notifications
echo "Publishing SMS notifications..."
publish_message "notifications.direct" "sms" '{"type":"verification","userId":"user123","phone":"+1234567890","code":"123456"}' 10
publish_message "notifications.direct" "sms" '{"type":"alert","userId":"user456","phone":"+0987654321","message":"Account locked"}' 5

# Populate user events
echo "Publishing user events..."
publish_message "user.events" "user.registered" '{"userId":"user001","email":"new@example.com","timestamp":"2024-01-15T10:30:00Z"}' 12
publish_message "user.events" "user.login" '{"userId":"user123","ip":"192.168.1.100","timestamp":"2024-01-15T11:45:00Z"}' 45
publish_message "user.events" "user.login" '{"userId":"user456","ip":"10.0.0.50","timestamp":"2024-01-15T12:15:00Z"}' 23

# Populate order processing
echo "Publishing order events..."
publish_message "events.topic" "order.created" '{"orderId":"order123","userId":"user789","amount":99.99,"items":[{"id":"item1","quantity":2}]}' 18
publish_message "events.topic" "order.updated" '{"orderId":"order124","status":"processing","updatedAt":"2024-01-15T13:20:00Z"}' 8
publish_message "events.topic" "order.shipped" '{"orderId":"order125","trackingNumber":"TRACK123","carrier":"UPS"}' 22

# Populate payment processing
echo "Publishing payment events..."
publish_message "events.topic" "payment.initiated" '{"paymentId":"pay123","orderId":"order123","amount":99.99,"method":"credit_card"}' 15
publish_message "events.topic" "payment.completed" '{"paymentId":"pay124","status":"success","transactionId":"txn456"}' 12
publish_message "events.topic" "payment.failed" '{"paymentId":"pay125","status":"failed","reason":"insufficient_funds"}' 3

# Populate analytics data
echo "Publishing analytics events..."
publish_message "analytics.fanout" "" '{"event":"click","elementId":"button-signup","userId":"user123","timestamp":"2024-01-15T14:30:00Z"}' 120
publish_message "analytics.fanout" "" '{"event":"pageview","page":"/dashboard","userId":"user456","sessionId":"sess789"}' 85

# Populate system alerts
echo "Publishing system alerts..."
publish_message "system.alerts" "critical" '{"level":"critical","service":"database","message":"High CPU usage detected","timestamp":"2024-01-15T15:00:00Z"}' 3
publish_message "system.alerts" "warning" '{"level":"warning","service":"api","message":"Response time above threshold","timestamp":"2024-01-15T15:05:00Z"}' 8
publish_message "system.alerts" "info" '{"level":"info","service":"cache","message":"Cache cleared successfully","timestamp":"2024-01-15T15:10:00Z"}' 15

echo "Sample data population completed!"
echo "You can access RabbitMQ Management UI at http://localhost:15672"
echo "Username: admin, Password: admin123"