import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router";

import type { Edge, Node } from "@xyflow/react";

import { track } from "@/lib/analytics";
import { RabbitMQAlertSeverity } from "@/lib/api/alertTypes";
import { buildTopologyGraph } from "@/lib/topology/layout";

import type { LogEntry } from "@/components/scan/ScanLogStream";
import { ScanLogStream } from "@/components/scan/ScanLogStream";
import { ScanReveal } from "@/components/scan/ScanReveal";
import { ScanTopologyCanvas } from "@/components/scan/ScanTopologyCanvas";

import {
  useScanDiscoveryFindingsFetcher,
  useScanDiscoveryNotifSettings,
  useScanDiscoveryOverview,
  useScanDiscoveryTopology,
  useScanDiscoveryTrigger,
} from "@/hooks/queries/useScanDiscovery";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

type Phase = "connecting" | "topology" | "config" | "alerts" | "reveal";

const MAX_TOPOLOGY_NODES = 50;
const SCAN_TIMEOUT_MS = 12_000;
const TOPOLOGY_TIMEOUT_MS = 8_000;

interface LocationState {
  serverId?: string;
}

interface ScanFinding {
  id: string;
  ruleKey: string;
  severity: RabbitMQAlertSeverity;
  resourceType: string;
  resourceName: string;
  vhost?: string | null;
  detectedAt: string | Date;
  resolvedAt?: string | Date | null;
  isExplainDemoTarget?: boolean;
}

