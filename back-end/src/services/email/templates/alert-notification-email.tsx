import { RabbitMQAlert } from "@/types/alert";
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
} from "@react-email/components";
import {
  baseStyles,
  contentStyles,
  buttonStyles,
  textStyles,
  utilityStyles,
  sectionStyles,
  layoutStyles,
  footerStyles,
  colorVariants,
} from "../shared/styles";

interface AlertNotificationEmailProps {
  workspaceName: string;
  workspaceId: string;
  serverName: string;
  serverId: string;
  alerts: RabbitMQAlert[];
  frontendUrl: string;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return colorVariants.error;
    case "warning":
      return colorVariants.warning;
    default:
      return colorVariants.info;
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case "critical":
      return "🔴";
    case "warning":
      return "⚠️";
    default:
      return "ℹ️";
  }
};

export default function AlertNotificationEmail({
  workspaceName,
  serverName,
  serverId,
  alerts,
  frontendUrl,
}: AlertNotificationEmailProps): JSX.Element {
  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");
  const hasCritical = criticalAlerts.length > 0;

  // Group alerts by category
  const alertsByCategory = alerts.reduce(
    (acc, alert) => {
      if (!acc[alert.category]) {
        acc[alert.category] = [];
      }
      acc[alert.category].push(alert);
      return acc;
    },
    {} as Record<string, RabbitMQAlert[]>
  );

  return (
    <Html>
      <Head />
      <Preview>
        {hasCritical
          ? `${criticalAlerts.length} critical alert${criticalAlerts.length > 1 ? "s" : ""} detected on ${serverName}`
          : `${warningAlerts.length} warning alert${warningAlerts.length > 1 ? "s" : ""} detected on ${serverName}`}
      </Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>
              {hasCritical ? "🔴 Critical Alert" : "⚠️ Warning Alert"}
            </Text>

            <Text style={contentStyles.paragraph}>
              New alert{alerts.length > 1 ? "s" : ""} detected on your RabbitMQ
              server <strong>{serverName}</strong> in workspace{" "}
              <strong>{workspaceName}</strong>.
            </Text>

            {hasCritical && (
              <Section
                style={{
                  ...sectionStyles.warningSection,
                  backgroundColor: colorVariants.error.background,
                  borderColor: colorVariants.error.border,
                }}
              >
                <Text
                  style={{
                    ...contentStyles.heading,
                    color: colorVariants.error.text,
                  }}
                >
                  {criticalAlerts.length} Critical Alert
                  {criticalAlerts.length > 1 ? "s" : ""} Require Immediate
                  Attention
                </Text>
              </Section>
            )}

            {/* Alert Details */}
            {Object.entries(alertsByCategory).map(
              ([category, categoryAlerts]) => (
                <Section key={category} style={sectionStyles.featuresSection}>
                  <Text
                    style={{
                      ...contentStyles.heading,
                      textTransform: "capitalize",
                      marginBottom: "16px",
                    }}
                  >
                    {category} Alerts
                  </Text>

                  {categoryAlerts.map((alert, index) => {
                    const severityColor = getSeverityColor(alert.severity);
                    return (
                      <Section
                        key={index}
                        style={{
                          ...styles.alertItem,
                          borderLeft: `4px solid ${severityColor.primary}`,
                        }}
                      >
                        <Text style={styles.alertTitle}>
                          {getSeverityIcon(alert.severity)} {alert.title}
                        </Text>
                        <Text style={textStyles.featureText}>
                          {alert.description}
                        </Text>

                        {alert.details && (
                          <Section style={utilityStyles.spacer}>
                            {typeof alert.details.current === "number" ? (
                              <Text style={layoutStyles.detailValue}>
                                <strong>Current:</strong>{" "}
                                {alert.details.current}
                                {alert.details.threshold !== undefined &&
                                  ` (Threshold: ${alert.details.threshold})`}
                              </Text>
                            ) : (
                              <Text style={layoutStyles.detailValue}>
                                <strong>Current:</strong>{" "}
                                {alert.details.current}
                              </Text>
                            )}

                            {alert.details.recommended && (
                              <Text style={styles.recommendedText}>
                                <strong>Recommended:</strong>{" "}
                                {alert.details.recommended}
                              </Text>
                            )}

                            {alert.details.affected &&
                              alert.details.affected.length > 0 && (
                                <Text style={layoutStyles.detailValue}>
                                  <strong>Affected:</strong>{" "}
                                  {alert.details.affected.join(", ")}
                                </Text>
                              )}
                          </Section>
                        )}

                        <Text style={footerStyles.footerTextSmall}>
                          Detected: {new Date(alert.timestamp).toLocaleString()}
                        </Text>
                      </Section>
                    );
                  })}
                </Section>
              )
            )}

            {/* Call to Action */}
            <Section style={buttonStyles.buttonSection}>
              <Button
                style={buttonStyles.primaryButton}
                href={`${frontendUrl}/alerts/${serverId}`}
              >
                View Alerts in Dashboard
              </Button>
            </Section>

            <Text style={contentStyles.paragraph}>
              You can manage alert thresholds and preferences in your{" "}
              <Link
                href={`${frontendUrl}/alerts/${serverId}`}
                style={textStyles.link}
              >
                alerts settings
              </Link>
              .
            </Text>

            <Hr style={utilityStyles.hr} />

            <Text style={contentStyles.paragraph}>
              This is an automated notification from RabbitHQ. You're receiving
              this because new alerts were detected on your monitored server.
            </Text>

            <Text style={contentStyles.signature}>The RabbitHQ Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Custom styles for alert notification email
const styles = {
  alertItem: {
    margin: "16px 0",
    padding: "16px",
    backgroundColor: "#ffffff",
    borderRadius: "6px",
  },

  alertTitle: {
    ...contentStyles.heading,
    fontSize: "16px",
    margin: "0 0 8px",
  },

  recommendedText: {
    ...textStyles.successText,
    margin: "4px 0",
    fontStyle: "italic",
  },
} as const;
