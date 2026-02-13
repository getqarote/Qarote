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

interface LicenseExpirationReminderEmailProps {
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  daysUntilExpiration: number;
  expiresAt: Date;
  renewalUrl: string;
  portalUrl: string;
}

export default function LicenseExpirationReminderEmail({
  userName,
  licenseKey,
  tier,
  daysUntilExpiration,
  expiresAt,
  renewalUrl,
  portalUrl,
}: LicenseExpirationReminderEmailProps): JSX.Element {
  const tierDisplay = tier.charAt(0) + tier.slice(1).toLowerCase();
  const expiryDate = expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const urgency = daysUntilExpiration <= 7 ? "urgent" : "info";
  const emoji = daysUntilExpiration <= 7 ? "⚠️" : "ℹ️";

  return (
    <Html>
      <Head />
      <Preview>
        {`${emoji} Your Qarote ${tierDisplay} license expires in ${daysUntilExpiration} days`}
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>
              {emoji} License Expiration Reminder
            </Text>

            <Text style={contentStyles.paragraph}>
              {userName ? `Hi ${userName}` : "Hi"},
            </Text>

            <Text style={contentStyles.paragraph}>
              This is a reminder that your Qarote <strong>{tierDisplay}</strong>{" "}
              license will expire in <strong>{daysUntilExpiration} days</strong>
              .
            </Text>

            {/* License Details */}
            <Section
              style={
                urgency === "urgent"
                  ? sectionStyles.warningSection
                  : sectionStyles.infoSection
              }
            >
              <Text style={contentStyles.heading}>License Details</Text>
              <Text
                style={
                  urgency === "urgent"
                    ? textStyles.warningText
                    : textStyles.infoText
                }
              >
                <strong>Plan:</strong> {tierDisplay}
              </Text>
              <Text
                style={
                  urgency === "urgent"
                    ? textStyles.warningText
                    : textStyles.infoText
                }
              >
                <strong>License Key:</strong> {licenseKey}
              </Text>
              <Text
                style={
                  urgency === "urgent"
                    ? textStyles.warningText
                    : textStyles.infoText
                }
              >
                <strong>Expires On:</strong> {expiryDate}
              </Text>
            </Section>

            <Text style={contentStyles.paragraph}>
              {daysUntilExpiration <= 7 ? (
                <>
                  <strong>Action required soon!</strong> After expiration, your
                  self-hosted instance will stop working. Make sure your payment
                  method is up to date to ensure automatic renewal.
                </>
              ) : (
                <>
                  Don't worry - if your payment method is valid, your license
                  will renew automatically. You'll receive an updated license
                  file after renewal.
                </>
              )}
            </Text>

            {/* Call to Action */}
            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={renewalUrl}>
                {daysUntilExpiration <= 7
                  ? "Update Payment Method"
                  : "View License Details"}
              </Button>
            </Section>

            <Section style={sectionStyles.featuresSection}>
              <Text style={contentStyles.heading}>What Happens Next?</Text>
              <Text style={textStyles.featureText}>
                ✓ Automatic renewal will occur on {expiryDate}
              </Text>
              <Text style={textStyles.featureText}>
                ✓ You'll receive an updated license file via email
              </Text>
              <Text style={textStyles.featureText}>
                ✓ Simply replace your current license file to continue
              </Text>
              <Text style={textStyles.featureText}>
                ✓ No service interruption if renewed on time
              </Text>
            </Section>

            <Text style={contentStyles.paragraph}>
              You can manage your licenses and payment methods in your{" "}
              <Link href={`${portalUrl}/licenses`} style={textStyles.link}>
                license portal
              </Link>
              .
            </Text>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>
              Questions? Contact our support team - we're here to help!
            </Text>

            <Text style={contentStyles.signature}>The Qarote Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
