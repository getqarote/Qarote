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

interface LicensePaymentFailedEmailProps {
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  gracePeriodDays: number;
  isInGracePeriod: boolean;
  willDeactivate: boolean;
  portalUrl: string;
}

export default function LicensePaymentFailedEmail({
  userName,
  licenseKey,
  tier,
  gracePeriodDays,
  isInGracePeriod,
  willDeactivate,
  portalUrl,
}: LicensePaymentFailedEmailProps): JSX.Element {
  const tierDisplay = tier.charAt(0) + tier.slice(1).toLowerCase();

  return (
    <Html>
      <Head />
      <Preview>
        ⚠️ Payment failed for your Qarote {tierDisplay} license. Update your
        payment method to avoid service interruption.
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>⚠️ License Payment Failed</Text>

            <Text style={contentStyles.paragraph}>
              {userName ? `Hi ${userName}` : "Hi"},
            </Text>

            <Text style={contentStyles.paragraph}>
              We were unable to process the renewal payment for your Qarote{" "}
              <strong>{tierDisplay}</strong> license.
            </Text>

            {/* License Details */}
            <Section style={sectionStyles.warningSection}>
              <Text style={contentStyles.heading}>License Information</Text>
              <Text style={textStyles.warningText}>
                <strong>Plan:</strong> {tierDisplay}
              </Text>
              <Text style={textStyles.warningText}>
                <strong>License Key:</strong> {licenseKey}
              </Text>
              {isInGracePeriod && (
                <Text style={textStyles.warningText}>
                  <strong>Grace Period:</strong> {gracePeriodDays} days
                  remaining
                </Text>
              )}
              <Text style={textStyles.warningText}>
                <strong>Status:</strong>{" "}
                {isInGracePeriod ? "Grace Period" : "Payment Failed"}
              </Text>
            </Section>

            <Text style={contentStyles.paragraph}>
              <strong>Action Required:</strong> Please update your payment
              method as soon as possible to avoid service interruption.
            </Text>

            {willDeactivate && (
              <Section style={sectionStyles.warningSection}>
                <Text style={textStyles.warningText}>
                  <strong>Warning:</strong> If payment is not resolved within{" "}
                  {gracePeriodDays} days, your license will be deactivated and
                  your self-hosted instance will stop working.
                </Text>
              </Section>
            )}

            {/* Call to Action */}
            <Section style={buttonStyles.buttonSection}>
              <Button
                style={buttonStyles.primaryButton}
                href={`${portalUrl}/licenses`}
              >
                Update Payment Method
              </Button>
            </Section>

            <Section style={sectionStyles.featuresSection}>
              <Text style={contentStyles.heading}>Common Reasons</Text>
              <Text style={textStyles.featureText}>
                • Insufficient funds in account
              </Text>
              <Text style={textStyles.featureText}>• Expired credit card</Text>
              <Text style={textStyles.featureText}>
                • Payment method declined by bank
              </Text>
              <Text style={textStyles.featureText}>
                • Billing address mismatch
              </Text>
            </Section>

            <Text style={contentStyles.paragraph}>
              Once you update your payment method, we'll automatically retry the
              payment. You'll receive a confirmation email when successful.
            </Text>

            <Text style={contentStyles.paragraph}>
              Manage your payment methods in your{" "}
              <Link href={`${portalUrl}/licenses`} style={textStyles.link}>
                license portal
              </Link>
              .
            </Text>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>
              Questions? Contact our support team - we're here to help resolve
              this quickly.
            </Text>

            <Text style={contentStyles.signature}>The Qarote Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
