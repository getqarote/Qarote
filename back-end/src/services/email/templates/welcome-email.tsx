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
  workspaceName: string;
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
        Welcome to RabbitHQ, {name}! Your workspace is ready to go.
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          {/* Header */}

          {/* Main Content */}
          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>Welcome to RabbitHQ!</Text>

            <Text style={contentStyles.paragraph}>Hi {name},</Text>

            <Text style={contentStyles.paragraph}>
              Welcome to RabbitHQ! Your workspace{" "}
              <strong>{workspaceName}</strong> has been successfully set up on
              the <strong>{planDisplayName}</strong> plan.
            </Text>

            <Text style={contentStyles.paragraph}>
              You can now start monitoring your RabbitMQ clusters and managing
              your message queues with ease.
            </Text>

            {/* Plan Features Section */}
            <Section style={sectionStyles.featuresSection}>
              <Text style={contentStyles.heading}>What you can do now:</Text>

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
                Go to Dashboard
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

            <Text style={contentStyles.signature}>The RabbitHQ Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
