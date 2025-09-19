import { WorkspacePlan } from "@prisma/client";
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
import {
  baseStyles,
  headerStyles,
  contentStyles,
  buttonStyles,
  textStyles,
  utilityStyles,
  sectionStyles,
  layoutStyles,
} from "../shared/styles";

interface UpcomingInvoiceEmailProps {
  name: string;
  workspaceName: string;
  plan: WorkspacePlan;
  amount: string;
  currency: string;
  invoiceDate: string;
  nextBillingDate: string;
  frontendUrl: string;
}

const styles = {
  invoiceAmount: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#059669", // Green success color
    textAlign: "center" as const,
    margin: "20px 0",
  },
  invoiceDetails: {
    backgroundColor: "#f0f9ff",
    padding: "24px",
    borderRadius: "8px",
    border: "1px solid #bfdbfe",
    margin: "24px 0",
  },
  usageGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "16px",
    marginTop: "16px",
  },
  usageItem: {
    flex: "1 1 calc(50% - 8px)",
    backgroundColor: "#ffffff",
    padding: "16px",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
    textAlign: "center" as const,
  },
  usageNumber: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1f2937",
    margin: "0 0 4px",
  },
  usageLabel: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0",
  },
};

export default function UpcomingInvoiceEmail({
  name,
  workspaceName,
  plan,
  amount,
  currency,
  invoiceDate,
  nextBillingDate,
  frontendUrl,
}: UpcomingInvoiceEmailProps): JSX.Element {
  const planDisplayName = plan.charAt(0) + plan.slice(1).toLowerCase();

  return (
    <Html>
      <Head />
      <Preview>
        Your upcoming {planDisplayName} subscription invoice -{" "}
        {currency.toUpperCase()} {amount}
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          {/* Header */}

          {/* Main Content */}
          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>
              Upcoming invoice notification
            </Text>

            <Text style={contentStyles.paragraph}>Hi {name},</Text>

            <Text style={contentStyles.paragraph}>
              This is a friendly reminder that your next{" "}
              <strong>{planDisplayName}</strong> subscription payment for
              workspace <strong>{workspaceName}</strong> is coming up.
            </Text>

            {/* Invoice Amount */}
            <Text style={styles.invoiceAmount}>
              {currency.toUpperCase()} {amount}
            </Text>

            {/* Invoice Details Section */}
            <Section style={styles.invoiceDetails}>
              <Text style={contentStyles.heading}>📄 Invoice details</Text>

              <Section style={layoutStyles.detailRow}>
                <Text style={layoutStyles.detailLabel}>Workspace:</Text>
                <Text style={layoutStyles.detailValue}>{workspaceName}</Text>
              </Section>

              <Section style={layoutStyles.detailRow}>
                <Text style={layoutStyles.detailLabel}>Plan:</Text>
                <Text style={layoutStyles.detailValue}>{planDisplayName}</Text>
              </Section>

              <Section style={layoutStyles.detailRow}>
                <Text style={layoutStyles.detailLabel}>Amount:</Text>
                <Text style={layoutStyles.detailValue}>
                  {currency.toUpperCase()} {amount}
                </Text>
              </Section>

              <Section style={layoutStyles.detailRow}>
                <Text style={layoutStyles.detailLabel}>Invoice date:</Text>
                <Text style={layoutStyles.detailValue}>{invoiceDate}</Text>
              </Section>

              <Section style={layoutStyles.detailRow}>
                <Text style={layoutStyles.detailLabel}>Next billing date:</Text>
                <Text style={layoutStyles.detailValue}>{nextBillingDate}</Text>
              </Section>
            </Section>

            <Text style={contentStyles.paragraph}>
              Your subscription will automatically renew, and payment will be
              processed using your saved payment method.
            </Text>

            {/* Features Reminder */}
            <Section style={sectionStyles.featuresSection}>
              <Text style={contentStyles.heading}>
                What you're getting with {planDisplayName}:
              </Text>

              <Section style={layoutStyles.rowItem}>
                <Text style={textStyles.featureText}>
                  📊 Advanced analytics and detailed metrics
                </Text>
              </Section>

              <Section style={layoutStyles.rowItem}>
                <Text style={textStyles.featureText}>
                  🔔 Custom alerts and real-time notifications
                </Text>
              </Section>

              <Section style={layoutStyles.rowItem}>
                <Text style={textStyles.featureText}>
                  👥 Team collaboration and workspace sharing
                </Text>
              </Section>

              <Section style={layoutStyles.rowItem}>
                <Text style={textStyles.featureText}>
                  🧠 Memory optimization insights and recommendations
                </Text>
              </Section>

              <Section style={layoutStyles.rowItem}>
                <Text style={textStyles.featureText}>
                  🎯 Priority support and expert consultation
                </Text>
              </Section>
            </Section>

            {/* Action Section */}
            <Text style={contentStyles.paragraph}>
              <strong>No action needed</strong> - your payment will be processed
              automatically. However, if you need to update your payment method
              or have any questions, you can visit your billing dashboard.
            </Text>

            <Section style={buttonStyles.buttonSection}>
              <Button
                style={buttonStyles.secondaryButton}
                href={`${frontendUrl}/profile?tab=plans`}
              >
                Manage Billing
              </Button>
            </Section>

            <Text style={contentStyles.paragraph}>
              Questions about your subscription? Our{" "}
              <Link href={`${frontendUrl}/help`} style={textStyles.link}>
                support team
              </Link>{" "}
              is here to help.
            </Text>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>Happy monitoring! 🐰</Text>

            <Text style={contentStyles.signature}>The RabbitHQ Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

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
