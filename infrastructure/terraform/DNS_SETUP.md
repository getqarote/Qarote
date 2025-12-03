# DNS Setup Guide for RabbitMQ Instances

This guide explains how to set up custom hostnames for your RabbitMQ instances using AWS Route 53 and GCP Cloud DNS.

## Overview

Instead of accessing RabbitMQ via IP addresses like:

- `http://15.237.128.241:15672` (AWS)
- `http://34.155.244.36:15672` (GCP)

You can use friendly hostnames like:

- `http://rabbitmq-aws.rabbithq.com:15672` (AWS)
- `http://rabbitmq-gcp.rabbithq.com:15672` (GCP)

## Prerequisites

- A domain name you own (e.g., `rabbithq.com`)
- Access to your domain registrar to update nameservers

## AWS Route 53 Setup

### Step 1: Create a Hosted Zone

**Via AWS CLI:**

```bash
aws route53 create-hosted-zone \
  --name rabbithq.com \
  --caller-reference $(date +%s)
```

**Via AWS Console:**

1. Go to Route 53 → Hosted zones
2. Click "Create hosted zone"
3. Enter your domain name (e.g., `rabbithq.com`)
4. Click "Create hosted zone"

### Step 2: Get the Hosted Zone ID

**Via AWS CLI:**

```bash
aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='rabbithq.com.'].Id" \
  --output text
```

**Via AWS Console:**

- The hosted zone ID is shown in the hosted zone list (e.g., `Z1234567890ABC`)

### Step 3: Update Domain Nameservers

1. In Route 53, go to your hosted zone
2. Note the 4 nameservers (e.g., `ns-123.awsdns-12.com`)
3. Go to your domain registrar (where you bought the domain)
4. Update the nameservers to the Route 53 nameservers
5. Wait for DNS propagation (can take up to 48 hours, usually much faster)

### Step 4: Configure Terraform

Add to your `terraform.tfvars`:

```hcl
aws_domain_name      = "rabbitmq-aws.rabbithq.com"
aws_route53_zone_id  = "Z1234567890ABC"  # Your hosted zone ID
```

## GCP Cloud DNS Setup

### Step 1: Create a Managed Zone

**Via gcloud CLI:**

```bash
gcloud dns managed-zones create rabbithq-zone \
  --dns-name=rabbithq.com \
  --description="RabbitMQ DNS zone" \
  --project=rabbithq
```

**Via GCP Console:**

1. Go to Cloud DNS → Zones
2. Click "Create zone"
3. Zone type: Public
4. Zone name: `rabbithq-zone` (or any name you prefer)
5. DNS name: `rabbithq.com`
6. Click "Create"

### Step 2: Get the Zone Name

The zone name is what you specified when creating the zone (e.g., `rabbithq-zone`).

**Via gcloud CLI:**

```bash
gcloud dns managed-zones list --filter="dnsName:rabbithq.com"
```

### Step 3: Update Domain Nameservers

1. In Cloud DNS, open your managed zone
2. Note the 4 nameservers (shown at the top of the zone details)
3. Go to your domain registrar
4. Update the nameservers to the Cloud DNS nameservers
5. Wait for DNS propagation

### Step 4: Configure Terraform

Add to your `terraform.tfvars`:

```hcl
gcp_domain_name      = "rabbitmq-gcp.rabbithq.com"
gcp_dns_zone_name    = "rabbithq-zone"  # Your managed zone name
```

## Apply DNS Configuration

After configuring the domain variables in `terraform.tfvars`:

```bash
cd infrastructure/terraform
terraform plan   # Review changes
terraform apply  # Create DNS records
```

Terraform will automatically:

- Create A records pointing to your instance IPs
- Update outputs to use hostnames instead of IPs

## Verify DNS Setup

After applying, check the outputs:

```bash
terraform output -json | jq '.aws_rabbitmq.value.fqdn'
terraform output -json | jq '.gcp_rabbitmq.value.fqdn'
```

You should see your configured hostnames.

## Testing DNS Resolution

Test that DNS is working:

```bash
# Test AWS hostname
nslookup rabbitmq-aws.rabbithq.com

# Test GCP hostname
nslookup rabbitmq-gcp.rabbithq.com
```

Both should resolve to the respective instance IP addresses.

## Accessing RabbitMQ

Once DNS is configured and propagated, you can access:

- **AWS Management UI:** `http://rabbitmq-aws.rabbithq.com:15672`
- **GCP Management UI:** `http://rabbitmq-gcp.rabbithq.com:15672`

## Notes

- DNS propagation can take up to 48 hours, but usually completes within minutes to hours
- If you don't configure DNS, instances will continue to work with IP addresses
- DNS records are automatically updated when instances are recreated (if IPs change)
- You can use the same domain for both AWS and GCP, or use different domains

## Troubleshooting

**DNS not resolving:**

- Check that nameservers are correctly set at your domain registrar
- Wait for DNS propagation (use `dig` or `nslookup` to check)
- Verify the hosted zone/managed zone exists and is active

**Terraform errors:**

- Ensure the hosted zone ID (AWS) or zone name (GCP) is correct
- Verify you have permissions to create DNS records
- Check that the domain name matches the zone's DNS name
