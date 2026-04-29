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

interface LicenseCancellationEmailProps {
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  expiresAt: Date;
  portalUrl: string;
  locale?: string;
}

export default function LicenseCancellationEmail({
  userName,
  licenseKey,
  tier,
  expiresAt,
  portalUrl,
  locale = "en",
}: LicenseCancellationEmailProps): JSX.Element {
  const tierDisplay = tier.charAt(0) + tier.slice(1).toLowerCase();
  const accessUntil = expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <Html>
      <Head />
      <Preview>
        Your Qarote {tierDisplay} license has been cancelled. Access continues
        until {accessUntil}.
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <EmailHeader frontendUrl={portalUrl} />

          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>License Cancelled</Text>

            <Text style={contentStyles.paragraph}>
              {userName ? `Hi ${userName},` : "Hi,"}
            </Text>

            <Text style={contentStyles.paragraph}>
              Your Qarote <strong>{tierDisplay}</strong> license has been
              cancelled and will not renew. Your instance will keep running
              until <strong>{accessUntil}</strong> — no further charges will be
              made.
            </Text>

            <Section style={sectionStyles.infoSection}>
              <Text style={textStyles.infoText}>
                <strong>Plan:</strong> {tierDisplay}
              </Text>
              <Text style={styles.licenseKey}>{licenseKey}</Text>
              <Text style={textStyles.infoText}>
                <strong>Access until:</strong> {accessUntil}
              </Text>
            </Section>

            <Text style={contentStyles.paragraph}>
              Your data remains intact throughout the grace period. After{" "}
              {accessUntil}, your instance will stop and your data will be
              preserved — reactivate any time to pick up where you left off.
            </Text>

            <Text style={contentStyles.paragraph}>
              Changed your mind?{" "}
              <Link href={`${portalUrl}/licenses`} style={textStyles.link}>
                Reactivate your license
              </Link>{" "}
              before {accessUntil} and nothing will be interrupted.
            </Text>

            <Section style={buttonStyles.buttonSection}>
              <Button
                style={buttonStyles.primaryButton}
                href={`${portalUrl}/licenses`}
              >
                Reactivate License
              </Button>
            </Section>

            <Text style={contentStyles.paragraph}>
              We'd genuinely like to know what didn't work. Reply to this email
              and we'll read it.
            </Text>

            <EmailFooter locale={locale} frontendUrl={portalUrl} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  licenseKey: {
    ...textStyles.metric,
    margin: "4px 0",
  },
} as const;
