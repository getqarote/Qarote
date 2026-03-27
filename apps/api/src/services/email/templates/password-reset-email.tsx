import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import React from "react";

import { EmailFooter } from "../shared/email-footer";
import { EmailHeader } from "../shared/email-header";
import {
  baseStyles,
  buttonStyles,
  contentStyles,
  sectionStyles,
  textStyles,
} from "../shared/styles";

import { tEmail } from "@/i18n";

interface PasswordResetEmailProps {
  userName?: string;
  expiresAt: string;
  frontendUrl: string;
  token: string;
  locale?: string;
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  userName = "User",
  expiresAt,
  frontendUrl,
  token,
  locale = "en",
}) => {
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  return (
    <Html>
      <Head />
      <Preview>{tEmail(locale, "passwordReset.preview")}</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={sectionStyles.section}>
            <EmailHeader frontendUrl={frontendUrl} />

            <Section style={contentStyles.contentPadded}>
              <Heading style={contentStyles.title}>
                {tEmail(locale, "passwordReset.title")}
              </Heading>
            </Section>

            <Text style={contentStyles.paragraph}>
              {tEmail(locale, "common.greeting", { name: userName })}
            </Text>

            <Text style={contentStyles.paragraph}>
              {tEmail(locale, "passwordReset.body")}
            </Text>

            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={resetUrl}>
                {tEmail(locale, "passwordReset.resetButton")}
              </Button>
            </Section>

            <Text style={contentStyles.paragraph}>
              {tEmail(locale, "common.ifButtonDoesntWork")}
            </Text>
            <Text style={textStyles.linkText}>
              <Link href={resetUrl} style={textStyles.link}>
                {resetUrl}
              </Link>
            </Text>

            <Text style={styles.footerText}>
              {tEmail(locale, "passwordReset.securityNote", { expiresAt })}
            </Text>

            <EmailFooter locale={locale} frontendUrl={frontendUrl} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Custom styles for this template
const styles = {
  footerText: {
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: "1.5",
    margin: "0 0 8px",
  },
} as const;
