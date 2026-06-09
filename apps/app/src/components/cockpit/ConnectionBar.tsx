/**
 * Cockpit connection bar — leads the cockpit with broker reachability.
 * Connected: status dot + server name + RabbitMQ/Erlang versions + Manage/Add.
 * On failure it renders one of three states driven by the backend-classified
 * broker error kind (see readBrokerErrorKind): auth / unreachable / error,
 * each with the appropriate recovery action.
 *
 * Self-contained: owns the AddServerForm (controlled) and ServerManagement
 * (trigger-wrapped) so the cockpit page just renders <ConnectionBar />.
 */

import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { Plus, RefreshCw } from "lucide-react";

import { readBrokerErrorKind } from "@/lib/readBrokerError";

import { AddServerForm } from "@/components/AddServerFormComponent";
import { ServerManagement } from "@/components/ServerManagement";
import { Button } from "@/components/ui/button";
import { PixelSettings } from "@/components/ui/pixel-settings";

import { useServerContext } from "@/contexts/ServerContext";

import { useOverview } from "@/hooks/queries/useRabbitMQ";
import { useServer } from "@/hooks/queries/useServer";

/** A button that opens the Server Management dialog (trigger-based). */
function ManageButton({
  label,
  variant,
  icon,
}: {
  label: string;
  variant: "ghost" | "outline" | "default";
  icon?: ReactNode;
}) {
  return (
    <ServerManagement
      trigger={
        <Button variant={variant} size="sm">
          {icon}
          {label}
        </Button>
      }
    />
  );
}

export function ConnectionBar() {
  const { t } = useTranslation("cockpit");
  const navigate = useNavigate();
  const { selectedServerId } = useServerContext();
  const { data: serverData } = useServer(selectedServerId);
  const {
    data: overviewData,
    isError,
    error,
    isLoading,
    refetch,
  } = useOverview(selectedServerId);
  const [showAdd, setShowAdd] = useState(false);

  const server = serverData?.server;
  const overview = overviewData?.overview;
  const name =
    server?.name ?? overview?.cluster_name ?? t("connectionBar.broker");

  // Only treat a missing overview as a broker error when a server is actually
  // selected — a disabled query (no server) leaves overview undefined too.
  if (selectedServerId && (isError || (!isLoading && !overview))) {
    const kind = readBrokerErrorKind(error) ?? "error";
    const tone = kind === "auth" ? "warning" : "destructive";

    const retryBtn = (
      <Button
        size="sm"
        variant={kind === "auth" ? "outline" : "default"}
        onClick={() => void refetch()}
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        {t("connectionBar.retry")}
      </Button>
    );

    return (
      <div
        className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
          tone === "warning"
            ? "border-warning/40 bg-warning-muted"
            : "border-destructive/40 bg-destructive/10"
        }`}
        role="alert"
      >
        <div className="flex items-start gap-2 min-w-0">
          <span
            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
              tone === "warning" ? "bg-warning" : "bg-destructive"
            }`}
            aria-hidden="true"
          />
          <span
            className={`text-sm font-medium ${
              tone === "warning"
                ? "text-warning-foreground"
                : "text-destructive"
            }`}
          >
            {t(`connectionBar.error.${kind}`, { name })}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {kind === "auth" && (
            <ManageButton
              label={t("connectionBar.updateCredentials")}
              variant="default"
            />
          )}
          {retryBtn}
          {kind === "unreachable" && (
            <ManageButton
              label={t("connectionBar.checkSettings")}
              variant="outline"
            />
          )}
          {kind === "error" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/help")}
            >
              {t("connectionBar.contactSupport")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span className="font-medium">{t("connectionBar.connected")}</span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
          <span className="truncate">{name}</span>
          {overview?.rabbitmq_version && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-xs">
                v{overview.rabbitmq_version}
              </span>
            </>
          )}
          {overview?.erlang_version && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-xs">
                Erlang {overview.erlang_version}
              </span>
            </>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <ManageButton
          label={t("connectionBar.manage")}
          variant="ghost"
          icon={<PixelSettings className="h-4 w-auto" aria-hidden="true" />}
        />
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("connectionBar.addServer")}
        </Button>
      </div>
      <AddServerForm isOpen={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
}
