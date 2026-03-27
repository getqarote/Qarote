import {
  Body,
  Button,
  Container,
  Head,
  Heading,
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
  layoutStyles,
  sectionStyles,
  textStyles,
  utilityStyles,
} from "../shared/styles";

import { tEmail } from "@/i18n";

interface PaymentConfirmationEmailProps {
  userName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  frontendUrl: string;
  locale?: string;
}

const PaymentConfirmationEmail: React.FC<PaymentConfirmationEmailProps> = ({
  userName,
  amount,
  currency,
  paymentMethod,
  frontendUrl,
  locale = "en",
}) => {
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatPaymentMethod = (method: string) => {
    switch (method.toLowerCase()) {
      case "card":
        return "Credit/Debit Card";
      case "bank_account":
        return "Bank Account";
      case "sepa_debit":
        return "SEPA Direct Debit";
      case "ideal":
        return "iDEAL";
      case "sofort":
        return "Sofort";
      default:
        return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  return (
    <Html>
      <Head />
      <Preview>{tEmail(locale, "paymentConfirmation.title")}</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <EmailHeader frontendUrl={frontendUrl} />

          <Section style={contentStyles.contentPadded}>
            <Heading style={contentStyles.title}>
              {tEmail(locale, "paymentConfirmation.title")}
            </Heading>
          </Section>

          <Section style={contentStyles.content}>
            <Text style={contentStyles.paragraph}>
              {tEmail(locale, "common.greeting", { name: userName })}
            </Text>

            <Text style={contentStyles.paragraph}>
              Great news! Your payment has been successfully processed and your
              Qarote subscription is now active.
            </Text>

            <Section style={sectionStyles.successSection}>
              <Heading as="h2" style={contentStyles.heading}>
                Payment Details
              </Heading>

              <Section style={layoutStyles.detailRow}>
                <Text style={layoutStyles.detailLabel}>Amount:</Text>
                <Text style={layoutStyles.detailValue}>
                  {formatAmount(amount, currency)}
                </Text>
              </Section>

              <Section style={layoutStyles.detailRow}>
                <Text style={layoutStyles.detailLabel}>Payment Method:</Text>
                <Text style={layoutStyles.detailValue}>
                  {formatPaymentMethod(paymentMethod)}
                </Text>
              </Section>

              <Section style={layoutStyles.detailRow}>
                <Text style={layoutStyles.detailLabel}>Status:</Text>
                <Text style={textStyles.successText}>✅ Completed</Text>
              </Section>
            </Section>

            <Text style={contentStyles.paragraph}>
              Thank you for your payment! You can continue using Qarote without
              any interruptions. Your subscription is now active and you have
              full access to all features.
            </Text>

            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={frontendUrl}>
                {tEmail(locale, "paymentConfirmation.viewBilling")}
              </Button>
            </Section>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>
              If you have any questions about this payment, please don't
              hesitate to contact our{" "}
              <Link href={`${frontendUrl}/help`} style={textStyles.link}>
                {tEmail(locale, "common.supportTeam")}
              </Link>
              .
            </Text>

            <EmailFooter locale={locale} frontendUrl={frontendUrl} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default PaymentConfirmationEmail;
