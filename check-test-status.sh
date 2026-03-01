#!/bin/bash

# Quick status check for E2E test monitoring

echo "🎯 Qarote E2E Test Status Check"
echo "==============================="

# Check if monitor is running
if pgrep -f "test-monitor.sh" > /dev/null; then
    echo "✅ Test monitor is RUNNING"
else
    echo "❌ Test monitor is NOT running"
fi

# Show latest log entries
LOG_FILE="/tmp/qarote-test-monitor.log"
if [ -f "$LOG_FILE" ]; then
    echo ""
    echo "📋 Latest monitoring activity:"
    echo "------------------------------"
    tail -10 "$LOG_FILE"
    
    echo ""
    echo "📄 Full log: $LOG_FILE"
else
    echo "❌ No log file found at $LOG_FILE"
fi

# Check for test success markers
if [ -f "$LOG_FILE" ] && grep -q "TESTS ARE NOW PASSING" "$LOG_FILE"; then
    echo ""
    echo "🎉 SUCCESS: Tests are passing! Check the log above for details."
elif [ -f "$LOG_FILE" ] && grep -q "tests still failing after" "$LOG_FILE"; then
    echo ""
    echo "⚠️  Monitoring completed - tests still failing. Check the E2E setup."
fi