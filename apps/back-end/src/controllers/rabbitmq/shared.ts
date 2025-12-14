import { RabbitMQServer, Workspace } from "@prisma/client";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";
import { QueuePauseState, RabbitMQAmqpClientFactory } from "@/core/rabbitmq";
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
    amqpPort: server.amqpPort,
    version: server.version ?? undefined,
    versionMajorMinor: server.versionMajorMinor ?? undefined,
  };
}

/**
 * Helper function to verify server belongs to user's workspace and return server
 */
export async function verifyServerAccess(
  serverId: string,
  workspaceId: string,
  includeWorkspace = false
): Promise<(RabbitMQServer & { workspace?: Workspace }) | null> {
  const server = await prisma.rabbitMQServer.findFirst({
    where: {
      id: serverId,
      workspaceId,
    },
    include: includeWorkspace ? { workspace: true } : undefined,
  });

  if (!server) {
    return null;
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
  if (!server) {
    throw new Error(`Server with ID ${serverId} not found or access denied`);
  }
  return new RabbitMQClient(getDecryptedCredentials(server));
}

/**
 * Helper function to create AMQP client for queue operations using the factory
 */
export async function createAmqpClient(serverId: string, workspaceId: string) {
  const server = await prisma.rabbitMQServer.findFirst({
    where: {
      id: serverId,
      workspaceId,
    },
    select: {
      id: true,
      name: true,
      host: true,
      port: true,
      amqpPort: true,
      username: true,
      password: true,
      vhost: true,
      useHttps: true,
      queuePauseStates: true,
    },
  });

  if (!server) {
    throw new Error(`Server with ID ${serverId} not found or access denied`);
  }

  // Decrypt username and password before creating client
  let decryptedUsername: string;
  let decryptedPassword: string;

  try {
    decryptedUsername = EncryptionService.decrypt(server.username);
    decryptedPassword = EncryptionService.decrypt(server.password);

    logger.debug(
      {
        serverId: server.id,
        serverName: server.name,
        hasUsername: !!decryptedUsername,
        hasPassword: !!decryptedPassword,
      },
      `Decrypted credentials for server ${server.name}`
    );
  } catch (error) {
    logger.error(
      { error },
      `Failed to decrypt credentials for server ${server.name}`
    );
    throw new Error(`Failed to decrypt server credentials for ${server.name}`);
  }

  // Create client using factory with decrypted credentials
  const client = await RabbitMQAmqpClientFactory.createClient({
    id: server.id,
    name: server.name,
    host: server.host,
    port: server.port, // Management API port
    amqpPort: server.amqpPort, // AMQP protocol port
    username: decryptedUsername, // ✅ Using decrypted username
    password: decryptedPassword, // ✅ Using decrypted password
    vhost: server.vhost || "/",
    useHttps: server.useHttps,
  });

  // Set up persistence callback to save pause states to database
  client.setPersistenceCallback(
    async (serverId: string, pauseStates: QueuePauseState[]) => {
      try {
        await prisma.rabbitMQServer.update({
          where: { id: serverId },
          data: {
            queuePauseStates: JSON.parse(
              JSON.stringify(
                pauseStates.reduce(
                  (acc, state) => {
                    acc[state.queueName] = state;
                    return acc;
                  },
                  {} as Record<string, QueuePauseState>
                )
              )
            ),
          },
        });

        logger.debug(
          {
            pausedQueues: pauseStates.filter((s) => s.isPaused).length,
            totalQueues: pauseStates.length,
          },
          `Persisted pause states for server ${serverId}`
        );
      } catch (error) {
        logger.error(
          { error },
          `Failed to persist pause states for server ${serverId}`
        );
      }
    }
  );

  // Load existing pause states from database
  const existingPauseStates = server.queuePauseStates as Record<
    string,
    QueuePauseState
  > | null;

  if (existingPauseStates) {
    const pauseStatesArray = Object.values(existingPauseStates).map(
      (state) => ({
        ...state,
        pausedAt: state.pausedAt ? new Date(state.pausedAt) : undefined,
        resumedAt: state.resumedAt ? new Date(state.resumedAt) : undefined,
      })
    );
    client.loadPauseStates(pauseStatesArray);
  }

  return client;
}
