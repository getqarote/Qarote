export type CardFormat = "og" | "square";

export type CardType = "default" | "page" | "rca";

export type CardSeverity = "critical" | "high" | "medium" | "low";

export interface CardSpec {
  /** Card family member. Drives which slots render. */
  type: CardType;
  /** Export size. 1200×630 (default) or 1200×1200. */
  format?: CardFormat;
  /** Main headline. For `default`, the fixed brand tagline. */
  title: string;
  /**
   * Optional substring of `title` colored carrot (the agent-first accent).
   * If it isn't found verbatim in `title`, the whole title stays white.
   */
  accent?: string;
  /** Eyebrow line (page section label). `page` type. */
  eyebrow?: string;
  /** Sub-headline under the title. `page` type. */
  sub?: string;
  /** RCA finding line, e.g. "orders.incoming · CRITICAL · AWS RabbitMQ". */
  finding?: string;
  /** RCA severity → status-dot color. */
  severity?: CardSeverity;
  /** Footer URL. Defaults to "qarote.io". */
  url?: string;
}
