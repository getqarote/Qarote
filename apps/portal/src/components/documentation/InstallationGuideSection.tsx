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
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Docker and Docker Compose</li>
            <li>PostgreSQL 15+ (or use the included PostgreSQL container)</li>
            <li>For Enterprise Edition: Valid license file and public key</li>
          </ul>
        </div>

        {/* Quick Start */}
        <div className="space-y-4">
          <Heading level={4} id="quick-start">
            Quick Start
          </Heading>

          <div className="space-y-3">
            <h5 className="text-sm font-medium">1. Clone the Repository</h5>
            <CodeBlock
              code={`git clone https://github.com/getqarote/Qarote.git
cd qarote`}
              language="bash"
            />
          </div>

          <div className="space-y-3">
            <h5 className="text-sm font-medium">
              2. Configure Environment Variables
            </h5>
            <CodeBlock
              code={`# Copy the environment template
cp .env.selfhosted.example .env

# Edit .env and configure your deployment
# For Community Edition: Set DEPLOYMENT_MODE=community
# For Enterprise Edition: Set DEPLOYMENT_MODE=enterprise`}
              language="bash"
            />

            <div className="bg-muted rounded-lg p-4">
              <p className="font-semibold mb-2">⚠️ Required Configuration</p>
              <p className="text-sm text-muted-foreground">
                You must generate secure values for:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>
                  <code className="bg-background px-1 rounded">JWT_SECRET</code>{" "}
                  - Minimum 32 characters
                </li>
                <li>
                  <code className="bg-background px-1 rounded">
                    ENCRYPTION_KEY
                  </code>{" "}
                  - Minimum 32 characters
                </li>
                <li>
                  <code className="bg-background px-1 rounded">
                    POSTGRES_PASSWORD
                  </code>{" "}
                  - Strong database password
                </li>
              </ul>
              <p className="text-sm text-muted-foreground mt-3">
                Generate these secrets automatically:
              </p>
            </div>

            <CodeBlock
              code={`# Run setup script from project root
pnpm setup:selfhosted

# Or write directly to apps/api/.env file
pnpm setup:selfhosted --write`}
              language="bash"
            />
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
DEPLOYMENT_MODE=enterprise
LICENSE_FILE_PATH=./qarote-license.json

# Public key for license validation (provided via email with your license)
# IMPORTANT: Wrap the entire key in double quotes, use \\n for line breaks
LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA...\\n-----END PUBLIC KEY-----"`}
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
            <h5 className="text-sm font-medium">5. Run Database Migrations</h5>
            <CodeBlock
              code={`# For Community Edition
docker exec qarote_backend_community pnpm run db:migrate

# For Enterprise Edition
docker exec qarote_backend_enterprise pnpm run db:migrate`}
              language="bash"
            />
          </div>

          <div className="space-y-3">
            <h5 className="text-sm font-medium">6. Access the Application</h5>
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
              🔐 OAuth2 Authentication (Recommended)
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
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com`}
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
SMTP_OAUTH_REFRESH_TOKEN=your-refresh-token
FROM_EMAIL=your-email@gmail.com`}
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
                      <li>
                        Click gear icon (⚙️) → Use your own OAuth credentials
                      </li>
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
SMTP_PASS=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com`}
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
SMTP_PASS=your-mailgun-password
FROM_EMAIL=noreply@yourdomain.com`}
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
SMTP_PASS=your-password
FROM_EMAIL=your-email@yourdomain.com`}
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
SMTP_PASS=smtp-password
FROM_EMAIL=noreply@yourcompany.com`}
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
            <CodeBlock
              code={`# Test connection only
pnpm test:smtp

# Send simple test email via real SMTP
pnpm test:smtp --send admin@yourcompany.com

# Send with production React Email template
pnpm test:smtp --send admin@yourcompany.com --template

# Test with Ethereal (fake SMTP for development)
pnpm test:smtp:ethereal

# Send test via Ethereal and get preview URL
pnpm test:smtp:ethereal --send test@example.com

# Test React Email templates with Ethereal
pnpm test:smtp:ethereal --send test@example.com --template`}
              language="bash"
            />
            <p className="text-sm text-muted-foreground mt-3">
              <strong>Ethereal Email:</strong> A fake SMTP service for
              development testing. Test emails are never delivered but viewable
              via a web preview URL. Perfect for testing email templates without
              a real SMTP server.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>--template flag:</strong> Uses the same production React
              Email templates that your users receive. Perfect for verifying
              templates render correctly via SMTP.
            </p>
          </div>
        </div>

        {/* Updating Qarote */}
        <div className="space-y-4">
          <Heading level={4} id="updating-qarote">
            Updating Qarote
          </Heading>
          <CodeBlock
            code={`# Pull latest changes
git pull origin main

# Rebuild and restart services
docker compose -f docker-compose.selfhosted.yml up -d --build

# Run any new migrations
docker exec qarote_backend_\${DEPLOYMENT_MODE} pnpm run db:migrate`}
            language="bash"
          />
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
