import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Link,
} from "@react-email/components";
import React from "react";
import {
  baseStyles,
  contentStyles,
  buttonStyles,
  textStyles,
  utilityStyles,
  sectionStyles,
} from "../shared/styles";

interface PasswordResetEmailProps {
  userName?: string;
  expiresAt: string;
  frontendUrl: string;
  token: string;
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  userName = "User",
  expiresAt,
  frontendUrl,
  token,
}) => {
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  return (
    <Html>
      <Head />
      <Preview>Reset your password for RabbitMQ Dashboard</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={sectionStyles.section}>
            {/* Add Logo */}

            <Section style={contentStyles.contentPadded}>
              <Heading style={contentStyles.title}>Reset your password</Heading>
            </Section>

            <Text style={contentStyles.paragraph}>Hello {userName},</Text>

            <Text style={contentStyles.paragraph}>
              We received a request to reset your password for your RabbitMQ
              Dashboard account. If you didn't request this, you can safely
              ignore this email.
            </Text>

            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={resetUrl}>
                Reset Password
              </Button>
            </Section>

            <Text style={contentStyles.paragraph}>
              Or copy and paste this URL into your browser:
            </Text>
            <Text style={textStyles.linkText}>
              <Link href={resetUrl} style={textStyles.link}>
                {resetUrl}
              </Link>
            </Text>

            <Text style={styles.footerText}>
              This password reset link will expire on {expiresAt}.
            </Text>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>Happy monitoring! 🐰</Text>

            <Text style={contentStyles.signature}>The RabbitHQ Team</Text>
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

export default PasswordResetEmail;
