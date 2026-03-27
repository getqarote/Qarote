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
import { tEmail } from "@/i18n";

interface LicenseDeliveryEmailProps {
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  expiresAt: Date;
  downloadUrl: string;
  portalUrl: string;
  locale?: string;
}

export default function LicenseDeliveryEmail({
  userName,
  licenseKey,
  tier,
  expiresAt,
  downloadUrl,
  portalUrl,
  locale = "en",
}: LicenseDeliveryEmailProps): JSX.Element {
  const tierDisplay = tier.charAt(0) + tier.slice(1).toLowerCase();
  const expiryDate = expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <Html>
      <Head />
      <Preview>
        Your Qarote {tierDisplay} license is ready! Copy your license key to
        activate your self-hosted instance.
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <EmailHeader frontendUrl={portalUrl} />

          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>
              {tEmail(locale, "licenseDelivery.title")}
            </Text>

            <Text style={contentStyles.paragraph}>
              {tEmail(locale, "common.greeting", { name: userName || "" })}
            </Text>

            <Text style={contentStyles.paragraph}>
              Thank you for purchasing Qarote <strong>{tierDisplay}</strong>!
              Your self-hosted license has been generated and is ready to use.
            </Text>

            {/* License Details */}
            <Section style={sectionStyles.infoSection}>
              <Text style={contentStyles.heading}>License Details</Text>
              <Text style={textStyles.infoText}>
                <strong>Plan:</strong> {tierDisplay}
              </Text>
              <Text style={textStyles.infoText}>
                <strong>License Key:</strong> {licenseKey}
              </Text>
              <Text style={textStyles.infoText}>
                <strong>Valid Until:</strong> {expiryDate} (12 months)
              </Text>
              <Text style={textStyles.infoText}>
                <strong>Auto-Renewal:</strong> Enabled
              </Text>
            </Section>

            <Text style={contentStyles.paragraph}>
              Copy your license key above, then paste it in your self-hosted
              Qarote admin panel to activate your license.
            </Text>

            {/* Call to Action */}
            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={downloadUrl}>
                Manage Your Licenses
              </Button>
            </Section>

            {/* Installation Instructions */}
            <Section style={sectionStyles.featuresSection}>
              <Text style={contentStyles.heading}>Activation Steps</Text>
              <Text style={textStyles.featureText}>
                1. Copy the license key above
              </Text>
              <Text style={textStyles.featureText}>
                2. Open your Qarote self-hosted admin panel
              </Text>
              <Text style={textStyles.featureText}>
                3. Go to the License page and paste your key
              </Text>
              <Text style={textStyles.featureText}>
                4. Your license will be activated immediately
              </Text>
            </Section>

            <Text style={contentStyles.paragraph}>
              You can also manage your licenses anytime from your{" "}
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
