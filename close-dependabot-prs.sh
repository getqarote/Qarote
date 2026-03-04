#!/bin/bash

# Script to close all individual Dependabot PRs since they were consolidated in PR #219

set -euo pipefail

echo "🔄 Closing individual Dependabot PRs (consolidated in #219)..."

# Get all open Dependabot PRs (using cut instead of jq)
DEPENDABOT_PRS=$(gh pr list --limit 50 --author "dependabot[bot]" --state open | cut -f1)

if [ -z "$DEPENDABOT_PRS" ]; then
    echo "ℹ️  No Dependabot PRs found to close"
    exit 0
fi

CLOSE_MESSAGE="Closing this individual Dependabot PR as it was consolidated into #219.

All dependency updates from this PR have been included in the consolidated update that was successfully merged.

✅ Changes included in: #219 - Consolidate Dependabot Updates (25+ PRs)  
🤖 Automated closure by Qarote Monitoring Agent"

CLOSED_COUNT=0
FAILED_COUNT=0

for PR_NUMBER in $DEPENDABOT_PRS; do
    echo "📝 Closing PR #${PR_NUMBER}..."
    
    if gh pr close "$PR_NUMBER" --comment "$CLOSE_MESSAGE"; then
        echo "✅ Closed PR #${PR_NUMBER}"
        CLOSED_COUNT=$((CLOSED_COUNT + 1))
    else
        echo "❌ Failed to close PR #${PR_NUMBER}"
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
    
    # Small delay to avoid rate limiting
    sleep 0.5
done

echo ""
echo "📊 Summary:"
echo "✅ Successfully closed: ${CLOSED_COUNT} PRs"
echo "❌ Failed to close: ${FAILED_COUNT} PRs"
echo "🎉 All individual Dependabot PRs have been cleaned up!"