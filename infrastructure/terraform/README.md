# Multi-Cloud RabbitMQ Infrastructure

This Terraform configuration deploys RabbitMQ instances across multiple cloud providers (AWS, Azure, GCP, and Digital Ocean) for testing workflows.

## Prerequisites

1. **Terraform** (>= 1.5.0)

   ```bash
   # Install via Homebrew (macOS) - Note: Homebrew core only provides up to 1.5.7
   # For newer versions, use HashiCorp's official tap:
   # brew tap hashicorp/tap
   # brew install hashicorp/tap/terraform
   ```

2. **Cloud Provider Credentials**
   - **AWS**: Configure AWS CLI or set environment variables

     ```bash
     aws configure
     # Or set:
     export AWS_ACCESS_KEY_ID=your_key
     export AWS_SECRET_ACCESS_KEY=your_secret
     export AWS_DEFAULT_REGION=us-east-1
     ```

   - **Azure**: Login and set subscription

     ```bash
     az login
     az account set --subscription "your-subscription-id"
     ```

   - **GCP**: Set up application default credentials and set project ID in `terraform.tfvars`

     ```bash
     gcloud auth application-default login
     gcloud config set project your-project-id
     # Also set gcp_project_id in terraform.tfvars
     ```

   - **Digital Ocean**: Set API token
     ```bash
     export DIGITALOCEAN_TOKEN=your_token
     ```

3. **SSH Key** (optional but recommended)
   - You can use an existing SSH key or let Terraform generate one
   - For Digital Ocean, you may need to add your SSH key to the DO dashboard first

## DNS Configuration (Optional)

You can configure custom hostnames for your RabbitMQ instances using Route 53 (AWS) and Cloud DNS (GCP) instead of IP addresses.

### AWS Route 53 Setup

1. **Create a hosted zone in Route 53:**

   ```bash
   aws route53 create-hosted-zone --name example.com --caller-reference $(date +%s)
   ```

   Or use the AWS Console: Route 53 → Hosted zones → Create hosted zone

2. **Get the hosted zone ID:**

   ```bash
   aws route53 list-hosted-zones --query "HostedZones[?Name=='example.com.'].Id" --output text
   ```

   The ID will look like: `Z1234567890ABC`

