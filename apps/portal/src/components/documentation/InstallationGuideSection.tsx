import { Trans, useTranslation } from "react-i18next";

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
  const { t } = useTranslation("docs");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <Heading level={3} id="installation-guide">
            {t("installGuide.title")}
          </Heading>
        </CardTitle>
        <CardDescription>{t("installGuide.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prerequisites */}
        <div className="space-y-4">
          <Heading level={4} id="prerequisites">
            {t("installGuide.prerequisites.title")}
          </Heading>
          <p className="text-sm text-muted-foreground">
            {t("installGuide.prerequisites.description")}
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li
              dangerouslySetInnerHTML={{
                __html: t("installGuide.prerequisites.dockerCompose"),
              }}
            />
            <li
              dangerouslySetInnerHTML={{
                __html: t("installGuide.prerequisites.dokku"),
              }}
            />
            <li
              dangerouslySetInnerHTML={{
                __html: t("installGuide.prerequisites.manual"),
              }}
            />
            <li
              dangerouslySetInnerHTML={{
                __html: t("installGuide.prerequisites.binary"),
              }}
            />
            <li
              dangerouslySetInnerHTML={{
                __html: t("installGuide.prerequisites.enterprise"),
              }}
            />
          </ul>
        </div>

        {/* Quick Start */}
        <div className="space-y-4">
          <Heading level={4} id="quick-start">
            {t("installGuide.quickStart.title")}
          </Heading>

          <Tabs defaultValue="docker-compose" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="docker-compose">
                {t("installGuide.quickStart.tabs.dockerCompose")}
              </TabsTrigger>
              <TabsTrigger value="dokku">
                {t("installGuide.quickStart.tabs.dokku")}
              </TabsTrigger>
              <TabsTrigger value="manual">
                {t("installGuide.quickStart.tabs.manual")}
              </TabsTrigger>
              <TabsTrigger value="binary">
                {t("installGuide.quickStart.tabs.binary")}
              </TabsTrigger>
            </TabsList>

            {/* Docker Compose Quick Start */}
            <TabsContent value="docker-compose" className="space-y-4 mt-4">
              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.dockerCompose.step1Title")}
                </h5>
                <CodeBlock
                  code={`git clone https://github.com/getqarote/Qarote.git /opt/qarote
cd /opt/qarote`}
                  language="bash"
                />
                <p className="text-sm text-muted-foreground">
                  <Trans
                    i18nKey="installGuide.quickStart.dockerCompose.step1Description"
                    ns="docs"
                    components={{
                      code: <code className="bg-muted px-1 rounded" />,
                      fhsLink: (
                        <a
                          href="https://refspecs.linuxfoundation.org/FHS_3.0/fhs/ch03s13.html"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        />
                      ),
                    }}
                  />
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.dockerCompose.step2Title")}
                </h5>
                <CodeBlock
                  code={`# Community Edition (open-source)
./setup.sh community

# Enterprise Edition (licensed)
./setup.sh enterprise`}
                  language="bash"
                />

                <div className="bg-muted rounded-lg p-4">
                  <p
                    className="text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{
                      __html: t(
                        "installGuide.quickStart.dockerCompose.step2Note"
                      ),
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.dockerCompose.step3Title")}
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
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.dockerCompose.step4Title")}
                </h5>
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
                  {t("installGuide.quickStart.dockerCompose.step5Title")}
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
                  {t("installGuide.quickStart.dockerCompose.step6Title")}
                </h5>
                <div className="bg-muted rounded-lg p-4">
                  <ul className="text-sm space-y-2">
                    <li>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: t(
                            "installGuide.quickStart.dockerCompose.step6Frontend"
                          ),
                        }}
                      />{" "}
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
                      <span
                        dangerouslySetInnerHTML={{
                          __html: t(
                            "installGuide.quickStart.dockerCompose.step6BackendApi"
                          ),
                        }}
                      />{" "}
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
                  {t("installGuide.quickStart.dokku.whyDokkuTitle")}
                </h5>
                <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside space-y-1">
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t(
                        "installGuide.quickStart.dokku.whyDokkuEasyDeployment"
                      ),
                    }}
                  />
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t(
                        "installGuide.quickStart.dokku.whyDokkuAutoSsl"
                      ),
                    }}
                  />
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t(
                        "installGuide.quickStart.dokku.whyDokkuProcessMgmt"
                      ),
                    }}
                  />
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t(
                        "installGuide.quickStart.dokku.whyDokkuDbPlugins"
                      ),
                    }}
                  />
                </ul>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.dokku.step1Title")}
                </h5>
                <p className="text-sm text-muted-foreground">
                  <Trans
                    i18nKey="installGuide.quickStart.dokku.step1Description"
                    ns="docs"
                    components={{
                      dokkuLink: (
                        <a
                          href="https://dokku.com/docs/getting-started/installation/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        />
                      ),
                    }}
                  />
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.dokku.step2Title")}
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
                <p
                  className="text-sm text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: t("installGuide.quickStart.dokku.step2Note"),
                  }}
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.dokku.step3Title")}
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
                <p
                  className="text-sm text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: t("installGuide.quickStart.dokku.step3Note"),
                  }}
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.dokku.step4Title")}
                </h5>
                <CodeBlock
                  code={`git remote add dokku dokku@your-server:qarote
git push dokku main`}
                  language="bash"
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.dokku.step5Title")}
                </h5>
                <CodeBlock
                  code={`dokku run qarote pnpm run db:migrate`}
                  language="bash"
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.dokku.step6Title")}
                </h5>
                <CodeBlock
                  code={`dokku domains:set qarote your-domain.com
dokku letsencrypt:enable qarote`}
                  language="bash"
                />
                <p
                  className="text-sm text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: t("installGuide.quickStart.dokku.step6Note"),
                  }}
                />
              </div>
            </TabsContent>

            {/* Manual (Bare Metal) Quick Start */}
            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <h5 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                  {t("installGuide.quickStart.manual.advancedSetupTitle")}
                </h5>
                <p
                  className="text-sm text-amber-800 dark:text-amber-200"
                  dangerouslySetInnerHTML={{
                    __html: t(
                      "installGuide.quickStart.manual.advancedSetupDescription"
                    ),
                  }}
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.manual.step1Title")}
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
                  {t("installGuide.quickStart.manual.step2Title")}
                </h5>
                <CodeBlock
                  code={`git clone https://github.com/getqarote/Qarote.git /opt/qarote
cd /opt/qarote
pnpm install`}
                  language="bash"
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.manual.step3Title")}
                </h5>
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
                  {t("installGuide.quickStart.manual.step4Title")}
                </h5>
                <CodeBlock
                  code={`# Generate .env with secrets (recommended)
./setup.sh community

# Then update DATABASE_URL to point to your local PostgreSQL:
# DATABASE_URL=postgresql://qarote:your-secure-password@localhost:5432/qarote`}
                  language="bash"
                />
                <p
                  className="text-sm text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: t("installGuide.quickStart.manual.step4Note"),
                  }}
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.manual.step5Title")}
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
node dist/index.js`}
                  language="bash"
                />
                <p className="text-sm text-muted-foreground">
                  <Trans
                    i18nKey="installGuide.quickStart.manual.step5Note"
                    ns="docs"
                    components={{
                      pm2Link: (
                        <a
                          href="https://pm2.keymetrics.io/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        />
                      ),
                      strong: <strong />,
                    }}
                  />
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.manual.step6Title")}
                </h5>
                <CodeBlock
                  code={`# Build the frontend (output: apps/app/dist/)
