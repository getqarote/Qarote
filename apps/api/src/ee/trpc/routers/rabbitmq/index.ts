import { definitionsRouter } from "@/trpc/routers/rabbitmq/definitions";
import { infrastructureRouter } from "@/trpc/routers/rabbitmq/infrastructure";
import { memoryRouter } from "@/trpc/routers/rabbitmq/memory";
import { messagesRouter } from "@/trpc/routers/rabbitmq/messages";
import { metricsRouter } from "@/trpc/routers/rabbitmq/metrics";
import { overviewRouter } from "@/trpc/routers/rabbitmq/overview";
import { policiesRouter } from "@/trpc/routers/rabbitmq/policies";
import { queuesRouter } from "@/trpc/routers/rabbitmq/queues";
import { serverRouter } from "@/trpc/routers/rabbitmq/server";
import { usersRouter } from "@/trpc/routers/rabbitmq/users";
import { vhostRouter } from "@/trpc/routers/rabbitmq/vhost";
import { router } from "@/trpc/trpc";

import { alertsRouter } from "@/ee/routers/rabbitmq/alerts";
import { topologyRouter } from "@/ee/routers/rabbitmq/topology";

/**
 * EE RabbitMQ router — extends the CE router with alerts and topology.
 * Used by the EE router assembly (src/ee/trpc/router.ts).
 */
export const rabbitmqRouter = router({
  queues: queuesRouter,
  overview: overviewRouter,
  infrastructure: infrastructureRouter,
  metrics: metricsRouter,
  memory: memoryRouter,
  messages: messagesRouter,
  server: serverRouter,
  vhost: vhostRouter,
  alerts: alertsRouter,
  users: usersRouter,
  topology: topologyRouter,
  policies: policiesRouter,
  definitions: definitionsRouter,
});
