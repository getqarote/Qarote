import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagsInput } from "@/components/ui/tags-input";

import { WorkspaceFormState } from "./profileUtils";

interface WorkspaceFormFieldsProps {
  editingWorkspace: boolean;
  isAdmin: boolean;
  workspaceForm: WorkspaceFormState;
  setWorkspaceForm: (form: WorkspaceFormState) => void;
  workspace: {
    name: string;
    contactEmail?: string;
    tags?: string[];
    unackedWarnThreshold?: number;
    traceRetentionHours?: number;
  };
  /**
   * Plan-derived ceiling for `traceRetentionHours`. Currently DEVELOPER
   * = 168, ENTERPRISE = 720. Used both as the input's `max` bound and
   * as the displayed value when the workspace row has no persisted
   * retention yet (covers FREE workspaces and any paid workspace that
   * has never customised the field).
   */
  maxTraceRetentionHours: number;
  /**
   * Whether the trace retention field is configurable. Locked for FREE
   * plans — server returns FORBIDDEN on any explicit value. Detected
   * by plan identity (not by numeric ceiling) so a future paid tier
   * with a small max stays editable.
   */
  traceRetentionLocked: boolean;
}

function ReadOnlyRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-1.5">
      <div className="text-xs font-medium text-muted-foreground truncate">
        {label}
      </div>
      <div className="text-sm text-foreground text-right leading-tight">
        {value}
      </div>
    </div>
  );
}

export const WorkspaceFormFields = ({
  editingWorkspace,
  isAdmin,
  workspaceForm,
  setWorkspaceForm,
  workspace,
  maxTraceRetentionHours,
  traceRetentionLocked,
}: WorkspaceFormFieldsProps) => {
  const { t } = useTranslation("profile");
  // Single source of truth for displaying the field. If the workspace
  // row has a value, show it; otherwise fall back to the plan max so
  // FREE / never-customised paid rows show "24h", "168h", or "720h"
  // instead of conflicting with the configured-input max.
  const effectiveTraceRetention =
    workspace.traceRetentionHours ?? maxTraceRetentionHours;
  return (
    <>
      <div className="space-y-4">
        {editingWorkspace && isAdmin ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="workspaceName">{t("workspace.name")}</Label>
              <Input
                id="workspaceName"
                value={workspaceForm.name}
                onChange={(e) =>
                  setWorkspaceForm({
                    ...workspaceForm,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspaceContactEmail">
                {t("workspace.contactEmail")}
              </Label>
              <Input
                id="workspaceContactEmail"
                type="email"
                value={workspaceForm.contactEmail}
                onChange={(e) =>
                  setWorkspaceForm({
                    ...workspaceForm,
                    contactEmail: e.target.value,
                  })
                }
                placeholder={t("workspace.contactEmailPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("workspace.contactEmailDesc")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspaceUnackedWarnThreshold">
                {t("workspace.unackedWarnThreshold")}
              </Label>
              <Input
                id="workspaceUnackedWarnThreshold"
                type="number"
                min={0}
                max={100000}
                value={workspaceForm.unackedWarnThreshold}
                onChange={(e) =>
                  setWorkspaceForm({
                    ...workspaceForm,
                    unackedWarnThreshold: Math.max(
                      0,
                      parseInt(e.target.value, 10) || 0
                    ),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("workspace.unackedWarnThresholdDesc")}
              </p>
            </div>
            {traceRetentionLocked ? (
              // FREE plan: render the value read-only with an upgrade hint
              // rather than a disabled input. A disabled <Input> looks like
              // a stuck form; a ReadOnlyRow makes "this is a plan limit,
              // not a UI bug" the obvious read.
              <div className="space-y-2">
                <ReadOnlyRow
                  label={t("workspace.traceRetentionHours")}
                  value={
                    <span className="font-mono text-sm">
                      {effectiveTraceRetention}h
                    </span>
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("workspace.traceRetentionLockedFree")}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="workspaceTraceRetentionHours">
                  {t("workspace.traceRetentionHours")}
                </Label>
                <Input
                  id="workspaceTraceRetentionHours"
                  type="number"
                  min={1}
                  max={maxTraceRetentionHours}
                  aria-describedby="workspaceTraceRetentionHours-hint"
                  // Inherit the effective retention as the visible
                  // default when the workspace row has no persisted
                  // value yet (a paid workspace that hasn't customised
                  // the field). Otherwise the input shows the
                  // workspaceForm value initialised to 24, which
                  // contradicts the read-only row's display.
                  value={
                    workspaceForm.traceRetentionHours ?? effectiveTraceRetention
                  }
                  onChange={(e) => {
                    const raw = parseInt(e.target.value, 10);
                    // Treat empty / NaN as 1 (the floor) so users can
                    // still type freely; the clamp below normalises.
                    const safe = Number.isFinite(raw) ? raw : 1;
                    // Clamp client-side; server validates against the same
                    // plan ceiling and is the authoritative gate.
                    const clamped = Math.min(
                      Math.max(1, safe),
                      maxTraceRetentionHours
                    );
                    setWorkspaceForm({
                      ...workspaceForm,
                      traceRetentionHours: clamped,
                    });
                  }}
                />
                <p
                  id="workspaceTraceRetentionHours-hint"
                  className="text-xs text-muted-foreground"
                >
                  {t("workspace.traceRetentionDesc", {
                    max: maxTraceRetentionHours,
                  })}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border bg-muted/30 px-4 py-2">
            <ReadOnlyRow label={t("workspace.name")} value={workspace.name} />
            <ReadOnlyRow
              label={t("workspace.contactEmail")}
              value={
                workspace.contactEmail ? (
                  <span className="font-mono text-sm">
                    {workspace.contactEmail}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {t("workspace.notSet")}
                  </span>
                )
              }
            />
            <ReadOnlyRow
              label={t("workspace.unackedWarnThreshold")}
              value={
                <span className="font-mono text-sm">
                  {workspace.unackedWarnThreshold ?? 100}
                </span>
              }
            />
            <ReadOnlyRow
              label={t("workspace.traceRetentionHours")}
              value={
                <span className="font-mono text-sm">
                  {effectiveTraceRetention}h
                </span>
              }
            />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>{t("workspace.tags")}</Label>
        {editingWorkspace && isAdmin ? (
          <TagsInput
            value={workspaceForm.tags}
            onChange={(tags) => setWorkspaceForm({ ...workspaceForm, tags })}
            placeholder={t("workspace.tagsPlaceholder")}
          />
        ) : (
          <div className="flex flex-wrap gap-2 py-1">
            {workspace.tags && workspace.tags.length > 0 ? (
              workspace.tags.map((tag) => (
                <Badge key={tag} variant="soft-primary">
                  {tag}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("workspace.notSet")}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
};
