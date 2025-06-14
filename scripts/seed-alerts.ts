/**
 * Alert System Seeding Script
 *
 * This script creates sample alert rules and alerts for testing and demonstration purposes.
 * It will create various types of alert rules and trigger some sample alerts.
 */

import {
  PrismaClient,
  AlertType,
  AlertSeverity,
  ComparisonOperator,
  AlertStatus,
} from "@prisma/client";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

// Load environment variables
dotenv.config({ path: "../back-end/.env" });

const prisma = new PrismaClient();

// Sample alert rule configurations
const alertRuleTemplates = [
  {
    name: "High Queue Depth",
    description: "Triggers when queue depth exceeds 1000 messages",
    type: AlertType.QUEUE_DEPTH,
    threshold: 1000,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.HIGH,
  },
  {
    name: "Critical Queue Depth",
    description: "Triggers when queue depth exceeds 5000 messages",
    type: AlertType.QUEUE_DEPTH,
    threshold: 5000,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.CRITICAL,
  },
  {
    name: "Low Message Rate",
    description: "Triggers when message rate drops below 10 per second",
    type: AlertType.MESSAGE_RATE,
    threshold: 10,
    operator: ComparisonOperator.LESS_THAN,
    severity: AlertSeverity.MEDIUM,
  },
  {
    name: "High Memory Usage",
    description: "Triggers when memory usage exceeds 80%",
    type: AlertType.MEMORY_USAGE,
    threshold: 80,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.HIGH,
  },
  {
    name: "Critical Memory Usage",
    description: "Triggers when memory usage exceeds 95%",
    type: AlertType.MEMORY_USAGE,
    threshold: 95,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.CRITICAL,
  },
  {
    name: "No Consumers",
    description: "Triggers when consumer count drops to zero",
    type: AlertType.CONSUMER_COUNT,
    threshold: 0,
    operator: ComparisonOperator.EQUALS,
    severity: AlertSeverity.MEDIUM,
  },
  {
    name: "High Connection Count",
    description: "Triggers when connection count exceeds 100",
    type: AlertType.CONNECTION_COUNT,
    threshold: 100,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.MEDIUM,
  },
  {
    name: "Node Down",
    description: "Triggers when RabbitMQ node is unreachable",
    type: AlertType.NODE_DOWN,
    threshold: 0,
    operator: ComparisonOperator.EQUALS,
    severity: AlertSeverity.CRITICAL,
  },
  {
    name: "Disk Usage Warning",
    description: "Triggers when disk usage exceeds 75%",
    type: AlertType.DISK_USAGE,
    threshold: 75,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.MEDIUM,
  },
  {
    name: "Critical Disk Usage",
    description: "Triggers when disk usage exceeds 90%",
    type: AlertType.DISK_USAGE,
    threshold: 90,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.CRITICAL,
  },
];

// Sample alert instances to create
const alertTemplates = [
  {
    title: "Queue depth exceeded on user-notifications",
    description:
      "The user-notifications queue has accumulated 1,245 messages, exceeding the threshold of 1000",
    severity: AlertSeverity.HIGH,
    status: AlertStatus.ACTIVE,
    value: 1245,
    threshold: 1000,
  },
  {
    title: "Memory usage critical on node rabbit@server-1",
    description:
      "Memory usage has reached 96% on rabbit@server-1, immediate attention required",
    severity: AlertSeverity.CRITICAL,
    status: AlertStatus.ACKNOWLEDGED,
    value: 96,
    threshold: 95,
  },
  {
    title: "Low message rate detected",
    description:
      "Message processing rate has dropped to 3.2 messages/second, below the expected threshold",
    severity: AlertSeverity.MEDIUM,
    status: AlertStatus.ACTIVE,
    value: 3.2,
    threshold: 10,
  },
  {
    title: "No consumers on payment-processing queue",
    description:
      "The payment-processing queue has no active consumers, messages are accumulating",
    severity: AlertSeverity.MEDIUM,
    status: AlertStatus.RESOLVED,
    value: 0,
    threshold: 0,
  },
  {
    title: "High connection count detected",
    description:
      "Current connection count is 127, exceeding the recommended threshold of 100",
    severity: AlertSeverity.MEDIUM,
    status: AlertStatus.ACTIVE,
    value: 127,
    threshold: 100,
  },
  {
    title: "Disk usage warning on rabbit@server-2",
    description:
      "Disk usage has reached 78% on rabbit@server-2, monitoring required",
    severity: AlertSeverity.MEDIUM,
    status: AlertStatus.ACKNOWLEDGED,
    value: 78,
    threshold: 75,
  },
];

