import { useTranslation } from "react-i18next";

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
  port: string;
  ssl_opts: unknown[];
}

interface PortsAndContextsProps {
  listeners: Listener[];
  contexts: Context[];
  isLoading?: boolean;
  fetchFailed?: boolean;
}

export function PortsAndContexts({
  listeners,
  contexts,
}: PortsAndContextsProps) {
  const { t } = useTranslation("nodes");

  if (listeners.length === 0 && contexts.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Listeners table */}
      {listeners.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">
            {t("portsAndContexts.listeners")}
          </h3>
          <div className="overflow-x-auto">
            <div
              className="border border-border rounded-lg overflow-hidden"
              role="table"
              aria-label={t("portsAndContexts.listeners")}
            >
              {/* Header */}
              <div
                className="flex items-center px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                role="row"
              >
                <span className="flex-1" role="columnheader">
                  {t("portsAndContexts.node")}
                </span>
                <span className="w-32" role="columnheader">
                  {t("portsAndContexts.protocol")}
                </span>
                <span className="w-36" role="columnheader">
                  {t("portsAndContexts.ipAddress")}
                </span>
                <span className="w-20 text-right" role="columnheader">
                  {t("portsAndContexts.port")}
                </span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border" role="rowgroup">
                {listeners.map((listener) => (
                  <div
                    key={`${listener.node}-${listener.protocol}-${listener.port}-${listener.ip_address}`}
                    className="flex items-center px-4 py-2.5 text-sm"
                    role="row"
                  >
                    <span
                      className="flex-1 font-mono text-xs truncate"
                      role="cell"
                    >
                      {listener.node}
                    </span>
                    <span className="w-32 text-xs" role="cell">
                      {listener.protocol}
                    </span>
                    <span className="w-36 font-mono text-xs" role="cell">
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
          </div>
        </div>
      )}

      {/* Contexts table */}
      {contexts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">
            {t("portsAndContexts.contexts")}
          </h3>
          <div className="overflow-x-auto">
            <div
              className="border border-border rounded-lg overflow-hidden"
              role="table"
              aria-label={t("portsAndContexts.contexts")}
            >
              {/* Header */}
              <div
                className="flex items-center px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                role="row"
              >
                <span className="flex-1" role="columnheader">
                  {t("portsAndContexts.node")}
                </span>
                <span className="flex-1" role="columnheader">
                  {t("portsAndContexts.description")}
                </span>
                <span className="w-32" role="columnheader">
                  {t("portsAndContexts.path")}
                </span>
                <span className="w-20 text-right" role="columnheader">
                  {t("portsAndContexts.port")}
                </span>
                <span className="w-16 text-center" role="columnheader">
                  {t("portsAndContexts.ssl")}
                </span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border" role="rowgroup">
                {contexts.map((ctx, idx) => (
                  <div
                    key={`${ctx.node}-${ctx.path}-${ctx.port}-${idx}`}
                    className="flex items-center px-4 py-2.5 text-sm"
                    role="row"
                  >
                    <span
                      className="flex-1 font-mono text-xs truncate"
                      role="cell"
                    >
                      {ctx.node}
                    </span>
                    <span className="flex-1 text-xs truncate" role="cell">
                      {ctx.description}
                    </span>
                    <span className="w-32 font-mono text-xs" role="cell">
                      {ctx.path}
                    </span>
                    <span
                      className="w-20 text-right font-mono tabular-nums text-xs"
                      role="cell"
                    >
                      {ctx.port}
                    </span>
                    <span className="w-16 text-center text-xs" role="cell">
                      {ctx.ssl_opts?.length
                        ? t("portsAndContexts.yes")
                        : t("portsAndContexts.no")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
