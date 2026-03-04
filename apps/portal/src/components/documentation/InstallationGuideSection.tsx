import { Trans, useTranslation } from "react-i18next";

import { FileCode, FileText } from "lucide-react";

import { DockerComposeSection } from "@/components/documentation/DockerComposeSection";
import { EnvironmentConfigSection } from "@/components/documentation/EnvironmentConfigSection";
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

interface InstallationGuideSectionProps {
  activeDeployment: string;
  onDeploymentChange: (value: string) => void;
}

const ARCHITECTURES = [
  { value: "linux-x64", label: "Linux x64" },
  { value: "linux-arm64", label: "Linux ARM64" },
  { value: "darwin-arm64", label: "macOS ARM" },
  { value: "darwin-x64", label: "macOS Intel" },
] as const;

function ArchDownloadTabs({
  defaultValue = "linux-x64",
}: {
  defaultValue?: string;
}) {
  return (
    <Tabs defaultValue={defaultValue} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        {ARCHITECTURES.map((arch) => (
          <TabsTrigger key={arch.value} value={arch.value}>
            {arch.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {ARCHITECTURES.map((arch) => (
        <TabsContent key={arch.value} value={arch.value}>
          <CodeBlock
            code={`curl -L https://github.com/getqarote/Qarote/releases/latest/download/qarote-${arch.value}.tar.gz | tar xz --strip-components=1`}
            language="bash"
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function InstallationGuideSection({
  activeDeployment,
  onDeploymentChange,
}: InstallationGuideSectionProps) {
  const { t } = useTranslation("docs");

  const troubleshootingMethod =
    activeDeployment === "docker-compose"
      ? "dockerCompose"
      : activeDeployment === "dokku"
        ? "dokku"
        : "binary";

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

          <Tabs
            value={activeDeployment}
            onValueChange={onDeploymentChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="binary">
                {t("installGuide.quickStart.tabs.binary")}
              </TabsTrigger>
              <TabsTrigger value="docker-compose">
                {t("installGuide.quickStart.tabs.dockerCompose")}
              </TabsTrigger>
              <TabsTrigger value="dokku">
                {t("installGuide.quickStart.tabs.dokku")}
              </TabsTrigger>
            </TabsList>

            {/* Docker Compose Quick Start */}
            <TabsContent value="docker-compose" className="space-y-4 mt-4">
              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.dockerCompose.step1Title")}
                </h5>
                <CodeBlock
                  code={`git clone https://github.com/getqarote/Qarote.git qarote
cd qarote`}
                  language="bash"
                />
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.dockerCompose.step2Title")}
                </h5>
                <CodeBlock code={`./setup.sh`} language="bash" />

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

                <Accordion type="multiple" className="w-full space-y-2 mt-2">
                  <AccordionItem
                    value="docker-compose-file"
                    className="border rounded-lg"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          docker-compose.selfhosted.yml
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <DockerComposeSection />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="env-config"
                    className="border rounded-lg"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          .env.selfhosted.example
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <EnvironmentConfigSection />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
                  code={`docker exec qarote_backend pnpm run db:migrate`}
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
  JWT_SECRET=$(openssl rand -hex 64) \\
  ENCRYPTION_KEY=$(openssl rand -hex 64) \\
  ENABLE_EMAIL=false

# To enable email, set ENABLE_EMAIL=true and add SMTP settings:
# dokku config:set qarote \\
#   ENABLE_EMAIL=true \\
#   SMTP_HOST=smtp.gmail.com \\
#   SMTP_PORT=587 \\
#   SMTP_USER=your-email@gmail.com \\
#   SMTP_PASS=your-app-password`}
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

            {/* Binary Quick Start */}
            <TabsContent value="binary" className="space-y-4 mt-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("installGuide.quickStart.binary.description")}
                </p>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p
                    className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2"
                    dangerouslySetInnerHTML={{
                      __html: t(
                        "installGuide.quickStart.binary.postgresInstallTitle"
                      ),
                    }}
                  />
                  <CodeBlock
                    code={`# macOS
brew install postgresql@15

# Ubuntu / Debian / WSL2
sudo apt install postgresql`}
                    language="bash"
                  />
                </div>

                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.binary.dbSetupTitle")}
                </h5>
                <p className="text-sm text-muted-foreground">
                  {t("installGuide.quickStart.binary.dbSetupDescription")}
                </p>
                <CodeBlock
                  code={`sudo -u postgres psql -c "CREATE USER qarote WITH PASSWORD 'your-secure-password';"
sudo -u postgres psql -c "CREATE DATABASE qarote OWNER qarote;"`}
                  language="bash"
                />
                <p className="text-sm text-muted-foreground">
                  <Trans
                    i18nKey="installGuide.quickStart.binary.dbSetupNote"
                    ns="docs"
                    components={{ code: <code /> }}
                  />
                </p>

                <h5 className="text-sm font-medium">
                  {t("installGuide.quickStart.binary.step1Title")}
                </h5>

                <ArchDownloadTabs />
                <p className="text-xs text-muted-foreground">
                  <Trans
                    i18nKey="installGuide.quickStart.binary.step1Note"
                    ns="docs"
                    components={{
                      releasesLink: (
                        <a
                          href="https://github.com/getqarote/Qarote/releases"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        />
                      ),
                    }}
                  />
                </p>
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
                <div className="bg-muted rounded-lg p-4 mt-2 space-y-2">
                  <p className="text-sm font-medium">
                    {t("installGuide.quickStart.binary.setupWizardTitle")}
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>
                      <Trans
                        i18nKey="installGuide.quickStart.binary.setupWizardCreateAdmin"
                        ns="docs"
                        components={{ strong: <strong /> }}
                      />
                    </li>
                    <li>
                      <Trans
                        i18nKey="installGuide.quickStart.binary.setupWizardConfigureRegistration"
                        ns="docs"
                        components={{ strong: <strong /> }}
                      />
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    {t("installGuide.quickStart.binary.setupWizardTip")}
                  </p>
                </div>

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
                    code={`./qarote \\
  --database-url postgresql://user:pass@localhost/qarote \\
  --jwt-secret $(openssl rand -hex 64) \\
  --encryption-key $(openssl rand -hex 64)`}
                    language="bash"
                  />
                  <p
                    className="text-sm text-muted-foreground mt-3 mb-1"
                    dangerouslySetInnerHTML={{
                      __html: t("installGuide.quickStart.binary.cliFlagsTitle"),
                    }}
                  />
                  <CodeBlock
                    code={`./qarote setup                  # Interactive setup wizard (generates .env)
--database-url <url>            # PostgreSQL connection URL
--jwt-secret <secret>           # JWT signing secret (min 32 chars)
--encryption-key <key>          # Encryption key (min 32 chars)
-p, --port <port>               # Server port (default: 3000)
-h, --host <host>               # Server host (default: localhost)
--enable-email <bool>           # Enable email features (default: false)
--smtp-host <host>              # SMTP server hostname
--smtp-port <port>              # SMTP server port (default: 587)
--smtp-user <user>              # SMTP username
--smtp-pass <pass>              # SMTP password
--smtp-service <name>           # SMTP service for OAuth2 (e.g. gmail)
--smtp-oauth-client-id <id>    # OAuth2 client ID
--smtp-oauth-client-secret <s> # OAuth2 client secret
--smtp-oauth-refresh-token <t> # OAuth2 refresh token`}
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
            <CodeBlock
              code={`# Docker Compose: replace <container> with your backend container name
docker exec <container> pnpm run test:smtp

# Send a test email
docker exec <container> pnpm run test:smtp -- --send admin@yourcompany.com

# Dokku
dokku run qarote pnpm run test:smtp -- --send admin@yourcompany.com`}
              language="bash"
            />

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
          {activeDeployment === "binary" && (
            <div className="space-y-3">
              <CodeBlock
                code={`# Stop the running instance
kill $(pgrep -f './qarote') 2>/dev/null || true`}
                language="bash"
              />
              <ArchDownloadTabs />
              <CodeBlock
                code={`# Restart — new migrations are applied automatically on startup
# (your .env file is preserved — no reconfiguration needed)
./qarote`}
                language="bash"
              />
            </div>
          )}

          {activeDeployment === "docker-compose" && (
            <CodeBlock
              code={`# Pull latest changes
git pull origin main

# Rebuild and restart services
docker compose -f docker-compose.selfhosted.yml up -d --build

# Run any new migrations
docker exec qarote_backend pnpm run db:migrate`}
              language="bash"
            />
          )}

          {activeDeployment === "dokku" && (
            <CodeBlock
              code={`# Push latest changes to Dokku (triggers rebuild automatically)
git push dokku main

# Run any new migrations
dokku run qarote pnpm run db:migrate`}
              language="bash"
            />
          )}
        </div>

        {/* Troubleshooting */}
        <div className="space-y-4">
          <Heading level={4} id="troubleshooting">
            {t("installGuide.troubleshooting.title")}
          </Heading>

          <Accordion
            type="multiple"
            defaultValue={["wont-start", "database", "license"]}
            className="w-full"
          >
            {activeDeployment === "binary" && (
              <AccordionItem value="exec-format-error">
                <AccordionTrigger className="text-sm font-medium">
                  {t("installGuide.troubleshooting.execFormatTitle")}
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <Trans
                      i18nKey="installGuide.troubleshooting.execFormatDescription"
                      ns="docs"
                      components={{ code: <code /> }}
                    />
                  </p>
                  <CodeBlock
                    code={`# Example: switch from linux-x64 to linux-arm64
curl -L https://github.com/getqarote/Qarote/releases/latest/download/qarote-linux-arm64.tar.gz | tar xz --strip-components=1
./qarote setup`}
                    language="bash"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("installGuide.troubleshooting.execFormatTip")}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="wont-start">
              <AccordionTrigger className="text-sm font-medium">
                {t("installGuide.troubleshooting.wontStartTitle")}
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Trans
                      i18nKey={`installGuide.troubleshooting.${troubleshootingMethod}.wontStartItem1`}
                      ns="docs"
                      components={{ code: <code /> }}
                    />
                  </li>
                  <li>
                    <Trans
                      i18nKey={`installGuide.troubleshooting.${troubleshootingMethod}.wontStartItem2`}
                      ns="docs"
                      components={{ code: <code /> }}
                    />
                  </li>
                  <li>
                    <Trans
                      i18nKey={`installGuide.troubleshooting.${troubleshootingMethod}.wontStartItem3`}
                      ns="docs"
                      components={{ code: <code /> }}
                    />
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="database">
              <AccordionTrigger className="text-sm font-medium">
                {t("installGuide.troubleshooting.databaseTitle")}
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Trans
                      i18nKey={`installGuide.troubleshooting.${troubleshootingMethod}.databaseItem1`}
                      ns="docs"
                      components={{ code: <code /> }}
                    />
                  </li>
                  <li>
                    <Trans
                      i18nKey={`installGuide.troubleshooting.${troubleshootingMethod}.databaseItem2`}
                      ns="docs"
                      components={{ code: <code /> }}
                    />
                  </li>
                  <li>
                    <Trans
                      i18nKey={`installGuide.troubleshooting.${troubleshootingMethod}.databaseItem3`}
                      ns="docs"
                      components={{ code: <code /> }}
                    />
                  </li>
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
