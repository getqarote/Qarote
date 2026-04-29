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
  codeStyles,
  colorVariants,
  contentStyles,
  sectionStyles,
  textStyles,
} from "../shared/styles";

import { UserPlan } from "@/generated/prisma/client";
import { tEmail } from "@/i18n";

interface LicenseDeliveryEmailProps {
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  expiresAt: Date;
  portalUrl: string;
  locale?: string;
}

export default function LicenseDeliveryEmail({
  userName,
  licenseKey,
  tier,
  expiresAt,
  portalUrl,
  locale = "en",
}: LicenseDeliveryEmailProps): JSX.Element {
  const tierDisplay = tier.charAt(0) + tier.slice(1).toLowerCase();
  const expiryDate = expiresAt.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <Html>
      <Head />
      <Preview>
        Your Qarote {tierDisplay} license is ready — paste it in your admin
        panel to activate.
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <EmailHeader frontendUrl={portalUrl} />

          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>
              {tEmail(locale, "licenseDelivery.title")}
            </Text>

            <Text style={contentStyles.paragraph}>
              {userName ? `Hi ${userName},` : "Hi,"}
            </Text>

            <Text style={contentStyles.paragraph}>
              Your Qarote <strong>{tierDisplay}</strong> license is ready. Copy
              the key below and paste it into your admin panel — you'll be
              monitoring in minutes.
            </Text>

            {/* License key as the visual centerpiece */}
            <Text style={styles.keyLabel}>Your license key</Text>
            <Text style={codeStyles.commandBlock}>{licenseKey}</Text>

            {/* License meta — secondary info */}
            <Section style={styles.metaSection}>
              <Text style={textStyles.infoText}>
                <strong>Plan:</strong> {tierDisplay}
              </Text>
              <Text style={textStyles.infoText}>
                <strong>Valid until:</strong> {expiryDate}
              </Text>
              <Text style={textStyles.infoText}>
                <strong>Auto-renewal:</strong> Enabled
              </Text>
            </Section>

            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={portalUrl}>
                Open License Portal
              </Button>
            </Section>

            {/* Activation steps — brief */}
            <Section style={sectionStyles.featuresSection}>
              <Text style={contentStyles.heading}>Activation</Text>
              <Text style={textStyles.featureText}>
                1. Copy the license key above
              </Text>
              <Text style={textStyles.featureText}>
                2. Open your Qarote admin panel → License
              </Text>
              <Text style={textStyles.featureText}>
                3. Paste and save — active immediately
              </Text>
            </Section>

            <Text style={contentStyles.paragraph}>
              Manage your licenses anytime from your{" "}
              <Link href={`${portalUrl}/licenses`} style={textStyles.link}>
                license portal
              </Link>
              .
            </Text>

            <EmailFooter locale={locale} frontendUrl={portalUrl} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  keyLabel: {
    ...contentStyles.paragraph,
    color: colorVariants.neutral.primary,
    marginBottom: "8px",
    fontSize: "13px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  metaSection: {
    ...sectionStyles.infoSection,
    marginTop: "24px",
  },
} as const;
