#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# Check prerequisites
print_info "Checking prerequisites..."
check_command terraform

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    print_warn "terraform.tfvars not found. Creating from example..."
    if [ -f "terraform.tfvars.example" ]; then
        cp terraform.tfvars.example terraform.tfvars
        print_warn "Please edit terraform.tfvars with your configuration before running again."
        exit 1
    else
        print_error "terraform.tfvars.example not found. Please create terraform.tfvars manually."
        exit 1
    fi
fi

# Parse command line arguments
ACTION="${1:-apply}"

case "$ACTION" in
    init)
        print_info "Initializing Terraform..."
        terraform init
        ;;
    plan)
        print_info "Planning Terraform deployment..."
        terraform plan
        ;;
    apply)
        print_info "Applying Terraform configuration..."
        terraform apply
        ;;
    destroy)
        print_warn "This will destroy all RabbitMQ instances!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            print_info "Destroying infrastructure..."
            terraform destroy
        else
            print_info "Cancelled."
        fi
        ;;
    output)
        print_info "Showing Terraform outputs..."
        terraform output
        ;;
    *)
        echo "Usage: $0 {init|plan|apply|destroy|output}"
        echo ""
        echo "Commands:"
        echo "  init     - Initialize Terraform"
        echo "  plan     - Show deployment plan"
        echo "  apply    - Deploy infrastructure (default)"
        echo "  destroy  - Destroy all infrastructure"
        echo "  output   - Show connection details"
        exit 1
        ;;
esac
