#!/bin/bash

# Comprehensive E2E Test Monitor for Qarote
# This script will monitor E2E tests and notify Brice when they start passing

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
MAX_ATTEMPTS=20
ATTEMPT=1
SLEEP_INTERVAL=60  # 1 minute between attempts
LOG_FILE="/tmp/qarote-test-monitor.log"

echo "🎯 Qarote E2E Test Monitor Started" | tee $LOG_FILE
echo "📅 $(date)" | tee -a $LOG_FILE
echo "⏰ Will check every ${SLEEP_INTERVAL} seconds for up to ${MAX_ATTEMPTS} attempts" | tee -a $LOG_FILE

# Function to setup environment
setup_environment() {
    echo -e "${BLUE}🔧 Setting up test environment...${NC}" | tee -a $LOG_FILE
    
    # Build i18n package if needed
    if [ ! -f "packages/i18n/dist/index.js" ]; then
        echo "🏗️  Building i18n package..." | tee -a $LOG_FILE
        cd packages/i18n && pnpm build && cd ../..
    fi
    
    # Set environment variables
    export NODE_ENV=test
    export DATABASE_URL=postgres://postgres:password@localhost:5433/qarote_e2e
    export API_URL=http://localhost:3001
    export PORT=3001
    export APP_PORT=8081
    export DEPLOYMENT_MODE=selfhosted
    
    echo "✅ Environment setup complete" | tee -a $LOG_FILE
}

# Function to run test
run_test_attempt() {
    local attempt=$1
    echo -e "\n${YELLOW}📋 Test Attempt ${attempt}/${MAX_ATTEMPTS} - $(date '+%H:%M:%S')${NC}" | tee -a $LOG_FILE
    
    # Try to run a basic smoke test
    cd apps/e2e
    
    # Create a test output file
    local test_output="/tmp/test-attempt-${attempt}.log"
    
    if timeout 120 npx playwright test tests/smoke --project=selfhosted --reporter=list --max-failures=1 > $test_output 2>&1; then
        echo -e "${GREEN}🎉 SUCCESS! E2E TESTS ARE NOW PASSING! 🎉${NC}" | tee -a $LOG_FILE
        echo -e "${GREEN}✅ Smoke tests completed successfully at $(date)${NC}" | tee -a $LOG_FILE
        
        # Show test results
        echo -e "\n📊 Test Results:" | tee -a $LOG_FILE
        tail -20 $test_output | tee -a $LOG_FILE
        
        # Big notification for Brice
        echo -e "\n${GREEN}🚨 NOTIFICATION FOR BRICE 🚨${NC}" | tee -a $LOG_FILE
        echo -e "${GREEN}✅ E2E tests are now PASSING!${NC}" | tee -a $LOG_FILE
        echo -e "${GREEN}📍 Time: $(date)${NC}" | tee -a $LOG_FILE
        echo -e "${GREEN}🧪 Test Type: Smoke tests${NC}" | tee -a $LOG_FILE
        echo -e "${GREEN}🔗 Check the full results above${NC}" | tee -a $LOG_FILE
        
        cd ../..
        return 0
    else
        echo -e "${RED}❌ Tests failed (attempt ${attempt})${NC}" | tee -a $LOG_FILE
        
        # Show the last few lines of error output
        echo "🔍 Last few lines of output:" | tee -a $LOG_FILE
        tail -5 $test_output | tee -a $LOG_FILE
        
        cd ../..
        return 1
    fi
}

# Main execution
echo -e "${BLUE}🚀 Starting Qarote E2E Test Monitor...${NC}"

# Setup environment first
setup_environment

# Main monitoring loop
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if run_test_attempt $ATTEMPT; then
        echo -e "\n${GREEN}🏁 Monitoring complete - TESTS ARE PASSING!${NC}" | tee -a $LOG_FILE
        echo -e "${GREEN}📄 Full log available at: $LOG_FILE${NC}" | tee -a $LOG_FILE
        exit 0
    else
        if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
            echo -e "${YELLOW}⏳ Waiting ${SLEEP_INTERVAL} seconds before next attempt...${NC}" | tee -a $LOG_FILE
            sleep $SLEEP_INTERVAL
        fi
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

# If we get here, tests are still failing
echo -e "\n${RED}⚠️  Monitoring completed - tests still failing after ${MAX_ATTEMPTS} attempts${NC}" | tee -a $LOG_FILE
echo -e "${YELLOW}💡 Check the setup guide: apps/e2e/README.md${NC}" | tee -a $LOG_FILE
echo -e "${YELLOW}📄 Full log available at: $LOG_FILE${NC}" | tee -a $LOG_FILE

exit 1