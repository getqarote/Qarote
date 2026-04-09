import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { ArrowUpDown, Server, Users, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
 * A single connection in the list, rendered as a `Collapsible` Radix
 * primitive so the whole header row is keyboard-operable via Enter
 * and Space. The trigger is a native `<button>` (via `asChild`) —
 * not a `<div>` with `cursor-pointer` — so screen readers announce
 * it as interactive and the focus ring works out of the box.
 *
 * The expanded pane shows:
 *   - A two-column details grid (connection metadata + traffic stats)
 *   - The list of active channels for this connection, if any
 */
export function ConnectionRow({
  connection,
  isOpen,
  onOpenChange,
}: ConnectionRowProps) {
  const { t } = useTranslation("connections");

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <div className="border rounded-lg">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors text-left"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className={getStateIconColorClass(connection.state)}>
                  {getConnectionIcon(connection.state, connection.protocol)}
                </span>
                <span
                  className="font-medium truncate max-w-[300px] font-mono text-sm"
                  title={connection.name}
                >
                  {connection.name}
                </span>
              </div>
              {connection.state && (
                <Badge className={getStateBadgeClass(connection.state)}>
                  {connection.state}
                </Badge>
              )}
              <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-0">
                <Users className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{connection.user}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-0">
                <Server className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{connection.node}</span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <HeaderMetric
                label={t("totalChannels")}
                value={connection.channelCount.toLocaleString()}
              />
              <HeaderMetric
                label={t("bytesReceived")}
                value={formatBytes(connection.recv_oct ?? 0)}
              />
              <HeaderMetric
                label={t("bytesSent")}
                value={formatBytes(connection.send_oct ?? 0)}
              />
              <ArrowUpDown
                className="h-4 w-4 text-muted-foreground shrink-0"
                aria-hidden="true"
              />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <ConnectionDetailsPanel connection={connection} />
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function HeaderMetric({ label, value }: { label: ReactNode; value: string }) {
  return (
    <div className="text-center">
      <div className="font-mono tabular-nums font-medium text-foreground">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ConnectionDetailsPanel({
  connection,
}: {
  connection: ConnectionListItem;
}) {
  const { t } = useTranslation("connections");

  return (
    <div className="border-t p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection metadata */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">
            {t("connectionDetails")}
          </h4>
          <dl className="space-y-1 text-sm">
            <DetailRow label={t("protocol")} value={connection.protocol} />
            <DetailRow label={t("virtualHost")} value={connection.vhost} mono />
            <DetailRow
              label={t("packetsReceived")}
              value={(connection.recv_cnt ?? 0).toLocaleString()}
              mono
            />
            <DetailRow
              label={t("packetsSent")}
              value={(connection.send_cnt ?? 0).toLocaleString()}
              mono
            />
          </dl>
        </div>

        {/* Traffic stats */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">
            {t("trafficStatistics")}
          </h4>
          <dl className="space-y-1 text-sm">
            <DetailRow
              label={t("bytesReceived")}
              value={formatBytes(connection.recv_oct ?? 0)}
              mono
            />
            <DetailRow
              label={t("bytesSent")}
              value={formatBytes(connection.send_oct ?? 0)}
              mono
            />
            <DetailRow
              label={t("activeChannels")}
              value={connection.channelCount.toLocaleString()}
              mono
            />
          </dl>
        </div>
      </div>

      {connection.channelDetails && connection.channelDetails.length > 0 && (
        <ChannelsList channels={connection.channelDetails} />
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-muted-foreground shrink-0">{label}:</dt>
      <dd
        className={`min-w-0 truncate text-foreground ${mono ? "font-mono tabular-nums text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function ChannelsList({ channels }: { channels: ChannelDetail[] }) {
  const { t } = useTranslation("connections");

  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Zap className="h-4 w-4" aria-hidden="true" />
        {t("activeChannels")} ({channels.length})
      </h4>
      <div className="grid gap-3">
        {channels.map((channel) => (
          <ChannelCard key={channel.name} channel={channel} />
        ))}
      </div>
    </div>
  );
}

function ChannelCard({ channel }: { channel: ChannelDetail }) {
  const { t } = useTranslation("connections");
  const peerHost = channel.connection_details?.peer_host;
  const peerPort = channel.connection_details?.peer_port;
  const peer = peerHost && peerPort ? `${peerHost}:${peerPort}` : undefined;

  return (
    <div className="border rounded-lg p-3 bg-muted/40">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <Badge variant="outline" className="font-mono text-xs shrink-0">
            #{channel.number}
          </Badge>
          <span
            className="font-medium text-sm font-mono truncate"
            title={channel.name}
          >
            {channel.name}
          </span>
          {channel.state && (
            <Badge className={getStateBadgeClass(channel.state)}>
              {channel.state}
            </Badge>
          )}
        </div>
        {peer && (
          <div className="text-xs text-muted-foreground font-mono shrink-0">
            {peer}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 text-xs">
        <ChannelField label={t("user")} value={channel.user} />
        <ChannelField label={t("vhost")} value={channel.vhost} mono />
        <ChannelField label={t("node")} value={channel.node} mono />
      </div>
    </div>
  );
}

function ChannelField({
  label,
  value,
  mono = false,
}: {
  label: ReactNode;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <span className="text-muted-foreground">{label}:</span>
      <div
        className={`font-medium truncate ${mono ? "font-mono" : ""}`}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
