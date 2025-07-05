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
} from "@react-email/components";
import React from "react";

interface PasswordResetEmailProps {
  userName?: string;
  resetUrl: string;
  expiresAt: string;
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  userName = "User",
  resetUrl,
  expiresAt,
}) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your password for RabbitMQ Dashboard</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Heading style={h1}>Reset your password</Heading>

            <Text style={text}>Hello {userName},</Text>

            <Text style={text}>
              We received a request to reset your password for your RabbitMQ
              Dashboard account. If you didn't request this, you can safely
              ignore this email.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={resetUrl}>
                Reset Password
              </Button>
            </Section>

            <Text style={text}>
              Or copy and paste this URL into your browser:
            </Text>

            <Text style={linkText}>{resetUrl}</Text>

            <Text style={footerText}>
              This password reset link will expire on {expiresAt}.
            </Text>

            <Hr style={hr} />

            <Text style={footerText}>
              If you didn't request this password reset, please ignore this
              email or contact support if you have concerns.
            </Text>

            <Text style={footerText}>
              Best regards,
              <br />
              The RabbitMQ Dashboard Team
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const section = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "32px",
  margin: "0 auto",
};

const h1 = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.25",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "0 0 16px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const linkText = {
  color: "#2563eb",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 16px",
  wordBreak: "break-all" as const,
};

const footerText = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 8px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

export default PasswordResetEmail;
