import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Section,
  Text,
} from "@react-email/components";

import { getPlanFeatures } from "@/services/plan/plan.service";

import { EmailFooter } from "../shared/email-footer";
import { EmailHeader } from "../shared/email-header";
import {
  baseStyles,
  buttonStyles,
  colorVariants,
  contentStyles,
  sectionStyles,
  textStyles,
} from "../shared/styles";

import { UserPlan } from "@/generated/prisma/client";
import { tEmail } from "@/i18n";

interface WelcomeBackEmailProps {
  userName: string;
  workspaceName: string;
  plan: UserPlan;
  billingInterval: "monthly" | "yearly";
  previousCancelDate?: string;
  frontendUrl: string;
  locale?: string;
}

export const WelcomeBackEmail = ({
  workspaceName,
  plan,
  billingInterval,
  previousCancelDate,
  frontendUrl,
  locale = "en",
}: WelcomeBackEmailProps) => {
  const planDisplayName = plan.charAt(0) + plan.slice(1).toLowerCase();

  return (
    <Html>
      <Head />
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <EmailHeader frontendUrl={frontendUrl} />

          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>
              {tEmail(locale, "welcomeBack.title")}
            </Text>

            <Text style={contentStyles.paragraph}>
              We noticed you've renewed your subscription for{" "}
              <strong>{workspaceName}</strong>
              {previousCancelDate && (
                <>
                  {" "}
                  after your previous cancellation on{" "}
                  {new Date(previousCancelDate).toLocaleDateString("en-US", {
                    timeZone: "UTC",
                  })}
                </>
              )}
              . We're glad to have you back and look forward to supporting your
              RabbitMQ monitoring.
            </Text>

            <Section style={sectionStyles.highlightSection}>
              <Text style={styles.highlightText}>
                Thank you for giving us another chance.
              </Text>
              <Text style={styles.highlightSubtext}>
                Your feedback and loyalty mean a lot. We've been working to
                improve Qarote based on input from users like you.
              </Text>
            </Section>

            {/* Plan Info */}
            <Section style={styles.planSection}>
              <Heading as="h3" style={contentStyles.heading}>
                Your {planDisplayName} Plan
              </Heading>
              <Text style={contentStyles.paragraph}>
                <strong>Billing:</strong>{" "}
                {billingInterval === "yearly" ? "Annual" : "Monthly"}{" "}
                subscription
              </Text>

              {getPlanFeatures(plan).featureDescriptions.map(
                (feature, index) => (
                  <Text key={index} style={styles.featureItem}>
                    {feature}
                  </Text>
                )
              )}
            </Section>

            <Section style={buttonStyles.buttonSection}>
              <Link href={frontendUrl} style={buttonStyles.primaryButton}>
                {tEmail(locale, "welcomeBack.viewDashboard")}
              </Link>
            </Section>

            <Text style={contentStyles.paragraph}>
              Need help getting started again? Our{" "}
              <Link href={`${frontendUrl}/help`} style={textStyles.link}>
                {tEmail(locale, "common.supportTeam")}
              </Link>{" "}
              is here.
            </Text>

            <EmailFooter locale={locale} frontendUrl={frontendUrl} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const styles = {
  highlightText: {
    margin: "0 0 8px",
    fontWeight: "600",
    color: colorVariants.warning.text,
    fontSize: "16px",
  },

  highlightSubtext: {
    margin: "0",
    color: colorVariants.neutral.primary,
    fontSize: "15px",
    lineHeight: "22px",
  },

  planSection: {
    backgroundColor: colorVariants.neutral.background,
    padding: "20px",
    borderRadius: "8px",
    border: `1px solid ${colorVariants.neutral.border}`,
    margin: "20px 0",
  },

  featureItem: {
    margin: "6px 0",
    fontSize: "15px",
    lineHeight: "22px",
    color: colorVariants.neutral.text,
    paddingBottom: "6px",
    borderBottom: `1px solid ${colorVariants.neutral.border}`,
  },
} as const;
