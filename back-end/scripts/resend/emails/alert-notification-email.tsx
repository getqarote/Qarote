import React from "react";
import AlertNotificationEmail from "../../../src/services/email/templates/alert-notification-email";
import { emailConfig } from "../../../src/config";
import { AlertSeverity, AlertCategory } from "../../../src/types/alert";

const { frontendUrl } = emailConfig;

export default function AlertNotificationEmailPreview() {
  return (
    <AlertNotificationEmail
      workspaceName="Acme Corporation"
      workspaceId="workspace-123"
      serverName="Production RabbitMQ"
      serverId="server-456"
      frontendUrl={frontendUrl}
      alerts={[
        {
          id: "alert-1",
          serverId: "server-456",
          serverName: "Production RabbitMQ",
          severity: AlertSeverity.CRITICAL,
          category: AlertCategory.MEMORY,
          title: "High Memory Usage",
          description:
            "Memory usage has exceeded the critical threshold. Immediate action required to prevent service degradation.",
          details: {
            current: 96,
            threshold: 95,
            recommended: "Consider scaling up memory or reducing queue sizes",
            affected: ["rabbit@node1", "rabbit@node2"],
          },
          timestamp: new Date().toISOString(),
          resolved: false,
          source: {
            type: "node",
            name: "rabbit@node1",
          },
        },
        {
          id: "alert-2",
          serverId: "server-456",
          serverName: "Production RabbitMQ",
          severity: AlertSeverity.CRITICAL,
          category: AlertCategory.DISK,
          title: "Low Disk Space",
          description:
            "Available disk space is critically low. This may cause message persistence failures.",
          details: {
            current: 8,
            threshold: 10,
            recommended: "Free up disk space or increase storage capacity",
            affected: ["rabbit@node1"],
          },
          timestamp: new Date().toISOString(),
          resolved: false,
          source: {
            type: "node",
            name: "rabbit@node1",
          },
        },
        {
          id: "alert-3",
          serverId: "server-456",
          serverName: "Production RabbitMQ",
          severity: AlertSeverity.WARNING,
          category: AlertCategory.QUEUE,
          title: "High Message Count",
          description:
            "Queue has accumulated a large number of messages. Consider investigating consumer performance.",
          details: {
            current: 12500,
            threshold: 10000,
            recommended: "Check consumer health and processing rate",
            affected: ["order-processing-queue"],
          },
          timestamp: new Date().toISOString(),
          resolved: false,
          source: {
            type: "queue",
            name: "order-processing-queue",
          },
        },
        {
          id: "alert-4",
          serverId: "server-456",
          serverName: "Production RabbitMQ",
          severity: AlertSeverity.WARNING,
          category: AlertCategory.CONNECTION,
          title: "High Connection Count",
          description:
            "Number of connections is approaching the configured limit.",
          details: {
            current: 850,
            threshold: 1000,
            recommended:
              "Monitor connection patterns and consider connection pooling",
          },
          timestamp: new Date().toISOString(),
          resolved: false,
          source: {
            type: "cluster",
            name: "production-cluster",
          },
        },
      ]}
    />
  );
}
