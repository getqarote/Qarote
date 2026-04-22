import { useTranslation } from "react-i18next";

import { Server, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PixelChevronRight } from "@/components/ui/pixel-chevron-right";

import type { ChannelListItem } from "./types";

import { getStateBadgeClass } from "../ConnectionsList/connectionStateUi";

interface ChannelRowProps {
  channel: ChannelListItem;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChannelRow({ channel, isOpen, onOpenChange }: ChannelRowProps) {
  const { t } = useTranslation("channels");

  const stateTooltip = (() => {
    const s = channel.state?.toLowerCase();
    if (s === "idle") return t("stateIdleTooltip");
    if (s === "flow") return t("stateFlowTooltip");
    if (s === "blocked") return t("stateBlockedTooltip");
    return undefined;
  })();

  const deliverRate = channel.message_stats?.deliver_details?.rate ?? 0;
  const ackRate = channel.message_stats?.ack_details?.rate ?? 0;
  const unacked = channel.messages_unacknowledged ?? 0;

  const unackedTone =
    unacked >= 1000
      ? "text-destructive"
      : unacked >= 100
        ? "text-warning"
        : "text-foreground";

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center px-4 py-3 hover:bg-accent transition-colors text-left"
          title={t("channelLabel", {
            number: channel.number,
            connection: channel.connection_details.name,
          })}
        >
          {/* Left: identity */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Badge
              variant="outline"
              className="font-mono tabular-nums text-xs shrink-0"
            >
              #{channel.number}
            </Badge>
            <span
              className="font-medium truncate font-mono text-sm"
              title={channel.connection_details.name}
            >
              {channel.connection_details.name}
            </span>
            {channel.state && (
              <Badge
                className={`shrink-0 ${getStateBadgeClass(channel.state)}`}
                title={stateTooltip}
              >
                {channel.state}
              </Badge>
            )}
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Users className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{channel.user}</span>
            </span>
            <span className="hidden xl:inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Server className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-32">{channel.node}</span>
            </span>
          </div>

          {/* Right: unacked count aligned to column header */}
          <div className="flex items-center gap-0 shrink-0">
            <span
              className={`w-20 text-right font-mono tabular-nums text-sm ${unackedTone}`}
            >
              {unacked.toLocaleString()}
            </span>
            <div className="w-8 flex justify-center">
              <PixelChevronRight
                className={`h-3 text-muted-foreground transition-transform duration-150 shrink-0 ${
                  isOpen ? "rotate-90" : ""
                }`}
                aria-hidden="true"
              />
            </div>
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <DetailItem label={t("vhost")} value={channel.vhost} mono />
            <DetailItem label={t("user")} value={channel.user} />
            <DetailItem label={t("node")} value={channel.node} mono />
            <DetailItem
              label={t("peer")}
              value={`${channel.connection_details.peer_host}:${channel.connection_details.peer_port}`}
              mono
            />
            <DetailItem
              label={t("consumers")}
              value={(channel.consumer_count ?? 0).toLocaleString()}
              mono
            />
            {(channel.prefetch_count ?? 0) > 0 && (
              <DetailItem
                label={t("prefetch")}
                value={channel.prefetch_count.toLocaleString()}
                mono
              />
            )}
            {unacked > 0 && (
              <DetailItem
                label={t("unacknowledged")}
                value={
                  <span className={unackedTone}>
                    {unacked.toLocaleString()}
                  </span>
                }
                mono
              />
            )}
            {deliverRate > 0 && (
              <DetailItem
                label={t("deliverRate")}
                value={`${deliverRate.toFixed(1)}/s`}
                mono
              />
            )}
            {ackRate > 0 && (
              <DetailItem
                label={t("ackRate")}
                value={`${ackRate.toFixed(1)}/s`}
                mono
              />
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`text-xs font-medium text-foreground ${mono ? "font-mono tabular-nums" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
