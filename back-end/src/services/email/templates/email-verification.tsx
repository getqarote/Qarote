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
} from "@react-email/components";
import {
  baseStyles,
  contentStyles,
  buttonStyles,
  textStyles,
  utilityStyles,
} from "../shared/styles";

interface EmailVerificationProps {
  email: string;
  userName?: string;
  token: string;
  type: "SIGNUP" | "EMAIL_CHANGE";
  frontendUrl: string;
  expiryHours: number;
  // Remove frontendUrl dependency for logo
}

export const EmailVerification = ({
  email,
  userName,
  token,
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
  const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

  return (
    <Html>
      <Head />
      <Preview>
        {isSignup
          ? "Verify your email to get started with RabbitHQ"
          : "Confirm your new email address"}
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          {/* Header */}

          {/* Main Content */}
          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>{emailTitle}</Text>

            <Text style={contentStyles.paragraph}>{greeting}</Text>

            <Text style={contentStyles.paragraph}>{mainText}</Text>

            <Text style={contentStyles.paragraph}>
              <strong>Email:</strong> {email}
            </Text>

            {/* Call to Action */}
            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={verificationUrl}>
                Verify Email Address
              </Button>
            </Section>

            <Text style={contentStyles.paragraph}>
              If the button above doesn't work, you can also copy and paste this
              link into your browser:
            </Text>

            <Text style={textStyles.linkText}>
              <Link href={verificationUrl} style={textStyles.link}>
                {verificationUrl}
              </Link>
            </Text>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>
              <strong>Important:</strong> This verification link will expire in{" "}
              {expiryHours} hours. If you didn't request this{" "}
              {isSignup ? "account" : "email change"}, you can safely ignore
              this email.
            </Text>

            {
              <Text style={contentStyles.paragraph}>
                If you're having trouble, feel free to contact our{" "}
                <Link href={supportUrl} style={textStyles.link}>
                  support team
                </Link>
                .
              </Text>
            }

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>Happy monitoring! 🐰</Text>

            <Text style={contentStyles.signature}>The RabbitHQ Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default EmailVerification;
