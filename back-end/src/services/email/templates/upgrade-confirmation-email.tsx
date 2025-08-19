import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { WorkspacePlan } from "@prisma/client";
import { emailConfig } from "@/config";

interface UpgradeConfirmationEmailProps {
  userName: string;
  workspaceName: string;
  plan: WorkspacePlan;
  billingInterval: "monthly" | "yearly";
}

const getPlanDisplayName = (plan: WorkspacePlan) => {
  switch (plan) {
    case WorkspacePlan.DEVELOPER:
      return "Developer";
    case WorkspacePlan.ENTERPRISE:
      return "Enterprise";
    case WorkspacePlan.FREE:
    default:
      return "Free";
  }
};

const getPlanFeatures = (plan: WorkspacePlan) => {
  switch (plan) {
    case WorkspacePlan.DEVELOPER:
      return [
        "3 RabbitMQ servers",
        "25 message queues",
        "100K messages per month",
        "Advanced memory analysis",
        "Data export capabilities",
        "Email support",
      ];
    case WorkspacePlan.ENTERPRISE:
      return [
        "Unlimited RabbitMQ servers",
        "Unlimited message queues",
        "Unlimited messages per month",
        "All memory optimization features",
        "Custom integrations",
        "SOC 2 compliance",
        "Dedicated account manager",
        "Phone support",
      ];
    case WorkspacePlan.FREE:
    default:
      return [
        "1 RabbitMQ server",
        "5 message queues",
        "10K messages per month",
        "Basic monitoring",
        "Community support",
      ];
  }
};

export const UpgradeConfirmationEmail = ({
  userName,
  workspaceName,
  plan,
  billingInterval,
}: UpgradeConfirmationEmailProps) => {
  const planName = getPlanDisplayName(plan);
  const features = getPlanFeatures(plan);
  const baseUrl = emailConfig.frontendUrl;

  return (
    <Html>
      <Head />
      <Preview>Welcome to {planName} Plan! Your upgrade is confirmed.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={`${baseUrl}/icon_rabbit.svg`}
            width="50"
            height="50"
            alt="RabbitHQ"
            style={logo}
          />

          <Heading style={heading}>🎉 Welcome to {planName} Plan!</Heading>

          <Text style={paragraph}>Hi {userName},</Text>

          <Text style={paragraph}>
            Great news! Your workspace "{workspaceName}" has been successfully
            upgraded to the {planName} plan. You now have access to all the
            powerful features that will help you monitor and optimize your
            RabbitMQ infrastructure.
          </Text>

          <Section style={featuresSection}>
            <Heading as="h2" style={featuresHeading}>
              What's included in your {planName} plan:
            </Heading>
            {features.map((feature, index) => (
              <Text key={index} style={featureItem}>
                ✅ {feature}
              </Text>
            ))}
          </Section>

          <Section style={ctaSection}>
            <Button style={button} href={baseUrl}>
              Start Using Your New Features
            </Button>
          </Section>

          <Hr style={hr} />

          <Section style={billingSection}>
            <Text style={billingText}>
              <strong>Billing Details:</strong>
            </Text>
            <Text style={billingText}>
              Plan: {planName} (
              {billingInterval === "yearly" ? "Annual" : "Monthly"} billing)
            </Text>
            <Text style={billingText}>
              You can manage your subscription and view billing history in your{" "}
              <a href={`${baseUrl}/profile?tab=billing`} style={link}>
                account settings
              </a>
              .
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={supportText}>
            Need help getting started? Our team is here to help:
          </Text>

          <Section style={supportSection}>
            <Button style={supportButton} href={`${baseUrl}/help`}>
              Get Support
            </Button>
            <Button style={supportButton} href="mailto:support@rabbithq.com">
              Contact Us
            </Button>
          </Section>

          <Text style={footer}>
            Happy monitoring!
            <br />
            The RabbitHQ Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const logo = {
  margin: "0 auto",
  display: "block",
};

const heading = {
  fontSize: "24px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#1f2937",
  textAlign: "center" as const,
  margin: "30px 0",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.5",
  color: "#374151",
  margin: "16px 0",
};

const featuresSection = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
};

const featuresHeading = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 16px 0",
};

const featureItem = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#374151",
  margin: "8px 0",
};

const ctaSection = {
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
  padding: "12px 20px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const billingSection = {
  margin: "24px 0",
};

const billingText = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#6b7280",
  margin: "8px 0",
};

const link = {
  color: "#3b82f6",
  textDecoration: "underline",
};

const supportText = {
  fontSize: "16px",
  lineHeight: "1.5",
  color: "#374151",
  margin: "24px 0 16px 0",
  textAlign: "center" as const,
};

const supportSection = {
  textAlign: "center" as const,
  margin: "16px 0",
};

const supportButton = {
  backgroundColor: "#f3f4f6",
  borderRadius: "6px",
  color: "#374151",
  fontSize: "14px",
  fontWeight: "500",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  margin: "0 8px",
  padding: "8px 16px",
};

const footer = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "32px 0 0 0",
};
