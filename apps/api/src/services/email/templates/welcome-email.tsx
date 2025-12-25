import { UserPlan } from "@prisma/client";
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { JSX } from "react";

import {
  baseStyles,
  buttonStyles,
  contentStyles,
  sectionStyles,
  textStyles,
  utilityStyles,
} from "../shared/styles";

interface WelcomeEmailProps {
  name: string;
  workspaceName?: string;
  plan: UserPlan;
  frontendUrl: string;
}

const styles = {
  featureItem: {
    marginTop: "8px",
    paddingLeft: "4px",
  },
};

export default function WelcomeEmail({
  name,
  workspaceName,
  plan,
  frontendUrl,
}: WelcomeEmailProps): JSX.Element {
  const planDisplayName = plan.charAt(0) + plan.slice(1).toLowerCase();

  return (
    <Html>
      <Head />
      <Preview>
        Welcome to Qarote, {name}!{workspaceName ? " Your workspace is ready to go." : ""}
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          {/* Header */}

          {/* Main Content */}
          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>Welcome to Qarote!</Text>

            <Text style={contentStyles.paragraph}>Hi {name},</Text>

            <Text style={contentStyles.paragraph}>
              {workspaceName ? (
                <>
                  Welcome to Qarote! Your workspace <strong>{workspaceName}</strong>{" "}
                  has been successfully set up on the{" "}
                  <strong>{planDisplayName}</strong> plan.
                </>
              ) : (
                <>
                  Welcome to Qarote! Your account has been successfully created on the{" "}
                  <strong>{planDisplayName}</strong> plan. Get started by creating your first workspace!
                </>
              )}
            </Text>

            {!workspaceName && (
              <Text style={contentStyles.paragraph}>
                A workspace helps you organize your RabbitMQ servers, manage team members, and track your monitoring data. You can create one right away!
              </Text>
            )}

            <Text style={contentStyles.paragraph}>
              {workspaceName ? (
                <>
                  You can now start monitoring your RabbitMQ clusters and managing
                  your message queues with ease.
                </>
              ) : (
                <>
                  Once you create your workspace, you can start monitoring your RabbitMQ clusters and managing
                  your message queues with ease.
                </>
              )}
            </Text>

            {/* Plan Features Section */}
            <Section style={sectionStyles.featuresSection}>
              <Text style={contentStyles.heading}>
                {workspaceName ? "What you can do now:" : "What you can do once you create your workspace:"}
              </Text>

              {!workspaceName && (
                <Section style={styles.featureItem}>
                  <Text style={textStyles.featureText}>
                    🏢 Create your first workspace to get started
                  </Text>
                </Section>
              )}

              <Section style={styles.featureItem}>
                <Text style={textStyles.featureText}>
                  🚀 Add your first RabbitMQ server
                </Text>
              </Section>

              <Section style={styles.featureItem}>
                <Text style={textStyles.featureText}>
                  📊 Explore dashboard and metrics
                </Text>
              </Section>

              <Section style={styles.featureItem}>
                <Text style={textStyles.featureText}>
                  🔔 Set up alerts for your queues
                </Text>
              </Section>

              {
                <>
                  <Section style={styles.featureItem}>
                    <Text style={textStyles.featureText}>
                      📈 Access advanced analytics
                    </Text>
                  </Section>

                  <Section style={styles.featureItem}>
                    <Text style={textStyles.featureText}>
                      👥 Invite team members to collaborate
                    </Text>
                  </Section>
                </>
              }

              <Section style={styles.featureItem}>
                <Text style={textStyles.featureText}>
                  🧠 View detailed memory metrics and optimization tips
                </Text>
              </Section>

              <Section style={styles.featureItem}>
                <Text style={textStyles.featureText}>
                  🎯 Get priority support and expert insights
                </Text>
              </Section>
            </Section>

            {/* Call to Action */}
            <Section style={buttonStyles.buttonSection}>
              <Button style={buttonStyles.primaryButton} href={frontendUrl}>
                {workspaceName ? "Go to Dashboard" : "Create Your Workspace"}
              </Button>
            </Section>

            <Text style={contentStyles.paragraph}>
              If you need help getting started, check out our{" "}
              <Link href={`${frontendUrl}/help`} style={textStyles.link}>
                support team
              </Link>
              .
            </Text>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>Happy monitoring! 🐰</Text>

            <Text style={contentStyles.signature}>The Qarote Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
