import { router } from "@/trpc/trpc";

import { alertsRouter } from "./alerts";
import { infrastructureRouter } from "./infrastructure";
import { memoryRouter } from "./memory";
import { messagesRouter } from "./messages";
import { metricsRouter } from "./metrics";
import { overviewRouter } from "./overview";
import { policiesRouter } from "./policies";
import { queuesRouter } from "./queues";
import { serverRouter } from "./server";
import { topologyRouter } from "./topology";
import { usersRouter } from "./users";
import { vhostRouter } from "./vhost";

/**
 * RabbitMQ router
 * Combines all RabbitMQ-related routers
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
});
