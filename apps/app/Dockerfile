FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy root package files (for monorepo)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all workspace package.json files (needed for monorepo)
COPY apps/api/package.json ./apps/api/
COPY apps/app/package.json ./apps/app/
COPY apps/web/package.json ./apps/web/
COPY apps/portal/package.json ./apps/portal/
COPY packages/i18n/package.json ./packages/i18n/

# Install all dependencies (monorepo) - skip scripts to avoid issues
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy shared packages (required by app)
COPY packages/i18n ./packages/i18n

# Build shared packages first
RUN cd packages/i18n && npx tsc

# Copy app source code
COPY apps/app ./apps/app

# Build the SPA without baking VITE_* values. Vite would otherwise inline
# them into the bundle, which would lock the image to a single tenant's
# domain. Instead the SPA reads `window.__QAROTE_CONFIG__` at runtime —
# the nginx entrypoint regenerates `/config.js` from container env vars
# (see docker/nginx/docker-entrypoint.d/10-runtime-config.sh) so a single
# published image can serve any deployment.
WORKDIR /app/apps/app
RUN pnpm run build

# Production stage
FROM nginx:alpine

# Copy nginx configuration
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx/security-headers.conf /etc/nginx/conf.d/security-headers.conf

# Runtime config writer — nginx:alpine runs every executable in
# /docker-entrypoint.d/ before launching nginx, in name order.
COPY docker/nginx/docker-entrypoint.d/10-runtime-config.sh /docker-entrypoint.d/10-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/10-runtime-config.sh

# Copy built files
COPY --from=builder /app/apps/app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
