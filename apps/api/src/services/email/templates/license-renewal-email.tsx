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

interface LicenseRenewalEmailProps {
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  newExpiresAt: Date;
  portalUrl: string;
  locale?: string;
}

export default function LicenseRenewalEmail({
  userName,
  licenseKey,
  tier,
  newExpiresAt,
  portalUrl,
  locale = "en",
}: LicenseRenewalEmailProps): JSX.Element {
  const tierDisplay = tier.charAt(0) + tier.slice(1).toLowerCase();
  const newExpiryDate = newExpiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <Html>
      <Head />
      <Preview>
        Your Qarote {tierDisplay} license has been renewed — update your key
        before {newExpiryDate}.
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <EmailHeader frontendUrl={portalUrl} />

          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>
              {tEmail(locale, "licenseRenewal.title")}
            </Text>

            <Text style={contentStyles.paragraph}>
              {userName ? `Hi ${userName},` : "Hi,"}
            </Text>

            <Text style={contentStyles.paragraph}>
              Your Qarote <strong>{tierDisplay}</strong> license has been
              automatically renewed for another 12 months. You need to update
              your license key in the admin panel to keep your instance running
              without interruption.
            </Text>

            {/* New license key — the centerpiece */}
            <Text style={styles.keyLabel}>Your new license key</Text>
            <Text style={codeStyles.commandBlock}>{licenseKey}</Text>

            <Section style={styles.successSection}>
              <Text style={textStyles.successText}>
                <strong>Valid until:</strong> {newExpiryDate}
              </Text>
              <Text style={textStyles.successText}>
                <strong>Plan:</strong> {tierDisplay}
              </Text>
            </Section>

            <Section style={sectionStyles.warningSection}>
              <Text style={styles.warningHeading}>
                Action Required: Update Your License Key
              </Text>
              <Text style={textStyles.warningText}>
                Copy your new license key above, open your admin panel, and
                paste it on the License page. Your instance won't start until
                you've applied the updated key.
              </Text>
            </Section>

            <Section style={buttonStyles.buttonSection}>
              <Button
                style={buttonStyles.primaryButton}
                href={`${portalUrl}/licenses`}
              >
                Open License Portal
              </Button>
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
  successSection: {
    ...sectionStyles.successSection,
    marginTop: "24px",
  },
  warningHeading: {
    ...contentStyles.heading,
    margin: "0 0 8px",
  },
} as const;