VITE_API_URL=http://localhost:3000 pnpm run build:app

# Copy to Nginx webroot
sudo mkdir -p /var/www/qarote
sudo cp -r apps/app/dist/* /var/www/qarote/`}
                  language="bash"
                />
                <p
                  className="text-sm text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: t("installGuide.quickStart.manual.step6Note"),
                  }}
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.manual.step7Title")}
                </h5>
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
                  <Trans
                    i18nKey="installGuide.quickStart.manual.step7Note"
                    ns="docs"
                    components={{
                      certbotLink: (
                        <a
                          href="https://certbot.eff.org/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        />
                      ),
                      caddyLink: (
                        <a
                          href="https://caddyserver.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        />
                      ),
                    }}
                  />
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.manual.step8Title")}
                </h5>
                <CodeBlock
                  code={`# Option A: pm2
npm install -g pm2
cd /opt/qarote/apps/api
pm2 start "node dist/index.js" --name qarote-api
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
# ExecStart=/usr/bin/node dist/index.js
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
                  {t("installGuide.quickStart.manual.step9Title")}
                </h5>
                <div className="bg-muted rounded-lg p-4">
                  <ul className="text-sm space-y-2">
                    <li
                      dangerouslySetInnerHTML={{
                        __html: t(
                          "installGuide.quickStart.manual.step9Frontend"
                        ),
                      }}
                    />
                    <li
                      dangerouslySetInnerHTML={{
                        __html: t(
                          "installGuide.quickStart.manual.step9BackendApi"
                        ),
                      }}
                    />
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Binary Quick Start */}
            <TabsContent value="binary" className="space-y-4 mt-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("installGuide.quickStart.binary.description")}
                </p>

                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.binary.step1Title")}
                </h5>
                <CodeBlock
                  code={`# Download the latest release for your platform
# Replace linux-x64 with: linux-arm64, darwin-x64, or darwin-arm64
curl -L https://github.com/getqarote/Qarote/releases/latest/download/qarote-linux-x64.tar.gz | tar xz
cd qarote`}
                  language="bash"
                />

                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.binary.step2Title")}
                </h5>
                <CodeBlock
                  code={`# Generates .env with secure secrets, tests your database connection
./qarote setup`}
                  language="bash"
                />
                <p
                  className="text-sm text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: t("installGuide.quickStart.binary.step2Note"),
                  }}
                />

                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.binary.step3Title")}
                </h5>
                <CodeBlock
                  code={`# Start the server (reads .env automatically)
# Database migrations run automatically on first start
./qarote`}
                  language="bash"
                />

                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.binary.step4Title")}
                </h5>
                <div
                  className="text-sm text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: `<p>${t("installGuide.quickStart.binary.step4Description")}</p>`,
                  }}
                />

                <div className="bg-muted rounded-lg p-4 mt-2">
                  <p
                    className="text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{
                      __html: t(
                        "installGuide.quickStart.binary.step4ManualSetup"
                      ),
                    }}
                  />
                  <CodeBlock
                    code={`./qarote --port 8080 --database-url postgresql://user:pass@localhost/qarote`}
                    language="bash"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* SMTP Configuration */}
        <div className="space-y-4">
          <Heading level={4} id="smtp-configuration">
            {t("installGuide.smtp.title")}
          </Heading>
          <p
            className="text-muted-foreground"
            dangerouslySetInnerHTML={{
              __html: t("installGuide.smtp.description"),
            }}
          />

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 my-6">
            <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              {t("installGuide.smtp.oauth2Title")}
            </h5>
            <p
              className="text-sm text-blue-800 dark:text-blue-200 mb-3"
              dangerouslySetInnerHTML={{
                __html: t("installGuide.smtp.oauth2Description"),
              }}
            />
            <p
              className="text-sm text-blue-800 dark:text-blue-200 mb-2"
              dangerouslySetInnerHTML={{
                __html: t("installGuide.smtp.oauth2BenefitsTitle"),
              }}
            />
            <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside ml-2 space-y-1 mb-3">
              <li>{t("installGuide.smtp.oauth2Benefit1")}</li>
              <li>{t("installGuide.smtp.oauth2Benefit2")}</li>
              <li>{t("installGuide.smtp.oauth2Benefit3")}</li>
              <li>{t("installGuide.smtp.oauth2Benefit4")}</li>
            </ul>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <Trans
                i18nKey="installGuide.smtp.oauth2DocsLink"
                ns="docs"
                components={{
                  nodemailerLink: (
                    <a
                      href="https://nodemailer.com/smtp/oauth2/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium hover:text-blue-600 dark:hover:text-blue-300"
                    />
                  ),
                }}
              />
            </p>
          </div>

          <div className="space-y-6 mt-6">
            <div>
              <h5 className="font-semibold mb-3">
                {t("installGuide.smtp.gmailAppPasswordTitle")}
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
                <p
                  dangerouslySetInnerHTML={{
                    __html: t("installGuide.smtp.gmailAppPasswordRequirements"),
                  }}
                />
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t("installGuide.smtp.gmailAppPasswordReq1"),
                    }}
                  />
                  <li>
                    <Trans
                      i18nKey="installGuide.smtp.gmailAppPasswordReq2"
                      ns="docs"
                      components={{
                        appPasswordLink: (
                          <a
                            href="https://support.google.com/accounts/answer/185833"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          />
                        ),
                      }}
                    />
                  </li>
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t("installGuide.smtp.gmailAppPasswordReq3"),
                    }}
                  />
                </ul>
              </div>
            </div>

            <div>
              <h5 className="font-semibold mb-3">
                {t("installGuide.smtp.gmailOauth2Title")}
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
                <p
                  dangerouslySetInnerHTML={{
                    __html: t("installGuide.smtp.gmailOauth2SetupTitle"),
                  }}
                />
                <ol className="list-decimal list-inside ml-2 space-y-2">
                  <li>
                    <Trans
                      i18nKey="installGuide.smtp.gmailOauth2Step1"
                      ns="docs"
                      components={{
                        googleCloudLink: (
                          <a
                            href="https://console.cloud.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          />
                        ),
                      }}
                    />
                  </li>
                  <li>{t("installGuide.smtp.gmailOauth2Step2")}</li>
                  <li>{t("installGuide.smtp.gmailOauth2Step3")}</li>
                  <li>{t("installGuide.smtp.gmailOauth2Step4")}</li>
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t("installGuide.smtp.gmailOauth2Step5"),
                    }}
                  />
                  <li>
                    <Trans
                      i18nKey="installGuide.smtp.gmailOauth2Step6"
                      ns="docs"
                      components={{
                        oauthPlaygroundLink: (
                          <a
                            href="https://developers.google.com/oauthplayground/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          />
                        ),
                      }}
                    />
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>{t("installGuide.smtp.gmailOauth2Step6Sub1")}</li>
                      <li>{t("installGuide.smtp.gmailOauth2Step6Sub2")}</li>
                      <li
                        dangerouslySetInnerHTML={{
                          __html: t("installGuide.smtp.gmailOauth2Step6Sub3"),
                        }}
                      />
                      <li>{t("installGuide.smtp.gmailOauth2Step6Sub4")}</li>
                      <li>{t("installGuide.smtp.gmailOauth2Step6Sub5")}</li>
                      <li>{t("installGuide.smtp.gmailOauth2Step6Sub6")}</li>
                    </ul>
                  </li>
                </ol>
                <p className="mt-3">
                  <Trans
                    i18nKey="installGuide.smtp.gmailOauth2DetailedInstructions"
                    ns="docs"
                    components={{
                      nodemailerGmailLink: (
                        <a
                          href="https://nodemailer.com/smtp/oauth2/#example-3"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        />
                      ),
                    }}
                  />
                </p>
              </div>
            </div>

            <div>
              <h5 className="font-semibold mb-3">
                {t("installGuide.smtp.sendgridTitle")}
              </h5>
              <CodeBlock
                code={`ENABLE_EMAIL=true
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key`}
                language="bash"
              />
              <div className="text-sm text-muted-foreground mt-2 space-y-2">
                <p
                  dangerouslySetInnerHTML={{
                    __html: t("installGuide.smtp.sendgridRequirements"),
                  }}
                />
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t("installGuide.smtp.sendgridReq1"),
                    }}
                  />
                  <li>{t("installGuide.smtp.sendgridReq2")}</li>
                  <li>{t("installGuide.smtp.sendgridReq3")}</li>
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t("installGuide.smtp.sendgridReq4"),
                    }}
                  />
                </ul>
              </div>
            </div>

            <div>
              <h5 className="font-semibold mb-3">
                {t("installGuide.smtp.mailgunTitle")}
              </h5>
              <CodeBlock
                code={`ENABLE_EMAIL=true
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password`}
                language="bash"
              />
              <div className="text-sm text-muted-foreground mt-2 space-y-2">
                <p
                  dangerouslySetInnerHTML={{
                    __html: t("installGuide.smtp.mailgunRequirements"),
                  }}
                />
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>{t("installGuide.smtp.mailgunReq1")}</li>
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t("installGuide.smtp.mailgunReq2"),
                    }}
                  />
                  <li>{t("installGuide.smtp.mailgunReq3")}</li>
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t("installGuide.smtp.mailgunReq4"),
                    }}
                  />
                </ul>
              </div>
            </div>

            <div>
              <h5 className="font-semibold mb-3">
                {t("installGuide.smtp.amazonSesTitle")}
              </h5>
              <CodeBlock
                code={`ENABLE_EMAIL=true
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password`}
                language="bash"
              />
              <div className="text-sm text-muted-foreground mt-2 space-y-2">
                <p
                  dangerouslySetInnerHTML={{
                    __html: t("installGuide.smtp.amazonSesRequirements"),
                  }}
                />
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t("installGuide.smtp.amazonSesReq1"),
                    }}
                  />
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t("installGuide.smtp.amazonSesReq2"),
                    }}
                  />
                  <li>{t("installGuide.smtp.amazonSesReq3")}</li>
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t("installGuide.smtp.amazonSesReq4"),
                    }}
                  />
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t("installGuide.smtp.amazonSesReq5"),
                    }}
                  />
                </ul>
              </div>
            </div>

            <div>
              <h5 className="font-semibold mb-3">
                {t("installGuide.smtp.office365BasicTitle")}
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
                <p
                  dangerouslySetInnerHTML={{
                    __html: t("installGuide.smtp.office365BasicImportant"),
                  }}
                />
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>{t("installGuide.smtp.office365BasicReq1")}</li>
                  <li>{t("installGuide.smtp.office365BasicReq2")}</li>
                  <li>{t("installGuide.smtp.office365BasicReq3")}</li>
                </ul>
                <p
                  className="mt-2"
                  dangerouslySetInnerHTML={{
                    __html: t("installGuide.smtp.office365BasicNote"),
                  }}
                />
              </div>
            </div>

            <div>
              <h5 className="font-semibold mb-3">
                {t("installGuide.smtp.office365Oauth2Title")}
              </h5>
              <p className="text-sm text-muted-foreground mb-3">
                {t("installGuide.smtp.office365Oauth2Description")}
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                <Trans
                  i18nKey="installGuide.smtp.office365Oauth2DocsLink"
                  ns="docs"
                  components={{
                    nodemailerLink: (
                      <a
                        href="https://nodemailer.com/smtp/oauth2/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      />
                    ),
                  }}
                />
              </p>
            </div>

            <div>
              <h5 className="font-semibold mb-3">
                {t("installGuide.smtp.customSmtpTitle")}
              </h5>
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
                {t("installGuide.smtp.additionalOauth2Title")}
              </h5>
              <p className="text-sm text-muted-foreground">
                <Trans
                  i18nKey="installGuide.smtp.additionalOauth2Description"
                  ns="docs"
                  components={{
                    nodemailerLink: (
                      <a
                        href="https://nodemailer.com/smtp/oauth2/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                      />
                    ),
                  }}
                />
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 mt-2 space-y-1">
                <li>{t("installGuide.smtp.additionalOauth2Item1")}</li>
                <li>{t("installGuide.smtp.additionalOauth2Item2")}</li>
                <li>{t("installGuide.smtp.additionalOauth2Item3")}</li>
                <li>{t("installGuide.smtp.additionalOauth2Item4")}</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
            <h5 className="font-semibold mb-3">
              {t("installGuide.smtp.testingTitle")}
            </h5>
            <p className="text-sm text-muted-foreground mb-3">
              {t("installGuide.smtp.testingDescription")}
            </p>
            <Tabs defaultValue="smtp-docker" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="smtp-docker">
                  {t("installGuide.quickStart.tabs.dockerCompose")}
                </TabsTrigger>
                <TabsTrigger value="smtp-dokku">
                  {t("installGuide.quickStart.tabs.dokku")}
                </TabsTrigger>
                <TabsTrigger value="smtp-manual">
                  {t("installGuide.quickStart.tabs.manual")}
                </TabsTrigger>
                <TabsTrigger value="smtp-binary">
                  {t("installGuide.quickStart.tabs.binary")}
                </TabsTrigger>
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

              <TabsContent value="smtp-binary" className="mt-4">
                <CodeBlock
                  code={`# The binary does not include test scripts.
# To test SMTP, use curl or a mail client to verify your SMTP settings,
# then configure ENABLE_EMAIL=true and SMTP_* variables in .env.
# Restart the binary for changes to take effect.`}
                  language="bash"
                />
              </TabsContent>
            </Tabs>

            <p
              className="text-sm text-muted-foreground mt-3"
              dangerouslySetInnerHTML={{
                __html: t("installGuide.smtp.testingEtherealNote"),
              }}
            />
          </div>
        </div>

        {/* Updating Qarote */}
        <div className="space-y-4">
          <Heading level={4} id="updating-qarote">
            {t("installGuide.updating.title")}
          </Heading>
          <Tabs defaultValue="update-docker" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="update-docker">
                {t("installGuide.updating.tabs.dockerCompose")}
              </TabsTrigger>
              <TabsTrigger value="update-dokku">
                {t("installGuide.updating.tabs.dokku")}
              </TabsTrigger>
              <TabsTrigger value="update-manual">
                {t("installGuide.updating.tabs.manual")}
              </TabsTrigger>
              <TabsTrigger value="update-binary">
                {t("installGuide.updating.tabs.binary")}
              </TabsTrigger>
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

            <TabsContent value="update-binary" className="mt-4">
              <CodeBlock
                code={`# Stop the running instance
kill $(pgrep -f './qarote') 2>/dev/null || true

# Download and extract in-place (overwrites binary, public/, migrations/)
# Replace linux-x64 with: linux-arm64, darwin-x64, or darwin-arm64
curl -L https://github.com/getqarote/Qarote/releases/latest/download/qarote-linux-x64.tar.gz \\
  | tar xz --strip-components=1

# Restart — new migrations are applied automatically on startup
# (your .env file is preserved — no reconfiguration needed)
./qarote`}
                language="bash"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Troubleshooting */}
        <div className="space-y-4">
          <Heading level={4} id="troubleshooting">
            {t("installGuide.troubleshooting.title")}
          </Heading>

          <Accordion
            type="multiple"
            defaultValue={["services", "database", "license"]}
            className="w-full"
          >
            <AccordionItem value="services">
              <AccordionTrigger className="text-sm font-medium">
                {t("installGuide.troubleshooting.servicesTitle")}
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li
                    dangerouslySetInnerHTML={{
                      __html: t("installGuide.troubleshooting.servicesItem1"),
                    }}
                  />
                  <li>{t("installGuide.troubleshooting.servicesItem2")}</li>
                  <li>{t("installGuide.troubleshooting.servicesItem3")}</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="database">
              <AccordionTrigger className="text-sm font-medium">
                {t("installGuide.troubleshooting.databaseTitle")}
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li>{t("installGuide.troubleshooting.databaseItem1")}</li>
                  <li>{t("installGuide.troubleshooting.databaseItem2")}</li>
                  <li>{t("installGuide.troubleshooting.databaseItem3")}</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="license">
              <AccordionTrigger className="text-sm font-medium">
                {t("installGuide.troubleshooting.licenseTitle")}
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li>{t("installGuide.troubleshooting.licenseItem1")}</li>
                  <li>{t("installGuide.troubleshooting.licenseItem2")}</li>
                  <li>{t("installGuide.troubleshooting.licenseItem3")}</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Security Recommendations */}
        <div className="space-y-4">
          <Heading level={4} id="security">
            {t("installGuide.security.title")}
          </Heading>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>{t("installGuide.security.item1")}</li>
            <li>{t("installGuide.security.item2")}</li>
            <li>{t("installGuide.security.item3")}</li>
            <li>{t("installGuide.security.item4")}</li>
            <li>{t("installGuide.security.item5")}</li>
            <li>{t("installGuide.security.item6")}</li>
          </ul>
        </div>

        {/* Support */}
        <div className="space-y-4">
          <Heading level={4} id="support">
            {t("installGuide.support.title")}
          </Heading>
          <div className="bg-muted rounded-lg p-4">
            <p className="font-semibold mb-2">
              {t("installGuide.support.needHelp")}
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <span
                  dangerouslySetInnerHTML={{
                    __html: t("installGuide.support.communitySupport"),
                  }}
                />{" "}
                <a
                  href="https://github.com/getqarote/Qarote/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {t("installGuide.support.communitySupportLink")}
                </a>
              </li>
              <li
                dangerouslySetInnerHTML={{
                  __html: t("installGuide.support.enterpriseSupport"),
                }}
              />
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
