/**
 * Active agent keys for the current workspace, as a table (prototype): name,
 * scope pill, created, last-used (relative, or "Never used"), expiry, and a
 * revoke action behind a confirm dialog with the key's name in the body.
 *
 * Pagination is intentionally out of scope: agent-key fan-out is small by
 * design (one per agent integration), and the backend orders by createdAt desc.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { formatRelativeAgo } from "@/lib/formatRelativeAgo";
import { qToast } from "@/lib/qToast";
import { cn } from "@/lib/utils";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";

import { useApiKeys } from "@/hooks/queries/useApiKeys";

interface Props {
  workspaceId: string;
}

type ListedKey = NonNullable<
  ReturnType<typeof useApiKeys>["list"]["data"]
>[number];

const dateFmt = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

export const AgentKeysList = ({ workspaceId }: Props) => {
  const { t } = useTranslation("settings");
  const { list, revoke } = useApiKeys(workspaceId);
  const [pendingRevoke, setPendingRevoke] = useState<ListedKey | null>(null);

  const keys = list.data ?? [];
  // Hide already-revoked rows (enabled === false) — the backend returns them so
  // the list stays consistent during a refetch race; the operator only cares
  // about live keys here.
  const active = keys.filter((k) => k.enabled);

  if (active.length === 0) return null;

  const handleRevoke = async () => {
    if (!pendingRevoke) return;
    const target = pendingRevoke;
    try {
      await revoke.mutateAsync({ workspaceId, id: target.id });
      qToast({
        severity: "success",
        title: t("agentAccess.revoke.success", { name: target.name }),
      });
      setPendingRevoke(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("agentAccess.revoke.failed")
      );
    }
  };

  const colHead =
    "px-5 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground";

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className={colHead}>{t("agentAccess.list.colName")}</th>
              <th className={colHead}>{t("agentAccess.list.colScope")}</th>
              <th className={colHead}>{t("agentAccess.list.colCreated")}</th>
              <th className={colHead}>{t("agentAccess.list.colLastUsed")}</th>
              <th className={colHead}>{t("agentAccess.list.colExpires")}</th>
              <th className={cn(colHead, "sr-only")}>
                {t("agentAccess.list.revoke")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {active.map((k) => {
              const explain = k.mode === "explain";
              return (
                <tr key={k.id}>
                  <td className="px-5 py-3.5 font-medium">{k.name}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
                        explain
                          ? "border-primary/40 bg-accent text-primary"
                          : "border-success/40 bg-success-muted text-success"
                      )}
                    >
                      {k.mode}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                    {dateFmt.format(new Date(k.createdAt))}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                    {k.lastRequest
                      ? formatRelativeAgo(
                          k.lastRequest,
                          t("agentAccess.list.justNow")
                        )
                      : t("agentAccess.list.neverUsed")}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                    {k.expiresAt
                      ? dateFmt.format(new Date(k.expiresAt))
                      : t("agentAccess.list.neverExpires")}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingRevoke(k)}
                      disabled={revoke.isPending}
                      data-testid={`agent-key-revoke-${k.id}`}
                    >
                      {t("agentAccess.list.revoke")}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pendingRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRevoke(null);
        }}
        tone="danger"
        title={t("agentAccess.revoke.title")}
        body={t("agentAccess.revoke.description", {
          name: pendingRevoke?.name ?? "",
        })}
        confirmLabel={t("agentAccess.revoke.confirm")}
        pendingLabel={t("agentAccess.revoke.pending")}
        cancelLabel={t("agentAccess.revoke.cancel")}
        isPending={revoke.isPending}
        onConfirm={handleRevoke}
      />
    </>
  );
};
