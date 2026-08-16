import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import {
  ArrowRight,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { qToast } from "@/lib/qToast";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useRoleLabels } from "@/components/settings/organization/roleUi";
import { SettingsUpgradePrompt } from "@/components/settings/SettingsUpgradePrompt";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { UserPlan } from "@/types/plans";

// Display order for the built-in tiers (most → least privileged).
const BUILTIN_ORDER = ["OWNER", "ADMIN", "MEMBER", "READONLY"] as const;

function formatRelative(iso: string, language: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60)
    return new Intl.RelativeTimeFormat(language, { numeric: "auto" }).format(
      0,
      "minute"
    );
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: "always" });
  const min = Math.floor(diffSec / 60);
  if (min < 60) return rtf.format(-min, "minute");
  const hr = Math.floor(min / 60);
  if (hr < 24) return rtf.format(-hr, "hour");
  const day = Math.floor(hr / 24);
  if (day < 30) return rtf.format(-day, "day");
  return rtf.format(-Math.floor(day / 30), "month");
}

type CustomRole = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  updatedAt: string;
};

const RolesSection = () => {
  const { t, i18n } = useTranslation("roles");
  const { workspace } = useWorkspace();
  const { userPlan } = useUser();
  const workspaceId = workspace?.id ?? "";
  const isEnterprise = userPlan === UserPlan.ENTERPRISE;

  const roleLabels = useRoleLabels();
  const utils = trpc.useUtils();

  const customQuery = trpc.workspace.role.list.useQuery(
    { workspaceId, limit: 100 },
    { enabled: !!workspaceId && isEnterprise }
  );
  const builtinsQuery = trpc.workspace.role.builtins.useQuery(
    { workspaceId },
    { enabled: !!workspaceId && isEnterprise }
  );

  const [roleToDelete, setRoleToDelete] = useState<CustomRole | null>(null);
  const deleteMutation = trpc.workspace.role.delete.useMutation({
    onSuccess: () => {
      qToast({ severity: "success", title: t("editor.deletedToast") });
      void utils.workspace.role.list.invalidate();
      setRoleToDelete(null);
    },
    onError: (err) => toast.error(err.message || t("errors.deleteFailed")),
  });

  const customRoles = customQuery.data?.items ?? [];
  const builtins = useMemo(() => {
    const items = builtinsQuery.data?.items ?? [];
    return [...items].sort(
      (a, b) =>
        BUILTIN_ORDER.indexOf(a.builtinKey as (typeof BUILTIN_ORDER)[number]) -
        BUILTIN_ORDER.indexOf(b.builtinKey as (typeof BUILTIN_ORDER)[number])
    );
  }, [builtinsQuery.data]);

  const isLoading = customQuery.isLoading || builtinsQuery.isLoading;
  const isError = customQuery.isError || builtinsQuery.isError;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        {isEnterprise && (
          <Button asChild>
            <Link to="/settings/roles/new">
              <Plus className="h-4 w-4" aria-hidden />
              {t("createButton")}
            </Link>
          </Button>
        )}
      </header>

      {!isEnterprise && <PlanGateCard />}

      {isEnterprise && (
        <>
          {isLoading && <ListSkeleton />}

          {!isLoading && isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {t("errors.loadFailed")}
            </div>
          )}

          {!isLoading && !isError && (
            <RolesTable
              builtins={builtins}
              customRoles={customRoles}
              language={i18n.language}
              roleLabels={roleLabels}
              onDelete={setRoleToDelete}
              t={t}
            />
          )}

          {!isLoading && !isError && customRoles.length === 0 && (
            <EmptyState t={t} />
          )}
        </>
      )}

      {roleToDelete && (
        <ConfirmDialog
          open={!!roleToDelete}
          onOpenChange={(open) => !open && setRoleToDelete(null)}
          tone="danger"
          title={t("editor.deleteConfirm.title", { name: roleToDelete.name })}
          body={
            roleToDelete.memberCount === 0
              ? t("editor.deleteConfirm.bodyZero")
              : t("editor.deleteConfirm.body", {
                  count: roleToDelete.memberCount,
                })
          }
          confirmLabel={t("editor.deleteConfirm.confirm")}
          cancelLabel={t("editor.deleteConfirm.cancel")}
          isPending={deleteMutation.isPending}
          onConfirm={() =>
            deleteMutation.mutate({
              workspaceId,
              roleId: roleToDelete.id,
              expectedUpdatedAt: new Date(roleToDelete.updatedAt),
            })
          }
        />
      )}
    </section>
  );
};