/**
 * Get or create a company and user for tessierhuort@gmail.com
 */
async function getTestCompanyAndUser() {
  // Try to find existing user first
  let user = await prisma.user.findFirst({
    where: { email: "tessierhuort@gmail.com" },
    include: { company: true },
  });

  let company;

  if (user && user.company) {
    company = user.company;
    console.log("📋 Using existing company and user");
  } else {
    // Create company for the user
    company = await prisma.company.create({
      data: {
        name: "Tessier Company",
        contactEmail: "tessierhuort@gmail.com",
        planType: "PREMIUM",
      },
    });
    console.log("✅ Created company: Tessier Company");

    if (!user) {
      // Hash the password "MrffB!D$UPn254" for the user
      const hashedPassword = await bcrypt.hash("MrffB!D$UPn254", 10);

      user = await prisma.user.create({
        data: {
          email: "tessierhuort@gmail.com",
          passwordHash: hashedPassword,
          firstName: "Tessier",
          lastName: "Huort",
          role: "ADMIN",
          companyId: company.id,
        },
        include: { company: true },
      });
      console.log("✅ Created user account");
    } else {
      // Update existing user to belong to the new company
      user = await prisma.user.update({
        where: { id: user.id },
        data: { companyId: company.id },
        include: { company: true },
      });
      console.log("✅ Updated user to belong to new company");
    }
  }

  return { company, user: user! };
}

/**
 * Create sample alert rules
 */
async function createAlertRules(companyId: string, userId: string) {
  console.log("🔄 Creating alert rules...");

  // Get available servers for this company
  const servers = await prisma.rabbitMQServer.findMany({
    where: { companyId },
  });

  if (servers.length === 0) {
    console.log("⚠️  No servers found for company. Creating a test server...");

    const testServer = await prisma.rabbitMQServer.create({
      data: {
        name: "Test RabbitMQ Server",
        host: "localhost",
        port: 5672,
        username: "admin",
        password: "admin123",
        vhost: "/",
        companyId,
      },
    });

    servers.push(testServer);
    console.log("✅ Created test server");
  }

  const createdRules: any[] = [];

  for (const template of alertRuleTemplates) {
    // Create rules for each server
    for (const server of servers) {
      const alertRule = await prisma.alertRule.create({
        data: {
          ...template,
          serverId: server.id,
          companyId,
          createdById: userId,
        },
      });
      createdRules.push(alertRule);
    }
  }

  console.log(`✅ Created ${createdRules.length} alert rules`);
  return createdRules;
}

/**
 * Create sample alerts
 */
async function createAlerts(
  companyId: string,
  userId: string,
  alertRules: any[]
) {
  console.log("🔄 Creating sample alerts...");

  const createdAlerts: any[] = [];

  for (let i = 0; i < alertTemplates.length; i++) {
    const template = alertTemplates[i];
    // Use alert rules in rotation
    const alertRule = alertRules[i % alertRules.length];

    const alert = await prisma.alert.create({
      data: {
        ...template,
        alertRuleId: alertRule.id,
        companyId,
        createdById: userId,
        // Add some time variance
        createdAt: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ), // Random time in last 7 days
        // Set resolved/acknowledged timestamps for resolved/acknowledged alerts
        resolvedAt:
          template.status === AlertStatus.RESOLVED
            ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
            : undefined,
        acknowledgedAt:
          template.status === AlertStatus.ACKNOWLEDGED
            ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000)
            : undefined,
      },
    });
    createdAlerts.push(alert);
  }

  console.log(`✅ Created ${createdAlerts.length} sample alerts`);
  return createdAlerts;
}

