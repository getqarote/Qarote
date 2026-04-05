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

# Build the application
# Accept build arguments (Vite embeds env vars at build time, not runtime)
ARG DEPLOYMENT_MODE=selfhosted
ARG VITE_API_URL
ARG VITE_PORTAL_URL
ARG VITE_DEMO_MODE
WORKDIR /app/apps/app
RUN VITE_DEPLOYMENT_MODE=${DEPLOYMENT_MODE} VITE_API_URL=${VITE_API_URL} VITE_PORTAL_URL=${VITE_PORTAL_URL} VITE_DEMO_MODE=${VITE_DEMO_MODE} pnpm run build

# Production stage
FROM nginx:alpine

# Copy nginx configuration
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/apps/app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

