import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { getPlanFeatures } from "@/services/plan/plan.service";

import { EmailFooter } from "../shared/email-footer";
import { EmailHeader } from "../shared/email-header";
import {
  baseStyles,
  buttonStyles,
  contentStyles,
  sectionStyles,
  textStyles,
  utilityStyles,
} from "../shared/styles";

import { UserPlan } from "@/generated/prisma/client";
import { tEmail } from "@/i18n";

interface UpgradeConfirmationEmailProps {
  userName: string;
  workspaceName: string;
  plan: UserPlan;
  billingInterval: "monthly" | "yearly";
  frontendUrl: string;
  locale?: string;
}

export const UpgradeConfirmationEmail = ({
  userName,
  workspaceName,
  plan,
  billingInterval,
  frontendUrl,
  locale = "en",
}: UpgradeConfirmationEmailProps) => {
  const planDisplayName = plan.charAt(0) + plan.slice(1).toLowerCase();
  const planFeatures = getPlanFeatures(plan);

  return (
    <Html>
      <Head />
      <Preview>
        {tEmail(locale, "upgradeConfirmation.title", {
          plan: planDisplayName,
        })}
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <EmailHeader frontendUrl={frontendUrl} />

          <Section style={contentStyles.contentPadded}>
            <Heading style={contentStyles.title}>
              {tEmail(locale, "upgradeConfirmation.title", {
                plan: planDisplayName,
              })}
            </Heading>
          </Section>

          <Section style={contentStyles.content}>
            <Text style={contentStyles.paragraph}>
              {tEmail(locale, "common.greeting", { name: userName })}
            </Text>

            <Text style={contentStyles.paragraph}>
              Great news! Your workspace "{workspaceName}" has been successfully
              upgraded to the {planDisplayName} plan. You now have access to all
              the powerful features that will help you monitor and optimize your
              RabbitMQ infrastructure.
            </Text>

            <Section style={sectionStyles.featuresSection}>
              <Heading as="h2" style={contentStyles.heading}>
                What's included in your {planDisplayName} plan:
              </Heading>
              {planFeatures.featureDescriptions.map((feature, index) => (
                <Text key={index} style={textStyles.featureText}>
                  ✅ {feature}
                </Text>
              ))}
            </Section>

            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={frontendUrl}>
                {tEmail(locale, "upgradeConfirmation.viewDashboard")}
              </Button>
            </Section>

            <Hr style={utilityStyles.hr} />

            <Section style={styles.billingSection}>
              <Text style={styles.billingText}>
                <strong>Billing Details:</strong>
              </Text>
              <Text style={styles.billingText}>
                Plan: {planDisplayName} (
                {billingInterval === "yearly" ? "Annual" : "Monthly"} billing)
              </Text>
              <Text style={styles.billingText}>
                You can manage your subscription and view billing history in
                your{" "}
                <a
                  href={`${frontendUrl}/settings/subscription/billing`}
                  style={textStyles.link}
                >
                  account settings
                </a>
                .
              </Text>
            </Section>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>
              If you need help getting started, check out our{" "}
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
};

// Custom styles for this template
const styles = {
  billingSection: {
    margin: "24px 0",
  },

  billingText: {
    fontSize: "14px",
    lineHeight: "1.5",
    color: "#6b7280",
    margin: "8px 0",
  },

  supportSection: {
    textAlign: "center" as const,
    margin: "16px 0",
  },
} as const;
