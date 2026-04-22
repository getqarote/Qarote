import { router } from "@/trpc/trpc";

import { definitionsRouter } from "./definitions";
import { infrastructureRouter } from "./infrastructure";
import { memoryRouter } from "./memory";
import { messagesRouter } from "./messages";
import { metricsRouter } from "./metrics";
import { overviewRouter } from "./overview";
import { policiesRouter } from "./policies";
import { queuesRouter } from "./queues";
import { serverRouter } from "./server";
import { usersRouter } from "./users";
import { vhostRouter } from "./vhost";

/**
 * CE RabbitMQ router — no EE imports.
 * The EE rabbitmq router (src/ee/trpc/routers/rabbitmq/index.ts) adds
 * alerts and topology and is used by the EE assembly.
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
  users: usersRouter,
  policies: policiesRouter,
  definitions: definitionsRouter,
});
