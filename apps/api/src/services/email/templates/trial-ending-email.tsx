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

import { getPlanFeatures } from "@/services/plan/plan.service";

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

interface TrialEndingEmailProps {
  name: string;
  workspaceName: string;
  plan: UserPlan;
  trialEndDate: string;
  frontendUrl: string;
  locale?: string;
}

const styles = {
  warningItem: {
    marginTop: "8px",
    paddingLeft: "4px",
  },
  benefitItem: {
    marginTop: "8px",
    paddingLeft: "4px",
  },
};

export default function TrialEndingEmail({
  name,
  workspaceName,
  plan,
  trialEndDate,
  frontendUrl,
  locale = "en",
}: TrialEndingEmailProps): JSX.Element {
  const planDisplayName = plan.charAt(0) + plan.slice(1).toLowerCase();
  const planFeatures = getPlanFeatures(plan);

  return (
    <Html>
      <Head />
      <Preview>
        Your {planDisplayName} trial ends soon - upgrade to continue using
        Qarote
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <EmailHeader frontendUrl={frontendUrl} />

          {/* Main Content */}
          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>
              {tEmail(locale, "trialEnding.title")}
            </Text>

            <Text style={contentStyles.paragraph}>
              {tEmail(locale, "common.greeting", { name })}
            </Text>

            <Text style={contentStyles.paragraph}>
              Your <strong>{planDisplayName}</strong> trial for workspace{" "}
              <strong>{workspaceName}</strong> will end on{" "}
              <strong>{trialEndDate}</strong>.
            </Text>

            <Text style={contentStyles.paragraph}>
              To continue enjoying all the premium features and keep your
              RabbitMQ monitoring uninterrupted, please add a payment method
              before your trial expires.
            </Text>

            {/* Warning Section */}
            <Section style={sectionStyles.warningSection}>
              <Text style={contentStyles.heading}>
                ⚠️ What happens if you don't upgrade?
              </Text>

              <Section style={styles.warningItem}>
                <Text style={textStyles.warningText}>
                  • Your workspace will be downgraded to the Free plan
                </Text>
              </Section>

              <Section style={styles.warningItem}>
                <Text style={textStyles.warningText}>
                  • Advanced features will be disabled
                </Text>
              </Section>

              <Section style={styles.warningItem}>
                <Text style={textStyles.warningText}>
                  • Team collaboration features will be restricted
                </Text>
              </Section>
            </Section>

            {/* Benefits Section */}
            <Section style={sectionStyles.infoSection}>
              <Text style={contentStyles.heading}>
                Keep enjoying {planDisplayName} benefits:
              </Text>

              {planFeatures.featureDescriptions.map((feature, index) => (
                <Section key={index} style={styles.benefitItem}>
                  <Text style={textStyles.infoText}>✓ {feature}</Text>
                </Section>
              ))}
            </Section>

            {/* Call to Action */}
            <Section style={buttonStyles.buttonSection}>
              <Button
                style={buttonStyles.primaryButton}
                href={`${frontendUrl}/settings/subscription/billing`}
              >
                {tEmail(locale, "trialEnding.upgradeCta")}
              </Button>
            </Section>

            <Text style={contentStyles.paragraph}>
              Have questions about your subscription? Our{" "}
              <Link href={`${frontendUrl}/help`} style={textStyles.link}>
                {tEmail(locale, "common.supportTeam")}
              </Link>{" "}
              is here to help.
            </Text>

            <EmailFooter locale={locale} frontendUrl={frontendUrl} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
