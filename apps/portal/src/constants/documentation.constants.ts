export const dockerComposeContent = `services:
  postgres:
    image: postgres:15-alpine
    container_name: qarote_postgres
    restart: unless-stopped
    command: >
      postgres
      -c idle_session_timeout=30min
      -c idle_in_transaction_session_timeout=5min
    environment:
      POSTGRES_DB: qarote
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    ports:
      - "\${POSTGRES_PORT}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - qarote_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d qarote"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: ./apps/api/Dockerfile
    container_name: qarote_backend
    restart: unless-stopped
    environment:
      PORT: 3000
      HOST: 0.0.0.0
      DATABASE_URL: postgres://postgres:\${POSTGRES_PASSWORD}@postgres:5432/qarote
      DATABASE_POOL_SIZE: \${DATABASE_POOL_SIZE:-10}
      JWT_SECRET: \${JWT_SECRET}
      ENCRYPTION_KEY: \${ENCRYPTION_KEY}
      # Optional: Email configuration (disabled by default)
      ENABLE_EMAIL: \${ENABLE_EMAIL:-false}
      # Optional: SMTP settings (only needed if ENABLE_EMAIL=true)
      # Basic Auth:
      SMTP_HOST: \${SMTP_HOST}
      SMTP_PORT: \${SMTP_PORT:-587}
      SMTP_USER: \${SMTP_USER}
      SMTP_PASS: \${SMTP_PASS}
      # OAuth2 (Recommended - see SMTP Configuration section):
      # SMTP_SERVICE: \${SMTP_SERVICE}
      # SMTP_OAUTH_CLIENT_ID: \${SMTP_OAUTH_CLIENT_ID}
      # SMTP_OAUTH_CLIENT_SECRET: \${SMTP_OAUTH_CLIENT_SECRET}
      # SMTP_OAUTH_REFRESH_TOKEN: \${SMTP_OAUTH_REFRESH_TOKEN}
      # Optional: SSO configuration (requires Enterprise license)
      # SSO_ENABLED: \${SSO_ENABLED:-false}
      # SSO_TYPE: \${SSO_TYPE:-oidc}
      # SSO_OIDC_DISCOVERY_URL: \${SSO_OIDC_DISCOVERY_URL}
      # SSO_OIDC_CLIENT_ID: \${SSO_OIDC_CLIENT_ID}
      # SSO_OIDC_CLIENT_SECRET: \${SSO_OIDC_CLIENT_SECRET}
      # SSO_SAML_METADATA_URL: \${SSO_SAML_METADATA_URL}
      # API_URL: \${API_URL:-http://localhost:3000}
      # FRONTEND_URL: \${FRONTEND_URL:-http://localhost:8080}
      # SSO_BUTTON_LABEL: \${SSO_BUTTON_LABEL:-Sign in with SSO}
    ports:
      - "\${BACKEND_PORT}:3000"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - qarote_network

  frontend:
    build:
      context: .
      dockerfile: ./apps/app/Dockerfile
      args:
        VITE_API_URL: \${VITE_API_URL}
    container_name: qarote_frontend
    restart: unless-stopped
    ports:
      - "\${FRONTEND_PORT}:80"
    depends_on:
      - backend
    networks:
      - qarote_network

volumes:
  postgres_data:
    driver: local

networks:
  qarote_network:
    driver: bridge`;