3. **Update your domain's nameservers:**
   - Get the nameservers from Route 53 (they'll be shown after creating the zone)
   - Update your domain registrar to use these nameservers

4. **Configure in terraform.tfvars:**
   ```hcl
   aws_domain_name      = "rabbitmq-aws.example.com"
   aws_route53_zone_id  = "Z1234567890ABC"
   ```

### GCP Cloud DNS Setup

1. **Create a managed zone in Cloud DNS:**

   ```bash
   gcloud dns managed-zones create rabbithq-zone \
     --dns-name=example.com \
     --description="RabbitMQ DNS zone"
   ```

   Or use the GCP Console: Cloud DNS → Create zone

2. **Get the zone name:**

   ```bash
   gcloud dns managed-zones list --filter="dnsName:example.com"
   ```

   The zone name is what you specified (e.g., `rabbithq-zone`)

3. **Update your domain's nameservers:**
   - Get the nameservers from Cloud DNS (shown in the zone details)
   - Update your domain registrar to use these nameservers

4. **Configure in terraform.tfvars:**
   ```hcl
   gcp_domain_name      = "rabbitmq-gcp.example.com"
   gcp_dns_zone_name    = "rabbithq-zone"
   ```

**Note:** If you don't configure DNS, the instances will use IP addresses directly. DNS records are optional.

## Quick Start

1. **Navigate to the terraform directory**

   ```bash
   cd infrastructure/terraform
   ```

2. **Copy the example variables file**

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

3. **Edit `terraform.tfvars`** with your configuration:

   ```hcl
   cloud_providers = ["aws", "azure", "gcp", "digitalocean"]

   rabbitmq_admin_user     = "admin"
   rabbitmq_admin_password = "your-secure-password"

   # Optional: Specify which providers to deploy to
   # cloud_providers = ["aws"]  # Deploy only to AWS
   ```

4. **Initialize Terraform**

   ```bash
   terraform init
   ```

5. **Review the deployment plan**

   ```bash
   terraform plan
   ```

6. **Deploy the infrastructure**

   ```bash
   terraform apply
   ```

7. **View outputs** (connection details)
   ```bash
   terraform output
   ```

## Configuration

### Provider Selection

You can deploy to all providers or select specific ones by modifying the `cloud_providers` variable:

```hcl
# Deploy to all providers
cloud_providers = ["aws", "azure", "gcp", "digitalocean"]

# Deploy only to AWS
cloud_providers = ["aws"]

# Deploy to AWS and GCP
cloud_providers = ["aws", "gcp"]
```

### Instance Types

Each provider uses different instance type naming and has its own variable:

- **AWS**: `aws_instance_type` - e.g., `t3.micro`, `t3.small`, `t3.medium`, etc.
- **Azure**: `azure_instance_type` - e.g., `Standard_B1s`, `Standard_B2s`, etc.
- **GCP**: `gcp_instance_type` - e.g., `e2-micro`, `e2-small`, `e2-medium`, etc.
- **Digital Ocean**: `s-1vcpu-1gb`, `s-2vcpu-4gb`, etc.

**Default values (small instances for testing):**

- AWS: `t3.micro` (~$7.30/month)
- Azure: `Standard_B1s` (~$10.22/month)
- GCP: `e2-micro` (~$6.13/month)

**Total cost for all 3 providers: ~$23.65/month** (much cheaper than medium instances at ~$113.94/month)

### Regions

Default regions can be configured per provider:

```hcl
aws_region     = "us-east-1"
azure_location = "eastus"
gcp_region     = "us-central1"
gcp_zone       = "us-central1-a"
do_region      = "nyc1"
```

## Accessing RabbitMQ

After deployment, Terraform will output connection details for each instance:

- **Management UI**: `http://<public_ip>:15672`
  - Username: (from `rabbitmq_admin_user`)
  - Password: (from `rabbitmq_admin_password`)

- **AMQP URL**: `amqp://<user>:<password>@<public_ip>:5672`

### Example Output

```bash
$ terraform output

aws_rabbitmq = {
  "amqp_url" = "amqp://admin:password@54.123.45.67:5672"
  "management_url" = "http://54.123.45.67:15672"
  "private_ip" = "10.0.1.5"
  "public_ip" = "54.123.45.67"
}

azure_rabbitmq = {
  "amqp_url" = "amqp://admin:password@20.123.45.67:5672"
  "management_url" = "http://20.123.45.67:15672"
  ...
}
```

## Provider-Specific Notes

### AWS

- Uses default VPC and subnets
- Creates security groups for required ports
- Instance type: `t3.medium` (2 vCPU, 4GB RAM)

### Azure

- Creates a new resource group, VPC, and subnet
- Uses Network Security Groups for firewall rules
- VM size: `Standard_B2s` (2 vCPU, 4GB RAM)

### GCP

- Uses default network
- Creates firewall rules for required ports
- Machine type: `e2-medium` (2 vCPU, 4GB RAM)

### Digital Ocean

- Requires SSH key to be added to DO dashboard first (or use `ssh_key_id` variable)
- Creates firewall rules
- Droplet size: `s-2vcpu-4gb` (2 vCPU, 4GB RAM)

## Destroying Infrastructure

To tear down all resources:

```bash
terraform destroy
```

To destroy specific providers, comment them out in `terraform.tfvars` and run:

```bash
terraform apply
```

## Troubleshooting

### Provider Authentication Issues

- **AWS**: Verify credentials with `aws sts get-caller-identity`
- **Azure**: Verify login with `az account show`
- **GCP**: Verify with `gcloud auth list`
- **Digital Ocean**: Verify token with `curl -X GET -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" "https://api.digitalocean.com/v2/account"`

### SSH Access

If you need to SSH into instances:

```bash
# AWS
ssh -i ~/.ssh/your_key.pem ubuntu@<aws_public_ip>

# Azure
ssh azureuser@<azure_public_ip>

# GCP
ssh ubuntu@<gcp_public_ip>

# Digital Ocean
ssh root@<do_public_ip>
```

### RabbitMQ Not Starting

Check logs on the instance:

```bash
# SSH into the instance, then:
sudo systemctl status rabbitmq-server
sudo journalctl -u rabbitmq-server -f
sudo tail -f /var/log/rabbitmq-setup.log
```

## Cost Considerations

These instances will incur costs on each cloud provider. Remember to:

1. **Destroy resources** when not in use: `terraform destroy`
2. **Monitor usage** in each cloud provider's console
3. **Use smaller instance types** for testing (modify `instance_type` in `terraform.tfvars`)

## Security Notes

⚠️ **Important**: This configuration is for **testing purposes only**. For production:

1. Restrict firewall rules to specific IP ranges
2. Use VPC peering or private networks
3. Enable SSL/TLS for RabbitMQ
4. Use stronger passwords and key management
5. Enable RabbitMQ authentication plugins
6. Set up monitoring and alerting

## Module Structure

```
terraform/
├── main.tf                 # Main configuration
├── variables.tf            # Variable definitions (in main.tf)
├── outputs.tf             # Output definitions (in main.tf)
├── terraform.tfvars.example  # Example variables
├── modules/
│   ├── aws/               # AWS RabbitMQ module
│   ├── azure/             # Azure RabbitMQ module
│   ├── gcp/               # GCP RabbitMQ module
│   └── digitalocean/      # Digital Ocean RabbitMQ module
└── README.md              # This file
```

Each module includes:

- `main.tf`: Provider-specific resources
- `variables.tf`: Module variables
- `user_data.sh`: Installation script for RabbitMQ

## Additional Providers

To add more cloud providers:

1. Create a new module in `modules/<provider>/`
2. Add provider configuration to `main.tf`
3. Add module call in `main.tf`
4. Add outputs in `main.tf`

## Support

For issues or questions:

- Check Terraform documentation: https://www.terraform.io/docs
- Check provider documentation for specific cloud providers
- Review logs on the instances for RabbitMQ-specific issues
