import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ChevronLeft, ChevronRight } from "lucide-react";

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

const PAGE_SIZE = 10;

interface UserPermission {
  vhost: string;
  configure: string;
  write: string;
  read: string;
}

interface UserPermissionsTableProps {
  permissions: UserPermission[];
  pendingVhost: string | null;
  onClear: (vhost: string) => void;
}

export function UserPermissionsTable({
  permissions,
  pendingVhost,
  onClear,
}: UserPermissionsTableProps) {
  const { t } = useTranslation("users");
  const [clearConfirmVhost, setClearConfirmVhost] = useState<string | null>(
    null
  );
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(permissions.length / PAGE_SIZE);
  const paginatedPermissions = useMemo(
    () => permissions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [permissions, page]
  );
  const showPagination = permissions.length > PAGE_SIZE;

  const handleConfirmClear = () => {
    if (clearConfirmVhost) {
      onClear(clearConfirmVhost);
      setClearConfirmVhost(null);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {/* Section header */}
        <div className="flex items-center gap-2">
          <h2 className="title-section">{t("permissions")}</h2>
          <Badge variant="secondary">{permissions.length}</Badge>
        </div>

        {permissions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t("noPermissions")}
          </div>
        ) : (
          <>
            {/* Responsive scroll wrapper */}
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full min-w-[540px]">
                <thead>
                  <tr className="bg-muted/20 text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">
                      {t("virtualHost")}
                    </th>
                    <th className="w-32 px-4 py-2 text-right font-medium">
                      {t("configureRegexp")}
                    </th>
                    <th className="w-32 px-4 py-2 text-right font-medium">
                      {t("writeRegexp")}
                    </th>
                    <th className="w-32 px-4 py-2 text-right font-medium">
                      {t("readRegexp")}
                    </th>
                    <th className="w-24 px-4 py-2 text-right font-medium">
                      {t("common:actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedPermissions.map((permission) => {
                    const isPending = pendingVhost === permission.vhost;
                    return (
                      <tr
                        key={permission.vhost}
                        className="hover:bg-accent transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-sm font-medium truncate">
                          {permission.vhost === "/"
                            ? t("defaultVhost")
                            : permission.vhost}
                        </td>
                        <td className="w-32 px-4 py-3 text-right font-mono text-sm tabular-nums text-muted-foreground">
                          {permission.configure}
                        </td>
                        <td className="w-32 px-4 py-3 text-right font-mono text-sm tabular-nums text-muted-foreground">
                          {permission.write}
                        </td>
                        <td className="w-32 px-4 py-3 text-right font-mono text-sm tabular-nums text-muted-foreground">
                          {permission.read}
                        </td>
                        <td className="w-24 px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-none"
                            onClick={() =>
                              setClearConfirmVhost(permission.vhost)
                            }
                            disabled={isPending}
                          >
                            {isPending ? t("clearing") : t("clear")}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {showPagination && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {t("permissionsPagination", {
                    from: page * PAGE_SIZE + 1,
                    to: Math.min((page + 1) * PAGE_SIZE, permissions.length),
                    total: permissions.length,
                  })}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Clear confirmation dialog */}
      <AlertDialog
        open={clearConfirmVhost !== null}
        onOpenChange={(open) => {
          if (!open) setClearConfirmVhost(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clearPermissionsTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("clearPermissionsDescription", {
                vhost:
                  clearConfirmVhost === "/"
                    ? t("defaultVhost")
                    : clearConfirmVhost,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClear}
              className="border border-destructive/30 bg-background text-destructive hover:bg-destructive/10 hover:border-destructive/50 rounded-none"
            >
              {t("clearPermissions")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
