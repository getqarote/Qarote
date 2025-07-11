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

interface UpcomingInvoiceEmailProps {
  name: string;
  workspaceName: string;
  plan: "DEVELOPER" | "STARTUP" | "BUSINESS";
  amount: string;
  currency: string;
  invoiceDate: string;
  nextBillingDate: string;
  frontendUrl: string;
  usageReport?: {
    servers: number;
    queues: number;
    monthlyMessages: number;
    totalMessages: number;
  };
}

export const UpcomingInvoiceEmail = ({
  name,
  workspaceName,
  plan,
  amount,
  currency,
  invoiceDate,
  nextBillingDate,
  frontendUrl,
  usageReport,
}: UpcomingInvoiceEmailProps) => {
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
        Your upcoming {planDisplayName} subscription invoice -{" "}
        {currency.toUpperCase()} {amount}
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
            <Text style={title}>Upcoming invoice notification</Text>

            <Text style={paragraph}>Hi {name},</Text>

            <Text style={paragraph}>
              This is a friendly reminder that your next{" "}
              <strong>{planDisplayName}</strong> subscription payment for
              workspace <strong>{workspaceName}</strong> is coming up.
            </Text>

            {/* Invoice Details Section */}
            <Section style={invoiceSection}>
              <Text style={sectionTitle}>📄 Invoice details</Text>

              <Section style={invoiceRow}>
                <Text style={invoiceLabel}>Workspace:</Text>
                <Text style={invoiceValue}>{workspaceName}</Text>
              </Section>

              <Section style={invoiceRow}>
                <Text style={invoiceLabel}>Plan:</Text>
                <Text style={invoiceValue}>{planDisplayName}</Text>
              </Section>

              <Section style={invoiceRow}>
                <Text style={invoiceLabel}>Amount:</Text>
                <Text style={invoiceValue}>
                  {currency.toUpperCase()} {amount}
                </Text>
              </Section>

              <Section style={invoiceRow}>
                <Text style={invoiceLabel}>Invoice date:</Text>
                <Text style={invoiceValue}>{invoiceDate}</Text>
              </Section>

              <Section style={invoiceRow}>
                <Text style={invoiceLabel}>Next billing date:</Text>
                <Text style={invoiceValue}>{nextBillingDate}</Text>
              </Section>
            </Section>

            <Text style={paragraph}>
              Your subscription will automatically renew, and payment will be
              processed using your saved payment method.
            </Text>

            {/* Usage Insights Section */}
            {usageReport && (
              <Section style={usageSection}>
                <Text style={sectionTitle}>📊 Your usage this month:</Text>

                <Section style={usageRow}>
                  <Text style={usageLabel}>RabbitMQ Servers:</Text>
                  <Text style={usageValue}>
                    {usageReport.servers} server
                    {usageReport.servers !== 1 ? "s" : ""}
                  </Text>
                </Section>

                <Section style={usageRow}>
                  <Text style={usageLabel}>Message Queues:</Text>
                  <Text style={usageValue}>
                    {usageReport.queues} queue
                    {usageReport.queues !== 1 ? "s" : ""}
                  </Text>
                </Section>

                <Section style={usageRow}>
                  <Text style={usageLabel}>Messages Processed:</Text>
                  <Text style={usageValue}>
                    {usageReport.monthlyMessages.toLocaleString()} messages
                  </Text>
                </Section>

                {usageReport.monthlyMessages > 0 && (
                  <Text style={usageInsight}>
                    💡 Great activity! You're making the most of your{" "}
                    {planDisplayName} plan.
                  </Text>
                )}
              </Section>
            )}

            {/* Features Reminder */}
            <Section style={featuresSection}>
              <Text style={sectionTitle}>
                What you're getting with {planDisplayName}:
              </Text>

              <Section style={featureItem}>
                <Text style={featureText}>
                  📊 Advanced analytics and detailed metrics
                </Text>
              </Section>

              <Section style={featureItem}>
                <Text style={featureText}>
                  🔔 Custom alerts and real-time notifications
                </Text>
              </Section>

              <Section style={featureItem}>
                <Text style={featureText}>
                  👥 Team collaboration and workspace sharing
                </Text>
              </Section>

              {(plan === "STARTUP" || plan === "BUSINESS") && (
                <Section style={featureItem}>
                  <Text style={featureText}>
                    🧠 Memory optimization insights and recommendations
                  </Text>
                </Section>
              )}

              {plan === "BUSINESS" && (
                <Section style={featureItem}>
                  <Text style={featureText}>
                    🎯 Priority support and expert consultation
                  </Text>
                </Section>
              )}
            </Section>

            {/* Action Section */}
            <Text style={paragraph}>
              <strong>No action needed</strong> - your payment will be processed
              automatically. However, if you need to update your payment method
              or have any questions, you can visit your billing dashboard.
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={billingUrl}>
                Manage Billing
              </Button>
            </Section>

            <Text style={paragraph}>
              Questions about your subscription? Our{" "}
              <Link href={supportUrl} style={link}>
                support team
              </Link>{" "}
              is here to help.
            </Text>

            <Hr style={hr} />

            <Text style={paragraph}>
              Thank you for choosing RabbitHQ to monitor your RabbitMQ
              infrastructure! 🐰
            </Text>

            <Text style={signature}>The RabbitHQ Team</Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this email as a courtesy notification about your
              upcoming invoice.
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
  color: "#059669",
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#374151",
  margin: "0 0 16px",
};

const invoiceSection = {
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

const invoiceRow = {
  display: "flex",
  justifyContent: "space-between",
  margin: "0 0 12px",
  alignItems: "center",
};

const invoiceLabel = {
  fontSize: "15px",
  color: "#6b7280",
  margin: "0",
  fontWeight: "500",
};

const invoiceValue = {
  fontSize: "15px",
  color: "#1f2937",
  margin: "0",
  fontWeight: "600",
};

const usageSection = {
  margin: "32px 0",
  padding: "24px",
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  border: "1px solid #bbf7d0",
};

const usageRow = {
  display: "flex",
  justifyContent: "space-between",
  margin: "0 0 12px",
  alignItems: "center",
};

const usageLabel = {
  fontSize: "15px",
  color: "#6b7280",
  margin: "0",
  fontWeight: "500",
};

const usageValue = {
  fontSize: "15px",
  color: "#1f2937",
  margin: "0",
  fontWeight: "600",
};

const usageInsight = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#059669",
  margin: "16px 0 0",
  fontStyle: "italic" as const,
};

const featuresSection = {
  margin: "32px 0",
  padding: "24px",
  backgroundColor: "#f0f9ff",
  borderRadius: "8px",
  border: "1px solid #bfdbfe",
};

const featureItem = {
  margin: "0 0 8px",
};

const featureText = {
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
  backgroundColor: "#059669",
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

export default UpcomingInvoiceEmail;
