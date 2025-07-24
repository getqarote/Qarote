import { RabbitMQServer } from "@prisma/client";
import { prisma } from "@/core/prisma";
import { RabbitMQClient } from "@/core/rabbitmq/RabbitClient";
import { EncryptionService } from "@/services/encryption.service";

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
    useHttps: server.useHttps,
    sslConfig: {
      enabled: server.sslEnabled,
      verifyPeer: server.sslVerifyPeer,
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
): Promise<any> {
  // TODO: remove any
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
