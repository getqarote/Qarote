/**
 * Active agent keys for the current workspace — name, scope, created
 * date, last-used (or "Never used" sentinel), and a revoke action. The
 * revoke flow runs through a confirm dialog with the key's name in the
 * body so the operator can't muscle-memory through a wrong row.
 *
 * Pagination is intentionally out of scope: agent-key fan-out is small by
 * design (one per agent integration), and the backend already orders by
 * createdAt desc.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alertDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useApiKeys } from "@/hooks/queries/useApiKeys";

interface Props {
  workspaceId: string;
}

// Row shape inferred from `trpc.apiKeys.list` — no local interface to
// drift out of sync with the backend `select` if a field is added or
// renamed.
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
  // Hide already-revoked rows (enabled === false). The backend returns them
  // so the list stays consistent during a refetch race, but the operator
  // only cares about live keys here.
  const active = keys.filter((k) => k.enabled);

  if (active.length === 0) return null;

  const handleRevoke = () => {
    if (!pendingRevoke) return;
    const target = pendingRevoke;
    revoke.mutate(
      { workspaceId, id: target.id },
      {
        onSuccess: () => {
          toast.success(t("agentAccess.revoke.success", { name: target.name }));
          setPendingRevoke(null);
        },
        onError: (err) => {
          toast.error(err.message || t("agentAccess.revoke.failed"));
        },
      }
    );
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <ul className="divide-y">
            {active.map((k) => (
              <li
                key={k.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{k.name}</span>
                    <Badge
                      variant={k.mode === "explain" ? "default" : "secondary"}
                    >
                      {k.mode}
                    </Badge>
                    <code className="text-xs text-muted-foreground">
                      {k.prefix}…
                    </code>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4">
                    <span>
                      {t("agentAccess.list.created", {
                        date: dateFmt.format(new Date(k.createdAt)),
                      })}
                    </span>
                    <span>
                      {k.lastRequest
                        ? t("agentAccess.list.lastUsed", {
                            date: dateFmt.format(new Date(k.lastRequest)),
                          })
                        : t("agentAccess.list.neverUsed")}
                    </span>
                    {k.expiresAt && (
                      <span>
                        {t("agentAccess.list.expires", {
                          date: dateFmt.format(new Date(k.expiresAt)),
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingRevoke(k)}
                  disabled={revoke.isPending}
                  data-testid={`agent-key-revoke-${k.id}`}
                >
                  {t("agentAccess.list.revoke")}
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRevoke(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("agentAccess.revoke.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("agentAccess.revoke.description", {
                name: pendingRevoke?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoke.isPending}>
              {t("agentAccess.revoke.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoke.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoke.isPending
                ? t("agentAccess.revoke.pending")
                : t("agentAccess.revoke.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
