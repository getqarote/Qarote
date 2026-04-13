import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Calendar, Loader2, Save, Settings, Users, X } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useUpdateOrganization } from "@/hooks/queries/useOrganization";

import type { OrganizationSummary } from "./types";

interface OrgInfoCardProps {
  org: OrganizationSummary;
  isOrgAdmin: boolean;
}

/**
 * Displays the organization's general info (name, billing email,
 * headline stats) with inline edit for admins. Owns its own edit
 * state — parents only need to pass the org and whether the caller
 * has admin-level permissions.
 *
 * **Note on remounting:** the parent renders this component with
 * `key={org.id}` so switching organizations via the `OrgContextHeader`
 * remounts the card and naturally resets `editing` + `form` to the
 * new org's values. This avoids a `useEffect` that would otherwise
 * call `setState` synchronously on org change and trigger a
 * cascading render.
 */
export function OrgInfoCard({ org, isOrgAdmin }: OrgInfoCardProps) {
  const { t, i18n } = useTranslation("profile");
  const updateOrgMutation = useUpdateOrganization();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: org.name,
    contactEmail: org.contactEmail ?? "",
  });

  const handleCancel = () => {
    setForm({
      name: org.name,
      contactEmail: org.contactEmail ?? "",
    });
    setEditing(false);
  };

  const handleSave = async () => {
    try {
      await updateOrgMutation.mutateAsync({
        name: form.name || undefined,
        contactEmail: form.contactEmail || null,
      });
      setEditing(false);
      toast.success(t("org.toast.orgUpdated"));
    } catch (error) {
      logger.error({ error }, "Update org error");
      toast.error(t("org.toast.orgUpdateFailed"));
    }
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <h2 className="title-section">{t("org.general")}</h2>
        <p className="text-sm text-muted-foreground">{t("org.generalDesc")}</p>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">{t("org.name")}</Label>
            {editing ? (
              <Input
                id="org-name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={t("org.namePlaceholder")}
              />
            ) : (
              <p className="text-sm text-foreground">{org.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-email">{t("org.billingEmail")}</Label>
            {editing ? (
              <Input
                id="org-email"
                type="email"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    contactEmail: e.target.value,
                  }))
                }
                placeholder={t("org.billingEmailPlaceholder")}
              />
            ) : (
              <p className="text-sm text-foreground">
                {org.contactEmail || (
                  <span className="text-muted-foreground">
                    {t("org.billingEmailNotSet")}
                  </span>
                )}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("org.billingEmailDesc")}
            </p>
          </div>
        </div>

        {!editing && (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                {t("org.facts")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("org.factsHint")}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" aria-hidden="true" />
                {t("org.members")}:{" "}
                <span className="font-mono tabular-nums text-foreground">
                  {org._count?.members ?? 0}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Settings className="h-4 w-4" aria-hidden="true" />
                {t("org.workspaces")}:{" "}
                <span className="font-mono tabular-nums text-foreground">
                  {org._count?.workspaces ?? 0}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {t("org.created")}:{" "}
                <span className="text-foreground">
                  {new Intl.DateTimeFormat(i18n.language, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }).format(new Date(org.createdAt))}
                </span>
              </span>
            </div>
          </div>
        )}

        {isOrgAdmin && (
          <div className="flex justify-end gap-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" aria-hidden="true" />
                  {t("org.cancel")}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateOrgMutation.isPending}
                >
                  {updateOrgMutation.isPending ? (
                    <Loader2
                      className="h-4 w-4 mr-2 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                  )}
                  {updateOrgMutation.isPending
                    ? t("org.saving")
                    : t("org.saveChanges")}
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)} className="rounded-none">
                {t("org.editOrganization")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
