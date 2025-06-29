import prisma, { Server } from "../../core/prisma";
import { RabbitMQServer, Workspace } from "@prisma/client";
import { RabbitMQClient } from "../../core/rabbitmq/Client";
import { EncryptionService } from "../../services/encryption.service";
import { Context } from "hono";

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
  workspaceId: string
): Promise<RabbitMQServer>;

export async function verifyServerAccess(
  serverId: string,
  workspaceId: string,
  includeWorkspace: true
): Promise<RabbitMQServer & { workspace: Workspace | null }>;

export async function verifyServerAccess(
  serverId: string,
  workspaceId: string,
  includeWorkspace = false
): Promise<any> {
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
  console.error("Controller error:", error);
  return c.json(
    {
      error: defaultMessage,
      message: error instanceof Error ? error.message : "Unknown error",
    },
    statusCode
  );
}

/**
 * Warning information type for plan validation responses
 */
export type WarningInfo = {
  isOverLimit: boolean;
  message: string;
  currentQueueCount: number;
  queueCountAtConnect: number | null;
  upgradeRecommendation: string;
  recommendedPlan: string | null;
  warningShown: boolean | null;
};
