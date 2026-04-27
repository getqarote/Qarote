import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Server, Users, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PixelChevronRight } from "@/components/ui/pixel-chevron-right";

import {
  formatBytes,
  getConnectionIcon,
  getStateBadgeClass,
  getStateIconColorClass,
} from "./connectionStateUi";
import type { ChannelDetail, ConnectionListItem } from "./types";

interface ConnectionRowProps {
  connection: ConnectionListItem;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * A single connection row. The collapsed view shows the connection
 * identity (icon, name, state badge, user, node) on the left and
 * channels + bytes sent on the right — aligned to the sort headers.
 *
 * The expand chevron rotates 90° when open. The expanded panel shows
 * only data NOT already visible in the collapsed header: protocol,
 * vhost, packets, bytes received, and channel details.
 */
export function ConnectionRow({
  connection,
  isOpen,
  onOpenChange,
}: ConnectionRowProps) {
  const { t } = useTranslation("connections");

  const stateTooltip = (() => {
    const s = connection.state?.toLowerCase();
    if (s === "blocked") return t("stateBlockedTooltip");
    if (s === "flow") return t("stateFlowTooltip");
    if (s === "closing") return t("stateClosingTooltip");
    return undefined;
  })();

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center px-4 py-3 hover:bg-accent transition-colors text-left"
        >
          {/* Left: identity */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className={getStateIconColorClass(connection.state)}>
              {getConnectionIcon(connection.state, connection.protocol)}
            </span>
            <span
              className="font-medium truncate font-mono text-sm"
              title={connection.name}
            >
              {connection.name}
            </span>
            {connection.state && (
              <Badge
                className={getStateBadgeClass(connection.state)}
                title={stateTooltip}
              >
                {connection.state}
              </Badge>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{connection.user}</span>
            </span>
            <span className="hidden xl:inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Server className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{connection.node}</span>
            </span>
          </div>

          {/* Right: key metrics aligned to sort headers */}
          <div className="flex items-center gap-0">
            <span className="w-28 text-right font-mono tabular-nums text-sm text-foreground">
              {(connection.channelCount ?? 0).toLocaleString()}
            </span>
            <span className="w-28 text-right font-mono tabular-nums text-sm text-foreground">
              {formatBytes(connection.send_oct ?? 0)}
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
        <ConnectionDetailsPanel connection={connection} />
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Expanded detail panel — flat section strip (no nested cards).
 *
 * Only shows data NOT already in the collapsed header:
 *   - Protocol, vhost (metadata the header omits for density)
 *   - Bytes received, packets in/out (traffic the header omits)
 *   - Channel list (expandable sub-detail)
 *
 * Bytes sent and channel count are NOT repeated here.
 */
function ConnectionDetailsPanel({
  connection,
}: {
  connection: ConnectionListItem;
}) {
  const { t } = useTranslation("connections");

  return (
    <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
      {/* Inline metrics strip */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <DetailItem label={t("protocol")} value={connection.protocol} />
        <DetailItem label={t("virtualHost")} value={connection.vhost} mono />
        <DetailItem label={t("user")} value={connection.user} />
        <DetailItem label={t("node")} value={connection.node} mono />
        <DetailItem
          label={t("bytesReceived")}
          value={formatBytes(connection.recv_oct ?? 0)}
          mono
        />
        <DetailItem
          label={t("packetsReceived")}
          value={(connection.recv_cnt ?? 0).toLocaleString()}
          mono
        />
        <DetailItem
          label={t("packetsSent")}
          value={(connection.send_cnt ?? 0).toLocaleString()}
          mono
        />
      </div>

      {/* Channel list */}
      {connection.channelDetails && connection.channelDetails.length > 0 && (
        <ChannelsList channels={connection.channelDetails} />
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
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

function ChannelsList({ channels }: { channels: ChannelDetail[] }) {
  const { t } = useTranslation("connections");

  return (
    <div>
      <h4 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
        <Zap className="h-3 w-3" aria-hidden="true" />
        {t("activeChannels")} ({channels.length})
      </h4>
      <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
        {channels.map((channel) => (
          <ChannelRow key={channel.name} channel={channel} />
        ))}
      </div>
    </div>
  );
}

function ChannelRow({ channel }: { channel: ChannelDetail }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-xs">
      <Badge variant="outline" className="font-mono text-xs shrink-0">
        #{channel.number}
      </Badge>
      <span
        className="font-mono text-xs truncate flex-1 min-w-0"
        title={channel.name}
      >
        {channel.name}
      </span>
      {channel.state && (
        <Badge className={getStateBadgeClass(channel.state)}>
          {channel.state}
        </Badge>
      )}
      <span className="text-muted-foreground shrink-0">{channel.vhost}</span>
    </div>
  );
}
