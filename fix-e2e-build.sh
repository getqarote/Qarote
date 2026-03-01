#!/bin/bash

# E2E Build Fix Script
# This ensures all dependencies are properly built before running E2E tests

set -e

echo "🔧 E2E Build Fix - Ensuring all dependencies are ready"

# Build all packages in correct order
echo "📦 Building i18n package..."
cd packages/i18n && pnpm build && cd ../..

# Install playwright with system dependencies
echo "🎭 Installing Playwright dependencies..."
cd apps/e2e && pnpm install && npx playwright install --with-deps chromium && cd ../..

# Verify i18n build
echo "✅ Verifying i18n build..."
if [ -f "packages/i18n/dist/index.js" ]; then
    echo "✅ i18n package built successfully"
else
    echo "❌ i18n package build failed"
    exit 1
fi

# Generate Prisma client  
echo "🗃️ Generating Prisma client..."
cd apps/api && pnpm exec prisma generate && cd ../..

echo "🎯 All dependencies are ready for E2E tests!"

# Optional: run a quick smoke test
if [ "$1" = "--test" ]; then
    echo "🧪 Running quick smoke test..."
    export NODE_ENV=test
    export DATABASE_URL=postgres://postgres:password@localhost:5433/qarote_e2e
    cd apps/e2e && timeout 30 npx playwright test tests/smoke --project=selfhosted --reporter=list --max-failures=1 || echo "⚠️ Test still failing - check services"
fi