export const envExampleContent = `# Qarote Self-Hosted Deployment
# Copy this file to .env and update with your values
# cp .env.selfhosted.example .env

# =============================================================================
# REQUIRED - Database Configuration
# =============================================================================
# Generate with: ./setup.sh
POSTGRES_PASSWORD=your-secure-postgres-password
POSTGRES_PORT=5432
# Maximum database connections per process (default: 10)
# DATABASE_POOL_SIZE=10

# =============================================================================
# REQUIRED - Security
# =============================================================================
# JWT secret for token signing (minimum 32 characters)
# Generate with: ./setup.sh
JWT_SECRET=your-jwt-secret-minimum-32-characters-long

# Encryption key for sensitive data (minimum 32 characters)
# Generate with: ./setup.sh
ENCRYPTION_KEY=your-encryption-key-minimum-32-characters-long

# Timezone (must be UTC for correct date handling)
TZ=UTC

# Backend port mapping (host:container)
BACKEND_PORT=3000

# =============================================================================
# REQUIRED - Frontend Configuration
# =============================================================================
# Backend API URL for frontend (baked at build time, must match BACKEND_PORT)
VITE_API_URL=http://localhost:3000

# Frontend port mapping (host:container)
FRONTEND_PORT=8080

# =============================================================================
# OPTIONAL - Email Configuration
# =============================================================================
# Enable email features (disabled by default for self-hosted)
ENABLE_EMAIL=false
# Frontend URL for email links (only needed if ENABLE_EMAIL=true)
# Defaults to http://localhost:8080 if not set
# FRONTEND_URL=https://yourcompany.com

# Portal Frontend URL for portal email links (only needed if ENABLE_EMAIL=true and you use the portal)
# PORTAL_FRONTEND_URL=https://portal.yourcompany.com

# SMTP configuration (only needed if ENABLE_EMAIL=true)
#
# OPTION 1: Basic Authentication (Simple)
# Example providers:
#
# Gmail (App Password):
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
#
# SendGrid:
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASS=your-sendgrid-api-key
#
# Mailgun:
# SMTP_HOST=smtp.mailgun.org
# SMTP_PORT=587
# SMTP_USER=postmaster@your-domain.mailgun.org
# SMTP_PASS=your-mailgun-password
#
# Office 365 / Outlook:
# SMTP_HOST=smtp.office365.com
# SMTP_PORT=587
# SMTP_USER=your-email@yourdomain.com
# SMTP_PASS=your-password
#
# OPTION 2: OAuth2 Authentication (Recommended for production)
# More secure than app passwords. See docs/SELF_HOSTED_DEPLOYMENT.md for setup guide.
# Link: https://nodemailer.com/smtp/oauth2/
#
# Gmail OAuth2:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_SERVICE=gmail
# SMTP_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
# SMTP_OAUTH_CLIENT_SECRET=your-client-secret
# SMTP_OAUTH_REFRESH_TOKEN=your-refresh-token
#
# For other providers (Office 365, Outlook.com, etc.), see:
# https://nodemailer.com/smtp/oauth2/

# =============================================================================
# OPTIONAL - SSO Configuration (requires Enterprise license)
# =============================================================================
# Enable SSO to let users authenticate via your identity provider (OIDC or SAML 2.0).
# SSO_ENABLED=false
# SSO_TYPE=oidc
#
# --- OIDC (recommended) ---
# SSO_OIDC_DISCOVERY_URL=https://your-idp.com/realms/qarote/.well-known/openid-configuration
# SSO_OIDC_CLIENT_ID=qarote
# SSO_OIDC_CLIENT_SECRET=your-client-secret
#
# --- SAML (alternative) ---
# SSO_SAML_METADATA_URL=https://your-idp.com/metadata.xml
#
# --- Required for SSO callbacks ---
# API_URL=https://api.your-domain.com
# FRONTEND_URL=https://your-domain.com
#
# --- Optional display ---
# SSO_BUTTON_LABEL=Sign in with SSO`;

export interface TOCItem {
  id: string;
  key: string;
  level: number;
}

export const TOC_ITEMS: TOCItem[] = [
  { id: "installation-guide", key: "toc.installationGuide", level: 3 },
  { id: "prerequisites", key: "toc.prerequisites", level: 4 },
  { id: "quick-start", key: "toc.quickStart", level: 4 },
  { id: "smtp-configuration", key: "toc.smtpConfiguration", level: 4 },
  { id: "updating-qarote", key: "toc.updatingQarote", level: 4 },
  { id: "troubleshooting", key: "toc.troubleshooting", level: 4 },
  { id: "security", key: "toc.security", level: 4 },
  { id: "support", key: "toc.support", level: 4 },
  { id: "docker-compose", key: "toc.dockerCompose", level: 3 },
  { id: "environment-config", key: "toc.environmentConfig", level: 3 },
];
