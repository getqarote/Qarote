/**
 * Catalog of RabbitMQ queue arguments we support first-class in the builder.
 * Each entry provides the input shape, grouping for the key picker, docs URL,
 * and a normalizer that maps the user-entered string to the final JSON value.
 */
type ArgType = "number" | "number-ms" | "string" | "boolean" | "enum";

interface ArgDefinition {
  key: string;
  type: ArgType;
  group: "limits" | "lifecycle" | "dlq" | "behavior";
  defaultValue: string;
  /** i18n key for the tooltip/helper description. */
  tooltipKey: string;
  docsUrl: string;
  /** For enum types only. */
  options?: string[];
}

export const ARG_CATALOG: ArgDefinition[] = [
  {
    key: "x-max-length",
    type: "number",
    group: "limits",
    defaultValue: "10000",
    tooltipKey: "tooltipMaxLength",
    docsUrl: "https://www.rabbitmq.com/docs/maxlength",
  },
  {
    key: "x-max-priority",
    type: "number",
    group: "limits",
    defaultValue: "10",
    tooltipKey: "tooltipMaxPriority",
    docsUrl: "https://www.rabbitmq.com/docs/priority",
  },
  {
    key: "x-overflow",
    type: "enum",
    group: "limits",
    defaultValue: "reject-publish",
    tooltipKey: "tooltipOverflow",
    docsUrl: "https://www.rabbitmq.com/docs/maxlength#overflow-behaviour",
    options: ["drop-head", "reject-publish", "reject-publish-dlx"],
  },
  {
    key: "x-message-ttl",
    type: "number",
    group: "lifecycle",
    defaultValue: "3600000",
    tooltipKey: "tooltipMessageTtl",
    docsUrl: "https://www.rabbitmq.com/docs/ttl#per-queue-message-ttl",
  },
  {
    key: "x-expires",
    type: "number",
    group: "lifecycle",
    defaultValue: "1800000",
    tooltipKey: "tooltipExpires",
    docsUrl: "https://www.rabbitmq.com/docs/ttl#queue-ttl",
  },
  {
    key: "x-dead-letter-exchange",
    type: "string",
    group: "dlq",
    defaultValue: "",
    tooltipKey: "tooltipDeadLetterExchange",
    docsUrl: "https://www.rabbitmq.com/docs/dlx",
  },
  {
    key: "x-dead-letter-routing-key",
    type: "string",
    group: "dlq",
    defaultValue: "",
    tooltipKey: "tooltipDeadLetterRoutingKey",
    docsUrl: "https://www.rabbitmq.com/docs/dlx",
  },
  {
    key: "x-single-active-consumer",
    type: "boolean",
    group: "behavior",
    defaultValue: "true",
    tooltipKey: "tooltipSingleActiveConsumer",
    docsUrl: "https://www.rabbitmq.com/docs/consumers#single-active-consumer",
  },
];

export const CATALOG_BY_KEY: Record<string, ArgDefinition> = Object.fromEntries(
  ARG_CATALOG.map((a) => [a.key, a])
);

export type RabbitMQQueueType = "default" | "classic" | "quorum" | "stream";

export type QueuePresetId =
  | "classic"
  | "transient"
  | "priority"
  | "dlq"
  | "custom";

interface QueuePreset {
  id: QueuePresetId;
  titleKey: string;
  descKey: string;
  durable: boolean;
  autoDelete: boolean;
  exclusive: boolean;
  /** Argument rows to prefill. */
  args: Array<{ key: string; value: string }>;
}

export const QUEUE_PRESETS: QueuePreset[] = [
  {
    id: "classic",
    titleKey: "presetClassicTitle",
    descKey: "presetClassicDesc",
    durable: true,
    autoDelete: false,
    exclusive: false,
    args: [],
  },
  {
    id: "dlq",
    titleKey: "presetDlqTitle",
    descKey: "presetDlqDesc",
    durable: true,
    autoDelete: false,
    exclusive: false,
    args: [{ key: "x-dead-letter-exchange", value: "" }],
  },
  {
    id: "priority",
    titleKey: "presetPriorityTitle",
    descKey: "presetPriorityDesc",
    durable: true,
    autoDelete: false,
    exclusive: false,
    args: [{ key: "x-max-priority", value: "10" }],
  },
  {
    id: "transient",
    titleKey: "presetTransientTitle",
    descKey: "presetTransientDesc",
    durable: false,
    autoDelete: true,
    exclusive: false,
    args: [],
  },
];

/** Sentinel value used by the exchange Select when the user picks "no binding". */
export const NO_BINDING = "none";
/** Sentinel value used by the Select when the user picks RabbitMQ's default exchange. */
export const DEFAULT_EXCHANGE = "default";

/**
 * Normalizes a builder row to its JSON-value representation. Returns undefined
 * for rows that shouldn't be emitted (empty custom keys / invalid numbers).
 */
export function normalizeArgValue(
  key: string,
  raw: string
): unknown | undefined {
  const def = CATALOG_BY_KEY[key];
  const trimmed = raw.trim();
  if (!def) {
    // Custom key — best-effort: number if parseable, true/false for bool literals,
    // otherwise string.
    if (trimmed === "") return undefined;
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    const asNum = Number(trimmed);
    if (!Number.isNaN(asNum) && trimmed !== "") return asNum;
    return trimmed;
  }
  if (trimmed === "") return undefined;
  switch (def.type) {
    case "number":
    case "number-ms": {
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : undefined;
    }
    case "boolean":
      return trimmed === "true";
    case "enum":
    case "string":
      return trimmed;
  }
}
