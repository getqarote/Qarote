#!/bin/bash
set -euo pipefail

# =============================================================================
# Qarote Single Binary Build Script
# Compiles the API + frontend into a standalone distribution using Bun.
#
# Output: a .tar.gz containing the binary + public/ directory.
# bun build --compile bundles the JS module graph but NOT files accessed via
# fs at runtime, so static frontend assets must ship alongside the binary.
#
# Usage:
#   ./scripts/build-binary.sh                    # Build for current platform
#   ./scripts/build-binary.sh linux-x64          # Cross-compile for Linux x64
#   ./scripts/build-binary.sh linux-arm64        # Cross-compile for Linux ARM64
#   ./scripts/build-binary.sh darwin-x64         # Cross-compile for macOS x64
#   ./scripts/build-binary.sh darwin-arm64       # Cross-compile for macOS ARM64
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
PLATFORM=${1:-}

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  BLUE='\033[0;34m'
  NC='\033[0m'
else
  RED='' GREEN='' BLUE='' NC=''
fi

error() { echo -e "${RED}Error: $1${NC}" >&2; exit 1; }
info() { echo -e "${BLUE}$1${NC}"; }
success() { echo -e "${GREEN}$1${NC}"; }

# --- Validation ---
if ! command -v bun &> /dev/null; then
  error "Bun is required but not found. Install it: https://bun.sh"
fi

if ! command -v pnpm &> /dev/null; then
  error "pnpm is required but not found."
fi

cd "$PROJECT_ROOT"

# --- Step 1: Build frontend (no VITE_API_URL — runtime config via /config.js) ---
info "Step 1/5: Building frontend..."
pnpm run --filter qarote-app build 2>&1 | tail -5

# --- Step 2: Build backend (ESM + Prisma Rust-free) ---
info "Step 2/5: Building backend..."
pnpm run --filter qarote-api build 2>&1 | tail -5

# --- Step 3: Copy frontend dist into backend's public/ directory ---
info "Step 3/5: Embedding frontend assets..."
rm -rf apps/api/dist/public
mkdir -p apps/api/dist/public
cp -r apps/app/dist/* apps/api/dist/public/

# --- Step 4: Compile to standalone binary with Bun ---
info "Step 4/5: Compiling binary..."

BUN_BUILD_ARGS=(
  "apps/api/dist/index.js"
  "--compile"
  "--external" "@sentry/node"
  "--external" "@sentry/profiling-node"
)

if [ -n "$PLATFORM" ]; then
  BUN_BUILD_ARGS+=("--target" "bun-$PLATFORM")
  OUTNAME="qarote-$PLATFORM"
else
  OUTNAME="qarote"
fi

BUN_BUILD_ARGS+=("--outfile" "$OUTNAME")

bun build "${BUN_BUILD_ARGS[@]}"

# --- Step 5: Package binary + frontend assets into tarball ---
info "Step 5/5: Packaging distribution..."

DIST_DIR="$(mktemp -d)"
mkdir -p "$DIST_DIR/qarote"
cp "$OUTNAME" "$DIST_DIR/qarote/qarote"
cp -r apps/api/dist/public "$DIST_DIR/qarote/public"

TARBALL="${OUTNAME}.tar.gz"
tar czf "$TARBALL" -C "$DIST_DIR" qarote
rm -rf "$DIST_DIR" "$OUTNAME"

# --- Output ---
echo ""
success "Build complete: $TARBALL ($(du -h "$TARBALL" | cut -f1))"
echo ""
echo "  Install:"
echo "    tar xzf $TARBALL"
echo "    cd qarote"
echo ""
echo "  Usage:"
echo "    ./qarote setup                          # Interactive setup"
echo "    ./qarote                                 # Start on port 3000"
echo ""
echo "  CLI flags (override .env):"
echo "    ./qarote --database-url postgresql://user:pass@localhost/qarote"
echo "    ./qarote --port 8080"
echo ""
