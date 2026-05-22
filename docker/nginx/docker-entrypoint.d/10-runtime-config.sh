#!/bin/sh
#
# Runtime config injector for the Qarote SPA.
#
# Why this exists: Vite inlines `import.meta.env.VITE_*` at build time. A
# single GHCR-published image with VITE_API_URL baked would only work for
# one tenant's domain. Instead we build the image WITHOUT setting VITE_*
# vars, and at container start we generate `/usr/share/nginx/html/config.js`
# from the runtime environment. The SPA reads it via `window.__QAROTE_CONFIG__`
# and falls back to those values when build-time vars are absent (see
# `apps/app/src/lib/runtimeConfig.ts`).
#
# nginx:alpine runs every executable in `/docker-entrypoint.d/` in name order
# before launching nginx, so this script is picked up automatically. Filename
# prefix `10-` keeps the slot before any future scripts that should run after
# config is written.

set -eu

CONFIG_PATH=/usr/share/nginx/html/config.js

# Defaults match the static `apps/app/public/config.js` so an unset env var
# never produces an undefined runtime field — the SPA helpers treat empty
# strings as "fall through to whatever the build-time default was."
: "${VITE_API_URL:=}"
: "${VITE_PORTAL_URL:=}"
: "${VITE_DEMO_MODE:=}"
: "${VITE_DEPLOYMENT_MODE:=}"

# Emit JSON-safe strings. Backslash and double-quote are the only characters
# we have to escape for a JS string literal; URLs and "true"/"cloud" values
# don't contain either, but we escape defensively in case an operator puts
# a quote in a portal URL.
escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

# Refuse control characters (newlines, NULs, etc.) in any var. A literal
# newline pasted into VITE_API_URL would otherwise break the JS literal and
# the SPA would boot with no runtime config — silent breakage that nginx
# doesn't surface because the container still listens on :80.
#
# `tr -d` strips printable ASCII + horizontal tab; if anything remains in the
# input, we hit a control char and bail. This is POSIX-portable and avoids
# the bash/busybox quirks of `case` bracket expressions with `[:print:]`.
reject_control_chars() {
  name=$1
  value=$2
  remainder=$(printf '%s' "$value" | tr -d '\11\40-\176')
  if [ -n "$remainder" ]; then
    echo "[qarote] refusing control character in $name — set a clean value and restart" >&2
    exit 1
  fi
}

reject_control_chars VITE_API_URL "$VITE_API_URL"
reject_control_chars VITE_PORTAL_URL "$VITE_PORTAL_URL"
reject_control_chars VITE_DEMO_MODE "$VITE_DEMO_MODE"
reject_control_chars VITE_DEPLOYMENT_MODE "$VITE_DEPLOYMENT_MODE"

cat > "$CONFIG_PATH" <<EOF
// Generated at container start by docker/nginx/docker-entrypoint.d/10-runtime-config.sh
// DO NOT edit by hand — restart the container to regenerate from env.
window.__QAROTE_CONFIG__ = {
  apiUrl: "$(escape_js "$VITE_API_URL")",
  portalUrl: "$(escape_js "$VITE_PORTAL_URL")",
  demoMode: "$(escape_js "$VITE_DEMO_MODE")",
  deploymentMode: "$(escape_js "$VITE_DEPLOYMENT_MODE")",
};
EOF

# Log which vars the operator actually set (names only — never values, so a
# future field that happens to be sensitive doesn't leak to container logs).
detected=""
[ -n "$VITE_API_URL" ] && detected="${detected}VITE_API_URL "
[ -n "$VITE_PORTAL_URL" ] && detected="${detected}VITE_PORTAL_URL "
[ -n "$VITE_DEMO_MODE" ] && detected="${detected}VITE_DEMO_MODE "
[ -n "$VITE_DEPLOYMENT_MODE" ] && detected="${detected}VITE_DEPLOYMENT_MODE "
echo "[qarote] wrote $CONFIG_PATH (detected: ${detected:-none})"
