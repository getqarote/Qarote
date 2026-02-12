#!/bin/bash
set -euo pipefail

# =============================================================================
# Qarote Self-Hosted Setup Script
# Generates a .env file with secure random secrets — no Node.js required.
#
# Usage:
#   ./setup.sh community          # Community Edition (open-source)
#   ./setup.sh enterprise         # Enterprise Edition (licensed)
#   ./setup.sh community --force  # Overwrite existing .env without prompting
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_EXAMPLE="$SCRIPT_DIR/.env.selfhosted.example"
ENV_FILE="$SCRIPT_DIR/.env"

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  NC='\033[0m'
else
  RED='' GREEN='' YELLOW='' BLUE='' NC=''
fi

error() { echo -e "${RED}Error: $1${NC}" >&2; exit 1; }
info() { echo -e "${BLUE}$1${NC}"; }
success() { echo -e "${GREEN}$1${NC}"; }
warn() { echo -e "${YELLOW}$1${NC}"; }

# --- Argument parsing ---
DEPLOYMENT_MODE=""
FORCE=false

for arg in "$@"; do
  case "$arg" in
    community|enterprise) DEPLOYMENT_MODE="$arg" ;;
    --force) FORCE=true ;;
    -h|--help)
      echo "Usage: ./setup.sh <community|enterprise> [--force]"
      echo ""
      echo "Arguments:"
      echo "  community    Set up Community Edition (open-source)"
      echo "  enterprise   Set up Enterprise Edition (licensed)"
      echo "  --force      Overwrite existing .env without prompting"
      exit 0
      ;;
    *) error "Unknown argument: $arg. Use --help for usage." ;;
  esac
done

if [ -z "$DEPLOYMENT_MODE" ]; then
  error "Deployment mode required. Usage: ./setup.sh <community|enterprise>"
fi

# --- Validation ---
if ! command -v openssl &> /dev/null; then
  error "openssl is required but not found. Install it and try again."
fi

if [ ! -f "$ENV_EXAMPLE" ]; then
  error ".env.selfhosted.example not found at $ENV_EXAMPLE"
fi

# --- Check existing .env ---
if [ -f "$ENV_FILE" ] && [ "$FORCE" = false ]; then
  warn "A .env file already exists at $ENV_FILE"
  read -rp "Overwrite? (y/N) " answer
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

# --- Generate secrets ---
info "Generating secure secrets..."

JWT_SECRET=$(openssl rand -hex 64)
ENCRYPTION_KEY=$(openssl rand -hex 64)
POSTGRES_PASSWORD=$(openssl rand -hex 32)

# --- Copy template ---
cp "$ENV_EXAMPLE" "$ENV_FILE"

# --- Cross-platform sed in-place ---
sed_inplace() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# --- Replace values ---
sed_inplace "s|^DEPLOYMENT_MODE=.*|DEPLOYMENT_MODE=$DEPLOYMENT_MODE|" "$ENV_FILE"
sed_inplace "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|" "$ENV_FILE"
sed_inplace "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$ENV_FILE"
sed_inplace "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|" "$ENV_FILE"

# --- Output ---
echo ""
success "Qarote $DEPLOYMENT_MODE edition configured!"
echo ""
echo "  .env file created at: $ENV_FILE"
echo ""
echo "  Generated secrets:"
echo "    DEPLOYMENT_MODE = $DEPLOYMENT_MODE"
echo "    POSTGRES_PASSWORD = ${POSTGRES_PASSWORD:0:16}..."
echo "    JWT_SECRET        = ${JWT_SECRET:0:16}..."
echo "    ENCRYPTION_KEY    = ${ENCRYPTION_KEY:0:16}..."
echo ""

if [ "$DEPLOYMENT_MODE" = "enterprise" ]; then
  warn "Enterprise Edition: Don't forget to configure your license in .env:"
  echo "    LICENSE_FILE_PATH=./qarote-license.json"
  echo "    LICENSE_PUBLIC_KEY=\"-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----\""
  echo ""
fi

info "Next steps:"
if [ "$DEPLOYMENT_MODE" = "enterprise" ]; then
  echo "  1. Place your license file: cp /path/to/qarote-license-*.json ./qarote-license.json"
  echo "  2. Set LICENSE_FILE_PATH and LICENSE_PUBLIC_KEY in .env"
  echo "  3. Start services: docker compose -f docker-compose.selfhosted.yml up -d"
  echo "  4. Run migrations: docker exec qarote_backend_enterprise pnpm run db:migrate"
else
  echo "  1. Start services: docker compose -f docker-compose.selfhosted.yml up -d"
  echo "  2. Run migrations: docker exec qarote_backend_community pnpm run db:migrate"
  echo "  3. Open http://localhost:8080"
fi
echo ""
