import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface TitleWithCountProps {
  /**
   * The page title text. Kept as ReactNode so it can contain inline i18n
   * interpolations if needed.
   */
  children: ReactNode;
  /**
   * Row count to display next to the title. If undefined, nothing is
   * rendered in its place (use this while data is loading to avoid a
   * flash of "0").
   */
  count?: number;
  /**
   * Total count before filtering. If provided AND different from
   * `count`, the count is rendered as "filtered of total" so the
   * operator can see both numbers at once (e.g. "2 of 47").
   *
   * Leave undefined when there is no filter in play.
   */
  total?: number;
}

/**
 * Page title that optionally shows a row count beside the title text.
 *
 * Renders the count in a lighter weight and muted tone so it reads as
 * metadata, not as part of the heading. Numbers use the mono font stack
 * (Fragment Mono) per the Qarote "numbers are sacred" principle — they
 * deserve their own typographic treatment, not default sans.
 *
 * When a filter is active (`total` provided and != `count`), the count
 * is formatted as "filtered of total" and wrapped in an aria-live
 * region so screen readers announce filter result changes.
 *
 * Used on all list pages (Queues, Exchanges, Connections, Nodes,
 * Virtual Hosts, Users) so users know the magnitude of the dataset
 * before parsing the table.
 */
export function TitleWithCount({
  children,
  count,
  total,
}: TitleWithCountProps) {
  const { t } = useTranslation("common");
  const isFiltered = typeof total === "number" && total !== count;

  return (
    <h1 className="title-page flex items-baseline gap-2">
      {children}
      {count !== undefined && (
        <span
          className="font-mono text-xl font-normal text-muted-foreground tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {isFiltered
            ? t("countOfTotal", {
                filtered: count.toLocaleString(),
                total: (total as number).toLocaleString(),
              })
            : count.toLocaleString()}
        </span>
      )}
    </h1>
  );
}
