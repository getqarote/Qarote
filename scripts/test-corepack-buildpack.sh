#!/bin/bash
# Test script to simulate Heroku buildpack behavior and test corepack setup
# This helps reproduce the corepack: command not found error locally

set -e

echo "🧪 Testing Heroku Buildpack Corepack Setup"
echo "=========================================="
echo ""

# Create a temporary directory to simulate build environment
TEST_DIR=$(mktemp -d)
echo "📁 Test directory: $TEST_DIR"
cd "$TEST_DIR"

# Copy package.json to test directory
cp "$OLDPWD/package.json" .
# Copy bin/prebuild if it exists
if [ -f "$OLDPWD/bin/prebuild" ]; then
  mkdir -p ./bin
  cp "$OLDPWD/bin/prebuild" ./bin/prebuild
  chmod +x ./bin/prebuild
  echo "✓ Copied bin/prebuild"
else
  echo "Note: bin/prebuild not found, will test heroku-prebuild only"
fi

# Simulate Node.js installation (using system Node.js)
NODE_VERSION=$(node --version)
echo "📦 Node.js version: $NODE_VERSION"

# Check if corepack exists
if command -v corepack &> /dev/null; then
  echo "✓ corepack found in PATH: $(command -v corepack)"
else
  NODE_DIR=$(dirname "$(command -v node)")
  COREPACK_PATH="$NODE_DIR/corepack"
  if [ -f "$COREPACK_PATH" ]; then
    echo "✓ corepack found at: $COREPACK_PATH"
    export PATH="$NODE_DIR:$PATH"
  else
    echo "❌ corepack not found"
    echo "   This simulates the error you're seeing in Dokku"
    exit 1
  fi
fi

# Test bin/prebuild script if it exists
if [ -f "./bin/prebuild" ]; then
  echo ""
  echo "🔧 Testing bin/prebuild script..."
  chmod +x ./bin/prebuild
  ./bin/prebuild || {
    echo "❌ bin/prebuild failed"
    exit 1
  }
  echo "✓ bin/prebuild completed"
fi

# Test heroku-prebuild script
echo ""
echo "🔧 Testing heroku-prebuild script..."
if [ -f "package.json" ]; then
  # Extract and run heroku-prebuild
  HEROKU_PREBUILD=$(node -e "const pkg = require('./package.json'); console.log(pkg.scripts?.['heroku-prebuild'] || '')")
  if [ -n "$HEROKU_PREBUILD" ]; then
    echo "Running: $HEROKU_PREBUILD"
    eval "$HEROKU_PREBUILD" || {
      echo "❌ heroku-prebuild failed"
      exit 1
    }
    echo "✓ heroku-prebuild completed"
  else
    echo "⚠️  No heroku-prebuild script found in package.json"
  fi
fi

# Verify corepack is enabled and pnpm is available
echo ""
echo "🔍 Verifying corepack setup..."
if command -v corepack &> /dev/null; then
  echo "✓ corepack is available"
  corepack --version || true
else
  echo "❌ corepack not available after setup"
  exit 1
fi

# Try to use corepack to prepare pnpm (simulating what buildpack does)
echo ""
echo "🔍 Testing pnpm availability via corepack..."
if corepack prepare pnpm@9.0.0 --activate &>/dev/null; then
  echo "✓ corepack can prepare pnpm@9.0.0"
else
  echo "⚠️  corepack prepare failed (this might be expected in test environment)"
fi

# Simulate what binaries.sh line 244 does
echo ""
echo "🔍 Simulating buildpack binaries.sh behavior..."
if command -v corepack &> /dev/null; then
  echo "✓ corepack command is available (buildpack would succeed)"
  echo "   Location: $(command -v corepack)"
else
  echo "❌ corepack command not found (this is the error you're seeing)"
  echo "   This simulates: /tmp/buildpacks/02_buildpack-nodejs/lib/binaries.sh: line 244: corepack: command not found"
  exit 1
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
cd "$OLDPWD"
rm -rf "$TEST_DIR"

echo ""
echo "✅ Corepack setup test completed successfully!"
echo ""
echo "💡 If this test passes but Dokku still fails, check:"
echo "   1. Is bin/prebuild executable? (chmod +x bin/prebuild)"
echo "   2. Is bin/prebuild in the git repository?"
echo "   3. Are there any PATH issues in the Dokku build environment?"

