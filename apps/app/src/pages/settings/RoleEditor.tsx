import { useEffect, useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { WORKSPACE_ROLE_RANK, WorkspaceRole } from "@/lib/api/authTypes";
import { qToast } from "@/lib/qToast";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useRoleLabels } from "@/components/settings/organization/roleUi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radioGroup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { TagsInput } from "@/components/ui/tags-input";
import { Textarea } from "@/components/ui/textarea";

import { useWorkspace } from "@/hooks/ui/useWorkspace";

function readEditorCause(err: unknown): Record<string, unknown> | null {
  if (!err || typeof err !== "object") return null;
  const data = (err as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const cause = (data as { cause?: unknown }).cause;
  if (!cause || typeof cause !== "object") return null;
  return cause as Record<string, unknown>;
}

type ScopeJson =
  | null
  | { kind: "server.id"; ids: string[] }
  | { kind: "server.environment"; values: string[] };

interface PermissionEntry {
  permissionKey: string;
  scope: ScopeJson;
}

interface CatalogPermission {
  key: string;
  minimumBuiltinTier: string;
  label: string;
  category: string;
  scopable: boolean;
}

const BUILTIN_ROLE_NAMES = ["owner", "admin", "member", "readonly"] as const;
// Tiers offered as clone sources for a new role ("Based on").
const CLONE_TIERS: WorkspaceRole[] = [
  WorkspaceRole.ADMIN,
  WorkspaceRole.MEMBER,
  WorkspaceRole.READONLY,
];

const FormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "editor.nameTooShort")
    .max(64)
    .regex(/^[a-zA-Z0-9 _-]+$/)
    .refine(
      (val) =>
        !BUILTIN_ROLE_NAMES.includes(
          val.toLowerCase() as (typeof BUILTIN_ROLE_NAMES)[number]
        ),
      { message: "editor.nameReserved" }
    ),
  description: z.string().trim().max(280).nullable().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

function scopeFingerprint(scope: ScopeJson): string {
  if (scope === null) return "null";
  if (scope.kind === "server.id") {
    return `server.id:${[...scope.ids].sort().join(",")}`;
  }
  return `server.environment:${[...scope.values].sort().join(",")}`;
}

