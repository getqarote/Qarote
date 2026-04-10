import { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Database, Lock, Trash2 } from "lucide-react";

import type { VHost } from "@/lib/api/vhostTypes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
 * Health signal: any non-zero message count gets `text-warning` so
 * operators can spot backlogged vhosts at a scan without parsing every
 * number in the column. Zero stays muted — absence of a problem
 * shouldn't compete for attention.
 *
 * The default vhost `/` cannot be deleted. Its delete button is hidden
 * outright rather than shown disabled, because a ghosted trash can in
 * every row is noise operators re-parse with zero benefit.
 *
 * The Lock badge is wrapped in a Tooltip — icon-only badges are
 * inaccessible; the tooltip surfaces the meaning without cluttering
 * the row layout.
 *
 * Description is allowed to wrap rather than truncate. Power-users
 * write descriptive vhost descriptions; a 300 px max-width silently
 * amputates them with no way to read the full text.
 */
export function VHostsTableRow({ vhost, href, onDelete }: VHostsTableRowProps) {
  const { t } = useTranslation("vhosts");

  const isDefault = vhost.name === "/";

  const ready = vhost.messages_ready ?? 0;
  const unacked = vhost.messages_unacknowledged ?? 0;
  const total = vhost.messages ?? 0;

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
          className="flex items-start gap-2 rounded-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Database
            className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0 overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="break-all">{vhost.name}</span>
              {vhost.protected_from_deletion && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="text-xs flex items-center gap-1 shrink-0"
                        aria-label={t("protectedFromDeletion")}
                      >
                        <Lock className="w-3 h-3" aria-hidden="true" />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("protectedFromDeletion")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {vhost.description && (
              <p className="text-xs text-muted-foreground font-normal mt-0.5 line-clamp-2 break-all">
                {vhost.description}
              </p>
            )}
          </div>
        </Link>
      </TableCell>
      <TableCell className="font-mono tabular-nums">
        {vhost.permissionCount ?? 0}
      </TableCell>
      <TableCell
        className={`font-mono tabular-nums ${ready > 0 ? "text-warning" : ""}`}
      >
        {ready.toLocaleString()}
      </TableCell>
      <TableCell
        className={`font-mono tabular-nums ${unacked > 0 ? "text-warning" : ""}`}
      >
        {unacked.toLocaleString()}
      </TableCell>
      <TableCell
        className={`font-mono tabular-nums ${total > 0 ? "text-warning" : ""}`}
      >
        {total.toLocaleString()}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {!isDefault && (
            <Button
              variant="ghost"
              size="icon"
              onClick={stopAnd(onDelete)}
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
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