/**
 * Create additional random alerts for testing pagination and filtering
 */
async function createRandomAlerts(
  companyId: string,
  userId: string,
  alertRules: any[],
  count: number = 20
) {
  console.log(`🔄 Creating ${count} additional random alerts...`);

  const statuses = [
    AlertStatus.ACTIVE,
    AlertStatus.ACKNOWLEDGED,
    AlertStatus.RESOLVED,
  ];
  const severities = [
    AlertSeverity.LOW,
    AlertSeverity.MEDIUM,
    AlertSeverity.HIGH,
    AlertSeverity.CRITICAL,
  ];

  const randomTitles = [
    "Queue backup detected",
    "Performance degradation",
    "Resource limit reached",
    "Connection timeout",
    "Message processing delay",
    "System resource warning",
    "Network connectivity issue",
    "Storage capacity warning",
    "Consumer lag detected",
    "Throughput anomaly",
  ];

  for (let i = 0; i < count; i++) {
    const alertRule = alertRules[Math.floor(Math.random() * alertRules.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const title = randomTitles[Math.floor(Math.random() * randomTitles.length)];

    const value = Math.random() * 1000;
    const threshold = Math.random() * 500;

    await prisma.alert.create({
      data: {
        title: `${title} #${i + 1}`,
        description: `Automated alert generated for testing purposes. Value: ${value.toFixed(
          2
        )}, Threshold: ${threshold.toFixed(2)}`,
        severity,
        status,
        value,
        threshold,
        alertRuleId: alertRule.id,
        companyId,
        createdById: userId,
        createdAt: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ), // Random time in last 30 days
        resolvedAt:
          status === AlertStatus.RESOLVED
            ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
            : undefined,
        acknowledgedAt:
          status === AlertStatus.ACKNOWLEDGED
            ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000)
            : undefined,
      },
    });
  }

  console.log(`✅ Created ${count} random alerts`);
}

/**
 * Main seeding function
 */
async function main() {
  try {
    console.log("🚀 Starting alert system seeding...");

    // Get or create test data
    const { company, user } = await getTestCompanyAndUser();

    // Create alert rules
    const alertRules = await createAlertRules(company.id, user.id);

    // Create sample alerts
    await createAlerts(company.id, user.id, alertRules);

    // Create additional random alerts for testing
    await createRandomAlerts(company.id, user.id, alertRules, 30);

    console.log("🎉 Alert system seeding completed successfully!");

    // Print summary
    const alertCount = await prisma.alert.count({
      where: { companyId: company.id },
    });
    const ruleCount = await prisma.alertRule.count({
      where: { companyId: company.id },
    });
    const activeAlerts = await prisma.alert.count({
      where: { companyId: company.id, status: AlertStatus.ACTIVE },
    });

    console.log(`
📊 Seeding Summary:
   - Alert Rules: ${ruleCount}
   - Total Alerts: ${alertCount}
   - Active Alerts: ${activeAlerts}
   - Company: ${company.name}
   - User: ${user.email}
   
🔐 Login Credentials:
   - Email: tessierhuort@gmail.com
   - Password: MrffB!D$UPn254
    `);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Cleanup function to remove all test data
 */
async function cleanup() {
  try {
    console.log("🧹 Cleaning up alert data...");

    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { name: "Test Company" },
          { name: "Tessier Company" },
          { contactEmail: "tessierhuort@gmail.com" },
        ],
      },
    });

    if (company) {
      // Delete alerts first (due to foreign keys)
      await prisma.alert.deleteMany({
        where: { companyId: company.id },
      });

      // Delete alert rules
      await prisma.alertRule.deleteMany({
        where: { companyId: company.id },
      });

      console.log("✅ Cleanup completed");
    } else {
      console.log("📋 No test data found to clean up");
    }
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Handle command line arguments
const command = process.argv[2];

if (command === "cleanup") {
  cleanup();
} else {
  main();
}
