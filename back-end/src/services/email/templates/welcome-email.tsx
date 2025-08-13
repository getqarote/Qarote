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

interface WelcomeEmailProps {
  name: string;
  workspaceName: string;
  plan: "FREE" | "DEVELOPER" | "STARTUP" | "BUSINESS";
  frontendUrl: string;
}

export const WelcomeEmail = ({
  name,
  workspaceName,
  plan,
  frontendUrl,
}: WelcomeEmailProps) => {
  const planDisplayName = {
    FREE: "Free",
    DEVELOPER: "Developer",
    STARTUP: "Startup",
    BUSINESS: "Business",
  }[plan];

  const dashboardUrl = `${frontendUrl}`;
  const supportUrl = `${frontendUrl}/help`;

  return (
    <Html>
      <Head />
      <Preview>
        Welcome to RabbitHQ, {name}! Your workspace is ready to go.
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
            <Text style={title}>Welcome to RabbitHQ!</Text>

            <Text style={paragraph}>Hi {name},</Text>

            <Text style={paragraph}>
              Welcome to RabbitHQ! Your workspace{" "}
              <strong>{workspaceName}</strong> has been successfully set up on
              the <strong>{planDisplayName}</strong> plan.
            </Text>

            <Text style={paragraph}>
              You can now start monitoring your RabbitMQ clusters and managing
              your message queues with ease.
            </Text>

            {/* Plan Features Section */}
            <Section style={featuresSection}>
              <Text style={sectionTitle}>What you can do now:</Text>

              <Section style={featureItem}>
                <Text style={featureText}>
                  🚀 Add your first RabbitMQ server
                </Text>
              </Section>

              <Section style={featureItem}>
                <Text style={featureText}>
                  📊 Explore real-time dashboard and metrics
                </Text>
              </Section>

              <Section style={featureItem}>
                <Text style={featureText}>
                  🔔 Set up alerts for your queues
                </Text>
              </Section>

              {plan !== "FREE" && (
                <>
                  <Section style={featureItem}>
                    <Text style={featureText}>
                      📈 Access advanced analytics
                    </Text>
                  </Section>

                  <Section style={featureItem}>
                    <Text style={featureText}>
                      👥 Invite team members to collaborate
                    </Text>
                  </Section>
                </>
              )}

              {(plan === "STARTUP" || plan === "BUSINESS") && (
                <Section style={featureItem}>
                  <Text style={featureText}>
                    🧠 View detailed memory metrics and optimization tips
                  </Text>
                </Section>
              )}

              {plan === "BUSINESS" && (
                <Section style={featureItem}>
                  <Text style={featureText}>
                    🎯 Get priority support and expert insights
                  </Text>
                </Section>
              )}
            </Section>

            {/* Call to Action */}
            <Section style={buttonSection}>
              <Button style={button} href={dashboardUrl}>
                Go to Dashboard
              </Button>
            </Section>

            <Text style={paragraph}>
              If you need help getting started, check out our{" "}
              <Link href={supportUrl} style={link}>
                support team
              </Link>
              .
            </Text>

            <Hr style={hr} />

            <Text style={paragraph}>Happy monitoring! 🐰</Text>

            <Text style={signature}>The RabbitHQ Team</Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this email because you just created a RabbitHQ
              account.
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
  color: "#1f2937",
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#374151",
  margin: "0 0 16px",
};

const featuresSection = {
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

const featureItem = {
  margin: "0 0 8px",
};

const featureText = {
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

export default WelcomeEmail;
