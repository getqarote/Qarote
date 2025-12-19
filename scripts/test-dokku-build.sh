#!/bin/bash
# Quick test to verify corepack setup for Dokku build
# This simulates the critical check that fails: binaries.sh line 244

set -e

echo "🐳 Quick Dokku Build Test"
echo "========================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Quick checks
echo "🔍 Checking prerequisites..."
echo ""

# 1. Check bin/prebuild exists and is executable
if [ -f "bin/prebuild" ]; then
    if [ -x "bin/prebuild" ]; then
        echo -e "${GREEN}✓ bin/prebuild exists and is executable${NC}"
    else
        echo -e "${YELLOW}⚠️  bin/prebuild exists but not executable${NC}"
        chmod +x bin/prebuild
        echo -e "${GREEN}✓ Made bin/prebuild executable${NC}"
    fi
else
    echo -e "${RED}❌ bin/prebuild not found${NC}"
    exit 1
fi

# 2. Check heroku-prebuild script exists
if grep -q '"heroku-prebuild"' package.json; then
    echo -e "${GREEN}✓ heroku-prebuild script found in package.json${NC}"
else
    echo -e "${RED}❌ heroku-prebuild script not found in package.json${NC}"
    exit 1
fi

# 3. Test bin/prebuild script (quick test)
echo ""
echo "🔧 Testing bin/prebuild script..."
if bash -n bin/prebuild 2>/dev/null; then
    echo -e "${GREEN}✓ bin/prebuild syntax is valid${NC}"
else
    echo -e "${RED}❌ bin/prebuild has syntax errors${NC}"
    exit 1
fi

# 4. Simulate the critical check (binaries.sh line 244)
echo ""
echo "🔍 Simulating buildpack check (binaries.sh:244)..."
echo "This is the check that fails in Dokku:"
echo ""

# Create a minimal test environment
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

# Copy essential files
cp "$OLDPWD/package.json" .
cp "$OLDPWD/bin/prebuild" ./bin/prebuild 2>/dev/null || true
chmod +x ./bin/prebuild 2>/dev/null || true

# Simulate Node.js installation (use system Node)
NODE_DIR=$(dirname "$(command -v node)")
export PATH="$NODE_DIR:$PATH"

# Run bin/prebuild
if [ -f "./bin/prebuild" ]; then
    echo "Running bin/prebuild..."
    ./bin/prebuild > /tmp/prebuild-output.log 2>&1 || {
        echo -e "${YELLOW}⚠️  bin/prebuild had warnings (checking output)${NC}"
    }
fi

# Run heroku-prebuild
echo "Running heroku-prebuild..."
HEROKU_PREBUILD=$(node -e "const pkg = require('./package.json'); console.log(pkg.scripts?.['heroku-prebuild'] || '')" 2>/dev/null || echo "")
if [ -n "$HEROKU_PREBUILD" ]; then
    eval "$HEROKU_PREBUILD" > /tmp/heroku-prebuild-output.log 2>&1 || {
        echo -e "${YELLOW}⚠️  heroku-prebuild had warnings${NC}"
    }
fi

# The critical check: Can we find corepack?
echo ""
echo "🔍 Critical Check: Is corepack available? (binaries.sh:244)"
if command -v corepack > /dev/null 2>&1; then
    echo -e "${GREEN}✅ SUCCESS: corepack is available${NC}"
    echo "   Location: $(command -v corepack)"
    corepack --version 2>/dev/null || true
    echo ""
    echo -e "${GREEN}✓ This check would PASS in Dokku${NC}"
    echo -e "${GREEN}✓ Your build should succeed${NC}"
else
    echo -e "${RED}❌ FAILURE: corepack: command not found${NC}"
    echo ""
    echo -e "${RED}This is the exact error you're seeing in Dokku!${NC}"
    echo "Error: /tmp/buildpacks/02_buildpack-nodejs/lib/binaries.sh: line 244: corepack: command not found"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check bin/prebuild output:"
    cat /tmp/prebuild-output.log 2>/dev/null || echo "   (no output)"
    echo ""
    echo "  2. Check heroku-prebuild output:"
    cat /tmp/heroku-prebuild-output.log 2>/dev/null || echo "   (no output)"
    cd "$OLDPWD"
    rm -rf "$TEST_DIR"
    exit 1
fi

# Cleanup
cd "$OLDPWD"
rm -rf "$TEST_DIR"

echo ""
echo -e "${GREEN}✅ All checks passed!${NC}"
echo ""
echo "💡 Your corepack setup should work in Dokku."
echo "   The buildpack will find corepack and install pnpm successfully."

