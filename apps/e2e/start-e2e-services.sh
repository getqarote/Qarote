#!/bin/bash

# E2E Test Services Startup Script
# This script starts the required PostgreSQL and RabbitMQ services for E2E testing

set -e

echo "🚀 Starting Qarote E2E Test Services..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Check if Docker Compose is available  
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available"
    exit 1
fi

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker/docker-compose.e2e.yml"

echo "📂 Using compose file: $COMPOSE_FILE"

# Start services in detached mode
echo "🐘 Starting PostgreSQL (port 5433)..."
echo "🐰 Starting RabbitMQ (ports 5682, 15682)..."

docker compose -f "$COMPOSE_FILE" up -d

echo "⏳ Waiting for services to be healthy..."

# Wait for services to be ready
timeout=60
elapsed=0
interval=2

while [ $elapsed -lt $timeout ]; do
    if docker compose -f "$COMPOSE_FILE" ps --format json | jq -r '.[].Health' | grep -v "healthy" | grep -v "null" &> /dev/null; then
        echo "⏰ Services starting... (${elapsed}s/${timeout}s)"
        sleep $interval
        elapsed=$((elapsed + interval))
    else
        break
    fi
done

# Check final status
echo "📋 Service Status:"
docker compose -f "$COMPOSE_FILE" ps

# Test connections
echo "🔌 Testing connections..."

# Test PostgreSQL
if pg_isready -h localhost -p 5433 -U postgres &> /dev/null; then
    echo "✅ PostgreSQL is ready on port 5433"
else
    echo "⚠️  PostgreSQL connection test failed (pg_isready not available or service not ready)"
fi

# Test RabbitMQ AMQP
if timeout 3 bash -c "</dev/tcp/localhost/5682" &> /dev/null; then
    echo "✅ RabbitMQ AMQP is ready on port 5682"
else
    echo "⚠️  RabbitMQ AMQP connection test failed"
fi

# Test RabbitMQ Management
if timeout 3 bash -c "</dev/tcp/localhost/15682" &> /dev/null; then
    echo "✅ RabbitMQ Management is ready on port 15682"
    echo "🌐 Management UI: http://localhost:15682 (admin/admin123)"
else
    echo "⚠️  RabbitMQ Management connection test failed"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Run tests: cd apps/e2e && pnpm test"
echo "2. View RabbitMQ: http://localhost:15682"
echo "3. Stop services: docker compose -f docker/docker-compose.e2e.yml down"

echo ""
echo "✨ E2E services are ready!"