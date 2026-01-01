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

# Install all dependencies (monorepo) - skip scripts to avoid issues
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy app source code
COPY apps/app ./apps/app

# Build the application
WORKDIR /app/apps/app
RUN pnpm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/apps/app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

