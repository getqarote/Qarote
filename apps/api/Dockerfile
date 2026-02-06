FROM node:24-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy root package files (for monorepo)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml VERSION ./

# Copy all workspace package.json files
COPY apps/api/package.json ./apps/api/
COPY apps/app/package.json ./apps/app/
COPY apps/web/package.json ./apps/web/
COPY apps/portal/package.json ./apps/portal/

# Copy Prisma schema (needed for postinstall script)
COPY apps/api/prisma ./apps/api/prisma/

# Install all dependencies (monorepo) - skip scripts to avoid Prisma generate during install
# Then install dependencies in the API workspace to ensure all are available
RUN pnpm install --frozen-lockfile --ignore-scripts && \
    cd apps/api && pnpm install --frozen-lockfile --ignore-scripts

# Copy API source code
COPY apps/api ./apps/api

# Build the application
WORKDIR /app/apps/api
# Generate Prisma client (now that schema is available)
RUN pnpm run db:generate
# Build the application
RUN pnpm run build

# Expose port
EXPOSE 3000

# Start the application
# Use the start:production script which runs migrations before starting
WORKDIR /app/apps/api
CMD ["pnpm", "run", "start:production"]

