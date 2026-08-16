FROM node:24-alpine

ENV TZ=UTC

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

# Copy shared package manifests
# Every workspace dep declared in apps/api/package.json must appear here, or
# `pnpm install --frozen-lockfile` resolves against a lockfile describing
# packages that are not in the build context.
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/analytics/package.json ./packages/analytics/
COPY packages/og-cards/package.json ./packages/og-cards/

# Install all dependencies (monorepo) - skip scripts to avoid Prisma generate during install
# Then install dependencies in the API workspace to ensure all are available
RUN pnpm install --frozen-lockfile --ignore-scripts && \
    cd apps/api && pnpm install --frozen-lockfile --ignore-scripts

# Copy shared packages and build them. `pnpm install` only symlinks workspace
# deps — it does not compile them — so each one needs an explicit tsc here or
# the API's own build fails with TS2307 "cannot find module".
#   @qarote/i18n      — translations
#   @qarote/analytics — posthog.ts
#   @qarote/og-cards  — routers/rca-page.router.ts
COPY packages/i18n ./packages/i18n
RUN cd packages/i18n && npx tsc
COPY packages/analytics ./packages/analytics
RUN cd packages/analytics && npx tsc
COPY packages/og-cards ./packages/og-cards
RUN cd packages/og-cards && npx tsc

# Copy API source code
COPY apps/api ./apps/api

# Build the application
WORKDIR /app/apps/api
# Generate Prisma client (now that schema is available)
RUN pnpm run db:generate
# Build the application
RUN pnpm run build

# Embed Procfile so dokku git:from-image can read it from the image root
COPY Procfile /Procfile

# Expose port
EXPOSE 3000

# Start the application
# Use the start:production script which runs migrations before starting
WORKDIR /app/apps/api
CMD ["pnpm", "run", "start:production"]

