#!/bin/bash
# Route 53 DNS Setup Script
# This script helps you set up a Route 53 hosted zone for your RabbitMQ instances

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Route 53 DNS Setup ===${NC}"
echo ""

# Check if domain is provided as argument
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 <domain-name>${NC}"
    echo "Example: $0 rabbithq.com"
    echo ""
    read -p "Enter your domain name (e.g., rabbithq.com): " DOMAIN
else
    DOMAIN=$1
fi

# Remove trailing dot if present
DOMAIN=${DOMAIN%.}

echo ""
echo -e "${GREEN}Step 1: Creating hosted zone for ${DOMAIN}...${NC}"
echo ""

# Create hosted zone
RESPONSE=$(aws route53 create-hosted-zone \
  --name "${DOMAIN}" \
  --caller-reference "$(date +%s)" \
  --hosted-zone-config Comment="RabbitMQ DNS zone" 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Hosted zone created successfully!${NC}"
    echo ""
    
    # Extract Zone ID
    ZONE_ID=$(echo "$RESPONSE" | grep -oP '(?<="Id": "/hostedzone/)[^"]*')
    ZONE_ID=$(echo "$ZONE_ID" | sed 's|/hostedzone/||')
    
    # Extract nameservers
    echo -e "${GREEN}Step 2: Zone Details${NC}"
    echo ""
    echo "Hosted Zone ID: ${ZONE_ID}"
    echo ""
    echo "Nameservers (update these at your domain registrar):"
    echo "$RESPONSE" | grep -A 4 '"NameServers"' | grep '"Value"' | sed 's/.*"Value": "\([^"]*\)".*/\1/' | sed 's/^/  - /'
    echo ""
    
    echo -e "${YELLOW}Step 3: Update your domain's nameservers${NC}"
    echo "1. Go to your domain registrar (where you bought ${DOMAIN})"
    echo "2. Find the nameserver settings"
    echo "3. Replace existing nameservers with the ones listed above"
    echo "4. Save changes"
    echo ""
    
    echo -e "${GREEN}Step 4: Update terraform.tfvars${NC}"
    echo ""
    echo "Add these lines to your terraform.tfvars:"
    echo ""
    echo "aws_domain_name      = \"rabbitmq-aws.${DOMAIN}\""
    echo "aws_route53_zone_id  = \"${ZONE_ID}\""
    echo ""
    
    echo -e "${GREEN}Setup complete!${NC}"
    echo ""
    echo "After updating nameservers at your registrar, run:"
    echo "  terraform apply"
    
else
    echo -e "${YELLOW}Error creating hosted zone.${NC}"
    echo "$RESPONSE"
    exit 1
fi
