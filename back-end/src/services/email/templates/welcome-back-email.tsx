import { WorkspacePlan } from "@prisma/client";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Link,
  Hr,
} from "@react-email/components";
import { emailConfig } from "@/config";
import { getPlanFeatures } from "@/services/plan.service";

interface WelcomeBackEmailProps {
  userName: string;
  workspaceName: string;
  plan: WorkspacePlan;
  billingInterval: "monthly" | "yearly";
  previousCancelDate?: string;
}

export const WelcomeBackEmail = ({
  userName,
  workspaceName,
  plan,
  billingInterval,
  previousCancelDate,
}: WelcomeBackEmailProps) => {
  const planDisplayName = plan.charAt(0) + plan.slice(1).toLowerCase();
  const frontendUrl = emailConfig.frontendUrl;

  return (
    <Html>
      <Head />
      <Body
        style={{
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#f6f9fc",
        }}
      >
        <Container
          style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}
        >
          {/* Header */}
          <Section
            style={{
              textAlign: "center",
              padding: "30px 20px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              borderRadius: "8px",
              marginBottom: "30px",
            }}
          >
            <Heading
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                margin: "0 0 10px 0",
              }}
            >
              🎉 Welcome Back, {userName}!
            </Heading>
            <Text style={{ fontSize: "16px", margin: "0", opacity: "0.9" }}>
              We're thrilled to have you back on the {planDisplayName} plan
            </Text>
          </Section>

          {/* Main Content */}
          <Section
            style={{
              padding: "20px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            <Heading as="h2" style={{ fontSize: "20px", marginBottom: "15px" }}>
              Great to see you again!
            </Heading>
            <Text style={{ marginBottom: "15px", lineHeight: "1.6" }}>
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

            <Section
              style={{
                background: "#e8f5e8",
                border: "1px solid #c3e6c3",
                padding: "15px",
                borderRadius: "8px",
                margin: "20px 0",
              }}
            >
              <Text style={{ margin: "0", fontWeight: "bold" }}>
                🙏 Thank you for giving us another chance!
              </Text>
              <Text style={{ margin: "10px 0 0 0" }}>
                Your feedback and loyalty mean the world to us. We've been
                working hard to improve Rabbit Scout based on user feedback like
                yours.
              </Text>
            </Section>
          </Section>

          {/* Plan Info */}
          <Section
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              borderLeft: "4px solid #667eea",
              margin: "20px 0",
            }}
          >
            <Heading as="h3" style={{ fontSize: "18px", marginBottom: "15px" }}>
              Your {planDisplayName} Plan Features
            </Heading>
            <Text style={{ marginBottom: "15px" }}>
              <strong>Billing:</strong>{" "}
              {billingInterval === "yearly" ? "Annual" : "Monthly"} subscription
            </Text>

            {getPlanFeatures(plan).featureDescriptions.map((feature, index) => (
              <Text
                key={index}
                style={{
                  margin: "8px 0",
                  borderBottom: "1px solid #eee",
                  paddingBottom: "8px",
                }}
              >
                ✓ {feature}
              </Text>
            ))}
          </Section>

          {/* CTA Button */}
          <Section style={{ textAlign: "center", margin: "30px 0" }}>
            <Link
              href={`${frontendUrl}/dashboard`}
              style={{
                display: "inline-block",
                background: "#667eea",
                color: "white",
                padding: "12px 30px",
                textDecoration: "none",
                borderRadius: "5px",
                fontWeight: "bold",
              }}
            >
              Access Your Dashboard
            </Link>
          </Section>

          {/* What's New */}
          <Section
            style={{
              padding: "20px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            <Heading as="h3" style={{ fontSize: "18px", marginBottom: "15px" }}>
              What's New Since You Left?
            </Heading>
            <Text style={{ marginBottom: "10px" }}>
              🚀 Improved performance and reliability
            </Text>
            <Text style={{ marginBottom: "10px" }}>
              📊 Enhanced memory metrics and analysis
            </Text>
            <Text style={{ marginBottom: "10px" }}>
              🔔 Smarter alert system with better notifications
            </Text>
            <Text style={{ marginBottom: "10px" }}>
              📈 New visualization features for queue monitoring
            </Text>
            <Text style={{ marginBottom: "20px" }}>
              🛠️ Better integration options and APIs
            </Text>

            <Text style={{ marginBottom: "10px" }}>
              <strong>Need help getting started again?</strong>
            </Text>
            <Text>
              Our team is here to help! Reply to this email or check out our{" "}
              <Link href={`${frontendUrl}/docs`} style={{ color: "#667eea" }}>
                updated documentation
              </Link>{" "}
              for the latest features and best practices.
            </Text>
          </Section>

          <Hr style={{ margin: "30px 0" }} />

          {/* Footer */}
          <Section
            style={{ textAlign: "center", color: "#666", fontSize: "14px" }}
          >
            <Text>
              Welcome back to the Rabbit Scout family!
              <br />
              <Link href={frontendUrl} style={{ color: "#667eea" }}>
                Rabbit Scout
              </Link>{" "}
              |{" "}
              <Link
                href={`${frontendUrl}/profile?tab=billing`}
                style={{ color: "#667eea" }}
              >
                Manage Subscription
              </Link>
            </Text>
            <Text
              style={{ fontSize: "12px", color: "#999", marginTop: "10px" }}
            >
              If you have any questions or need assistance, don't hesitate to
              reach out to our support team.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeBackEmail;
