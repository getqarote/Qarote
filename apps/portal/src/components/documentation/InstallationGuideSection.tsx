import { FileText } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function InstallationGuideSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <Heading level={3} id="installation-guide">
            Installation Guide
          </Heading>
        </CardTitle>
        <CardDescription>
          Step-by-step instructions for deploying Qarote
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prerequisites */}
        <div className="space-y-4">
          <Heading level={4} id="prerequisites">
            Prerequisites
          </Heading>
          <p className="text-sm text-muted-foreground">
            Requirements depend on your deployment method:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>Docker Compose:</strong> Docker and Docker Compose
              (PostgreSQL is included)
            </li>
            <li>
              <strong>Dokku:</strong> Dokku installed on your server
            </li>
            <li>
              <strong>Manual:</strong> Node.js 24+, pnpm, PostgreSQL 15+, and
              Nginx or Caddy
            </li>
            <li>
              <strong>Enterprise Edition:</strong> Valid license file and public
              key (all methods)
            </li>
          </ul>
        </div>

        {/* Quick Start */}
        <div className="space-y-4">
          <Heading level={4} id="quick-start">
            Quick Start
          </Heading>

          <Tabs defaultValue="docker-compose" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="docker-compose">Docker Compose</TabsTrigger>
              <TabsTrigger value="dokku">Dokku</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
            </TabsList>

            {/* Docker Compose Quick Start */}
            <TabsContent value="docker-compose" className="space-y-4 mt-4">
              <div className="space-y-3">
                <h5 className="text-sm font-medium">1. Clone the Repository</h5>
                <CodeBlock
                  code={`git clone https://github.com/getqarote/Qarote.git /opt/qarote
cd /opt/qarote`}
                  language="bash"
                />
                <p className="text-sm text-muted-foreground">
                  <code className="bg-muted px-1 rounded">/opt/qarote</code> is
                  the recommended path on Linux — it follows the{" "}
                  <a
                    href="https://refspecs.linuxfoundation.org/FHS_3.0/fhs/ch03s13.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Filesystem Hierarchy Standard
                  </a>{" "}
                  for optional/add-on software. On Windows (WSL2 + Docker
                  Desktop), use{" "}
                  <code className="bg-muted px-1 rounded">C:\qarote</code>. Any
                  directory works — just adjust the path in the commands below.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">2. Run the Setup Script</h5>
                <CodeBlock
                  code={`# Community Edition (open-source)
./setup.sh community

# Enterprise Edition (licensed)
./setup.sh enterprise`}
                  language="bash"
                />

                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    This creates a{" "}
                    <code className="bg-background px-1 rounded">.env</code>{" "}
                    file with secure random secrets (JWT_SECRET, ENCRYPTION_KEY,
                    POSTGRES_PASSWORD) and sets your deployment mode.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  3. For Enterprise Edition: Add Your License
                </h5>
                <CodeBlock
                  code={`# Place your downloaded license file
# License files are downloaded with format: qarote-license-{uuid}.json
cp /path/to/your/qarote-license-*.json ./qarote-license.json

# Update .env with your license configuration
# LICENSE_FILE_PATH=./qarote-license.json
# LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA...\\n-----END PUBLIC KEY-----"`}
                  language="bash"
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">4. Start the Services</h5>
                <CodeBlock
                  code={`# Start all services
docker compose -f docker-compose.selfhosted.yml up -d

# View logs
docker compose -f docker-compose.selfhosted.yml logs -f`}
                  language="bash"
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  5. Run Database Migrations
                </h5>
                <CodeBlock
                  code={`# For Community Edition
docker exec qarote_backend_community pnpm run db:migrate

# For Enterprise Edition
docker exec qarote_backend_enterprise pnpm run db:migrate`}
                  language="bash"
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  6. Access the Application
                </h5>
                <div className="bg-muted rounded-lg p-4">
                  <ul className="text-sm space-y-2">
                    <li>
                      <strong>Frontend:</strong>{" "}
                      <a
                        href="http://localhost:8080"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        http://localhost:8080
                      </a>
                    </li>
                    <li>
                      <strong>Backend API:</strong>{" "}
                      <a
                        href="http://localhost:3000"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        http://localhost:3000
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Dokku Quick Start */}
            <TabsContent value="dokku" className="space-y-4 mt-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Why Dokku?
                </h5>
                <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside space-y-1">
                  <li>
                    <strong>Easy deployment:</strong> Git push to deploy, like
                    Heroku
                  </li>
                  <li>
                    <strong>Automatic SSL:</strong> Let's Encrypt certificates
                    out of the box
                  </li>
                  <li>
                    <strong>Process management:</strong> Built-in scaling and
                    monitoring
                  </li>
                  <li>
                    <strong>Database plugins:</strong> Easy PostgreSQL setup
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">1. Install Dokku</h5>
                <p className="text-sm text-muted-foreground">
                  See the{" "}
                  <a
                    href="https://dokku.com/docs/getting-started/installation/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Dokku Installation Guide
                  </a>{" "}
                  for your platform.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  2. Create App and Database
                </h5>
                <CodeBlock
                  code={`# Create the Qarote app
ssh dokku@your-server apps:create qarote

# Install PostgreSQL plugin and create database
sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git postgres
dokku postgres:create qarote-db
dokku postgres:link qarote-db qarote`}
                  language="bash"
                />
                <p className="text-sm text-muted-foreground">
                  <code className="bg-muted px-1 rounded">DATABASE_URL</code> is
                  automatically set by Dokku when you link the database.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  3. Set Environment Variables
                </h5>
                <CodeBlock
                  code={`dokku config:set qarote \\
  DEPLOYMENT_MODE=community \\
  NODE_ENV=production \\
  LOG_LEVEL=info \\
  JWT_SECRET=$(openssl rand -hex 64) \\
  ENCRYPTION_KEY=$(openssl rand -hex 64) \\
  CORS_ORIGIN=* \\
  API_URL=https://your-domain.com \\
  FRONTEND_URL=https://your-domain.com \\
  ENABLE_EMAIL=false`}
                  language="bash"
                />
                <p className="text-sm text-muted-foreground">
                  <code className="bg-muted px-1 rounded">PORT</code> and{" "}
                  <code className="bg-muted px-1 rounded">HOST</code> are
                  automatically set by Dokku. Replace{" "}
                  <code className="bg-muted px-1 rounded">
                    https://your-domain.com
                  </code>{" "}
                  with your actual domain.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">4. Deploy</h5>
                <CodeBlock
                  code={`git remote add dokku dokku@your-server:qarote
git push dokku main`}
                  language="bash"
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  5. Run Database Migrations
                </h5>
                <CodeBlock
                  code={`dokku run qarote pnpm run db:migrate`}
                  language="bash"
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  6. Domain and SSL (Optional)
                </h5>
                <CodeBlock
                  code={`dokku domains:set qarote your-domain.com
dokku letsencrypt:enable qarote`}
                  language="bash"
                />
                <p className="text-sm text-muted-foreground">
                  Your app will be available at{" "}
                  <code className="bg-muted px-1 rounded">
                    https://your-domain.com
                  </code>{" "}
                  (or your server's IP).
                </p>
              </div>
            </TabsContent>

            {/* Manual (Bare Metal) Quick Start */}
            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <h5 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                  Advanced Setup
                </h5>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Manual deployment gives you full control but requires managing
                  Node.js, PostgreSQL, a reverse proxy, and process management
                  yourself. <strong>Docker Compose is recommended</strong> for
                  most users.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  1. Install Prerequisites
                </h5>
                <CodeBlock
                  code={`# Install Node.js 24+ (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install 24

# Enable pnpm via corepack
corepack enable

# Install PostgreSQL 15+
# Ubuntu/Debian:
sudo apt install postgresql postgresql-contrib
# macOS:
brew install postgresql@15

# Install Nginx (reverse proxy)
# Ubuntu/Debian:
sudo apt install nginx
# macOS:
brew install nginx`}
                  language="bash"
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  2. Clone and Install Dependencies
                </h5>
                <CodeBlock
                  code={`git clone https://github.com/getqarote/Qarote.git /opt/qarote
cd /opt/qarote
pnpm install`}
                  language="bash"
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">3. Set Up the Database</h5>
                <CodeBlock
                  code={`# Create database and user
sudo -u postgres psql -c "CREATE USER qarote WITH PASSWORD 'your-secure-password';"
sudo -u postgres psql -c "CREATE DATABASE qarote OWNER qarote;"

# Verify connection
psql -h localhost -U qarote -d qarote -c "SELECT 1;"`}
                  language="bash"
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  4. Configure Environment
                </h5>
                <CodeBlock
                  code={`# Generate .env with secrets (recommended)
./setup.sh community

# Then update DATABASE_URL to point to your local PostgreSQL:
# DATABASE_URL=postgresql://qarote:your-secure-password@localhost:5432/qarote`}
                  language="bash"
                />
                <p className="text-sm text-muted-foreground">
                  The setup script generates secrets. You only need to override{" "}
                  <code className="bg-muted px-1 rounded">DATABASE_URL</code> to
                  point to your local PostgreSQL instead of the Docker
                  container.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  5. Build and Start the Backend
                </h5>
                <CodeBlock
                  code={`# Build the API (generates Prisma client + compiles TypeScript)
pnpm run build:api

# Run database migrations
cd apps/api
pnpm run db:migrate
cd ../..

# Start the backend
cd apps/api
node --require tsconfig-paths/register dist/index.js`}
                  language="bash"
                />
                <p className="text-sm text-muted-foreground">
                  For production, use a process manager like{" "}
                  <a
                    href="https://pm2.keymetrics.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    pm2
                  </a>{" "}
                  or <strong>systemd</strong> to keep the backend running and
                  restart on failure.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  6. Build and Serve the Frontend
                </h5>
                <CodeBlock
                  code={`# Build the frontend (output: apps/app/dist/)
VITE_API_URL=http://localhost:3000 pnpm run build:app

# Copy to Nginx webroot
sudo mkdir -p /var/www/qarote
sudo cp -r apps/app/dist/* /var/www/qarote/`}
                  language="bash"
                />
                <p className="text-sm text-muted-foreground">
                  <code className="bg-muted px-1 rounded">VITE_API_URL</code> is
                  baked at build time. Set it to the URL where your backend API
                  is reachable.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">7. Configure Nginx</h5>
                <CodeBlock
                  code={`# /etc/nginx/sites-available/qarote
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (SPA)
    root /var/www/qarote;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Enable the site
# sudo ln -s /etc/nginx/sites-available/qarote /etc/nginx/sites-enabled/
# sudo nginx -t && sudo systemctl reload nginx`}
                  language="nginx"
                />
                <p className="text-sm text-muted-foreground">
                  For HTTPS, add{" "}
                  <a
                    href="https://certbot.eff.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Certbot
                  </a>{" "}
                  for free Let's Encrypt SSL certificates, or use{" "}
                  <a
                    href="https://caddyserver.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Caddy
                  </a>{" "}
                  which handles HTTPS automatically.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  8. Process Management (Production)
                </h5>
                <CodeBlock
                  code={`# Option A: pm2
npm install -g pm2
cd /opt/qarote/apps/api
pm2 start "node --require tsconfig-paths/register dist/index.js" --name qarote-api
pm2 save
pm2 startup  # auto-start on boot

# Option B: systemd
# Create /etc/systemd/system/qarote-api.service
# [Unit]
# Description=Qarote API
# After=postgresql.service
#
# [Service]
# Type=simple
# User=qarote
# WorkingDirectory=/opt/qarote/apps/api
# ExecStart=/usr/bin/node --require tsconfig-paths/register dist/index.js
# Restart=on-failure
# EnvironmentFile=/opt/qarote/.env
#
# [Install]
# WantedBy=multi-user.target`}
                  language="bash"
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  9. Access the Application
                </h5>
                <div className="bg-muted rounded-lg p-4">
                  <ul className="text-sm space-y-2">
                    <li>
                      <strong>Frontend:</strong> http://your-domain.com (Nginx)
                    </li>
                    <li>
                      <strong>Backend API:</strong> http://localhost:3000
                      (direct, or proxied through Nginx)
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* SMTP Configuration */}
        <div className="space-y-4">
          <Heading level={4} id="smtp-configuration">
            SMTP Configuration
          </Heading>
          <p className="text-muted-foreground">
            Email features are <strong>disabled by default</strong> for
            self-hosted deployments. To enable email (for password resets,
            invitations, notifications), configure SMTP settings.
          </p>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 my-6">
            <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              OAuth2 Authentication (Recommended)
            </h5>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              For production environments, <strong>OAuth2</strong> is the
              recommended authentication method. It's more secure than app
              passwords and doesn't require storing credentials directly.
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              <strong>Benefits:</strong>
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside ml-2 space-y-1 mb-3">
              <li>More secure than app-specific passwords</li>
              <li>Tokens can be revoked without changing passwords</li>
              <li>Better for enterprise and high-volume sending</li>
              <li>Compliant with modern security standards</li>
            </ul>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              For detailed OAuth2 setup instructions, see the{" "}
              <a
                href="https://nodemailer.com/smtp/oauth2/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium hover:text-blue-600 dark:hover:text-blue-300"
              >
                Nodemailer OAuth2 Documentation
              </a>
              . Examples for Gmail and Office 365 are shown below.
            </p>
          </div>

          <div className="space-y-6 mt-6">
            <div>
              <h5 className="font-semibold mb-3">
                Gmail - Option 1: App Password (Simple)
              </h5>
              <CodeBlock
                code={`ENABLE_EMAIL=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password`}
                language="bash"
              />
              <div className="text-sm text-muted-foreground mt-2 space-y-2">
                <p>
                  <strong>Requirements:</strong>
                </p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>
                    <strong>Enable 2FA</strong> on your Google account first
                  </li>
                  <li>
                    Generate an{" "}
                    <a
                      href="https://support.google.com/accounts/answer/185833"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      App Password
                    </a>{" "}
                    (not your regular password)
                  </li>
                  <li>
                    <strong>Sending limits:</strong> 500 emails/day for free
                    Gmail accounts, 2,000/day for Google Workspace
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <h5 className="font-semibold mb-3">
                Gmail - Option 2: OAuth2 (Recommended for Production)
              </h5>
              <CodeBlock
                code={`ENABLE_EMAIL=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_SERVICE=gmail
SMTP_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
SMTP_OAUTH_CLIENT_SECRET=your-client-secret
SMTP_OAUTH_REFRESH_TOKEN=your-refresh-token`}
                language="bash"
              />
              <div className="text-sm text-muted-foreground mt-2 space-y-2">
                <p>
                  <strong>OAuth2 Setup Steps:</strong>
                </p>
                <ol className="list-decimal list-inside ml-2 space-y-2">
                  <li>
                    Go to{" "}
                    <a
                      href="https://console.cloud.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google Cloud Console
                    </a>
                  </li>
                  <li>Create a new project (or use existing)</li>
                  <li>Enable Gmail API for your project</li>
                  <li>
                    Create OAuth 2.0 credentials (OAuth client ID → Web
                    application)
                  </li>
                  <li>
                    Add{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      https://developers.google.com/oauthplayground
                    </code>{" "}
                    to authorized redirect URIs
                  </li>
                  <li>
                    Use{" "}
                    <a
                      href="https://developers.google.com/oauthplayground/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      OAuth2 Playground
                    </a>{" "}
                    to get refresh token:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>Click gear icon → Use your own OAuth credentials</li>
                      <li>Enter Client ID and Client Secret</li>
                      <li>
                        In "Select & authorize APIs", enter{" "}
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          https://mail.google.com/
                        </code>
                      </li>
                      <li>Authorize APIs and grant access</li>
                      <li>Exchange authorization code for tokens</li>
                      <li>Copy the refresh token</li>
                    </ul>
                  </li>
                </ol>
                <p className="mt-3">
                  For detailed instructions, see{" "}
                  <a
                    href="https://nodemailer.com/smtp/oauth2/#example-3"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Nodemailer Gmail OAuth2 Guide
                  </a>
                </p>
              </div>
            </div>

            <div>
              <h5 className="font-semibold mb-3">SendGrid</h5>
              <CodeBlock
                code={`ENABLE_EMAIL=true
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key`}
                language="bash"
              />
              <div className="text-sm text-muted-foreground mt-2 space-y-2">
                <p>
                  <strong>Requirements:</strong>
                </p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>
                    Username is literally{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      apikey
                    </code>{" "}
                    (not your email)
                  </li>
                  <li>
                    Password is your SendGrid API key (create at Settings → API
                    Keys)
                  </li>
                  <li>Verify your sender domain in SendGrid dashboard first</li>
                  <li>
                    <strong>Free tier:</strong> 100 emails/day
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <h5 className="font-semibold mb-3">Mailgun</h5>
              <CodeBlock
                code={`ENABLE_EMAIL=true
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password`}
                language="bash"
              />
              <div className="text-sm text-muted-foreground mt-2 space-y-2">
                <p>
                  <strong>Requirements:</strong>
                </p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Add and verify your domain in Mailgun dashboard first</li>
                  <li>
                    Username format:{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      postmaster@your-domain.mailgun.org
                    </code>
                  </li>
                  <li>
                    Find SMTP credentials in Mailgun → Sending → Domain settings
                  </li>
                  <li>
                    <strong>Free tier:</strong> First 3 months free (up to
                    5,000/month), then paid only
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <h5 className="font-semibold mb-3">
                Office 365 / Outlook - Option 1: Basic Auth
              </h5>
              <CodeBlock
                code={`ENABLE_EMAIL=true
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-password`}
                language="bash"
              />
              <div className="text-sm text-muted-foreground mt-2 space-y-2">
                <p>
                  <strong>Important:</strong> Office 365 requires Modern
                  Authentication. You must enable <strong>SMTP AUTH</strong> in
                  your Microsoft 365 admin center:
                </p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>
                    Go to Microsoft 365 admin center → Settings → Org settings
                  </li>
                  <li>Select "Modern authentication" and enable SMTP AUTH</li>
                  <li>
                    If using 2FA/MFA, generate an App Password instead of your
                    regular password
                  </li>
                </ul>
                <p className="mt-2">
                  <strong>Note:</strong> Personal @outlook.com accounts should
                  use{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    smtp-mail.outlook.com
                  </code>{" "}
                  instead.
                </p>
              </div>
            </div>

            <div>
              <h5 className="font-semibold mb-3">
                Office 365 / Outlook - Option 2: OAuth2 (Recommended)
              </h5>
              <p className="text-sm text-muted-foreground mb-3">
                OAuth2 is recommended for Office 365/Outlook as it doesn't
                require enabling legacy SMTP AUTH.
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                For detailed Microsoft 365 OAuth2 setup instructions, see the{" "}
                <a
                  href="https://nodemailer.com/smtp/oauth2/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Nodemailer OAuth2 Documentation
                </a>
                .
              </p>
            </div>

            <div>
              <h5 className="font-semibold mb-3">Custom SMTP Server</h5>
              <CodeBlock
                code={`ENABLE_EMAIL=true
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=587
SMTP_USER=smtp-user
SMTP_PASS=smtp-password`}
                language="bash"
              />
            </div>

            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <h5 className="font-semibold mb-3">
                Additional OAuth2 Providers
              </h5>
              <p className="text-sm text-muted-foreground">
                For OAuth2 configuration with other providers (Outlook.com,
                Yahoo, AOL, etc.), refer to the comprehensive{" "}
                <a
                  href="https://nodemailer.com/smtp/oauth2/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Nodemailer OAuth2 Documentation
                </a>
                . It includes:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 mt-2 space-y-1">
                <li>Step-by-step setup guides for major providers</li>
                <li>Code examples for token generation and refresh</li>
                <li>Troubleshooting common OAuth2 issues</li>
                <li>Security best practices</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
            <h5 className="font-semibold mb-3">Testing SMTP Configuration</h5>
            <p className="text-sm text-muted-foreground mb-3">
              Use the built-in SMTP testing script to verify your configuration:
            </p>
            <Tabs defaultValue="smtp-docker" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="smtp-docker">Docker Compose</TabsTrigger>
                <TabsTrigger value="smtp-dokku">Dokku</TabsTrigger>
                <TabsTrigger value="smtp-manual">Manual</TabsTrigger>
              </TabsList>

              <TabsContent value="smtp-docker" className="mt-4">
                <CodeBlock
                  code={`# Replace <container> with your backend container name:
#   qarote_backend_community  (Community Edition)
#   qarote_backend_enterprise (Enterprise Edition)

# Test SMTP connection
docker exec <container> pnpm run test:smtp

# Send test email
docker exec <container> pnpm run test:smtp -- --send admin@yourcompany.com

# Send with production React Email template
docker exec <container> pnpm run test:smtp -- --send admin@yourcompany.com --template

# Test with Ethereal (fake SMTP, no real delivery)
docker exec <container> pnpm run test:smtp:ethereal

# Send test via Ethereal and get preview URL
docker exec <container> pnpm run test:smtp:ethereal -- --send test@example.com`}
                  language="bash"
                />
              </TabsContent>

              <TabsContent value="smtp-dokku" className="mt-4">
                <CodeBlock
                  code={`# Test SMTP connection
dokku run qarote pnpm run test:smtp

# Send test email
dokku run qarote pnpm run test:smtp -- --send admin@yourcompany.com

# Send with production React Email template
dokku run qarote pnpm run test:smtp -- --send admin@yourcompany.com --template

# Test with Ethereal (fake SMTP, no real delivery)
dokku run qarote pnpm run test:smtp:ethereal

# Send test via Ethereal and get preview URL
dokku run qarote pnpm run test:smtp:ethereal -- --send test@example.com`}
                  language="bash"
                />
              </TabsContent>

              <TabsContent value="smtp-manual" className="mt-4">
                <CodeBlock
                  code={`# From the project root (/opt/qarote)
cd apps/api

# Test SMTP connection
pnpm run test:smtp

# Send test email
pnpm run test:smtp -- --send admin@yourcompany.com

# Send with production React Email template
pnpm run test:smtp -- --send admin@yourcompany.com --template

# Test with Ethereal (fake SMTP, no real delivery)
pnpm run test:smtp:ethereal

# Send test via Ethereal and get preview URL
pnpm run test:smtp:ethereal -- --send test@example.com`}
                  language="bash"
                />
              </TabsContent>
            </Tabs>

            <p className="text-sm text-muted-foreground mt-3">
              <strong>Ethereal Email</strong> is a fake SMTP service — test
              emails are never delivered but viewable via a web preview URL.
            </p>
          </div>
        </div>

        {/* Updating Qarote */}
        <div className="space-y-4">
          <Heading level={4} id="updating-qarote">
            Updating Qarote
          </Heading>
          <Tabs defaultValue="update-docker" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="update-docker">Docker Compose</TabsTrigger>
              <TabsTrigger value="update-dokku">Dokku</TabsTrigger>
              <TabsTrigger value="update-manual">Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="update-docker" className="mt-4">
              <CodeBlock
                code={`# Pull latest changes
git pull origin main

# Rebuild and restart services
docker compose -f docker-compose.selfhosted.yml up -d --build

# Run any new migrations
docker exec qarote_backend_\${DEPLOYMENT_MODE} pnpm run db:migrate`}
                language="bash"
              />
            </TabsContent>

            <TabsContent value="update-dokku" className="mt-4">
              <CodeBlock
                code={`# Push latest changes to Dokku (triggers rebuild automatically)
git push dokku main

# Run any new migrations
dokku run qarote pnpm run db:migrate`}
                language="bash"
              />
            </TabsContent>

            <TabsContent value="update-manual" className="mt-4">
              <CodeBlock
                code={`# Pull latest changes
cd /opt/qarote
git pull origin main

# Install any new dependencies
pnpm install

# Rebuild backend and frontend
pnpm run build:api
VITE_API_URL=http://localhost:3000 pnpm run build:app

# Run any new migrations
cd apps/api
pnpm run db:migrate
cd ../..

# Restart the backend
pm2 restart qarote-api
# or: sudo systemctl restart qarote-api

# Update frontend static files
sudo cp -r apps/app/dist/* /var/www/qarote/`}
                language="bash"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Troubleshooting */}
        <div className="space-y-4">
          <Heading level={4} id="troubleshooting">
            Troubleshooting
          </Heading>

          <Accordion
            type="multiple"
            defaultValue={["services", "database", "license"]}
            className="w-full"
          >
            <AccordionItem value="services">
              <AccordionTrigger className="text-sm font-medium">
                Services Won't Start
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li>
                    Check Docker logs:{" "}
                    <code className="bg-muted px-1 rounded">
                      docker compose -f docker-compose.selfhosted.yml logs
                    </code>
                  </li>
                  <li>Verify environment variables in .env file</li>
                  <li>
                    Ensure ports 3000 and 8080 are available (or configure
                    different ports)
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="database">
              <AccordionTrigger className="text-sm font-medium">
                Database Connection Errors
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li>
                    Wait for PostgreSQL to fully initialize (check health
                    status)
                  </li>
                  <li>Verify POSTGRES_PASSWORD matches in .env</li>
                  <li>Ensure database migrations have been run</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="license">
              <AccordionTrigger className="text-sm font-medium">
                Enterprise License Issues
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Verify LICENSE_FILE_PATH points to the correct file</li>
                  <li>Ensure LICENSE_PUBLIC_KEY matches your license</li>
                  <li>Check license expiration date</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Security Recommendations */}
        <div className="space-y-4">
          <Heading level={4} id="security">
            Security Recommendations
          </Heading>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Use strong, randomly generated values for JWT_SECRET and
              ENCRYPTION_KEY
            </li>
            <li>
              Set restrictive file permissions on your license file (chmod 600
              qarote-license.json)
            </li>
            <li>Configure CORS_ORIGIN to your specific domain (not *)</li>
            <li>Use HTTPS in production with a reverse proxy</li>
            <li>Regularly update to the latest version</li>
            <li>Enable Sentry error tracking for production monitoring</li>
          </ul>
        </div>

        {/* Support */}
        <div className="space-y-4">
          <Heading level={4} id="support">
            Support
          </Heading>
          <div className="bg-muted rounded-lg p-4">
            <p className="font-semibold mb-2">Need Help?</p>
            <ul className="space-y-2 text-sm">
              <li>
                <strong>Community Support:</strong>{" "}
                <a
                  href="https://github.com/getqarote/Qarote/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub Issues
                </a>
              </li>
              <li>
                <strong>Enterprise Support:</strong> support@qarote.io
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
