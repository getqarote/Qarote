import { ReactNode } from "react";

interface TitleWithCountProps {
  /**
   * The page title text. Kept as ReactNode so it can contain inline i18n
   * interpolations if needed.
   */
  children: ReactNode;
  /**
   * The row count to display next to the title. If undefined, nothing is
   * rendered in its place (use this while data is loading to avoid a
   * flash of "0").
   */
  count?: number;
}

/**
 * Page title that optionally shows a row count beside the title text.
 *
 * Renders the count in a lighter weight and muted tone so it reads as
 * metadata, not as part of the heading. Used on all list pages (Queues,
 * Exchanges, Connections, Nodes, Virtual Hosts, Users) so users know the
 * magnitude of the dataset before parsing the table.
 */
export function TitleWithCount({ children, count }: TitleWithCountProps) {
  return (
    <h1 className="title-page flex items-baseline gap-2">
      {children}
      {count !== undefined && (
        <span className="text-xl font-normal text-muted-foreground tabular-nums">
          {count.toLocaleString()}
        </span>
      )}
    </h1>
  );
}
