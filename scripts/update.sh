#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Qarote Self-Hosted Update${NC}"
echo "========================="

# Check we're in the right directory
if [ ! -f "docker-compose.selfhosted.yml" ]; then
    echo -e "${RED}Error: docker-compose.selfhosted.yml not found.${NC}"
    echo "Please run this script from the Qarote root directory."
    exit 1
fi

# Read current version
OLD_VERSION=$(cat VERSION 2>/dev/null || echo "unknown")
echo -e "Current version: ${YELLOW}${OLD_VERSION}${NC}"

# Step 1: Pull latest changes
echo -e "\n${YELLOW}[1/3] Pulling latest changes...${NC}"
if ! git pull origin main; then
    echo -e "${RED}Failed to pull latest changes. Check your git configuration and network.${NC}"
    exit 1
fi

# Read new version
NEW_VERSION=$(cat VERSION 2>/dev/null || echo "unknown")

# Step 2: Rebuild containers
echo -e "\n${YELLOW}[2/3] Rebuilding Docker containers...${NC}"
if ! docker compose -f docker-compose.selfhosted.yml build; then
    echo -e "${RED}Docker build failed. Check the output above for details.${NC}"
    exit 1
fi

# Step 3: Restart containers (migrations run automatically on start)
echo -e "\n${YELLOW}[3/3] Restarting containers...${NC}"
if ! docker compose -f docker-compose.selfhosted.yml up -d; then
    echo -e "${RED}Failed to restart containers. Check the output above for details.${NC}"
    exit 1
fi

# Summary
echo -e "\n${GREEN}Update complete!${NC}"
if [ "$OLD_VERSION" != "$NEW_VERSION" ]; then
    echo -e "Updated from ${YELLOW}${OLD_VERSION}${NC} to ${GREEN}${NEW_VERSION}${NC}"
else
    echo -e "Version: ${GREEN}${NEW_VERSION}${NC} (already up to date)"
fi
echo -e "Database migrations run automatically on container start."
echo -e "\nCheck service status: ${BLUE}docker compose -f docker-compose.selfhosted.yml ps${NC}"
