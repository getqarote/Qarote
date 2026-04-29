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

interface LicenseExpiredEmailProps {
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  expiredAt: Date;
  renewalUrl: string;
  portalUrl: string;
  locale?: string;
}

export default function LicenseExpiredEmail({
  userName,
  licenseKey,
  tier,
  expiredAt,
  renewalUrl,
  portalUrl,
  locale = "en",
}: LicenseExpiredEmailProps): JSX.Element {
  const tierDisplay = tier.charAt(0) + tier.slice(1).toLowerCase();
  const expiredDate = expiredAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <Html>
      <Head />
      <Preview>
        Your Qarote {tierDisplay} license expired on {expiredDate} — renew to
        restore access.
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <EmailHeader frontendUrl={portalUrl} />

          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>Your license has expired</Text>

            <Text style={contentStyles.paragraph}>
              {userName ? `Hi ${userName},` : "Hi,"}
            </Text>

            <Text style={contentStyles.paragraph}>
              Your Qarote <strong>{tierDisplay}</strong> license expired on{" "}
              <strong>{expiredDate}</strong>. Renew now to restore full access
              to your self-hosted instance.
            </Text>

            {/* Recovery action — first and prominent */}
            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={renewalUrl}>
                Renew License
              </Button>
            </Section>

            {/* License reference info */}
            <Section style={sectionStyles.infoSection}>
              <Text style={contentStyles.heading}>License Details</Text>
              <Text style={textStyles.infoText}>
                <strong>Plan:</strong> {tierDisplay}
              </Text>
              <Text style={textStyles.infoText}>
                <strong>License Key:</strong> {licenseKey}
              </Text>
              <Text style={textStyles.infoText}>
                <strong>Expired:</strong> {expiredDate}
              </Text>
            </Section>

            <Text style={contentStyles.paragraph}>
              Your data is safe and intact. Once renewed, you'll receive an
              updated license key via email — paste it in your admin panel and
              restart your instance to restore full functionality.
            </Text>

            <Text style={contentStyles.paragraph}>
              Manage your licenses in your{" "}
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
