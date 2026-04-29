import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { JSX } from "react";

import { EmailFooter } from "../shared/email-footer";
import { EmailHeader } from "../shared/email-header";
import {
  baseStyles,
  buttonStyles,
  contentStyles,
  sectionStyles,
  textStyles,
} from "../shared/styles";

import { UserPlan } from "@/generated/prisma/client";
import { tEmail } from "@/i18n";

interface WelcomeEmailProps {
  name: string;
  workspaceName?: string;
  plan: UserPlan;
  frontendUrl: string;
  locale?: string;
  trialDaysRemaining?: number;
  trialEndDate?: string;
}

const styles = {
  featureItem: {
    marginTop: "8px",
    paddingLeft: "4px",
  },
};

export default function WelcomeEmail({
  name,
  workspaceName,
  plan,
  frontendUrl,
  locale = "en",
  trialDaysRemaining,
  trialEndDate,
}: WelcomeEmailProps): JSX.Element {
  const planDisplayName = plan.charAt(0) + plan.slice(1).toLowerCase();

  return (
    <Html>
      <Head />
      <Preview>{tEmail(locale, "subjects.welcome", { name })}</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <EmailHeader frontendUrl={frontendUrl} />

          {/* Main Content */}
          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>
              {tEmail(locale, "welcome.title")}
            </Text>

            <Text style={contentStyles.paragraph}>
              {tEmail(locale, "common.greeting", { name })}
            </Text>

            <Text style={contentStyles.paragraph}>
              {workspaceName ? (
                <>
                  Your workspace <strong>{workspaceName}</strong> is live on the{" "}
                  <strong>{planDisplayName}</strong> plan. Connect your first
                  RabbitMQ server and Qarote will start watching your queues,
                  message rates, and consumer health — and alert you before
                  problems reach your users.
                </>
              ) : (
                <>
                  Your account is ready on the{" "}
                  <strong>{planDisplayName}</strong> plan. Create a workspace,
                  connect a RabbitMQ server, and you'll have full queue
                  visibility in a few minutes.
                </>
              )}
            </Text>

            {/* Trial Info Section */}
            {trialDaysRemaining !== undefined && trialEndDate && (
              <Section style={sectionStyles.infoSection}>
                <Text style={textStyles.infoText}>
                  {tEmail(locale, "welcome.trialInfo", {
                    trialDays: trialDaysRemaining,
                    planName: planDisplayName,
                    trialEndDate,
                  })}
                </Text>
              </Section>
            )}

            {/* Plan Features Section */}
            <Section style={sectionStyles.featuresSection}>
              <Text style={contentStyles.heading}>
                {tEmail(
                  locale,
                  workspaceName
                    ? "welcome.featuresHeadingWithWorkspace"
                    : "welcome.featuresHeadingWithoutWorkspace"
                )}
              </Text>

              {!workspaceName && (
                <Section style={styles.featureItem}>
                  <Text style={textStyles.featureText}>
                    {tEmail(locale, "welcome.featureCreateWorkspace")}
                  </Text>
                </Section>
              )}

              <Section style={styles.featureItem}>
                <Text style={textStyles.featureText}>
                  {tEmail(locale, "welcome.featureAddServer")}
                </Text>
              </Section>

              <Section style={styles.featureItem}>
                <Text style={textStyles.featureText}>
                  {tEmail(locale, "welcome.featureExploreDashboard")}
                </Text>
              </Section>

              <Section style={styles.featureItem}>
                <Text style={textStyles.featureText}>
                  {tEmail(locale, "welcome.featureSetupAlerts")}
                </Text>
              </Section>

              {
                <>
                  <Section style={styles.featureItem}>
                    <Text style={textStyles.featureText}>
                      {tEmail(locale, "welcome.featureAdvancedAnalytics")}
                    </Text>
                  </Section>

                  <Section style={styles.featureItem}>
                    <Text style={textStyles.featureText}>
                      {tEmail(locale, "welcome.featureInviteTeam")}
                    </Text>
                  </Section>
                </>
              }

              <Section style={styles.featureItem}>
                <Text style={textStyles.featureText}>
                  {tEmail(locale, "welcome.featureMemoryMetrics")}
                </Text>
              </Section>

              <Section style={styles.featureItem}>
                <Text style={textStyles.featureText}>
                  {tEmail(locale, "welcome.featurePrioritySupport")}
                </Text>
              </Section>
            </Section>

            {/* Call to Action */}
            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={frontendUrl}>
                {tEmail(
                  locale,
                  workspaceName
                    ? "welcome.ctaWithWorkspace"
                    : "welcome.ctaWithoutWorkspace"
                )}
              </Button>
            </Section>

            <Text style={contentStyles.paragraph}>
              {tEmail(locale, "welcome.needHelp")}{" "}
              <Link href={`${frontendUrl}/help`} style={textStyles.link}>
                {tEmail(locale, "common.supportTeam")}
              </Link>
              .
            </Text>

            <EmailFooter locale={locale} frontendUrl={frontendUrl} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
