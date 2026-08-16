/**
 * Cockpit "Cluster" drawer — read-only consolidation of the dissolved
 * Connections / Channels / Nodes views (agent-first nav drops them as
 * destinations). Summary counts + short lists, plus a note that the same
 * objects are available to the user's agent via MCP tools.
 *
 * Read-only verification surface: no actions, just a glance at the low-level
 * RabbitMQ objects on demand from the cockpit.
 */

import { Trans, useTranslation } from "react-i18next";

import { Network } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { useServerContext } from "@/contexts/ServerContext";

import {
  useChannels,
  useConnections,
  useNodes,
} from "@/hooks/queries/useRabbitMQ";

// Minimal read shapes for the summary — cast defensively so the drawer
// doesn't couple to the full tRPC output types (it only displays a glance).
// run_queue is the Erlang scheduler run-queue length: the only honest
// per-node load signal the management API exposes (there is no CPU%), so we
// surface it labelled as such rather than faking a percentage.
type NodeRow = { name: string; running?: boolean; run_queue?: number };
type ConnRow = { name: string; state?: string; user?: string };
type ChanRow = { messages_unacknowledged?: number; prefetch_count?: number };

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${ok ? "bg-green-500" : "bg-warning"}`}
      aria-hidden="true"
    />
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

export function ClusterDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("cockpit");
  const { selectedServerId } = useServerContext();

  const { data: nodesData } = useNodes(selectedServerId);
  const { data: connData } = useConnections(selectedServerId);
  const { data: chanData } = useChannels(selectedServerId);

  const nodes = (nodesData?.nodes ?? []) as unknown as NodeRow[];
  const connections = (connData?.connections ?? []) as unknown as ConnRow[];
  const channels = (chanData?.channels ?? []) as unknown as ChanRow[];

  // Channels render as a 3-stat summary, not a list. Derive each from the
  // real channel rows; "—" where the field isn't reported rather than 0.
  const channelCount = channels.length;
  const unackedValues = channels
    .map((c) => c.messages_unacknowledged)
    .filter((v): v is number => typeof v === "number");
  const prefetchValues = channels
    .map((c) => c.prefetch_count)
    .filter((v): v is number => typeof v === "number");
  const totalUnacked =
    unackedValues.length > 0
      ? unackedValues.reduce((sum, v) => sum + v, 0)
      : null;
  const avgPrefetch =
    prefetchValues.length > 0
      ? Math.round(
          prefetchValues.reduce((sum, v) => sum + v, 0) / prefetchValues.length
        )
      : null;

  const emDash = "—";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-md"
        aria-label={t("cluster.title")}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Network
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            {t("cluster.title")}
          </SheetTitle>
          <SheetDescription>{t("cluster.description")}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* 1 — Nodes: status dot + mono name + right-aligned run-queue */}
          <section className="space-y-2">
            <SectionHeader>
              {t("cluster.nodes", { count: nodes.length })}
            </SectionHeader>
            {nodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("cluster.none")}
              </p>
            ) : (
              <ul className="space-y-px">
                {nodes.map((n) => (
                  <li
                    key={n.name}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <StatusDot ok={n.running !== false} />
                    <span className="truncate font-mono">{n.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {typeof n.run_queue === "number"
                        ? t("cluster.nodeRunQueue", { value: n.run_queue })
                        : emDash}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 2 — Connections: semantic dot + mono address + right-aligned user */}
          <section className="space-y-2">
            <SectionHeader>
              {t("cluster.connections", { count: connections.length })}
            </SectionHeader>
            {connections.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("cluster.none")}
              </p>
            ) : (
              <ul className="space-y-px">
                {connections.map((c) => {
                  // running = healthy; blocked/blocking = back-pressured.
                  const running =
                    c.state !== "blocked" && c.state !== "blocking";
                  return (
                    <li
                      key={c.name}
                      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <StatusDot ok={running} />
                      <span className="truncate font-mono">{c.name}</span>
                      {c.user && (
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {c.user}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* 3 — Channels: 3 key/value stats, not a list */}
          <section className="space-y-2">
            <SectionHeader>
              {t("cluster.channels", { count: channelCount })}
            </SectionHeader>
            <dl className="text-sm">
              <div className="flex items-center justify-between border-b border-border py-2">
                <dt className="text-muted-foreground">
                  {t("cluster.channelOpen")}
                </dt>
                <dd className="font-mono">{channelCount}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-border py-2">
                <dt className="text-muted-foreground">
                  {t("cluster.channelUnacked")}
                </dt>
                <dd className="font-mono">
                  {totalUnacked !== null
                    ? totalUnacked.toLocaleString()
                    : emDash}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-muted-foreground">
                  {t("cluster.channelPrefetchAvg")}
                </dt>
                <dd className="font-mono">
                  {avgPrefetch !== null ? avgPrefetch : emDash}
                </dd>
              </div>
            </dl>
          </section>

          {/* 4 — Agent-first note: tool names stay literal, carrot accent */}
          <p className="font-mono text-xs text-muted-foreground">
            <Trans
              t={t}
              i18nKey="cluster.agentNoteTools"
              components={{
                listServers: <code className="text-primary" />,
                getOverview: <code className="text-primary" />,
              }}
            />
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
