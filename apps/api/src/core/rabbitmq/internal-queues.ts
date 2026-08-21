/**
 * Queues Qarote creates on the user's broker for its own plumbing.
 *
 * The firehose declares a durable consumer queue per (server, vhost) named
 * `qarote.trace.v2.<serverId>.<vhost>`. It belongs to us, not to the user's
 * application, and it must not be presented or judged as one of their queues:
 * it inflates queue counts, shows up in the cockpit, and — most visibly — fires
 * depth alerts at the user whenever our own consumer falls behind.
 *
 * Lives in core (not ee/) because the CE tRPC routers and the MCP broker tools
 * list queues too, and a CE file importing from ee/ breaks the public mirror.
 *
 * Deliberately NOT applied inside ApiClient.getQueues: the trace monitor
 * registry lists queues precisely to find and delete leftover `qarote.trace.*`
 * ones, so the raw view has to stay honest. Filter at the boundaries that face
 * the user instead.
 */
const INTERNAL_QUEUE_PREFIX = "qarote.trace.";

export function isQaroteInternalQueue(queueName: string): boolean {
  return queueName.startsWith(INTERNAL_QUEUE_PREFIX);
}

/** Drop Qarote's own queues from a list destined for the user or the agent. */
export function excludeInternalQueues<T extends { name: string }>(
  queues: T[]
): T[] {
  return queues.filter((q) => !isQaroteInternalQueue(q.name));
}
