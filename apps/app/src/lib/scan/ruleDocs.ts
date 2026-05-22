/**
 * Maps config rule keys to canonical RabbitMQ documentation URLs.
 *
 * Quick-win runbook substitute: when a finding is shown, we link out to the
 * authoritative RabbitMQ docs for the underlying concept. Replaces ad-hoc
 * Googling and keeps users in a verified-source flow until we ship in-product
 * runbooks.
 */
const RULE_DOC_URLS: Record<string, string> = {
  "config.queue.missing_dlx": "https://www.rabbitmq.com/docs/dlx",
  "config.queue.classic_mirrored_deprecated":
    "https://www.rabbitmq.com/docs/ha",
  "config.queue.exclusive_in_production":
    "https://www.rabbitmq.com/docs/queues#exclusive-queues",
  "config.queue.no_consumer_backlog": "https://www.rabbitmq.com/docs/consumers",
  "config.queue.quorum_queue_ha_policy":
    "https://www.rabbitmq.com/docs/quorum-queues",
  "config.queue.quorum_queue_minority_replicas":
    "https://www.rabbitmq.com/docs/quorum-queues#use-cases",
  "config.queue.quorum_queue_no_delivery_limit":
    "https://www.rabbitmq.com/docs/quorum-queues#poison-message-handling",
  "config.exchange.orphan": "https://www.rabbitmq.com/docs/exchanges",
  "config.user.guest_enabled":
    "https://www.rabbitmq.com/docs/access-control#default-state",
  "config.vhost.default_unscoped": "https://www.rabbitmq.com/docs/vhosts",
  "config.node.watermark_misconfig": "https://www.rabbitmq.com/docs/memory",
  "config.consumer.prefetch_misconfig":
    "https://www.rabbitmq.com/docs/consumer-prefetch",
  "config.policy.conflicting": "https://www.rabbitmq.com/docs/policies",
};

export function getRuleDocUrl(ruleKey: string): string | undefined {
  return RULE_DOC_URLS[ruleKey];
}
