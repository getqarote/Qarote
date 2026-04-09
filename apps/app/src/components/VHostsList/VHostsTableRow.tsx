import { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Database, Lock, Trash2 } from "lucide-react";

import type { VHost } from "@/lib/api/vhostTypes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

// `permissionCount` is added by the tRPC router (see apps/api/src/trpc/
// routers/rabbitmq/vhost.ts) but not yet declared on the client-side
// `VHost` interface. Widen the type here rather than touching the
// shared types file in a design pass.
export type VHostListItem = VHost & { permissionCount?: number };

interface VHostsTableRowProps {
  vhost: VHostListItem;
  /**
   * Route the name cell links to. A real `<Link>` — not a programmatic
   * `navigate()` — so keyboard users can Tab into it, screen readers
   * announce it as a link, and mouse users can right-click / middle-
   * click / Cmd+click for new-tab behaviour.
   */
  href: string;
  onDelete: () => void;
}

/**
 * A single row in the vhosts list. Numbers use Fragment Mono + tabular
 * nums so the queued / unacked / total columns align vertically across
 * rows — per the "numbers are sacred" design principle.
 *
 * The default vhost `/` cannot be deleted. Its delete button is hidden
 * outright rather than shown disabled, because a ghosted trash can in
 * the middle of every table row is noise operators must re-parse.
 *
 * The name cell is a real `<Link>` (not a row-level `onClick`) so the
 * primary "open this vhost" affordance is keyboard-operable, screen-
 * reader announceable, and right-click-openable in a new tab. WCAG
 * 2.1.1 Keyboard compliant.
 */
export function VHostsTableRow({ vhost, href, onDelete }: VHostsTableRowProps) {
  const { t } = useTranslation("vhosts");

  const isDefault = vhost.name === "/";

  const stopAnd = (fn: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    fn();
  };

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-medium">
        <Link
          to={href}
          className="flex items-center gap-2 rounded-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Database
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate" title={vhost.name}>
                {vhost.name}
              </span>
              {vhost.protected_from_deletion && (
                <Badge
                  variant="secondary"
                  className="text-xs flex items-center gap-1"
                  title={t("protectedFromDeletion")}
                  aria-label={t("protectedFromDeletion")}
                >
                  <Lock className="w-3 h-3" aria-hidden="true" />
                </Badge>
              )}
            </div>
            {vhost.description && (
              <p className="text-xs text-muted-foreground font-normal truncate max-w-[300px]">
                {vhost.description}
              </p>
            )}
          </div>
        </Link>
      </TableCell>
      <TableCell className="font-mono tabular-nums">
        {vhost.permissionCount ?? 0}
      </TableCell>
      <TableCell className="font-mono tabular-nums">
        {(vhost.messages_ready ?? 0).toLocaleString()}
      </TableCell>
      <TableCell className="font-mono tabular-nums">
        {(vhost.messages_unacknowledged ?? 0).toLocaleString()}
      </TableCell>
      <TableCell className="font-mono tabular-nums">
        {(vhost.messages ?? 0).toLocaleString()}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {!isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={stopAnd(onDelete)}
              className="h-9 w-9 p-0 text-destructive hover:text-destructive"
              aria-label={t("deleteVhost") + ": " + vhost.name}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
