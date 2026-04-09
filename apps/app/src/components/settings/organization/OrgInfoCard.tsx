import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Calendar,
  Loader2,
  Pencil,
  Save,
  Settings,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>{t("org.general")}</CardTitle>
        <CardDescription>{t("org.generalDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" aria-hidden="true" />
              {t("org.members")}:{" "}
              <span className="font-mono tabular-nums">
                {org._count?.members ?? 0}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Settings className="h-4 w-4" aria-hidden="true" />
              {t("org.workspaces")}:{" "}
              <span className="font-mono tabular-nums">
                {org._count?.workspaces ?? 0}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              {t("org.created")}:{" "}
              {new Intl.DateTimeFormat(i18n.language, {
                year: "numeric",
                month: "long",
                day: "numeric",
              }).format(new Date(org.createdAt))}
            </span>
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
              <Button onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
                {t("org.editOrganization")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
