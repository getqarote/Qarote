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

interface LicenseRenewalEmailProps {
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  previousExpiresAt: Date;
  newExpiresAt: Date;
  downloadUrl: string;
  portalUrl: string;
}

export default function LicenseRenewalEmail({
  userName,
  licenseKey,
  tier,
  previousExpiresAt,
  newExpiresAt,
  downloadUrl,
  portalUrl,
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
        Your Qarote {tierDisplay} license has been renewed! Download your
        updated license file.
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>
              ✅ License Renewed Successfully
            </Text>

            <Text style={contentStyles.paragraph}>
              {userName ? `Hi ${userName}` : "Hi"},
            </Text>

            <Text style={contentStyles.paragraph}>
              Great news! Your Qarote <strong>{tierDisplay}</strong> license has
              been automatically renewed for another 12 months.
            </Text>

            {/* License Details */}
            <Section style={sectionStyles.successSection}>
              <Text style={contentStyles.heading}>Updated License Details</Text>
              <Text style={textStyles.successText}>
                <strong>Plan:</strong> {tierDisplay}
              </Text>
              <Text style={textStyles.successText}>
                <strong>License Key:</strong> {licenseKey}
              </Text>
              <Text style={textStyles.successText}>
                <strong>Previous Expiry:</strong>{" "}
                {previousExpiresAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </Text>
              <Text style={textStyles.successText}>
                <strong>New Expiry:</strong> {newExpiryDate}
              </Text>
            </Section>

            <Section style={sectionStyles.warningSection}>
              <Text style={contentStyles.heading}>
                ⚠️ Action Required: Update Your License Key
              </Text>
              <Text style={textStyles.warningText}>
                To continue using your self-hosted Qarote instance without
                interruption, copy your new license key and paste it in your
                admin panel.
              </Text>
            </Section>

            {/* Call to Action */}
            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={downloadUrl}>
                View Updated License
              </Button>
            </Section>

            {/* Installation Instructions */}
            <Section style={sectionStyles.featuresSection}>
              <Text style={contentStyles.heading}>Update Steps</Text>
              <Text style={textStyles.featureText}>
                1. Copy your new license key from the portal
              </Text>
              <Text style={textStyles.featureText}>
                2. Open your Qarote self-hosted admin panel
              </Text>
              <Text style={textStyles.featureText}>
                3. Go to the License page and paste your new key
              </Text>
              <Text style={textStyles.featureText}>
                4. Your license will be updated immediately
              </Text>
            </Section>

            <Text style={contentStyles.paragraph}>
              You can also manage your licenses anytime from your{" "}
              <Link href={`${portalUrl}/licenses`} style={textStyles.link}>
                license portal
              </Link>
              .
            </Text>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>
              Your license will automatically renew again in 12 months.
            </Text>

            <Text style={contentStyles.signature}>The Qarote Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
