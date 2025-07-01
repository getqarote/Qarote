import { Context } from "hono";
import { RabbitMQServer } from "@prisma/client";
import { prisma } from "@/core/prisma";
import { RabbitMQClient } from "@/core/rabbitmq/Client";
import { EncryptionService } from "@/services/encryption.service";
import { logger } from "@/core/logger";

/**
 * Helper function to decrypt server credentials for RabbitMQ client
 */
export function getDecryptedCredentials(server: RabbitMQServer) {
  return {
    host: server.host,
    port: server.port,
    username: EncryptionService.decrypt(server.username),
    password: EncryptionService.decrypt(server.password),
    vhost: server.vhost,
    sslConfig: {
      enabled: server.sslEnabled || false,
      verifyPeer: server.sslVerifyPeer || true,
      caCertPath: server.sslCaCertPath || undefined,
      clientCertPath: server.sslClientCertPath || undefined,
      clientKeyPath: server.sslClientKeyPath || undefined,
    },
  };
}

/**
 * Helper function to verify server belongs to user's workspace and return server
 */
export async function verifyServerAccess(
  serverId: string,
  workspaceId: string,
  includeWorkspace = false
): Promise<RabbitMQServer> {
  const server = await prisma.rabbitMQServer.findFirst({
    where: {
      id: serverId,
      workspaceId,
    },
    include: includeWorkspace ? { workspace: true } : undefined,
  });

  if (!server) {
    throw new Error("Server not found or access denied");
  }

  return server;
}

/**
 * Helper function to create RabbitMQ client with error handling
 */
export async function createRabbitMQClient(
  serverId: string,
  workspaceId: string
): Promise<RabbitMQClient> {
  const server = await verifyServerAccess(serverId, workspaceId);
  return new RabbitMQClient(getDecryptedCredentials(server));
}

/**
 * Standard error response for controllers
 */
export function createErrorResponse(
  c: Context,
  error: unknown,
  statusCode: 400 | 404 | 500 = 500,
  defaultMessage = "Unknown error occurred"
) {
  logger.error("Controller error:", error);
  return c.json(
    {
      error: defaultMessage,
      message: error instanceof Error ? error.message : "Unknown error",
    },
    statusCode
  );
}

export function getUserDisplayName(user: {
  firstName: string;
  lastName: string;
}): string {
  return `${user.firstName} ${user.lastName}`;
}
