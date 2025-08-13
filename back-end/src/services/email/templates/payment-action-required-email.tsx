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

interface PaymentActionRequiredEmailProps {
  name: string;
  workspaceName: string;
  plan: "DEVELOPER" | "STARTUP" | "BUSINESS";
  invoiceUrl: string;
  amount: string;
  currency: string;
  frontendUrl: string;
}

export const PaymentActionRequiredEmail = ({
  name,
  workspaceName,
  plan,
  invoiceUrl,
  amount,
  currency,
  frontendUrl,
}: PaymentActionRequiredEmailProps) => {
  const planDisplayName = {
    DEVELOPER: "Developer",
    STARTUP: "Startup",
    BUSINESS: "Business",
  }[plan];

  const billingUrl = `${frontendUrl}/billing`;
  const supportUrl = `${frontendUrl}/help`;

  return (
    <Html>
      <Head />
      <Preview>
        Action required: Complete your payment for {workspaceName}
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
            <Text style={title}>Payment action required</Text>

            <Text style={paragraph}>Hi {name},</Text>

            <Text style={paragraph}>
              We were unable to process the payment for your{" "}
              <strong>{planDisplayName}</strong> subscription for workspace{" "}
              <strong>{workspaceName}</strong>.
            </Text>

            <Text style={paragraph}>
              To continue your service without interruption, please complete the
              payment of{" "}
              <strong>
                {currency.toUpperCase()} {amount}
              </strong>
              .
            </Text>

            {/* Action Required Section */}
            <Section style={actionSection}>
              <Text style={actionTitle}>🚨 Immediate action required</Text>

              <Text style={actionText}>
                Your subscription will be suspended if payment is not completed
                within the next few days. This means:
              </Text>

              <Section style={actionItem}>
                <Text style={actionItemText}>
                  • Your workspace will lose access to premium features
                </Text>
              </Section>

              <Section style={actionItem}>
                <Text style={actionItemText}>
                  • Real-time monitoring may be interrupted
                </Text>
              </Section>

              <Section style={actionItem}>
                <Text style={actionItemText}>
                  • Team collaboration will be restricted
                </Text>
              </Section>

              <Section style={actionItem}>
                <Text style={actionItemText}>
                  • Data retention will be limited
                </Text>
              </Section>
            </Section>

            {/* Payment Instructions */}
            <Section style={instructionsSection}>
              <Text style={sectionTitle}>How to complete your payment:</Text>

              <Section style={instructionItem}>
                <Text style={instructionText}>
                  <strong>1.</strong> Click the "Complete Payment" button below
                </Text>
              </Section>

              <Section style={instructionItem}>
                <Text style={instructionText}>
                  <strong>2.</strong> You'll be taken to a secure payment page
                </Text>
              </Section>

              <Section style={instructionItem}>
                <Text style={instructionText}>
                  <strong>3.</strong> Update your payment method if needed
                </Text>
              </Section>

              <Section style={instructionItem}>
                <Text style={instructionText}>
                  <strong>4.</strong> Complete the payment to restore full
                  access
                </Text>
              </Section>
            </Section>

            {/* Call to Action */}
            <Section style={buttonSection}>
              <Button style={button} href={invoiceUrl}>
                Complete Payment
              </Button>
            </Section>

            <Text style={paragraph}>
              You can also manage your billing and payment methods from your{" "}
              <Link href={billingUrl} style={link}>
                billing dashboard
              </Link>
              .
            </Text>

            <Text style={paragraph}>
              Need help? Contact our{" "}
              <Link href={supportUrl} style={link}>
                support team
              </Link>{" "}
              and we'll assist you right away.
            </Text>

            <Hr style={hr} />

            <Text style={signature}>The RabbitHQ Team</Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this email because a payment for your
              subscription failed.
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

const actionSection = {
  margin: "32px 0",
  padding: "24px",
  backgroundColor: "#fef2f2",
  borderRadius: "8px",
  border: "1px solid #fecaca",
};

const actionTitle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#dc2626",
  margin: "0 0 16px",
};

const actionText = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#991b1b",
  margin: "0 0 16px",
};

const actionItem = {
  margin: "0 0 8px",
};

const actionItemText = {
  fontSize: "15px",
  lineHeight: "20px",
  color: "#991b1b",
  margin: "0",
};

const instructionsSection = {
  margin: "32px 0",
  padding: "24px",
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
};

const sectionTitle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 16px",
};

const instructionItem = {
  margin: "0 0 12px",
};

const instructionText = {
  fontSize: "15px",
  lineHeight: "20px",
  color: "#374151",
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

export default PaymentActionRequiredEmail;
