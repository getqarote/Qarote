/**
 * Cockpit "Cluster" drawer — read-only consolidation of the dissolved
 * Connections / Channels / Nodes views (agent-first nav drops them as
 * destinations). Summary counts + short lists, plus a note that the same
 * objects are available to the user's agent via MCP tools.
 */

import { useTranslation } from "react-i18next";

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
type NodeRow = { name: string; running?: boolean };
type ConnRow = { name: string; state?: string; user?: string };

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${ok ? "bg-green-500" : "bg-warning"}`}
      aria-hidden="true"
    />
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
  const channelCount = (chanData?.channels ?? []).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("cluster.title")}</SheetTitle>
          <SheetDescription>{t("cluster.description")}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("cluster.nodes", { count: nodes.length })}
            </h3>
            {nodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("cluster.none")}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {nodes.map((n) => (
                  <li key={n.name} className="flex items-center gap-2 text-sm">
                    <StatusDot ok={n.running !== false} />
                    <span className="font-mono truncate">{n.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("cluster.connections", { count: connections.length })}
            </h3>
            {connections.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("cluster.none")}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {connections.slice(0, 8).map((c) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <StatusDot ok={c.state !== "blocked"} />
                      <span className="font-mono truncate">{c.name}</span>
                    </span>
                    {c.user && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {c.user}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("cluster.channels", { count: channelCount })}
            </h3>
          </section>

          <p className="rounded-md bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
            {t("cluster.agentNote")}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
