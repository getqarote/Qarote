import { WorkspacePlan } from "@prisma/client";
import { getPlanFeatures } from "@/services/plan/plan.service";
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
} from "../shared/styles";

interface PaymentActionRequiredEmailProps {
  name: string;
  workspaceName: string;
  plan: WorkspacePlan;
  invoiceUrl: string;
  amount: string;
  currency: string;
  frontendUrl: string;
}

const styles = {
  paymentDetails: {
    backgroundColor: "#fef2f2",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #fecaca",
    margin: "24px 0",
  },
  amount: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#dc2626",
    textAlign: "center" as const,
    margin: "16px 0",
  },
  supportText: {
    fontSize: "14px",
    color: "#6b7280",
    fontStyle: "italic",
  },
  listItem: {
    marginTop: "8px",
    paddingLeft: "4px",
  },
};

export default function PaymentActionRequiredEmail({
  name,
  workspaceName,
  plan,
  invoiceUrl,
  amount,
  currency,
  frontendUrl,
}: PaymentActionRequiredEmailProps): JSX.Element {
  const planDisplayName = plan.charAt(0) + plan.slice(1).toLowerCase();
  const planFeatures = getPlanFeatures(plan);

  return (
    <Html>
      <Head />
      <Preview>
        Action required: Complete your payment for {workspaceName}
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          {/* Header */}

          {/* Main Content */}
          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>Payment action required</Text>

            <Text style={contentStyles.paragraph}>Hi {name},</Text>

            <Text style={contentStyles.paragraph}>
              We were unable to process the payment for your{" "}
              <strong>{planDisplayName}</strong> subscription for workspace{" "}
              <strong>{workspaceName}</strong>.
            </Text>

            <Text style={contentStyles.paragraph}>
              To continue your service without interruption, please complete the
              payment of{" "}
              <strong>
                {currency.toUpperCase()} {amount}
              </strong>
              .
            </Text>

            {/* Payment Details */}
            <Section style={styles.paymentDetails}>
              <Text style={contentStyles.heading}>Payment Required</Text>
              <Text style={styles.amount}>
                {currency.toUpperCase()} {amount}
              </Text>
            </Section>

            {/* Action Required Section */}
            <Section style={sectionStyles.warningSection}>
              <Text style={contentStyles.heading}>
                🚨 Immediate action required
              </Text>

              <Text style={contentStyles.paragraph}>
                Your subscription will be suspended if payment is not completed
                within the next few days. You will lose access to these{" "}
                {planDisplayName} features:
              </Text>

              {planFeatures.featureDescriptions.map((feature, index) => (
                <Section key={index} style={styles.listItem}>
                  <Text style={textStyles.warningText}>• {feature}</Text>
                </Section>
              ))}
            </Section>

            {/* Payment Instructions */}
            <Section style={sectionStyles.infoSection}>
              <Text style={contentStyles.heading}>
                How to complete your payment:
              </Text>

              <Section style={styles.listItem}>
                <Text style={textStyles.infoText}>
                  <strong>1.</strong> Click the "Complete Payment" button below
                </Text>
              </Section>

              <Section style={styles.listItem}>
                <Text style={textStyles.infoText}>
                  <strong>2.</strong> You'll be taken to a secure payment page
                </Text>
              </Section>

              <Section style={styles.listItem}>
                <Text style={textStyles.infoText}>
                  <strong>3.</strong> Update your payment method if needed
                </Text>
              </Section>

              <Section style={styles.listItem}>
                <Text style={textStyles.infoText}>
                  <strong>4.</strong> Complete the payment to restore full
                  access
                </Text>
              </Section>
            </Section>

            {/* Call to Action */}
            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={invoiceUrl}>
                Complete Payment
              </Button>
            </Section>

            <Text style={contentStyles.paragraph}>
              Need help? Contact our{" "}
              <Link href={`${frontendUrl}/help`} style={textStyles.link}>
                support team
              </Link>{" "}
              and we'll assist you right away.
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
