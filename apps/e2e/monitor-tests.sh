#!/bin/bash

# Test Monitor Script
# Runs E2E tests periodically and reports status to Brice

set -e

echo "🎯 Monitoring E2E Tests - Will notify when passing"

# Configuration
MAX_ATTEMPTS=10
ATTEMPT=1
SLEEP_INTERVAL=30  # seconds between attempts

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run a single test attempt
run_test() {
    local attempt=$1
    echo -e "${YELLOW}📋 Test Attempt ${attempt}/${MAX_ATTEMPTS} - $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    
    # Set environment variables for test
    export NODE_ENV=test
    export DATABASE_URL=postgres://postgres:password@localhost:5433/qarote_e2e
    export API_URL=http://localhost:3001
    export PORT=3001
    export APP_PORT=8081
    
    # Run a simple smoke test first
    if pnpm test:smoke --reporter=list --max-failures=1 &>/tmp/test-output.log; then
        echo -e "${GREEN}✅ TESTS ARE PASSING! ✅${NC}"
        echo -e "${GREEN}🎉 E2E Smoke tests completed successfully!${NC}"
        
        # Show test summary
        echo -e "\n📋 Test Summary:"
        tail -10 /tmp/test-output.log || echo "Could not show test output"
        
        echo -e "\n🚨 NOTIFICATION FOR BRICE:"
        echo -e "${GREEN}✅ E2E tests are now PASSING! ✅${NC}"
        echo -e "${GREEN}Time: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
        echo -e "${GREEN}Test Type: Smoke tests${NC}"
        
        return 0  # Success - tests are passing
    else
        echo -e "${RED}❌ Tests failed (attempt ${attempt})${NC}"
        
        # Show error details for debugging
        echo -e "\n🔍 Error Output:"
        tail -5 /tmp/test-output.log || echo "Could not show error output"
        
        return 1  # Failure - tests still failing
    fi
}

# Main monitoring loop
echo -e "🔄 Starting monitoring loop..."
echo -e "⏰ Will check every ${SLEEP_INTERVAL} seconds"

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if run_test $ATTEMPT; then
        echo -e "\n${GREEN}🎉 SUCCESS! Tests are passing, monitoring complete.${NC}"
        exit 0
    else
        if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
            echo -e "${YELLOW}⏳ Waiting ${SLEEP_INTERVAL} seconds before next attempt...${NC}"
            sleep $SLEEP_INTERVAL
        fi
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

echo -e "\n${RED}⚠️ Monitoring completed - tests still failing after ${MAX_ATTEMPTS} attempts${NC}"
echo -e "${YELLOW}💡 Check the E2E setup guide: apps/e2e/README.md${NC}"
exit 1