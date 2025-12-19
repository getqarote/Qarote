# Profile file for Heroku/Dokku buildpack
# This gets sourced during the build process and ensures corepack is available
# This runs early in the buildpack process, before binaries.sh
# See: https://github.com/nodejs/corepack#manual-installs

# Find Node.js installation (buildpack installs it in various locations)
# The buildpack installs Node.js before this profile is sourced
COREPACK_FOUND=false
for node_dir in "$HOME/.heroku/node/bin" "/app/.heroku/node/bin" "/tmp/cache/node/bin" "/tmp/cache/node-*/bin" "$(dirname "$(command -v node 2>/dev/null || echo '')" 2>/dev/null)"; do
  # Expand glob patterns
  for expanded_dir in $node_dir; do
    if [ -n "$expanded_dir" ] && [ -f "$expanded_dir/node" ]; then
      # Add to PATH if not already there (at the beginning for priority)
      if [[ ":$PATH:" != *":$expanded_dir:"* ]]; then
        export PATH="$expanded_dir:$PATH"
      fi
      
      # Check if corepack exists in this Node.js installation
      if [ -f "$expanded_dir/corepack" ]; then
        COREPACK_FOUND=true
        # Enable corepack immediately
        if ! command -v corepack > /dev/null 2>&1; then
          "$expanded_dir/corepack" enable pnpm > /dev/null 2>&1 || "$expanded_dir/corepack" enable > /dev/null 2>&1 || true
        fi
        # Create symlink in /usr/local/bin for maximum compatibility
        if [ -w /usr/local/bin ] 2>/dev/null && [ ! -f /usr/local/bin/corepack ]; then
          ln -sf "$expanded_dir/corepack" /usr/local/bin/corepack 2>/dev/null || true
        fi
        break 2
      fi
    fi
  done
done

# If corepack was not found, install it manually
# Node.js 25.0.0+ does NOT include corepack by default
# See: https://github.com/nodejs/corepack#manual-installs
if [ "$COREPACK_FOUND" = false ] && command -v node > /dev/null 2>&1 && command -v npm > /dev/null 2>&1; then
  # Install corepack globally using npm
  npm install --global corepack@latest > /dev/null 2>&1 || true
  # Add npm global bin to PATH
  if command -v npm > /dev/null 2>&1; then
    NPM_GLOBAL_BIN=$(npm config get prefix 2>/dev/null)/bin
    if [ -n "$NPM_GLOBAL_BIN" ] && [ -d "$NPM_GLOBAL_BIN" ]; then
      export PATH="$NPM_GLOBAL_BIN:$PATH"
    fi
  fi
  # Enable corepack
  if command -v corepack > /dev/null 2>&1; then
    corepack enable pnpm > /dev/null 2>&1 || corepack enable > /dev/null 2>&1 || true
    # Create symlink for maximum compatibility
    COREPACK_PATH=$(command -v corepack)
    if [ -w /usr/local/bin ] 2>/dev/null && [ ! -f /usr/local/bin/corepack ]; then
      ln -sf "$COREPACK_PATH" /usr/local/bin/corepack 2>/dev/null || true
    fi
  fi
fi

