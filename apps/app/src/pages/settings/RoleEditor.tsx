import { useEffect, useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { trpc } from "@/lib/trpc/client";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radioGroup";
import { Skeleton } from "@/components/ui/skeleton";
import { TagsInput } from "@/components/ui/tags-input";
import { Textarea } from "@/components/ui/textarea";

import { useWorkspace } from "@/hooks/ui/useWorkspace";

/**
 * Permissive cause-reader for editor-specific codes that aren't part of
 * the whitelist `readRbacError` handles (`STALE_UPDATE`,
 * `PRIVILEGE_ESCALATION`, `UNKNOWN_PERMISSION`,
 * `DUPLICATE_PERMISSION_ENTRY`). The errorFormatter still lifts the
 * cause onto `shape.data.cause` regardless of the code; the strict
 * whitelist only governs which codes the formatter accepts on the
 * server side.
 */
function readEditorCause(err: unknown): Record<string, unknown> | null {
  if (!err || typeof err !== "object") return null;
  const data = (err as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const cause = (data as { cause?: unknown }).cause;
  if (!cause || typeof cause !== "object") return null;
  return cause as Record<string, unknown>;
}

// ─── Scope model ─────────────────────────────────────────────────────

type ScopeJson =
  | null
  | { kind: "server.id"; ids: string[] }
  | { kind: "server.environment"; values: string[] };

interface PermissionEntry {
  permissionKey: string;
  scope: ScopeJson;
}

// ─── Form schema ─────────────────────────────────────────────────────

const BUILTIN_ROLE_NAMES = ["owner", "admin", "member", "readonly"] as const;

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

// ─── Helpers ─────────────────────────────────────────────────────────

function categoryOf(key: string): string {
  return key.split(":")[0] ?? "other";
}

function scopeFingerprint(scope: ScopeJson): string {
  if (scope === null) return "null";
  if (scope.kind === "server.id") {
    return `server.id:${[...scope.ids].sort().join(",")}`;
  }
  return `server.environment:${[...scope.values].sort().join(",")}`;
}

// ─── Editor ──────────────────────────────────────────────────────────

const RoleEditor = () => {
  const { t } = useTranslation("roles");
  const { roleId } = useParams<{ roleId?: string }>();
  const isEditing = !!roleId;
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";

  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [search, setSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    {}
  );
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

  // Load catalog
  const catalog = trpc.workspace.role.permissionList.useQuery(
    { workspaceId },
    { enabled: !!workspaceId, staleTime: 60_000 }
  );

  // Load servers for scope picker
  const servers = trpc.rabbitmq.server.getServers.useQuery(
    { workspaceId },
    { enabled: !!workspaceId, staleTime: 60_000 }
  );

  // Load role if editing
  const roleQuery = trpc.workspace.role.get.useQuery(
    { workspaceId, roleId: roleId ?? "" },
    { enabled: !!workspaceId && !!roleId }
  );

  // Seed form once on load; skip during conflict resolution to preserve the
  // user's in-progress edits while we fetch the latest updatedAt.
  useEffect(() => {
    if (!roleQuery.data || isResolvingConflict) return;
    form.reset({
      name: roleQuery.data.name,
      description: roleQuery.data.description ?? "",
    });
    setPermissions(
      roleQuery.data.permissions.map((p) => ({
        permissionKey: p.permissionKey,
        scope: p.scope as ScopeJson,
      }))
    );
    // Auto-expand categories that already have grants.
    const cats = new Set(
      roleQuery.data.permissions.map((p) => categoryOf(p.permissionKey))
    );
    setOpenCategories(
      Object.fromEntries(Array.from(cats).map((c) => [c, true]))
    );
  }, [roleQuery.data, form, isResolvingConflict]);

  // Group catalog by category
  const grouped = useMemo(() => {
    const cat = catalog.data?.permissions ?? [];
    const map = new Map<
      string,
      { key: string; minimumBuiltinTier: string }[]
    >();
    for (const p of cat) {
      const c = categoryOf(p.key);
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [catalog.data]);

  // Filter by search
  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped
      .map(
        ([c, perms]) =>
          [c, perms.filter((p) => p.key.toLowerCase().includes(q))] as const
      )
      .filter(([, perms]) => perms.length > 0);
  }, [grouped, search]);

  // Mutations
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
      toast.success(t("editor.deletedToast"));
      void utils.workspace.role.list.invalidate();
      navigate("/settings/roles");
    },
    onError: (err) => {
      toast.error(err.message || t("errors.deleteFailed"));
    },
  });

  function handleSaveError(err: { message?: string; data?: unknown }) {
    setEscalationErrors({});
    setIsResolvingConflict(false);
    const cause = readEditorCause(err);
    // STALE_UPDATE conflict
    if (
      cause &&
      typeof cause === "object" &&
      "code" in cause &&
      cause.code === "STALE_UPDATE"
    ) {
      const cu = (cause as { currentUpdatedAt?: string }).currentUpdatedAt;
      setConflictUpdatedAt(cu ?? "stale");
      return;
    }
    // PRIVILEGE_ESCALATION — surface inline on the offending row
    if (
      cause &&
      typeof cause === "object" &&
      "code" in cause &&
      cause.code === "PRIVILEGE_ESCALATION"
    ) {
      const p = (cause as { permission?: string }).permission;
      if (p) {
        setEscalationErrors({ [p]: t("editor.escalation.row") });
        // Expand that category
        setOpenCategories((prev) => ({ ...prev, [categoryOf(p)]: true }));
      }
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
      // Only append a global grant when there are no grants at all for this key
      // (scoped or global), preventing the checkbox from widening existing scoped grants.
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
    setEscalationErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPermissions((prev) => {
      // Remove all rows for this key, then add the new one.
      const without = prev.filter((p) => p.permissionKey !== key);
      return [...without, { permissionKey: key, scope }];
    });
  }

  async function onSubmit(values: FormValues) {
    if (!workspaceId) return;
    // Dedupe by (key, fingerprint) defensively (server also enforces).
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
      // Serialize: update name/desc first (capturing the fresh updatedAt from
      // the response), then setPermissions with that timestamp to avoid
      // a STALE_UPDATE on the second call.
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
        // onError callbacks on each mutation handle UI feedback.
      }
    } else if (!isEditing) {
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

  // ── Render ────────────────────────────────────────────────────────

  if (catalog.isLoading || (isEditing && roleQuery.isLoading)) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isEditing && !roleQuery.data) {
    return (
      <section className="max-w-3xl space-y-4">
        <header className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("editor.editTitle")}
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/settings/roles">
              <X className="h-4 w-4" aria-hidden />
              {t("editor.cancel")}
            </Link>
          </Button>
        </header>
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {t("errors.loadFailed")}
        </div>
      </section>
    );
  }

  const memberCount = isEditing ? (roleQuery.data?.memberCount ?? 0) : 0;
  const totalCount = catalog.data?.permissions.length ?? 0;
  const grantedCount = permissions.length;

  return (
    <section className="max-w-3xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            {isEditing
              ? roleQuery.data?.name || t("editor.editTitle")
              : t("editor.createTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("editor.selectedCount", {
              granted: grantedCount,
              total: totalCount,
            })}
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/settings/roles">
            <X className="h-4 w-4" aria-hidden />
            {t("editor.cancel")}
          </Link>
        </Button>
      </header>

      {conflictUpdatedAt && (
        <ConflictBanner
          onReload={() => {
            setConflictUpdatedAt(null);
            void roleQuery.refetch();
          }}
          onOverwrite={() => {
            // Freeze seeding so the refetch doesn't overwrite the user's edits,
            // then re-submit with the fresh updatedAt from the response.
            setIsResolvingConflict(true);
            void roleQuery
              .refetch()
              .then(() => {
                setConflictUpdatedAt(null);
                form.handleSubmit(onSubmit)();
              })
              .catch(() => {
                // Refetch failed — lift the guard so seeding can resume and
                // leave the conflict banner visible so the user can retry.
                setIsResolvingConflict(false);
              });
          }}
        />
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
        noValidate
      >
        <div className="space-y-4">
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

          <div className="space-y-1.5">
            <Label htmlFor="role-description">
              {t("editor.descriptionLabel")}
            </Label>
            <Textarea
              id="role-description"
              {...form.register("description")}
              rows={2}
              maxLength={280}
              placeholder={t("editor.descriptionHelper")}
              aria-invalid={!!form.formState.errors.description}
            />
            <p className="text-xs text-muted-foreground">
              {t("editor.descriptionHelper")}
            </p>
            {form.formState.errors.description && (
              <p role="alert" className="text-xs text-destructive">
                {t(form.formState.errors.description.message!)}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{t("editor.permissionsLabel")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("editor.permissionsHelper")}
            </p>
          </div>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden
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

          <Card>
            <CardContent className="p-0">
              {filteredGrouped.map(([cat, perms]) => {
                const grantedInCat = perms.filter((p) =>
                  permissions.some((g) => g.permissionKey === p.key)
                ).length;
                const isOpen = openCategories[cat] ?? false;
                return (
                  <CategoryGroup
                    key={cat}
                    category={cat}
                    perms={perms}
                    isOpen={isOpen}
                    grantedInCat={grantedInCat}
                    permissions={permissions}
                    escalationErrors={escalationErrors}
                    servers={servers.data?.servers ?? []}
                    onToggle={() =>
                      setOpenCategories((prev) => ({
                        ...prev,
                        [cat]: !isOpen,
                      }))
                    }
                    onPermissionToggle={togglePermission}
                    onScopeChange={updateScope}
                  />
                );
              })}
              {filteredGrouped.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground text-center">
                  —
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
          {isEditing ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {t("editor.delete")}
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={isSaving}>
            {isSaving && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            {isSaving ? t("editor.saving") : t("editor.save")}
          </Button>
        </div>
      </form>

      {isEditing && roleQuery.data && (
        <DeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          memberCount={memberCount}
          roleName={roleQuery.data.name}
          isDeleting={deleteMutation.isPending}
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
    </section>
  );
};

// ─── Subcomponents ───────────────────────────────────────────────────

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
      className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="space-y-1">
          <p className="font-medium text-sm">{t("editor.conflict.title")}</p>
          <p className="text-sm text-muted-foreground">
            {t("editor.conflict.body")}
          </p>
        </div>
      </div>
      <div className="flex gap-2 pl-8">
        <Button size="sm" variant="default" onClick={onReload}>
          {t("editor.conflict.reload")}
        </Button>
        <Button size="sm" variant="outline" onClick={onOverwrite}>
          {t("editor.conflict.overwrite")}
        </Button>
      </div>
    </div>
  );
};

interface CategoryGroupProps {
  category: string;
  perms: { key: string; minimumBuiltinTier: string }[];
  isOpen: boolean;
  grantedInCat: number;
  permissions: PermissionEntry[];
  escalationErrors: Record<string, string>;
  servers: { id: string; name: string; environment?: string | null }[];
  onToggle: () => void;
  onPermissionToggle: (key: string, checked: boolean) => void;
  onScopeChange: (key: string, scope: ScopeJson) => void;
}

const CategoryGroup = ({
  category,
  perms,
  isOpen,
  grantedInCat,
  permissions,
  escalationErrors,
  servers,
  onToggle,
  onPermissionToggle,
  onScopeChange,
}: CategoryGroupProps) => {
  const { t } = useTranslation("roles");
  const allChecked = grantedInCat === perms.length;
  const someChecked = grantedInCat > 0 && grantedInCat < perms.length;
  const categoryLabel = t(`editor.category.${category}`, {
    defaultValue: category,
  });

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="p-1 -m-1 rounded hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("editor.categoryToggle", { category: categoryLabel })}
        >
          {isOpen ? (
            <ChevronDown
              className="h-4 w-4 text-muted-foreground"
              aria-hidden
            />
          ) : (
            <ChevronRight
              className="h-4 w-4 text-muted-foreground"
              aria-hidden
            />
          )}
        </button>
        <Checkbox
          checked={allChecked ? true : someChecked ? "indeterminate" : false}
          onCheckedChange={(c) => {
            const target = c === true;
            perms.forEach((p) => onPermissionToggle(p.key, target));
          }}
          aria-label={t("editor.categoryToggleAll", {
            category: categoryLabel,
          })}
        />
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 text-left font-medium text-sm"
        >
          {t(`editor.category.${category}`, { defaultValue: category })}
        </button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {grantedInCat}/{perms.length}
        </span>
      </div>
      {isOpen && (
        <ul className="bg-muted/20">
          {perms.map((p) => {
            const granted = permissions.find((g) => g.permissionKey === p.key);
            const isGranted = !!granted;
            const error = escalationErrors[p.key];
            return (
              <li
                key={p.key}
                className={`flex items-center gap-3 px-4 py-2 pl-12 ${error ? "bg-destructive/5" : ""}`}
              >
                <Checkbox
                  id={`perm-${p.key}`}
                  checked={isGranted}
                  onCheckedChange={(c) => onPermissionToggle(p.key, c === true)}
                />
                <Label
                  htmlFor={`perm-${p.key}`}
                  className="flex-1 text-sm font-mono cursor-pointer"
                >
                  {p.key}
                </Label>
                {isGranted && (
                  <ScopePill
                    scope={granted!.scope}
                    servers={servers}
                    onChange={(scope) => onScopeChange(p.key, scope)}
                  />
                )}
                {error && (
                  <span
                    className="text-xs text-destructive font-medium"
                    role="alert"
                  >
                    {error}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
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
      return t("editor.scope.summaryServers", {
        count: scope.ids.length,
      });
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
          className="h-7 px-2 text-xs font-normal"
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
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="any" id={`${uid}-scope-any`} />
              <span className="text-sm">{t("editor.scope.any")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="server.id" id={`${uid}-scope-ids`} />
              <span className="text-sm">{t("editor.scope.modeServers")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
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
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
              {servers.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">—</p>
              ) : (
                servers.map((s) => {
                  const checked = scope.ids.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 cursor-pointer text-sm py-1"
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
                        <Badge variant="outline" className="text-[10px] py-0">
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

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  memberCount: number;
  roleName: string;
  isDeleting: boolean;
  onConfirm: () => void;
}

const DeleteDialog = ({
  open,
  onOpenChange,
  memberCount,
  roleName,
  isDeleting,
  onConfirm,
}: DeleteDialogProps) => {
  const { t } = useTranslation("roles");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("editor.deleteConfirm.title", { name: roleName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {memberCount === 0
              ? t("editor.deleteConfirm.bodyZero")
              : t("editor.deleteConfirm.body", { count: memberCount })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t("editor.deleteConfirm.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            {t("editor.deleteConfirm.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RoleEditor;
