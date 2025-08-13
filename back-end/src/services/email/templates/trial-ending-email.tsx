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

interface TrialEndingEmailProps {
  name: string;
  workspaceName: string;
  plan: "DEVELOPER" | "STARTUP" | "BUSINESS";
  trialEndDate: string;
  frontendUrl: string;
}

export const TrialEndingEmail = ({
  name,
  workspaceName,
  plan,
  trialEndDate,
  frontendUrl,
}: TrialEndingEmailProps) => {
  const planDisplayName = {
    DEVELOPER: "Developer",
    STARTUP: "Startup",
    BUSINESS: "Business",
  }[plan];

  const upgradeUrl = `${frontendUrl}/billing`;
  const supportUrl = `${frontendUrl}/help`;

  return (
    <Html>
      <Head />
      <Preview>
        Your {planDisplayName} trial ends soon - upgrade to continue using
        RabbitHQ
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
            <Text style={title}>Your trial is ending soon</Text>

            <Text style={paragraph}>Hi {name},</Text>

            <Text style={paragraph}>
              Your <strong>{planDisplayName}</strong> trial for workspace{" "}
              <strong>{workspaceName}</strong> will end on{" "}
              <strong>{trialEndDate}</strong>.
            </Text>

            <Text style={paragraph}>
              To continue enjoying all the premium features and keep your
              RabbitMQ monitoring uninterrupted, please upgrade your
              subscription before your trial expires.
            </Text>

            {/* Warning Section */}
            <Section style={warningSection}>
              <Text style={warningTitle}>
                ⚠️ What happens if you don't upgrade?
              </Text>

              <Section style={warningItem}>
                <Text style={warningText}>
                  • Your workspace will be downgraded to the Free plan
                </Text>
              </Section>

              <Section style={warningItem}>
                <Text style={warningText}>
                  • Advanced features will be disabled
                </Text>
              </Section>

              <Section style={warningItem}>
                <Text style={warningText}>
                  • Data retention will be limited
                </Text>
              </Section>

              <Section style={warningItem}>
                <Text style={warningText}>
                  • Team collaboration features will be restricted
                </Text>
              </Section>
            </Section>

            {/* Benefits Section */}
            <Section style={benefitsSection}>
              <Text style={sectionTitle}>
                Keep enjoying {planDisplayName} benefits:
              </Text>

              <Section style={benefitItem}>
                <Text style={benefitText}>
                  📊 Advanced analytics and detailed metrics
                </Text>
              </Section>

              <Section style={benefitItem}>
                <Text style={benefitText}>
                  🔔 Custom alerts and notifications
                </Text>
              </Section>

              <Section style={benefitItem}>
                <Text style={benefitText}>
                  👥 Team collaboration and workspace sharing
                </Text>
              </Section>

              {(plan === "STARTUP" || plan === "BUSINESS") && (
                <Section style={benefitItem}>
                  <Text style={benefitText}>
                    🧠 Memory optimization insights and recommendations
                  </Text>
                </Section>
              )}

              {plan === "BUSINESS" && (
                <Section style={benefitItem}>
                  <Text style={benefitText}>
                    🎯 Priority support and expert consultation
                  </Text>
                </Section>
              )}
            </Section>

            {/* Call to Action */}
            <Section style={buttonSection}>
              <Button style={button} href={upgradeUrl}>
                Upgrade Now
              </Button>
            </Section>

            <Text style={paragraph}>
              Have questions about your subscription? Our{" "}
              <Link href={supportUrl} style={link}>
                support team
              </Link>{" "}
              is here to help.
            </Text>

            <Hr style={hr} />

            <Text style={signature}>The RabbitHQ Team</Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this email because your trial subscription is
              ending soon.
            </Text>

            <Text style={footerText}>
              <Link href={frontendUrl} style={footerLink}>
                RabbitHQ
              </Link>{" "}
              - Monitor and manage your RabbitMQ clusters with ease.
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
};

const header = {
  padding: "32px 32px 20px",
  textAlign: "center" as const,
};

const logo = {
  margin: "0 auto 16px",
};

const headerText = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0",
};

const content = {
  padding: "0 32px",
};

const title = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#dc2626",
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#374151",
  margin: "0 0 16px",
};

const warningSection = {
  margin: "32px 0",
  padding: "24px",
  backgroundColor: "#fef2f2",
  borderRadius: "8px",
  border: "1px solid #fecaca",
};

const warningTitle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#dc2626",
  margin: "0 0 16px",
};

const warningItem = {
  margin: "0 0 8px",
};

const warningText = {
  fontSize: "15px",
  lineHeight: "20px",
  color: "#991b1b",
  margin: "0",
};

const benefitsSection = {
  margin: "32px 0",
  padding: "24px",
  backgroundColor: "#f0f9ff",
  borderRadius: "8px",
  border: "1px solid #bfdbfe",
};

const sectionTitle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 16px",
};

const benefitItem = {
  margin: "0 0 8px",
};

const benefitText = {
  fontSize: "15px",
  lineHeight: "20px",
  color: "#1e40af",
  margin: "0",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  background: "linear-gradient(to right, rgb(234, 88, 12), rgb(220, 38, 38))",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  border: "none",
};

const link = {
  color: "#3b82f6",
  textDecoration: "underline",
};

const signature = {
  fontSize: "16px",
  color: "#374151",
  fontWeight: "500",
  margin: "24px 0 0",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  padding: "32px 32px 0",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  margin: "0 0 8px",
};

const footerLink = {
  color: "#3b82f6",
  textDecoration: "underline",
};

export default TrialEndingEmail;
