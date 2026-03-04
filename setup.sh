#!/bin/bash
set -euo pipefail

# =============================================================================
# Qarote Self-Hosted Setup Script
# Generates a .env file with secure random secrets — no Node.js required.
#
# Usage:
#   ./setup.sh              # Generate .env with secure secrets
#   ./setup.sh --force      # Overwrite existing .env without prompting
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
FORCE=false

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    -h|--help)
      echo "Usage: ./setup.sh [--force]"
      echo ""
      echo "Options:"
      echo "  --force      Overwrite existing .env without prompting"
      exit 0
      ;;
    *) error "Unknown argument: $arg. Use --help for usage." ;;
  esac
done

# --- Validation ---
if ! command -v openssl &> /dev/null; then
  error "openssl is required but not found. Install it and try again."
fi

if [ ! -f "$ENV_EXAMPLE" ]; then
  error ".env.selfhosted.example not found at $ENV_EXAMPLE"
fi

# --- Check existing .env ---
EXISTING_ENV=false
if [ -f "$ENV_FILE" ]; then
  EXISTING_ENV=true
  if [ "$FORCE" = false ]; then
    warn "A .env file already exists at $ENV_FILE"
    read -rp "Overwrite? (y/N) " answer
    if [[ ! "$answer" =~ ^[Yy]$ ]]; then
      echo "Aborted."
      exit 0
    fi
  fi
fi

# --- Generate secrets (preserve existing to avoid breaking encrypted data) ---
info "Generating secure secrets..."

# Extract existing secrets from .env if present — changing these would break
# existing encrypted data (ENCRYPTION_KEY), active sessions (JWT_SECRET),
# or database access (POSTGRES_PASSWORD).
extract_existing() {
  grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2-
}

if [ "$EXISTING_ENV" = true ]; then
  JWT_SECRET=$(extract_existing JWT_SECRET)
  ENCRYPTION_KEY=$(extract_existing ENCRYPTION_KEY)
  POSTGRES_PASSWORD=$(extract_existing POSTGRES_PASSWORD)
  info "Preserved existing secrets from previous .env"
fi

# Generate new secrets only for values that are empty or missing
JWT_SECRET=${JWT_SECRET:-$(openssl rand -hex 64)}
ENCRYPTION_KEY=${ENCRYPTION_KEY:-$(openssl rand -hex 64)}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-$(openssl rand -hex 32)}

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
sed_inplace "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|" "$ENV_FILE"
sed_inplace "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$ENV_FILE"
sed_inplace "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|" "$ENV_FILE"

# --- Output ---
echo ""
success "Qarote configured!"
echo ""
echo "  .env file created at: $ENV_FILE"
echo ""
echo "  Generated secrets:"
echo "    POSTGRES_PASSWORD = ${POSTGRES_PASSWORD:0:16}..."
echo "    JWT_SECRET        = ${JWT_SECRET:0:16}..."
echo "    ENCRYPTION_KEY    = ${ENCRYPTION_KEY:0:16}..."
echo ""

info "Next steps:"
echo "  1. Start services: docker compose -f docker-compose.selfhosted.yml up -d"
echo "  2. Run migrations: docker exec qarote_backend pnpm run db:migrate"
echo "  3. Open http://localhost:8080"
echo "  4. To activate a license, go to Settings → License and paste your license key"
echo ""
