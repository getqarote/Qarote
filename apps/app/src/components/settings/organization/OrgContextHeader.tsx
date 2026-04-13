import { useTranslation } from "react-i18next";

import { Building2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useSwitchWorkspace,
  useUserWorkspaces,
} from "@/hooks/queries/useWorkspaceApi";
import { SESSION_TOAST_KEY } from "@/hooks/ui/useSessionToast";

import { getRoleBadgeVariant, useRoleLabels } from "./roleUi";

interface OrgContextHeaderProps {
  org: { id: string; name: string };
  callerRole: string | null | undefined;
  organizations: Array<{ id: string; name: string }>;
}

/**
 * Header bar for the Organization settings surface. Shows the page
 * title, the current caller's role as a status badge, and — when
 * the user belongs to multiple organizations — a switcher that
 * pivots the whole workspace over to the target org.
 *
 * Switching organizations reloads the page because too many cached
 * queries are scoped to the current org ID; invalidating them one at
 * a time is error-prone and a full reload is imperceptible once the
 * session toast confirms the switch on the other side.
 */
export function OrgContextHeader({
  org,
  callerRole,
  organizations,
}: OrgContextHeaderProps) {
  const { t } = useTranslation("profile");
  const roleLabels = useRoleLabels();

  const { data: allWorkspacesData } = useUserWorkspaces();
  const allWorkspaces = allWorkspacesData?.workspaces ?? [];
  const switchWorkspaceMutation = useSwitchWorkspace();

  const roleLabel = roleLabels[callerRole ?? "MEMBER"] ?? callerRole;

  const handleSwitchOrg = (orgId: string) => {
    if (orgId === org.id) return;
    const targetWs = allWorkspaces.find((w) => w.organization?.id === orgId);
    if (!targetWs) return;
    const targetOrg = organizations.find((o) => o.id === orgId);
    switchWorkspaceMutation.mutate(
      { workspaceId: targetWs.id },
      {
        onSuccess: () => {
          sessionStorage.setItem(
            SESSION_TOAST_KEY,
            JSON.stringify({
              title: t("org.orgSwitched", {
                defaultValue: "Organization switched",
              }),
              description: targetOrg?.name ?? "",
            })
          );
          window.location.href = "/settings/organization";
        },
        onError: (error) => {
          toast.error(
            t("org.switchFailed", {
              defaultValue: "Failed to switch organization",
            }),
            {
              description: error instanceof Error ? error.message : undefined,
            }
          );
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0"
          aria-hidden="true"
        >
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight">
            {t("org.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("org.subtitle")}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {organizations.length > 1 && (
          <Select
            value={org.id}
            onValueChange={handleSwitchOrg}
            disabled={switchWorkspaceMutation.isPending}
          >
            <SelectTrigger className="h-9 w-[240px] text-sm font-medium">
              <div className="flex items-center gap-2 truncate">
                <Building2
                  className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {organizations.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Badge
          variant={getRoleBadgeVariant()}
          role="status"
          aria-label={t("org.yourRole", { role: roleLabel })}
        >
          {roleLabel}
        </Badge>
      </div>
    </div>
  );
}
