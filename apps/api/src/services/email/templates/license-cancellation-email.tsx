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

interface LicenseCancellationEmailProps {
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  expiresAt: Date;
  gracePeriodDays: number;
  portalUrl: string;
}

export default function LicenseCancellationEmail({
  userName,
  licenseKey,
  tier,
  expiresAt,
  gracePeriodDays,
  portalUrl,
}: LicenseCancellationEmailProps): JSX.Element {
  const tierDisplay = tier.charAt(0) + tier.slice(1).toLowerCase();
  const accessUntil = expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Html>
      <Head />
      <Preview>
        {`Your Qarote ${tierDisplay} license has been cancelled. Access until ${accessUntil}.`}
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>License Cancelled</Text>

            <Text style={contentStyles.paragraph}>
              {userName ? `Hi ${userName}` : "Hi"},
            </Text>

            <Text style={contentStyles.paragraph}>
              We're sorry to see you go. Your Qarote{" "}
              <strong>{tierDisplay}</strong> license has been cancelled and will
              not renew automatically.
            </Text>

            {/* Cancellation Details */}
            <Section style={sectionStyles.infoSection}>
              <Text style={contentStyles.heading}>Cancellation Details</Text>
              <Text style={textStyles.infoText}>
                <strong>Plan:</strong> {tierDisplay}
              </Text>
              <Text style={textStyles.infoText}>
                <strong>License Key:</strong> {licenseKey}
              </Text>
              <Text style={textStyles.infoText}>
                <strong>Access Until:</strong> {accessUntil}
              </Text>
              <Text style={textStyles.infoText}>
                <strong>Status:</strong> Cancelled (no auto-renewal)
              </Text>
            </Section>

            <Text style={contentStyles.paragraph}>
              Your self-hosted instance will continue to work until{" "}
              <strong>{accessUntil}</strong> ({gracePeriodDays}-day grace
              period). After this date, your license will expire and your
              instance will stop functioning.
            </Text>

            <Section style={sectionStyles.featuresSection}>
              <Text style={contentStyles.heading}>What Happens Next?</Text>
              <Text style={textStyles.featureText}>
                • Your instance remains operational until {accessUntil}
              </Text>
              <Text style={textStyles.featureText}>
                • No further charges will be made
              </Text>
              <Text style={textStyles.featureText}>
                • Access stops after the grace period expires
              </Text>
              <Text style={textStyles.featureText}>
                • Your data remains intact but inaccessible
              </Text>
            </Section>

            <Text style={contentStyles.paragraph}>
              <strong>Changed your mind?</strong> You can reactivate your
              license at any time before it expires.
            </Text>

            {/* Call to Action */}
            <Section style={buttonStyles.buttonSection}>
              <Button
                style={buttonStyles.primaryButton}
                href={`${portalUrl}/licenses`}
              >
                Reactivate License
              </Button>
            </Section>

            <Text style={contentStyles.paragraph}>
              We'd love to hear your feedback! If there's anything we could have
              done better, please let us know by replying to this email.
            </Text>

            <Text style={contentStyles.paragraph}>
              You can manage your licenses anytime in your{" "}
              <Link href={`${portalUrl}/licenses`} style={textStyles.link}>
                license portal
              </Link>
              .
            </Text>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>
              Thank you for using Qarote. We hope to see you again!
            </Text>

            <Text style={contentStyles.signature}>The Qarote Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
