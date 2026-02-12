export const dockerComposeContent = `services:
  postgres:
    image: postgres:15-alpine
    container_name: qarote_postgres_\${DEPLOYMENT_MODE}
    restart: unless-stopped
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
    container_name: qarote_backend_\${DEPLOYMENT_MODE}
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      HOST: 0.0.0.0
      LOG_LEVEL: \${LOG_LEVEL}
      DATABASE_URL: postgres://postgres:\${POSTGRES_PASSWORD}@postgres:5432/qarote
      JWT_SECRET: \${JWT_SECRET}
      ENCRYPTION_KEY: \${ENCRYPTION_KEY}
      CORS_ORIGIN: \${CORS_ORIGIN}
      DEPLOYMENT_MODE: \${DEPLOYMENT_MODE}
      # License configuration (required for enterprise, ignored for community)
      LICENSE_FILE_PATH: \${LICENSE_FILE_PATH}
      LICENSE_PUBLIC_KEY: \${LICENSE_PUBLIC_KEY}
      # Optional: For license file generation (SaaS only)
      LICENSE_PRIVATE_KEY: \${LICENSE_PRIVATE_KEY}
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
        DEPLOYMENT_MODE: \${DEPLOYMENT_MODE:-community}
        VITE_API_URL: \${VITE_API_URL}
    container_name: qarote_frontend_\${DEPLOYMENT_MODE}
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
#
# Set DEPLOYMENT_MODE=community for Community Edition (open-source)
# Set DEPLOYMENT_MODE=enterprise for Enterprise Edition (licensed)

# =============================================================================
# REQUIRED - Deployment Mode
# =============================================================================
# Set to 'community' for open-source edition or 'enterprise' for licensed edition
DEPLOYMENT_MODE=community

# =============================================================================
# REQUIRED - Database Configuration
# =============================================================================
# Generate with: ./setup.sh community (or enterprise)
POSTGRES_PASSWORD=your-secure-postgres-password
POSTGRES_PORT=5432

# =============================================================================
# REQUIRED - Backend Configuration
# =============================================================================
# Logging level: debug, info, warn, error
LOG_LEVEL=info

# JWT secret for token signing (minimum 32 characters)
# Generate with: ./setup.sh community (or enterprise)
JWT_SECRET=your-jwt-secret-minimum-32-characters-long

# Encryption key for sensitive data (minimum 32 characters)
# Generate with: ./setup.sh community (or enterprise)
ENCRYPTION_KEY=your-encryption-key-minimum-32-characters-long

# CORS origin - allowed origins for API requests
CORS_ORIGIN=*

# Backend port mapping (host:container)
BACKEND_PORT=3000

# =============================================================================
# REQUIRED - License Configuration (Enterprise Edition Only)
# =============================================================================
# Path to license file (relative to docker-compose file or absolute path)
# Required only for Enterprise Edition, ignored for Community Edition
# License files are named: qarote-license-{uuid}.json
LICENSE_FILE_PATH=./qarote-license.json

# Public key for license validation (provided via email with your license)
# Required only for Enterprise Edition, ignored for Community Edition
# Format: LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\\nMIICIjAN...\\n-----END PUBLIC KEY-----"
# IMPORTANT: Wrap the entire key in double quotes, use \\n for line breaks
LICENSE_PUBLIC_KEY=

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
# https://nodemailer.com/smtp/oauth2/`;

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export const TOC_ITEMS: TOCItem[] = [
  { id: "installation-guide", text: "Installation Guide", level: 3 },
  { id: "prerequisites", text: "Prerequisites", level: 4 },
  { id: "quick-start", text: "Quick Start", level: 4 },
  { id: "smtp-configuration", text: "SMTP Configuration", level: 4 },
  { id: "updating-qarote", text: "Updating Qarote", level: 4 },
  { id: "troubleshooting", text: "Troubleshooting", level: 4 },
  { id: "security", text: "Security Recommendations", level: 4 },
  { id: "support", text: "Support", level: 4 },
  { id: "docker-compose", text: "Docker Compose File", level: 3 },
  { id: "environment-config", text: "Environment Configuration", level: 3 },
];
