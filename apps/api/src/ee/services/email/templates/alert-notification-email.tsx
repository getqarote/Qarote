import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { JSX } from "react";

import { EmailFooter } from "@/services/email/shared/email-footer";
import { EmailHeader } from "@/services/email/shared/email-header";
import {
  baseStyles,
  buttonStyles,
  colorVariants,
  contentStyles,
  footerStyles,
  layoutStyles,
  sectionStyles,
  textStyles,
  utilityStyles,
} from "@/services/email/shared/styles";

import { RabbitMQAlert } from "@/ee/services/alerts/alert.interfaces";
import { tEmail } from "@/i18n";

interface AlertNotificationEmailProps {
  workspaceName: string;
  workspaceId: string;
  serverName: string;
  serverId: string;
  alerts: RabbitMQAlert[];
  frontendUrl: string;
  locale?: string;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "CRITICAL":
      return colorVariants.error;
    case "HIGH":
      return colorVariants.error;
    case "MEDIUM":
      return colorVariants.warning;
    case "LOW":
      return colorVariants.info;
    case "INFO":
      return colorVariants.info;
    default:
      return colorVariants.info;
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case "CRITICAL":
      return "🔴";
    case "HIGH":
      return "🟠";
    case "MEDIUM":
      return "⚠️";
    case "LOW":
      return "🔵";
    case "INFO":
      return "ℹ️";
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
  locale = "en",
}: AlertNotificationEmailProps): JSX.Element {
  const criticalAlerts = alerts.filter(
    (a) => a.severity === "CRITICAL" || a.severity === "HIGH"
  );
  const warningAlerts = alerts.filter((a) => a.severity === "MEDIUM");
  const hasCritical = criticalAlerts.length > 0;

  // Determine vhost for URL - use the most common vhost from alerts, or first one if available
  const vhosts = alerts.map((a) => a.vhost).filter((v): v is string => !!v);
  const vhostCounts = vhosts.reduce(
    (acc, vhost) => {
      acc[vhost] = (acc[vhost] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const mostCommonVhost =
    Object.entries(vhostCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    vhosts[0];

  // Build alerts URL with serverId and vhost query parameters
  const alertsUrl = new URL(`${frontendUrl}/alerts`);
  if (serverId) {
    alertsUrl.searchParams.set("serverId", serverId);
  }
  if (mostCommonVhost) {
    alertsUrl.searchParams.set("vhost", mostCommonVhost);
  }

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
          <EmailHeader frontendUrl={frontendUrl} />

          <Section style={contentStyles.contentPadded}>
            <Text style={contentStyles.title}>
              {tEmail(
                locale,
                hasCritical
                  ? "alertNotification.titleCritical"
                  : "alertNotification.titleWarning"
              )}
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
                    {tEmail(locale, "alertNotification.categoryAlerts", {
                      category,
                    })}
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

                        {alert.vhost && (
                          <Text style={layoutStyles.detailValue}>
                            <strong>Virtual Host:</strong> {alert.vhost}
                          </Text>
                        )}

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
                          Detected:{" "}
                          {new Date(alert.timestamp).toLocaleString("en-US", {
                            timeZone: "UTC",
                          })}{" "}
                          UTC
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
                href={alertsUrl.toString()}
              >
                {tEmail(locale, "alertNotification.viewAlerts")}
              </Button>
            </Section>

            <Text style={contentStyles.paragraph}>
              {tEmail(locale, "alertNotification.managePreferences")}{" "}
              <Link
                href={`${frontendUrl}/alerts?openNotificationSettings=true`}
                style={textStyles.link}
              >
                {tEmail(locale, "alertNotification.alertsSettings")}
              </Link>
              .
            </Text>

            <EmailFooter locale={locale} frontendUrl={frontendUrl} />
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
