import { UserPlan } from "@prisma/client";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Section,
  Text,
} from "@react-email/components";

import { getPlanFeatures } from "@/services/plan/plan.service";

import {
  baseStyles,
  buttonStyles,
  contentStyles,
  sectionStyles,
  textStyles,
  utilityStyles,
} from "../shared/styles";

interface WelcomeBackEmailProps {
  userName: string;
  workspaceName: string;
  plan: UserPlan;
  billingInterval: "monthly" | "yearly";
  previousCancelDate?: string;
  frontendUrl: string;
}

export const WelcomeBackEmail = ({
  workspaceName,
  plan,
  billingInterval,
  previousCancelDate,
  frontendUrl,
}: WelcomeBackEmailProps) => {
  const planDisplayName = plan.charAt(0) + plan.slice(1).toLowerCase();

  return (
    <Html>
      <Head />
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          {/* Logo */}

          {/* Main Content */}
          <Section style={sectionStyles.featuresSection}>
            <Heading style={contentStyles.title}>
              Great to see you again!
            </Heading>
            <Text style={contentStyles.paragraph}>
              We noticed you've renewed your subscription for{" "}
              <strong>{workspaceName}</strong>
              {previousCancelDate && (
                <>
                  {" "}
                  after your previous cancellation on{" "}
                  {new Date(previousCancelDate).toLocaleDateString()}
                </>
              )}
              . We're excited to continue supporting your RabbitMQ monitoring
              needs!
            </Text>

            <Section style={sectionStyles.highlightSection}>
              <Text style={styles.highlightText}>
                🙏 Thank you for giving us another chance!
              </Text>
              <Text style={styles.highlightSubtext}>
                Your feedback and loyalty mean the world to us. We've been
                working hard to improve RabbitHQ based on user feedback like
                yours.
              </Text>
            </Section>
          </Section>

          {/* Plan Info */}
          <Section style={styles.planSection}>
            <Heading as="h3" style={contentStyles.heading}>
              Your {planDisplayName} Plan Features
            </Heading>
            <Text style={contentStyles.paragraph}>
              <strong>Billing:</strong>{" "}
              {billingInterval === "yearly" ? "Annual" : "Monthly"} subscription
            </Text>

            {getPlanFeatures(plan).featureDescriptions.map((feature, index) => (
              <Text key={index} style={styles.featureItem}>
                ✓ {feature}
              </Text>
            ))}
          </Section>

          {/* CTA Button */}
          <Section style={buttonStyles.buttonSection}>
            <Link href={frontendUrl} style={buttonStyles.primaryButton}>
              Access Your Dashboard
            </Link>
          </Section>

          {/* What's New */}
          <Section style={sectionStyles.featuresSection}>
            <Text style={contentStyles.paragraph}>
              <strong>Need help getting started again?</strong>
            </Text>
            <Text style={contentStyles.paragraph}>
              Our team is here to help! check out our{" "}
              <Link href={`${frontendUrl}/help`} style={textStyles.link}>
                support team
              </Link>{" "}
            </Text>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>Happy monitoring! 🐰</Text>

            <Text style={contentStyles.signature}>The RabbitHQ Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Custom styles for this template
const styles = {
  welcomeHeader: {
    textAlign: "center" as const,
    padding: "30px 20px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    borderRadius: "8px",
    marginBottom: "30px",
  },

  welcomeTitle: {
    fontSize: "28px",
    fontWeight: "bold",
    margin: "0 0 10px 0",
    color: "white",
  },

  welcomeSubtitle: {
    fontSize: "16px",
    margin: "0",
    opacity: "0.9",
    color: "white",
  },

  highlightText: {
    margin: "0",
    fontWeight: "bold",
    color: "#059669",
  },

  highlightSubtext: {
    margin: "10px 0 0 0",
    color: "#065f46",
  },

  planSection: {
    background: "white",
    padding: "20px",
    borderRadius: "8px",
    borderLeft: "4px solid #667eea",
    margin: "20px 0",
  },

  featureItem: {
    margin: "8px 0",
    borderBottom: "1px solid #eee",
    paddingBottom: "8px",
    fontSize: "15px",
    color: "#374151",
  },
} as const;

export default WelcomeBackEmail;