const TypePill = ({ system }: { system: boolean }) => {
  const { t } = useTranslation("roles");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        system
          ? "border-info/40 bg-info-muted text-info"
          : "border-primary/40 bg-accent text-primary"
      )}
    >
      {system ? t("typeSystem") : t("typeCustom")}
    </span>
  );
};

const PlanGateCard = () => {
  const { t } = useTranslation("roles");
  return (
    <SettingsUpgradePrompt
      icon={<Lock className="h-6 w-6" />}
      title={t("gate.title")}
      body={t("gate.body")}
      note={t("gate.footnote")}
    >
      <Button asChild>
        <Link to="/settings/subscription">
          {t("gate.upgradeCta")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </SettingsUpgradePrompt>
  );
};

const ListSkeleton = () => (
  <Card>
    <CardContent className="p-0">
      <div className="divide-y divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const EmptyState = ({ t }: { t: ReturnType<typeof useTranslation>["t"] }) => (
  <div className="flex items-center gap-3 rounded-xl border border-dashed border-border px-5 py-4 text-sm text-muted-foreground">
    <KeyRound className="h-4 w-4 shrink-0" aria-hidden />
    <span>{t("empty.body")}</span>
  </div>
);

type BuiltinRole = {
  id: string;
  builtinKey: string | null;
  name: string;
  memberCount: number;
};

const RolesTable = ({
  builtins,
  customRoles,
  language,
  roleLabels,
  onDelete,
  t,
}: {
  builtins: BuiltinRole[];
  customRoles: CustomRole[];
  language: string;
  roleLabels: Record<string, string>;
  onDelete: (role: CustomRole) => void;
  t: ReturnType<typeof useTranslation>["t"];
}) => {
  const customFormatted = useMemo(
    () =>
      customRoles.map((r) => ({
        ...r,
        updatedRelative: formatRelative(r.updatedAt, language),
      })),
    [customRoles, language]
  );

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.name")}</TableHead>
            <TableHead className="w-28">{t("table.type")}</TableHead>
            <TableHead className="w-24 text-right">
              {t("table.members")}
            </TableHead>
            <TableHead className="w-40">{t("table.updatedAt")}</TableHead>
            <TableHead className="w-24 text-right">
              {t("table.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Built-in roles — not editable, shown for orientation. */}
          {builtins.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="font-medium">
                {role.builtinKey
                  ? (roleLabels[role.builtinKey] ?? role.name)
                  : role.name}
              </TableCell>
              <TableCell>
                <TypePill system />
              </TableCell>
              <TableCell className="text-right">
                <MemberCount count={role.memberCount} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground/60">
                —
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground/60">
                —
              </TableCell>
            </TableRow>
          ))}

          {/* Custom roles — editable + deletable. */}
          {customFormatted.map((role) => (
            <TableRow key={role.id}>
              <TableCell>
                <Link
                  to={`/settings/roles/${role.id}`}
                  className="font-medium text-foreground hover:underline focus:outline-none focus-visible:underline"
                >
                  {role.name}
                </Link>
                {role.description && (
                  <p className="mt-0.5 max-w-md truncate text-xs text-muted-foreground">
                    {role.description}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <TypePill system={false} />
              </TableCell>
              <TableCell className="text-right">
                <MemberCount count={role.memberCount} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <time
                  dateTime={role.updatedAt}
                  title={new Date(role.updatedAt).toLocaleString()}
                >
                  {role.updatedRelative}
                </time>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <Link
                      to={`/settings/roles/${role.id}`}
                      aria-label={t("edit", { name: role.name })}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={t("editor.delete")}
                    onClick={() => onDelete(role)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

const MemberCount = ({ count }: { count: number }) => (
  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
    <Users className="h-3.5 w-3.5" aria-hidden />
    {count}
  </span>
);

export default RolesSection;