const RoleEditor = () => {
  const { t } = useTranslation("roles");
  const { roleId } = useParams<{ roleId?: string }>();
  const isEditing = !!roleId;
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";
  const roleLabels = useRoleLabels();

  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [search, setSearch] = useState("");
  const [basedOn, setBasedOn] = useState("blank");
  const [conflictUpdatedAt, setConflictUpdatedAt] = useState<string | null>(
    null
  );
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [escalationErrors, setEscalationErrors] = useState<
    Record<string, string>
  >({});

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: "", description: "" },
  });

  const catalog = trpc.workspace.role.permissionList.useQuery(
    { workspaceId },
    { enabled: !!workspaceId, staleTime: 60_000 }
  );
  const servers = trpc.rabbitmq.server.getServers.useQuery(
    { workspaceId },
    { enabled: !!workspaceId, staleTime: 60_000 }
  );
  const roleQuery = trpc.workspace.role.get.useQuery(
    { workspaceId, roleId: roleId ?? "" },
    { enabled: !!workspaceId && !!roleId }
  );

  useEffect(() => {
    if (!roleQuery.data || isResolvingConflict) return;
    form.reset({
      name: roleQuery.data.name,
      description: roleQuery.data.description ?? "",
    });
    /* eslint-disable react-hooks/set-state-in-effect */
    setPermissions(
      roleQuery.data.permissions.map((p) => ({
        permissionKey: p.permissionKey,
        scope: p.scope as ScopeJson,
      }))
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [roleQuery.data, form, isResolvingConflict]);

  const catalogPerms = useMemo(
    () => (catalog.data?.permissions ?? []) as CatalogPermission[],
    [catalog.data?.permissions]
  );

  // Group catalog by its (friendly) category.
  const grouped = useMemo(() => {
    const map = new Map<string, CatalogPermission[]>();
    for (const p of catalogPerms) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [catalogPerms]);

  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped
      .map(
        ([c, perms]) =>
          [
            c,
            perms.filter(
              (p) =>
                p.key.toLowerCase().includes(q) ||
                p.label.toLowerCase().includes(q)
            ),
          ] as const
      )
      .filter(([, perms]) => perms.length > 0);
  }, [grouped, search]);

  const utils = trpc.useUtils();
  const createMutation = trpc.workspace.role.create.useMutation({
    onSuccess: () => {
      toast.success(t("editor.createdToast"));
      void utils.workspace.role.list.invalidate();
      navigate("/settings/roles");
    },
    onError: (err) => handleSaveError(err),
  });
  const updateMutation = trpc.workspace.role.update.useMutation({
    onSuccess: () => {
      toast.success(t("editor.savedToast"));
      setIsResolvingConflict(false);
      void utils.workspace.role.get.invalidate();
      void utils.workspace.role.list.invalidate();
    },
    onError: (err) => handleSaveError(err),
  });
  const setPermsMutation = trpc.workspace.role.setPermissions.useMutation({
    onSuccess: () => {
      toast.success(t("editor.savedToast"));
      setIsResolvingConflict(false);
      void utils.workspace.role.get.invalidate();
      void utils.workspace.role.list.invalidate();
    },
    onError: (err) => handleSaveError(err),
  });
  const deleteMutation = trpc.workspace.role.delete.useMutation({
    onSuccess: () => {
      qToast({ severity: "success", title: t("editor.deletedToast") });
      void utils.workspace.role.list.invalidate();
      navigate("/settings/roles");
    },
    onError: (err) => toast.error(err.message || t("errors.deleteFailed")),
  });

  function handleSaveError(err: { message?: string; data?: unknown }) {
    setEscalationErrors({});
    setIsResolvingConflict(false);
    const cause = readEditorCause(err);
    if (cause && "code" in cause && cause.code === "STALE_UPDATE") {
      const cu = (cause as { currentUpdatedAt?: string }).currentUpdatedAt;
      setConflictUpdatedAt(cu ?? "stale");
      return;
    }
    if (cause && "code" in cause && cause.code === "PRIVILEGE_ESCALATION") {
      const p = (cause as { permission?: string }).permission;
      if (p) setEscalationErrors({ [p]: t("editor.escalation.row") });
    }
    toast.error(err.message || t("errors.saveFailed"));
  }

  function togglePermission(key: string, checked: boolean) {
    setEscalationErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (checked) {
      setPermissions((prev) =>
        prev.some((p) => p.permissionKey === key)
          ? prev
          : [...prev, { permissionKey: key, scope: null }]
      );
    } else {
      setPermissions((prev) => prev.filter((p) => p.permissionKey !== key));
    }
  }

  function updateScope(key: string, scope: ScopeJson) {
    setPermissions((prev) => {
      const without = prev.filter((p) => p.permissionKey !== key);
      return [...without, { permissionKey: key, scope }];
    });
  }

  // "Based on" — seed a new role from a built-in tier's implicit grant set.
  function applyClone(value: string) {
    setBasedOn(value);
    if (value === "blank") {
      setPermissions([]);
      return;
    }
    const rank = WORKSPACE_ROLE_RANK[value as WorkspaceRole] ?? -1;
    setPermissions(
      catalogPerms
        .filter(
          (p) =>
            rank >=
            (WORKSPACE_ROLE_RANK[p.minimumBuiltinTier as WorkspaceRole] ?? 99)
        )
        .map((p) => ({ permissionKey: p.key, scope: null }))
    );
  }

  async function onSubmit(values: FormValues) {
    if (!workspaceId) return;
    const seen = new Set<string>();
    const deduped = permissions.filter((p) => {
      const fp = `${p.permissionKey}:${scopeFingerprint(p.scope)}`;
      if (seen.has(fp)) return false;
      seen.add(fp);
      return true;
    });
    if (deduped.length === 0) {
      toast.error(t("editor.permissionsLabel"));
      return;
    }

    if (isEditing && roleQuery.data) {
      const expectedUpdatedAt = new Date(roleQuery.data.updatedAt);
      const nameOrDescChanged =
        values.name !== roleQuery.data.name ||
        (values.description ?? "") !== (roleQuery.data.description ?? "");
      try {
        let freshUpdatedAt = expectedUpdatedAt;
        if (nameOrDescChanged) {
          const updated = await updateMutation.mutateAsync({
            workspaceId,
            roleId: roleQuery.data.id,
            expectedUpdatedAt,
            name: values.name,
            description: values.description ?? null,
          });
          freshUpdatedAt = new Date(updated.updatedAt);
        }
        await setPermsMutation.mutateAsync({
          workspaceId,
          roleId: roleQuery.data.id,
          expectedUpdatedAt: freshUpdatedAt,
          permissions: deduped,
        });
      } catch {
        // per-mutation onError handles UI
      }
    } else {
      createMutation.mutate({
        workspaceId,
        name: values.name,
        description: values.description ?? null,
        permissions: deduped,
      });
    }
  }

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    setPermsMutation.isPending;
  const grantedCount = permissions.length;
  const memberCount = isEditing ? (roleQuery.data?.memberCount ?? 0) : 0;

  if (catalog.isLoading || (isEditing && roleQuery.isLoading)) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isEditing && !roleQuery.data) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
      >
        {t("errors.loadFailed")}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon" className="shrink-0">
          <Link to="/settings/roles" aria-label={t("editor.cancel")}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">
          {isEditing
            ? roleQuery.data?.name || t("editor.editTitle")
            : t("editor.createTitle")}
        </h2>
      </div>

      {conflictUpdatedAt && (
        <ConflictBanner
          onReload={() => {
            setConflictUpdatedAt(null);
            void roleQuery.refetch();
          }}
          onOverwrite={() => {
            setIsResolvingConflict(true);
            void roleQuery
              .refetch()
              .then(() => {
                setConflictUpdatedAt(null);
                form.handleSubmit(onSubmit)();
              })
              .catch(() => setIsResolvingConflict(false));
          }}
        />
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        {/* Identity card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">{t("editor.nameLabel")}</Label>
              <Input
                id="role-name"
                {...form.register("name")}
                placeholder={t("editor.namePlaceholder")}
                maxLength={64}
                autoFocus={!isEditing}
                aria-invalid={!!form.formState.errors.name}
              />
              {form.formState.errors.name && (
                <p role="alert" className="text-xs text-destructive">
                  {t(form.formState.errors.name.message!)}
                </p>
              )}
            </div>
            {!isEditing && (
              <div className="space-y-1.5">
                <Label htmlFor="role-basedon">{t("editor.basedOn")}</Label>
                <Select value={basedOn} onValueChange={applyClone}>
                  <SelectTrigger id="role-basedon">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blank">
                      {t("editor.basedOnBlank")}
                    </SelectItem>
                    {CLONE_TIERS.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {t("editor.basedOnClone", {
                          role: roleLabels[tier],
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="mt-3.5 space-y-1.5">
            <Label htmlFor="role-description">
              {t("editor.descriptionLabel")}
            </Label>
            <Textarea
              id="role-description"
              {...form.register("description")}
              rows={2}
              maxLength={280}
              placeholder={t("editor.descriptionHelper")}
            />
          </div>
        </div>

        {/* Search + count */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("editor.searchPlaceholder")}
              aria-label={t("editor.searchLabel")}
              className="pl-9"
            />
          </div>
          <p className="shrink-0 text-sm text-muted-foreground">
            {t("editor.enabledCount", { count: grantedCount })}
          </p>
        </div>

        {/* Permission category cards */}
        <div className="space-y-3">
          {filteredGrouped.map(([category, perms]) => (
            <CategoryCard
              key={category}
              category={category}
              perms={perms}
              permissions={permissions}
              escalationErrors={escalationErrors}
              servers={servers.data?.servers ?? []}
              onPermissionToggle={togglePermission}
              onScopeChange={updateScope}
            />
          ))}
          {filteredGrouped.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">—</p>
          )}
        </div>

        {/* Footer bar */}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
            {isEditing ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t("editor.delete")}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link to="/settings/roles">{t("editor.cancel")}</Link>
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {isSaving ? t("editor.saving") : t("editor.save")}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {isEditing && roleQuery.data && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          tone="danger"
          title={t("editor.deleteConfirm.title", { name: roleQuery.data.name })}
          body={
            memberCount === 0
              ? t("editor.deleteConfirm.bodyZero")
              : t("editor.deleteConfirm.body", { count: memberCount })
          }
          confirmLabel={t("editor.deleteConfirm.confirm")}
          cancelLabel={t("editor.deleteConfirm.cancel")}
          isPending={deleteMutation.isPending}
          onConfirm={() => {
            if (!workspaceId || !roleQuery.data) return;
            deleteMutation.mutate({
              workspaceId,
              roleId: roleQuery.data.id,
              expectedUpdatedAt: new Date(roleQuery.data.updatedAt),
            });
          }}
        />
      )}
    </div>
  );
};

