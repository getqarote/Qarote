/**
 * Catalog of RabbitMQ policy definition keys, grouped and typed.
 * Mirrors the ExchangeArgumentsBuilder catalog shape exactly.
 */
type DefType = "number" | "number-ms" | "string" | "enum";

type DefGroup =
  | "limits"
  | "lifecycle"
  | "deadletter"
  | "ha"
  | "federation"
  | "other";

interface DefDefinition {
  key: string;
  type: DefType;
  group: DefGroup;
  defaultValue: string;
  tooltipKey: string;
  docsUrl: string;
  options?: string[];
}

export const DEF_CATALOG: DefDefinition[] = [
  // ── Limits ────────────────────────────────────────────────────────────────
  {
    key: "max-length",
    type: "number",
    group: "limits",
    defaultValue: "10000",
    tooltipKey: "defTooltipMaxLength",
    docsUrl: "https://www.rabbitmq.com/docs/maxlength",
  },
  {
    key: "max-length-bytes",
    type: "number",
    group: "limits",
    defaultValue: "104857600",
    tooltipKey: "defTooltipMaxLengthBytes",
    docsUrl: "https://www.rabbitmq.com/docs/maxlength",
  },
  {
    key: "overflow",
    type: "enum",
    group: "limits",
    defaultValue: "drop-head",
    tooltipKey: "defTooltipOverflow",
    docsUrl: "https://www.rabbitmq.com/docs/maxlength#overflow-behaviour",
    options: ["drop-head", "reject-publish", "reject-publish-dlx"],
  },
  // ── Lifecycle ─────────────────────────────────────────────────────────────
  {
    key: "message-ttl",
    type: "number-ms",
    group: "lifecycle",
    defaultValue: "60000",
    tooltipKey: "defTooltipMessageTtl",
    docsUrl: "https://www.rabbitmq.com/docs/ttl#message-ttl-using-policy",
  },
  {
    key: "expires",
    type: "number-ms",
    group: "lifecycle",
    defaultValue: "300000",
    tooltipKey: "defTooltipExpires",
    docsUrl: "https://www.rabbitmq.com/docs/ttl#queue-ttl",
  },
  // ── Dead-letter ───────────────────────────────────────────────────────────
  {
    key: "dead-letter-exchange",
    type: "string",
    group: "deadletter",
    defaultValue: "",
    tooltipKey: "defTooltipDlx",
    docsUrl: "https://www.rabbitmq.com/docs/dlx",
  },
  {
    key: "dead-letter-routing-key",
    type: "string",
    group: "deadletter",
    defaultValue: "",
    tooltipKey: "defTooltipDlrk",
    docsUrl: "https://www.rabbitmq.com/docs/dlx",
  },
  {
    key: "dead-letter-strategy",
    type: "enum",
    group: "deadletter",
    defaultValue: "at-most-once",
    tooltipKey: "defTooltipDlStrategy",
    docsUrl: "https://www.rabbitmq.com/docs/quorum-queues#dead-lettering",
    options: ["at-most-once", "at-least-once"],
  },
  {
    key: "delivery-limit",
    type: "number",
    group: "deadletter",
    defaultValue: "5",
    tooltipKey: "defTooltipDeliveryLimit",
    docsUrl:
      "https://www.rabbitmq.com/docs/quorum-queues#poison-message-handling",
  },
  // ── HA / Replication ──────────────────────────────────────────────────────
  {
    key: "ha-mode",
    type: "enum",
    group: "ha",
    defaultValue: "all",
    tooltipKey: "defTooltipHaMode",
    docsUrl: "https://www.rabbitmq.com/docs/ha#mirroring-arguments",
    options: ["all", "exactly", "nodes"],
  },
  {
    key: "ha-params",
    type: "string",
    group: "ha",
    defaultValue: "2",
    tooltipKey: "defTooltipHaParams",
    docsUrl: "https://www.rabbitmq.com/docs/ha#mirroring-arguments",
  },
  {
    key: "ha-sync-mode",
    type: "enum",
    group: "ha",
    defaultValue: "automatic",
    tooltipKey: "defTooltipHaSyncMode",
    docsUrl: "https://www.rabbitmq.com/docs/ha#eager-synchronisation",
    options: ["automatic", "manual"],
  },
  // ── Federation ────────────────────────────────────────────────────────────
  {
    key: "federation-upstream",
    type: "string",
    group: "federation",
    defaultValue: "",
    tooltipKey: "defTooltipFederationUpstream",
    docsUrl: "https://www.rabbitmq.com/docs/federation",
  },
  {
    key: "federation-upstream-set",
    type: "string",
    group: "federation",
    defaultValue: "all",
    tooltipKey: "defTooltipFederationUpstreamSet",
    docsUrl: "https://www.rabbitmq.com/docs/federation",
  },
  // ── Other ─────────────────────────────────────────────────────────────────
  {
    key: "alternate-exchange",
    type: "string",
    group: "other",
    defaultValue: "",
    tooltipKey: "defTooltipAlternateExchange",
    docsUrl: "https://www.rabbitmq.com/docs/ae",
  },
  {
    key: "queue-mode",
    type: "enum",
    group: "other",
    defaultValue: "lazy",
    tooltipKey: "defTooltipQueueMode",
    docsUrl: "https://www.rabbitmq.com/docs/lazy-queues",
    options: ["lazy", "default"],
  },
];

export const CATALOG_BY_KEY: Record<string, DefDefinition> = Object.fromEntries(
  DEF_CATALOG.map((d) => [d.key, d])
);

export const GROUP_ORDER: DefGroup[] = [
  "limits",
  "lifecycle",
  "deadletter",
  "ha",
  "federation",
  "other",
];

export const GROUP_LABEL_KEY: Record<DefGroup, string> = {
  limits: "defGroupLimits",
  lifecycle: "defGroupLifecycle",
  deadletter: "defGroupDeadletter",
  ha: "defGroupHa",
  federation: "defGroupFederation",
  other: "defGroupOther",
};

/**
 * Converts a builder row value string to its correct JSON type.
 * Returns undefined for incomplete rows (empty custom keys, blank values).
 */
export function normalizeDefValue(
  key: string,
  raw: string
): string | number | boolean | undefined {
  const def = CATALOG_BY_KEY[key];
  const trimmed = raw.trim();

  if (!def) {
    // Custom key: infer type from value string (no boolean coercion —
    // catalog-driven boolean support belongs in the switch below).
    if (trimmed === "") return undefined;
    const asNum = Number(trimmed);
    if (Number.isFinite(asNum)) return asNum;
    return trimmed;
  }

  if (trimmed === "") return undefined;

  switch (def.type) {
    case "number":
    case "number-ms": {
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : undefined;
    }
    case "enum":
    case "string":
      return trimmed;
  }
}

export interface DefRow {
  id: string;
  key: string;
  value: string;
  isCustom?: boolean;
}

export const newRowId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
