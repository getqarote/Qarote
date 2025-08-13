import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Button,
  Hr,
  Img,
} from "@react-email/components";

interface EmailVerificationProps {
  email: string;
  userName?: string;
  verificationUrl: string;
  type: "SIGNUP" | "EMAIL_CHANGE";
  frontendUrl: string;
  expiryHours: number;
}

export const EmailVerification = ({
  email,
  userName,
  verificationUrl,
  type,
  frontendUrl,
  expiryHours,
}: EmailVerificationProps) => {
  const isSignup = type === "SIGNUP";
  const emailTitle = isSignup
    ? "Please verify your email address"
    : "Verify your new email address";

  const greeting = userName ? `Hi ${userName},` : "Hello,";

  const mainText = isSignup
    ? "Thank you for signing up for RabbitHQ! To complete your registration and access your account, please verify your email address by clicking the button below."
    : "You've requested to change your email address on RabbitHQ. To confirm this change, please verify your new email address by clicking the button below.";

  const supportUrl = `${frontendUrl}/help`;

  return (
    <Html>
      <Head />
      <Preview>
        {isSignup
          ? "Verify your email to get started with RabbitHQ"
          : "Confirm your new email address"}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src={`${frontendUrl}/icon_rabbit.svg`}
              width="50"
              height="50"
              alt="RabbitHQ"
              style={logo}
            />
            <Text style={headerText}>RabbitHQ</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={title}>{emailTitle}</Text>

            <Text style={paragraph}>{greeting}</Text>

            <Text style={paragraph}>{mainText}</Text>

            <Text style={paragraph}>
              <strong>Email:</strong> {email}
            </Text>

            {/* Call to Action */}
            <Section style={buttonSection}>
              <Button style={button} href={verificationUrl}>
                Verify Email Address
              </Button>
            </Section>

            <Text style={paragraph}>
              If the button above doesn't work, you can also copy and paste this
              link into your browser:
            </Text>

            <Text style={linkText}>
              <Link href={verificationUrl} style={link}>
                {verificationUrl}
              </Link>
            </Text>

            <Hr style={hr} />

            <Text style={paragraph}>
              <strong>Important:</strong> This verification link will expire in{" "}
              {expiryHours} hours. If you didn't request this{" "}
              {isSignup ? "account" : "email change"}, you can safely ignore
              this email.
            </Text>

            {!isSignup && (
              <Text style={paragraph}>
                If you're having trouble, feel free to contact our{" "}
                <Link href={supportUrl} style={link}>
                  support team
                </Link>
                .
              </Text>
            )}

            <Text style={signature}>The RabbitHQ Team</Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © 2024 RabbitHQ. All rights reserved.
            </Text>
            <Text style={footerText}>
              You received this email because you{" "}
              {isSignup ? "signed up for" : "requested to change your email on"}{" "}
              RabbitHQ.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "8px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  maxWidth: "600px",
};

const header = {
  display: "flex" as const,
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 40px 20px",
  borderBottom: "1px solid #e5e7eb",
};

const logo = {
  borderRadius: "50%",
  marginRight: "12px",
};

const headerText = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0",
  lineHeight: "28px",
};

const content = {
  padding: "40px",
};

const title = {
  fontSize: "24px",
  lineHeight: "28px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#374151",
  margin: "0 0 16px",
};

const linkText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  margin: "0 0 16px",
  wordBreak: "break-all" as const,
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  background: "linear-gradient(to right, rgb(234, 88, 12), rgb(220, 38, 38))",
  borderRadius: "6px",
  fontWeight: "600",
  color: "#ffffff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  border: "none",
  cursor: "pointer",
};

const link = {
  color: "#3b82f6",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const signature = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#374151",
  margin: "24px 0 0",
  fontWeight: "500",
};

const footer = {
  padding: "0 40px 40px",
  textAlign: "center" as const,
  borderTop: "1px solid #e5e7eb",
  paddingTop: "32px",
};

const footerText = {
  fontSize: "12px",
  lineHeight: "16px",
  color: "#6b7280",
  margin: "0 0 8px",
};

export default EmailVerification;