const ConflictBanner = ({
  onReload,
  onOverwrite,
}: {
  onReload: () => void;
  onOverwrite: () => void;
}) => {
  const { t } = useTranslation("roles");
  return (
    <div
      role="alert"
      className="space-y-3 rounded-lg border border-warning/40 bg-warning-muted p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-warning"
          aria-hidden
        />
        <div className="space-y-1">
          <p className="text-sm font-medium">{t("editor.conflict.title")}</p>
          <p className="text-sm text-muted-foreground">
            {t("editor.conflict.body")}
          </p>
        </div>
      </div>
      <div className="flex gap-2 pl-8">
        <Button size="sm" onClick={onReload}>
          {t("editor.conflict.reload")}
        </Button>
        <Button size="sm" variant="outline" onClick={onOverwrite}>
          {t("editor.conflict.overwrite")}
        </Button>
      </div>
    </div>
  );
};

interface CategoryCardProps {
  category: string;
  perms: CatalogPermission[];
  permissions: PermissionEntry[];
  escalationErrors: Record<string, string>;
  servers: { id: string; name: string; environment?: string | null }[];
  onPermissionToggle: (key: string, checked: boolean) => void;
  onScopeChange: (key: string, scope: ScopeJson) => void;
}

const CategoryCard = ({
  category,
  perms,
  permissions,
  escalationErrors,
  servers,
  onPermissionToggle,
  onScopeChange,
}: CategoryCardProps) => {
  const { t } = useTranslation("roles");
  const grantedInCat = perms.filter((p) =>
    permissions.some((g) => g.permissionKey === p.key)
  ).length;
  const allChecked = grantedInCat === perms.length;
  const label = t(`editor.category.${category}`, {
    defaultValue: category.charAt(0).toUpperCase() + category.slice(1),
  });

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold">{label}</h3>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {grantedInCat}/{perms.length}
          </span>
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() =>
              perms.forEach((p) => onPermissionToggle(p.key, !allChecked))
            }
          >
            {allChecked ? t("editor.deselectAll") : t("editor.selectAll")}
          </button>
        </div>
      </div>
      <div>
        {perms.map((p) => {
          const granted = permissions.find((g) => g.permissionKey === p.key);
          const isGranted = !!granted;
          const error = escalationErrors[p.key];
          return (
            <div
              key={p.key}
              className={cn(
                "flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0",
                error && "bg-destructive/5"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{p.label}</span>
                  {p.scopable && (
                    <Badge
                      variant="outline"
                      className="border-primary/30 px-1.5 py-0 font-mono text-[10px] text-primary"
                    >
                      {t("editor.scopableBadge")}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {p.key}
                </p>
                {error && (
                  <p
                    className="mt-0.5 text-xs font-medium text-destructive"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
              </div>
              {isGranted && p.scopable && (
                <ScopePill
                  scope={granted.scope}
                  servers={servers}
                  onChange={(scope) => onScopeChange(p.key, scope)}
                />
              )}
              <Switch
                checked={isGranted}
                onCheckedChange={(c) => onPermissionToggle(p.key, c)}
                aria-label={p.label}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface ScopePillProps {
  scope: ScopeJson;
  servers: { id: string; name: string; environment?: string | null }[];
  onChange: (scope: ScopeJson) => void;
}

const ScopePill = ({ scope, servers, onChange }: ScopePillProps) => {
  const { t } = useTranslation("roles");
  const [open, setOpen] = useState(false);
  const uid = useId();

  const mode: "any" | "server.id" | "server.environment" =
    scope === null ? "any" : scope.kind;

  const summary = useMemo(() => {
    if (scope === null) return t("editor.scope.any");
    if (scope.kind === "server.id") {
      return t("editor.scope.summaryServers", { count: scope.ids.length });
    }
    return scope.values.join(", ");
  }, [scope, t]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs font-normal"
          aria-label={t("editor.scope.configure")}
        >
          {summary}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("editor.scope.modeLabel")}
          </Label>
          <RadioGroup
            value={mode}
            onValueChange={(v) => {
              if (v === "any") onChange(null);
              else if (v === "server.id")
                onChange({ kind: "server.id", ids: [] });
              else onChange({ kind: "server.environment", values: [] });
            }}
            className="gap-2"
          >
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="any" id={`${uid}-scope-any`} />
              <span className="text-sm">{t("editor.scope.any")}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="server.id" id={`${uid}-scope-ids`} />
              <span className="text-sm">{t("editor.scope.modeServers")}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem
                value="server.environment"
                id={`${uid}-scope-env`}
              />
              <span className="text-sm">
                {t("editor.scope.modeEnvironments")}
              </span>
            </label>
          </RadioGroup>

          {scope?.kind === "server.id" && (
            <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-2">
              {servers.length === 0 ? (
                <p className="p-2 text-xs text-muted-foreground">—</p>
              ) : (
                servers.map((s) => {
                  const checked = scope.ids.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 py-1 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => {
                          const next = c
                            ? Array.from(new Set([...scope.ids, s.id]))
                            : scope.ids.filter((id) => id !== s.id);
                          onChange({ kind: "server.id", ids: next });
                        }}
                      />
                      <span className="flex-1 truncate">{s.name}</span>
                      {s.environment && (
                        <Badge variant="outline" className="py-0 text-[10px]">
                          {s.environment}
                        </Badge>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          )}

          {scope?.kind === "server.environment" && (
            <div className="space-y-2">
              <TagsInput
                value={scope.values}
                onChange={(values) =>
                  onChange({ kind: "server.environment", values })
                }
                placeholder={t("editor.scope.environmentsPlaceholder")}
                maxTags={16}
                maxTagLength={64}
              />
              <p className="text-xs text-muted-foreground">
                {t("editor.scope.environmentsHelper")}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default RoleEditor;
