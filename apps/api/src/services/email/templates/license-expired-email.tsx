import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { JSX } from "react";

import {
  baseStyles,
  buttonStyles,
  contentStyles,
  sectionStyles,
  textStyles,
  utilityStyles,
} from "../shared/styles";

import { UserPlan } from "@/generated/prisma/client";

interface LicenseExpiredEmailProps {
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  expiredAt: Date;
  renewalUrl: string;
  portalUrl: string;
}

export default function LicenseExpiredEmail({
  userName,
  licenseKey,
  tier,
  expiredAt,
  renewalUrl,
  portalUrl,
}: LicenseExpiredEmailProps): JSX.Element {
  const tierDisplay = tier.charAt(0) + tier.slice(1).toLowerCase();
  const expiredDate = expiredAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Html>
      <Head />
      <Preview>
        Your Qarote {tierDisplay} license has expired. Renew now to restore
        access.
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>❌ License Expired</Text>

            <Text style={contentStyles.paragraph}>
              {userName ? `Hi ${userName}` : "Hi"},
            </Text>

            <Text style={contentStyles.paragraph}>
              Your Qarote <strong>{tierDisplay}</strong> license has expired as
              of {expiredDate}. Your self-hosted instance is no longer
              operational.
            </Text>

            {/* License Details */}
            <Section style={sectionStyles.warningSection}>
              <Text style={contentStyles.heading}>License Status</Text>
              <Text style={textStyles.warningText}>
                <strong>Plan:</strong> {tierDisplay}
              </Text>
              <Text style={textStyles.warningText}>
                <strong>License Key:</strong> {licenseKey}
              </Text>
              <Text style={textStyles.warningText}>
                <strong>Expired On:</strong> {expiredDate}
              </Text>
              <Text style={textStyles.warningText}>
                <strong>Status:</strong> Inactive
              </Text>
            </Section>

            <Text style={contentStyles.paragraph}>
              <strong>Action Required:</strong> Renew your license immediately
              to restore access to your self-hosted Qarote instance.
            </Text>

            {/* Call to Action */}
            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={renewalUrl}>
                Renew License Now
              </Button>
            </Section>

            <Section style={sectionStyles.infoSection}>
              <Text style={contentStyles.heading}>What This Means</Text>
              <Text style={textStyles.infoText}>
                • Your self-hosted instance will not start
              </Text>
              <Text style={textStyles.infoText}>
                • License validation will fail
              </Text>
              <Text style={textStyles.infoText}>
                • Renew to receive a new license file
              </Text>
              <Text style={textStyles.infoText}>
                • All your data remains safe and intact
              </Text>
            </Section>

            <Text style={contentStyles.paragraph}>
              Once renewed, you'll receive an updated license file via email.
              Install it in your Qarote directory and restart your instance to
              restore full functionality.
            </Text>

            <Text style={contentStyles.paragraph}>
              Manage your licenses in your{" "}
              <Link href={`${portalUrl}/licenses`} style={textStyles.link}>
                license portal
              </Link>
              .
            </Text>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>
              Need help? Contact our support team and we'll assist you.
            </Text>

            <Text style={contentStyles.signature}>The Qarote Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