export default function ScanDiscovery() {
  const { t } = useTranslation("scan");
  const navigate = useNavigate();
  const { state } = useLocation() as { state: LocationState | null };
  const [searchParams] = useSearchParams();
  const { workspace } = useWorkspace();

  const defaultExplainFindingId = searchParams.get("findingId");

  const serverId = state?.serverId ?? "";

  const [phase, setPhase] = useState<Phase>("connecting");
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [activeText, setActiveText] = useState<string>("");
  const [visibleNodes, setVisibleNodes] = useState<Node[]>([]);
  const [visibleEdges, setVisibleEdges] = useState<Edge[]>([]);
  const [scanFindings, setScanFindings] = useState<ScanFinding[]>([]);
  const [isLimitedScan, setIsLimitedScan] = useState(false);

  const entryCounterRef = useRef(0);
  const makeEntry = useCallback(
    (text: string): LogEntry => ({
      id: String(++entryCounterRef.current),
      text,
      done: true,
    }),
    []
  );

  const phaseRef = useRef<Phase>("connecting");
  const topologyAnimRunning = useRef(false);
  const connectingAdvanced = useRef(false);
  const pendingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scanStartedAtRef = useRef<number | null>(null);
  // Timestamp when config phase begins — used to enforce a minimum visible dwell
  // so the "Analyse de la configuration..." step is never imperceptibly brief.
  const configPhaseStartRef = useRef<number | null>(null);
  const MIN_CONFIG_DWELL_MS = 800;
  // Stable refs so mutation callbacks never capture stale closures
  const tRef = useRef(t);
  tRef.current = t;
  const workspaceIdRef = useRef(workspace?.id ?? "");
  workspaceIdRef.current = workspace?.id ?? "";
  const serverIdRef = useRef(serverId);
  serverIdRef.current = serverId;
  // Guards setState/advanceTo calls inside async callbacks after unmount.
  // The effect body (not just the cleanup) resets the ref so React StrictMode's
  // simulate-unmount-remount cycle doesn't permanently strand it at false.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    // Reset one-shot guards so StrictMode's remount runs the full init path
    connectingAdvanced.current = false;
    topologyAnimRunning.current = false;
    return () => {
      mountedRef.current = false;
      pendingTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  const advanceTo = useCallback((next: Phase) => {
    if (!mountedRef.current) return;
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // Redirect if we land here without a server
  useEffect(() => {
    if (!serverId) navigate("/", { replace: true });
  }, [serverId, navigate]);

  // Queries — overview fires immediately; topology gated on phase
  const overview = useScanDiscoveryOverview(serverId);
  const topologyEnabled =
    phase === "topology" ||
    phase === "config" ||
    phase === "alerts" ||
    phase === "reveal";
  const topology = useScanDiscoveryTopology(serverId, topologyEnabled);
  const triggerScan = useScanDiscoveryTrigger();
  const fetchFindings = useScanDiscoveryFindingsFetcher();
  // Prefetch notification settings during config/alerts phases
  useScanDiscoveryNotifSettings(
    serverId,
    phase === "alerts" || phase === "reveal"
  );

  // ── Shared: fire config scan and handle result ─────────────────────────
  // Commits scan results to state and advances to the "alerts" phase,
  // respecting a minimum dwell in the config phase so it's always visible.
  const commitScanResult = useCallback(
    (findings: ScanFinding[]) => {
      const configEntry =
        findings.length === 0
          ? tRef.current("log.configClean")
          : tRef.current("log.configDone", { count: findings.length });

      setLogEntries((prev) => {
        const next = [...prev, makeEntry(configEntry)];
        findings.slice(0, 5).forEach((f) =>
          next.push(
            makeEntry(
              tRef.current("log.configFinding", {
                resourceType: f.resourceType,
                resourceName: f.resourceName,
              })
            )
          )
        );
        return next;
      });

      setActiveText(tRef.current("log.alertsActive"));

      // Ensure the config phase was visible for at least MIN_CONFIG_DWELL_MS
      const elapsed = Date.now() - (configPhaseStartRef.current ?? Date.now());
      const delay = Math.max(0, MIN_CONFIG_DWELL_MS - elapsed);

      const tid = setTimeout(() => {
        if (!mountedRef.current) return;
        advanceTo("alerts");
      }, delay);
      pendingTimersRef.current.push(tid);
    },
    // advanceTo and makeEntry are stable useCallback refs

    [advanceTo, makeEntry]
  );

  const fireScan = useCallback(() => {
    const wid = workspaceIdRef.current;
    const sid = serverIdRef.current;

    // Fail-fast: do nothing if either id isn't resolved yet. Synthesising
    // a "clean" reveal here would lie to the user — on a slow workspace
    // hydration path we'd skip the real scan entirely and land on a
    // false-positive success screen. Bail instead; the SCAN_TIMEOUT_MS
    // safety net (12 s) will eventually advance the flow, and if the
    // workspace truly never resolves the user sees no findings rather
    // than a manufactured one.
    if (!wid || !sid) {
      return;
    }

    triggerScan.mutate(
      { serverId: sid, workspaceId: wid },
      {
        // triggerScan returns upsert counts (`{ upserted, resolved }`) and
        // coverage — not the finding rows. Pull the persisted findings via
        // getFindings so the reveal screen has real data to display.
        onSuccess: async (result) => {
          if (!mountedRef.current) return;
          const cov = result.coverage as
            | { skipped?: unknown[] }
            | null
            | undefined;
          if ((cov?.skipped?.length ?? 0) > 0) setIsLimitedScan(true);

          let findings: ScanFinding[] = [];
          try {
            const findingsResult = await fetchFindings(sid, wid);
            if (!mountedRef.current) return;
            const validSeverities = new Set<string>(
              Object.values(RabbitMQAlertSeverity)
            );
            findings = findingsResult.findings.map((f) => ({
              id: f.id,
              ruleKey: f.ruleKey,
              severity: validSeverities.has(f.severity)
                ? (f.severity as RabbitMQAlertSeverity)
                : RabbitMQAlertSeverity.LOW,
              resourceType: f.resourceType,
              resourceName: f.resourceName,
              vhost: f.vhost,
              detectedAt: f.detectedAt,
              resolvedAt: f.resolvedAt,
              isExplainDemoTarget: f.isExplainDemoTarget,
            }));
          } catch {
            // Findings fetch failed — fall through with empty array so the
            // user still gets through the flow rather than stalling.
          }

          if (!mountedRef.current) return;
          setScanFindings(findings);
          commitScanResult(findings);
        },
        onError: () => {
          if (!mountedRef.current) return;
          track("scan_error", {
            server_id: serverIdRef.current,
            workspace_id: workspaceIdRef.current,
          });
          setScanFindings([]);
          commitScanResult([]);
        },
      }
    );
  }, [commitScanResult, fetchFindings, triggerScan]);

  // ── Phase: connecting ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "connecting" || connectingAdvanced.current) return;

    let advanceTimer: ReturnType<typeof setTimeout> | null = null;

    const doAdvance = () => {
      if (connectingAdvanced.current) return;
      connectingAdvanced.current = true;
      track("scan_started", {
        server_id: serverIdRef.current,
        workspace_id: workspaceIdRef.current,
      });
      scanStartedAtRef.current = Date.now();

      const serverName =
        (overview.data as { serverName?: string } | undefined)?.serverName ??
        serverId;
      setLogEntries([
        makeEntry(tRef.current("log.connecting", { serverName })),
        makeEntry(tRef.current("log.connected")),
      ]);
      setActiveText(tRef.current("log.topologyStart"));

      advanceTimer = setTimeout(() => advanceTo("topology"), 500);
    };

    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    if (overview.data || overview.isError) {
      doAdvance();
    } else {
      fallbackTimer = setTimeout(doAdvance, 2000);
    }

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (advanceTimer) clearTimeout(advanceTimer);
    };
  }, [phase, overview.data, overview.isError, serverId, advanceTo, makeEntry]);

  // ── Phase: topology ────────────────────────────────────────────────────
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const ready =
      phase === "topology" &&
      !topologyAnimRunning.current &&
      Boolean(topology.data);

    if (ready) {
      topologyAnimRunning.current = true;

      const { exchanges, queues, bindings, consumers } = topology.data as {
        exchanges: Parameters<typeof buildTopologyGraph>[0];
        queues: Parameters<typeof buildTopologyGraph>[1];
        bindings: Parameters<typeof buildTopologyGraph>[2];
        consumers: Parameters<typeof buildTopologyGraph>[3];
      };

      // Show `amq.*` defaults only when the cluster has no custom exchanges —
      // otherwise they dilute the topology with noise the user doesn't care
      // about. For a brand-new RabbitMQ they're the only thing to render,
      // so the canvas wouldn't be empty.
      const hasCustomExchanges = exchanges.some(
        (e) => e.name !== "" && !e.name.startsWith("amq.")
      );
      const graph = buildTopologyGraph(exchanges, queues, bindings, consumers, {
        includeDefaultExchanges: !hasCustomExchanges,
      });
      const allNodes = graph.nodes.slice(0, MAX_TOPOLOGY_NODES);
      const exchangeNodes = allNodes.filter((n) => n.type === "exchangeNode");
      const queueNodes = allNodes.filter((n) => n.type === "queueNode");

      // Stagger exchanges first, then queues — canvas starts 400ms after first log entry.
      // Initialise cursor to `canvasDelay` so when there are no exchanges the
      // queue stagger still respects the intended base delay (else queueStart
      // would collapse to 120ms and rush the topology animation).
      const canvasDelay = 400;
      let cursor = canvasDelay;
      exchangeNodes.forEach((node, i) => {
        const t = setTimeout(
          () => {
            if (!mountedRef.current) return;
            setVisibleNodes((prev) => [...prev, node]);
          },
          canvasDelay + i * 80
        );
        timers.push(t);
        cursor = canvasDelay + i * 80;
      });

      const queueStart = cursor + 120;
      queueNodes.forEach((node, i) => {
        const t = setTimeout(
          () => {
            if (!mountedRef.current) return;
            setVisibleNodes((prev) => [...prev, node]);
          },
          queueStart + i * 60
        );
        timers.push(t);
      });

      const edgesAt = queueStart + queueNodes.length * 60 + 200;

      const edgesTimer = setTimeout(() => {
        if (!mountedRef.current) return;
        setVisibleEdges(graph.edges);
        const topologyLogKey =
          allNodes.length === 0
            ? tRef.current("log.topologyEmpty")
            : tRef.current("log.topologyDone", {
                exchanges: exchanges.length,
                queues: queues.length,
                bindings: bindings.length,
              });
        setLogEntries((prev) => [...prev, makeEntry(topologyLogKey)]);
        setActiveText(tRef.current("log.configStart"));
        configPhaseStartRef.current = Date.now();
        advanceTo("config");
        fireScan();
      }, edgesAt);
      timers.push(edgesTimer);
    }

    return () => {
      for (const t of timers) clearTimeout(t);
    };
    // intentional one-shot effect — fires once when topology data arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, topology.data]);

  // ── Phase: topology — fetch timeout ───────────────────────────────────
  useEffect(() => {
    if (phase !== "topology") return;
    const tid = setTimeout(() => {
      if (phaseRef.current !== "topology") return;
      topologyAnimRunning.current = true;
      setLogEntries((prev) => [
        ...prev,
        makeEntry(tRef.current("log.topologyUnavailable")),
      ]);
      setActiveText(tRef.current("log.configStart"));
      configPhaseStartRef.current = Date.now();
      advanceTo("config");
      fireScan();
    }, TOPOLOGY_TIMEOUT_MS);
    return () => clearTimeout(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Phase: config — scan timeout safety net ───────────────────────────
  useEffect(() => {
    if (phase !== "config") return;
    const tid = setTimeout(() => {
      if (phaseRef.current !== "config") return;
      advanceTo("reveal");
    }, SCAN_TIMEOUT_MS);
    return () => clearTimeout(tid);
  }, [phase, advanceTo]);

  // ── Phase: alerts — guaranteed dwell before reveal ────────────────────
  // commitScanResult advances here; we stay for 1.5 s so the user can read
  // the "Règles d'alertes actives" entry before the reveal transition.
  useEffect(() => {
    if (phase !== "alerts") return;
    const t1 = setTimeout(() => {
      if (!mountedRef.current) return;
      setLogEntries((prev) => [
        ...prev,
        makeEntry(tRef.current("log.alertsActive")),
      ]);
      setActiveText(tRef.current("log.preparingReveal"));

      const t2 = setTimeout(() => {
        if (!mountedRef.current) return;
        setActiveText("");
        advanceTo("reveal");
      }, 2200);
      pendingTimersRef.current.push(t2);
    }, 2500);
    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Phase: reveal — telemetry ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== "reveal") return;
    track("scan_completed", {
      server_id: serverIdRef.current,
      workspace_id: workspaceIdRef.current,
      findings_count: scanFindings.length,
      is_limited_scan: isLimitedScan,
      topology_mapped: visibleNodes.length > 0,
      duration_ms: scanStartedAtRef.current
        ? Date.now() - scanStartedAtRef.current
        : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!serverId) return null;

  const overviewData = overview.data as
    | { serverName?: string; nodeCount?: number; rabbitmqVersion?: string }
    | undefined;
  const nodeCount = overviewData?.nodeCount ?? 1;
  const version = overviewData?.rabbitmqVersion;

  const showCanvas = visibleNodes.length > 0 && phase !== "reveal";
  const isDone = phase === "reveal";

  // Cluster fingerprint counts — derived from the topology snapshot we already
  // fetched for the canvas animation. Vhost count is reconstructed from the
  // union of vhosts on queues + exchanges (the API doesn't return it directly).
  const topologyData = topology.data as
    | {
        exchanges?: { vhost?: string | null }[];
        queues?: { vhost?: string | null }[];
        bindings?: unknown[];
      }
    | undefined;
  const exchangeCount = topologyData?.exchanges?.length;
  const queueCount = topologyData?.queues?.length;
  const bindingCount = topologyData?.bindings?.length;
  const vhostCount = (() => {
    if (!topologyData?.queues && !topologyData?.exchanges) return undefined;
    const set = new Set<string>();
    topologyData.queues?.forEach((q) => q.vhost && set.add(q.vhost));
    topologyData.exchanges?.forEach((e) => e.vhost && set.add(e.vhost));
    return set.size || undefined;
  })();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border/60 px-6 py-3 flex items-center gap-3">
        <span
          className={`h-2 w-2 rounded-full bg-green-500 ${isDone ? "" : "animate-pulse"}`}
        />
        <span className="text-sm font-medium text-muted-foreground">
          {t(`phase.${phase}`)}
        </span>
      </div>

      {isDone ? (
        <div className="flex-1 flex items-start justify-center py-16 overflow-y-auto">
          <ScanReveal
            nodeCount={nodeCount}
            version={version}
            findings={scanFindings}
            isLimitedScan={isLimitedScan}
            exchangeCount={exchangeCount}
            queueCount={queueCount}
            bindingCount={bindingCount}
            vhostCount={vhostCount}
            defaultExplainFindingId={defaultExplainFindingId}
          />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] min-h-0">
          {/* Log panel — fixed height on mobile so canvas is visible below */}
          <div className="border-r border-border/60 p-6 overflow-y-auto h-[45vh] lg:h-auto">
            <ScanLogStream entries={logEntries} activeText={activeText} />
          </div>

          {/* Topology canvas or placeholder */}
          <div className="relative p-4 overflow-hidden h-[55vh] lg:h-auto">
            {showCanvas ? (
              <ScanTopologyCanvas nodes={visibleNodes} edges={visibleEdges} />
            ) : (
              <div
                className="h-full flex flex-col items-center justify-center gap-3"
                role="status"
                aria-label={activeText || t("log.topologyStart")}
              >
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse"
                      style={{ animationDelay: `${i * 200}ms` }}
                    />
                  ))}
                </div>
                {activeText && (
                  <p className="text-xs text-muted-foreground">{activeText}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
