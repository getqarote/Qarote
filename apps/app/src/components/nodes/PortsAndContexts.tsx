import { useTranslation } from "react-i18next";

import { Shield, ShieldOff } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

interface Listener {
  node: string;
  protocol: string;
  ip_address: string;
  port: number;
}

interface Context {
  node: string;
  description: string;
  path: string;
  ip?: string;
  port: string;
  protocol?: string;
  ssl_opts: unknown[];
}

interface PortsAndContextsProps {
  listeners: Listener[];
  contexts: Context[];
  isLoading: boolean;
  fetchFailed?: boolean;
}

export const PortsAndContexts = ({
  listeners,
  contexts,
  isLoading,
  fetchFailed = false,
}: PortsAndContextsProps) => {
  const { t } = useTranslation("nodes");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-muted/30">
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="divide-y divide-border">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center px-4 py-2.5 gap-8">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && fetchFailed) {
    return (
      <p className="text-xs text-muted-foreground italic">
        {t("ports.fetchFailed")}
      </p>
    );
  }

  if (listeners.length === 0 && contexts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {listeners.length > 0 && (
        <div
          className="border border-border rounded-lg overflow-hidden"
          role="table"
          aria-label={t("ports.listeningPorts")}
        >
          {/* Section header — presentational */}
          <div className="flex items-center px-4 py-2 border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="flex-1">{t("ports.listeningPorts")}</span>
          </div>
          {/* Column label row */}
          <div role="rowgroup">
            <div
              className="flex items-center px-4 py-1.5 border-b border-border/60 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70"
              role="row"
            >
              <span className="flex-1" role="columnheader">
                {t("ports.protocol")}
              </span>
              <span className="w-40" role="columnheader">
                {t("ports.boundTo")}
              </span>
              <span className="w-20 text-right" role="columnheader">
                {t("ports.port")}
              </span>
            </div>
          </div>
          <div className="divide-y divide-border" role="rowgroup">
            {listeners.map((listener) => (
              <div
                key={`${listener.node}-${listener.protocol}-${listener.port}`}
                className="flex items-center px-4 py-2.5 text-sm hover:bg-muted/20 transition-colors"
                role="row"
              >
                <span className="flex-1 font-mono text-xs" role="cell">
                  {listener.protocol}
                </span>
                <span
                  className="w-40 font-mono text-xs text-muted-foreground"
                  role="cell"
                >
                  {listener.ip_address}
                </span>
                <span
                  className="w-20 text-right font-mono tabular-nums text-xs"
                  role="cell"
                >
                  {listener.port}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {contexts.length > 0 && (
        <div
          className="border border-border rounded-lg overflow-hidden"
          role="table"
          aria-label={t("ports.webContexts")}
        >
          {/* Section header — presentational, includes subtitle */}
          <div className="flex items-center px-4 py-2 border-b border-border bg-muted/30">
            <div className="flex-1">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("ports.webContexts")}
              </div>
              <div className="text-[11px] text-muted-foreground/70 mt-0.5 normal-case tracking-normal font-normal">
                {t("ports.webContextsSubtitle")}
              </div>
            </div>
          </div>
          {/* Column label row */}
          <div role="rowgroup">
            <div
              className="flex items-center px-4 py-1.5 border-b border-border/60 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70"
              role="row"
            >
              <span className="flex-1" role="columnheader">
                {t("ports.context")}
              </span>
              <span className="w-40" role="columnheader">
                {t("ports.boundTo")}
              </span>
              <span className="w-16 text-right" role="columnheader">
                {t("ports.port")}
              </span>
              <span className="w-12 text-center" role="columnheader">
                {t("ports.ssl")}
              </span>
              <span className="w-32 text-right" role="columnheader">
                {t("ports.path")}
              </span>
            </div>
          </div>
          <div className="divide-y divide-border" role="rowgroup">
            {contexts.map((ctx) => {
              const isSsl =
                ctx.protocol === "https" ||
                (Array.isArray(ctx.ssl_opts) && ctx.ssl_opts.length > 0);
              return (
                <div
                  key={`${ctx.node}-${ctx.port}-${ctx.path}`}
                  className="flex items-center px-4 py-2.5 text-sm hover:bg-muted/20 transition-colors"
                  role="row"
                >
                  <span className="flex-1 text-xs" role="cell">
                    {ctx.description}
                  </span>
                  <span
                    className="w-40 font-mono text-xs text-muted-foreground"
                    role="cell"
                  >
                    {ctx.ip ?? "0.0.0.0"}
                  </span>
                  <span
                    className="w-16 text-right font-mono tabular-nums text-xs"
                    role="cell"
                  >
                    {ctx.port}
                  </span>
                  <span className="w-12 flex justify-center" role="cell">
                    {isSsl ? (
                      <Shield className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <ShieldOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                    )}
                  </span>
                  <span
                    className="w-32 text-right font-mono text-xs text-muted-foreground"
                    role="cell"
                  >
                    {ctx.path}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
