#!/bin/bash
# Script to test GitHub Actions workflows locally using act
# This script handles platform-specific dependency issues

set -e

WORKFLOW_FILE="${1:-.github/workflows/deploy-api-staging.yml}"
JOB_NAME="${2:-quality-checks}"

echo "🧪 Testing GitHub Actions workflow locally with act"
echo "📄 Workflow: $WORKFLOW_FILE"
echo "🔧 Job: $JOB_NAME"
echo ""

# Check if act is installed
if ! command -v act &> /dev/null; then
    echo "❌ act is not installed. Install it with: brew install act"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Note: The workflow runs 'npm ci' which should install platform-specific dependencies
# However, if you encounter rollup/native module errors, you may need to:
# 1. Remove node_modules before running: rm -rf node_modules
# 2. Or use a clean workspace copy

echo "🚀 Running act..."
echo "💡 Note: If you see rollup native module errors, try: rm -rf node_modules && npm install"
echo ""

# Run act with the specified workflow and job
# Using --rm to clean up containers after run
act -j "$JOB_NAME" \
    -W "$WORKFLOW_FILE" \
    --rm \
    --container-architecture linux/amd64 \
    -P ubuntu-latest=catthehacker/ubuntu:act-latest

echo ""
echo "✅ Workflow test completed!"

