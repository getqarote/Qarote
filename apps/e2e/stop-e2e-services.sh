#!/bin/bash

# E2E Test Services Shutdown Script
# This script stops the PostgreSQL and RabbitMQ services used for E2E testing

set -e

echo "🛑 Stopping Qarote E2E Test Services..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker/docker-compose.e2e.yml"

echo "📂 Using compose file: $COMPOSE_FILE"

# Check if services are running
if docker compose -f "$COMPOSE_FILE" ps --services --filter "status=running" | grep -q .; then
    echo "🔽 Stopping services..."
    docker compose -f "$COMPOSE_FILE" down
    
    echo "📋 Final status:"
    docker compose -f "$COMPOSE_FILE" ps
    
    echo "✅ E2E services stopped"
else
    echo "ℹ️  No E2E services were running"
fi

# Option to remove volumes (data cleanup)
read -p "🗑️  Remove test data volumes? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Removing volumes..."
    docker compose -f "$COMPOSE_FILE" down -v
    echo "✅ Test data cleaned up"
fi

echo "🏁 Cleanup complete!"