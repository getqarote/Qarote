import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { ArrowRight, Inbox, Network } from "lucide-react";

import {
  type ExchangeNodeData,
  type QueueNodeData,
  queueTone,
} from "@/lib/topology/layout";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface TopologyBinding {
  source: string;
  destination: string;
  destination_type: string;
  routing_key: string;
  vhost: string;
}

export type PickedNode =
  | { kind: "queue"; data: QueueNodeData }
  | { kind: "exchange"; data: ExchangeNodeData };

interface NodeDetailProps {
  picked: PickedNode | null;
  bindings: TopologyBinding[];
  onClose: () => void;
}

function Kv({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono", tone && "text-destructive")}>
        {children}
      </span>
    </div>
  );
}

function MiniRow({ name, routingKey }: { name: string; routingKey: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border py-2 text-sm last:border-b-0">
      <Network
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate font-mono text-xs">{name}</span>
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
        {routingKey || "—"}
      </span>
    </div>
  );
}

/**
 * Click-a-node drill-down for the Topology graph — the in-place replacement for
 * the old object-list "Browse". Shows live state + bindings for a queue or
 * exchange and links an incident queue back to the cockpit diagnosis.
 */
export function NodeDetail({ picked, bindings, onClose }: NodeDetailProps) {
  const { t } = useTranslation("topology");
  const navigate = useNavigate();

  const name = picked?.data.label ?? "";

  return (
    <Sheet open={!!picked} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {picked?.kind === "queue" ? (
              <Inbox className="h-[18px] w-auto shrink-0" aria-hidden />
            ) : (
              <Network className="h-[18px] w-auto shrink-0" aria-hidden />
            )}
            <span className="truncate font-mono text-base">{name}</span>
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("drawer.description", { name })}
          </SheetDescription>
        </SheetHeader>

        {picked?.kind === "queue" && (
          <QueueBody
            data={picked.data}
            bindings={bindings}
            onInspect={() =>
              navigate(`/queues/${encodeURIComponent(picked.data.label)}`)
            }
            onCockpit={() => navigate("/")}
            t={t}
          />
        )}
        {picked?.kind === "exchange" && (
          <ExchangeBody
            data={picked.data}
            bindings={bindings}
            onInspect={() =>
              navigate(`/exchanges/${encodeURIComponent(picked.data.label)}`)
            }
            t={t}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function QueueBody({
  data,
  bindings,
  onInspect,
  onCockpit,
  t,
}: {
  data: QueueNodeData;
  bindings: TopologyBinding[];
  onInspect: () => void;
  onCockpit: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const tone = queueTone(data);
  const incident = tone === "red";
  const incoming = bindings.filter(
    (b) =>
      b.destination_type === "queue" &&
      b.destination === data.label &&
      b.vhost === data.vhost
  );

  return (
    <div className="flex-1 space-y-5 overflow-y-auto py-4">
      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("drawer.state")}
        </h3>
        <div className="divide-y divide-border">
          <Kv label={t("drawer.depth")} tone={incident}>
            {data.messages.toLocaleString()}
            {incident ? " ↑" : ""}
          </Kv>
          <Kv label={t("drawer.consumers")} tone={data.consumerCount === 0}>
            {data.consumerCount}
          </Kv>
          <Kv label={t("drawer.ready")}>
            {data.messagesReady.toLocaleString()}
          </Kv>
          <Kv label={t("drawer.unacked")}>
            {data.messagesUnacknowledged.toLocaleString()}
          </Kv>
          <Kv label={t("drawer.queueType")}>{data.queueType}</Kv>
        </div>
      </section>

      {incident && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-foreground">
          <span className="font-medium text-destructive">
            {t("drawer.incidentTitle")}
          </span>{" "}
          {t("drawer.incidentBody", { count: data.messages })}{" "}
          <button
            type="button"
            onClick={onCockpit}
            className="font-medium text-primary hover:underline"
          >
            {t("drawer.openInCockpit")} →
          </button>
        </div>
      )}

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("drawer.bindingsIn")}
        </h3>
        {incoming.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            {t("drawer.noBindings")}
          </p>
        ) : (
          <div>
            {incoming.map((b, i) => (
              <MiniRow key={i} name={b.source} routingKey={b.routing_key} />
            ))}
          </div>
        )}
      </section>

      <Button variant="outline" className="w-full" onClick={onInspect}>
        {t("drawer.inspect")}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}

function ExchangeBody({
  data,
  bindings,
  onInspect,
  t,
}: {
  data: ExchangeNodeData;
  bindings: TopologyBinding[];
  onInspect: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const outgoing = bindings.filter(
    (b) => b.source === data.label && b.vhost === data.vhost
  );

  return (
    <div className="flex-1 space-y-5 overflow-y-auto py-4">
      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("drawer.exchange")}
        </h3>
        <div className="divide-y divide-border">
          <Kv label={t("drawer.exchangeType")}>{data.exchangeType}</Kv>
          <Kv label={t("drawer.bindings")}>{outgoing.length}</Kv>
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("drawer.bindingsOut")}
        </h3>
        {outgoing.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            {t("drawer.noBindings")}
          </p>
        ) : (
          <div>
            {outgoing.map((b, i) => (
              <MiniRow
                key={i}
                name={b.destination}
                routingKey={b.routing_key}
              />
            ))}
          </div>
        )}
      </section>

      <Button variant="outline" className="w-full" onClick={onInspect}>
        {t("drawer.inspect")}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
