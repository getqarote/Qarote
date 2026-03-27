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

import { EmailFooter } from "../shared/email-footer";
import { EmailHeader } from "../shared/email-header";
import {
  baseStyles,
  buttonStyles,
  contentStyles,
  textStyles,
  utilityStyles,
} from "../shared/styles";

import { tEmail } from "@/i18n";

interface EmailVerificationProps {
  email: string;
  userName?: string;
  token: string;
  type: "SIGNUP" | "EMAIL_CHANGE";
  frontendUrl: string;
  expiryHours: number;
  locale?: string;
}

export const EmailVerification = ({
  email,
  userName,
  token,
  type,
  frontendUrl,
  expiryHours,
  locale = "en",
}: EmailVerificationProps) => {
  const isSignup = type === "SIGNUP";
  const emailTitle = tEmail(
    locale,
    isSignup ? "verification.titleSignup" : "verification.titleEmailChange"
  );

  const greeting = userName
    ? tEmail(locale, "common.greeting", { name: userName })
    : tEmail(locale, "common.greetingGeneric");

  const mainText = isSignup
    ? "Thank you for signing up for Qarote! To complete your registration and access your account, please verify your email address by clicking the button below."
    : "You've requested to change your email address on Qarote. To confirm this change, please verify your new email address by clicking the button below.";

  const supportUrl = `${frontendUrl}/help`;
  const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

  return (
    <Html>
      <Head />
      <Preview>
        {tEmail(
          locale,
          isSignup
            ? "verification.previewSignup"
            : "verification.previewEmailChange"
        )}
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <EmailHeader frontendUrl={frontendUrl} />

          {/* Main Content */}
          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>{emailTitle}</Text>

            <Text style={contentStyles.paragraph}>{greeting}</Text>

            <Text style={contentStyles.paragraph}>{mainText}</Text>

            <Text style={contentStyles.paragraph}>
              <strong>{tEmail(locale, "verification.emailLabel")}</strong>{" "}
              {email}
            </Text>

            {/* Call to Action */}
            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={verificationUrl}>
                {tEmail(locale, "verification.verifyButton")}
              </Button>
            </Section>

            <Text style={contentStyles.paragraph}>
              {tEmail(locale, "common.ifButtonDoesntWork")}
            </Text>

            <Text style={textStyles.linkText}>
              <Link href={verificationUrl} style={textStyles.link}>
                {verificationUrl}
              </Link>
            </Text>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>
              {tEmail(locale, "verification.expiryWarning", {
                expiryHours,
                requestType: tEmail(
                  locale,
                  isSignup
                    ? "verification.requestTypeAccount"
                    : "verification.requestTypeEmailChange"
                ),
              })}
            </Text>

            {
              <Text style={contentStyles.paragraph}>
                {tEmail(locale, "verification.havingTrouble")}{" "}
                <Link href={supportUrl} style={textStyles.link}>
                  {tEmail(locale, "common.supportTeam")}
                </Link>
                .
              </Text>
            }

            <EmailFooter locale={locale} frontendUrl={frontendUrl} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
