import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { KeyRound, Lock, Plus, Users } from "lucide-react";

import { trpc } from "@/lib/trpc/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const RolesSection = () => {
  const { t, i18n } = useTranslation("roles");
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const { userPlan } = useUser();
  const workspaceId = workspace?.id ?? "";
  const isEnterprise = userPlan === UserPlan.ENTERPRISE;

  const { data, isLoading, isError } = trpc.workspace.role.list.useQuery(
    { workspaceId, limit: 100 },
    { enabled: !!workspaceId && isEnterprise }
  );

  const items = data?.items ?? [];
  const hasRoles = items.length > 0;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground max-w-prose">
            {t("subtitle")}
          </p>
        </div>
        {isEnterprise && hasRoles && (
          <Button asChild>
            <Link to="/settings/roles/new">
              <Plus className="h-4 w-4" aria-hidden />
              {t("createButton")}
            </Link>
          </Button>
        )}
      </header>

      {/* Plan gate */}
      {!isEnterprise && <PlanGateCard />}

      {/* Plan-downgrade banner — Enterprise gate already covers Developer/Free,
          so this only fires for an edge case where a license drops mid-session.
          Defensive: if we ever surface a read-only "your custom roles exist
          but you can't edit" state, this is where it lives. */}

      {isEnterprise && (
        <>
          <BuiltinLegend t={t} />

          {isLoading && <ListSkeleton />}

          {!isLoading && isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {t("errors.loadFailed")}
            </div>
          )}

          {!isLoading && !isError && !hasRoles && (
            <EmptyState
              onCreate={() => navigate("/settings/roles/new")}
              t={t}
            />
          )}

          {!isLoading && !isError && hasRoles && (
            <RolesTable items={items} language={i18n.language} t={t} />
          )}
        </>
      )}
    </section>
  );
};

const PlanGateCard = () => {
  const { t } = useTranslation("roles");
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <span
          className="rounded-md bg-amber-500/15 p-2 text-amber-700 dark:text-amber-400"
          aria-hidden
        >
          <Lock className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">
            {t("gate.title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground max-w-prose">
            {t("gate.body")}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild variant="default">
          <Link to="/settings/subscription">{t("gate.upgradeCta")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

const BuiltinLegend = ({
  t,
}: {
  t: ReturnType<typeof useTranslation>["t"];
}) => (
  <p className="text-xs text-muted-foreground border-l border-border pl-3 py-1">
    {t("builtinLegend")}
  </p>
);

const ListSkeleton = () => (
  <Card>
    <CardContent className="p-0">
      <div className="space-y-0 divide-y divide-border">
        {Array.from({ length: 3 }).map((_, i) => (
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

const EmptyState = ({
  onCreate,
  t,
}: {
  onCreate: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}) => (
  <Card className="border-dashed">
    <CardContent className="flex flex-col items-center text-center py-12 px-6 gap-4">
      <span className="rounded-full bg-muted p-3" aria-hidden>
        <KeyRound className="h-6 w-6 text-muted-foreground" />
      </span>
      <div className="space-y-1 max-w-md">
        <h3 className="font-semibold">{t("empty.title")}</h3>
        <p className="text-sm text-muted-foreground">{t("empty.body")}</p>
      </div>
      <Button onClick={onCreate} className="mt-2">
        <Plus className="h-4 w-4" aria-hidden />
        {t("empty.cta")}
      </Button>
    </CardContent>
  </Card>
);

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  updatedAt: string;
};

const RolesTable = ({
  items,
  language,
  t,
}: {
  items: RoleRow[];
  language: string;
  t: ReturnType<typeof useTranslation>["t"];
}) => {
  const formatted = useMemo(
    () =>
      items.map((r) => ({
        ...r,
        updatedRelative: formatRelative(r.updatedAt, language),
      })),
    [items, language]
  );

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.name")}</TableHead>
            <TableHead className="w-24 text-right">
              {t("table.members")}
            </TableHead>
            <TableHead>{t("table.description")}</TableHead>
            <TableHead className="w-40">{t("table.updatedAt")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {formatted.map((role) => (
            <TableRow key={role.id}>
              <TableCell>
                <Link
                  to={`/settings/roles/${role.id}`}
                  className="font-medium text-foreground hover:underline focus-visible:underline focus:outline-none"
                >
                  {role.name}
                </Link>
              </TableCell>
              <TableCell className="text-right">
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {role.memberCount}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                {role.description || (
                  <span className="text-muted-foreground/60">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <time
                  dateTime={role.updatedAt}
                  title={new Date(role.updatedAt).toLocaleString()}
                >
                  {role.updatedRelative}
                </time>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

export default RolesSection;
