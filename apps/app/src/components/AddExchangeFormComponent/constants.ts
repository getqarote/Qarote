import type { ExchangeType } from "@/schemas";

/**
 * Catalog of RabbitMQ exchange-level arguments supported first-class in the
 * arguments builder. Mirrors the queue-side catalog shape.
 */
type ArgType = "number" | "number-ms" | "string" | "boolean" | "enum";

type ArgGroup = "routing" | "deduplication";

interface ArgDefinition {
  key: string;
  type: ArgType;
  group: ArgGroup;
  defaultValue: string;
  tooltipKey: string;
  docsUrl: string;
  options?: string[];
}

export const ARG_CATALOG: ArgDefinition[] = [
  {
    key: "alternate-exchange",
    type: "string",
    group: "routing",
    defaultValue: "",
    tooltipKey: "argTooltipAlternateExchange",
    docsUrl: "https://www.rabbitmq.com/docs/ae",
  },
  {
    key: "x-message-deduplication",
    type: "boolean",
    group: "deduplication",
    defaultValue: "true",
    tooltipKey: "argTooltipMessageDeduplication",
    docsUrl: "https://github.com/noxdafox/rabbitmq-message-deduplication",
  },
  {
    key: "x-cache-size",
    type: "number",
    group: "deduplication",
    defaultValue: "1000",
    tooltipKey: "argTooltipCacheSize",
    docsUrl: "https://github.com/noxdafox/rabbitmq-message-deduplication",
  },
  {
    key: "x-cache-ttl",
    type: "number-ms",
    group: "deduplication",
    defaultValue: "3600000",
    tooltipKey: "argTooltipCacheTtl",
    docsUrl: "https://github.com/noxdafox/rabbitmq-message-deduplication",
  },
  {
    key: "x-cache-persistence",
    type: "enum",
    group: "deduplication",
    defaultValue: "memory",
    tooltipKey: "argTooltipCachePersistence",
    docsUrl: "https://github.com/noxdafox/rabbitmq-message-deduplication",
    options: ["memory", "disk"],
  },
];

export const CATALOG_BY_KEY: Record<string, ArgDefinition> = Object.fromEntries(
  ARG_CATALOG.map((a) => [a.key, a])
);

export const GROUP_ORDER: ArgGroup[] = ["routing", "deduplication"];

export const GROUP_LABEL_KEY: Record<ArgGroup, string> = {
  routing: "argGroupRouting",
  deduplication: "argGroupDeduplication",
};

/**
 * Four RabbitMQ exchange types presented as decision cards. The `dotClass`
 * mirrors the coloring used across the rest of the dashboard for quick
 * recognition (direct = success, fanout = info, topic = warning, headers = muted).
 */
interface ExchangeTypeDescriptor {
  id: ExchangeType;
  titleKey: string;
  descKey: string;
  dotClass: string;
}

export const EXCHANGE_TYPE_DESCRIPTORS: ExchangeTypeDescriptor[] = [
  {
    id: "direct",
    titleKey: "typeDirectTitle",
    descKey: "typeDirectDesc",
    dotClass: "bg-success",
  },
  {
    id: "topic",
    titleKey: "typeTopicTitle",
    descKey: "typeTopicDesc",
    dotClass: "bg-warning",
  },
  {
    id: "fanout",
    titleKey: "typeFanoutTitle",
    descKey: "typeFanoutDesc",
    dotClass: "bg-info",
  },
  {
    id: "headers",
    titleKey: "typeHeadersTitle",
    descKey: "typeHeadersDesc",
    dotClass: "bg-muted-foreground",
  },
];

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
