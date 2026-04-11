import { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Lock, Trash2 } from "lucide-react";

import type { VHost } from "@/lib/api/vhostTypes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type VHostListItem = VHost & { permissionCount?: number };

interface VHostsTableRowProps {
  vhost: VHostListItem;
  href: string;
  onDelete: () => void;
  unackedWarnThreshold?: number;
}

/**
 * A single vhost row matching the QueueTable pattern: flex layout with
 * fixed-width right-aligned metric columns, mono font for identifiers,
 * hover:bg-accent for row hover.
 *
 * Rows link to detail pages (no collapsible). The entire row is wrapped
 * in a `<Link>` so keyboard users can Tab into it and screen readers
 * announce it as a link. The delete button uses stopPropagation to
 * prevent navigation.
 */
export function VHostsTableRow({
  vhost,
  href,
  onDelete,
  unackedWarnThreshold = 100,
}: VHostsTableRowProps) {
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
    <Link
      to={href}
      className="flex items-center px-4 py-3 hover:bg-accent transition-colors text-left group"
    >
      {/* Left: identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-medium font-mono text-sm truncate"
            title={vhost.name}
          >
            {vhost.name}
          </span>
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
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 break-all">
            {vhost.description}
          </p>
        )}
      </div>

      {/* Right: metrics aligned to sort headers */}
      <div className="flex items-center gap-0">
        <span className="w-24 text-right text-sm text-muted-foreground">
          {t("permissionsCount", { count: vhost.permissionCount ?? 0 })}
        </span>
        <span
          className={`w-28 text-right font-mono tabular-nums text-sm ${
            ready > 0 ? "text-warning font-semibold" : "text-foreground"
          }`}
        >
          {ready.toLocaleString()}
        </span>
        <span
          className={`w-28 text-right font-mono tabular-nums text-sm ${
            unacked > unackedWarnThreshold
              ? "text-warning font-semibold"
              : "text-foreground"
          }`}
        >
          {unacked.toLocaleString()}
        </span>
        <span
          className={`w-28 text-right font-mono tabular-nums text-sm ${
            total > 0 ? "text-warning font-semibold" : "text-foreground"
          }`}
        >
          {total.toLocaleString()}
        </span>
        <div className="w-10 flex justify-end">
          {!isDefault && (
            <Button
              variant="ghost"
              size="icon"
              onClick={stopAnd(onDelete)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={t("deleteVhost") + ": " + vhost.name}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
}
