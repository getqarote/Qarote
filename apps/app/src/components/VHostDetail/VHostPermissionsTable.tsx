import { useState } from "react";
import { useTranslation } from "react-i18next";

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

interface VHostPermission {
  user: string;
  vhost: string;
  configure: string;
  write: string;
  read: string;
}

interface VHostPermissionsTableProps {
  permissions: VHostPermission[];
  pendingUser: string | null;
  onClear: (username: string) => void;
}

export function VHostPermissionsTable({
  permissions,
  pendingUser,
  onClear,
}: VHostPermissionsTableProps) {
  const { t } = useTranslation("vhosts");
  const [clearConfirmUser, setClearConfirmUser] = useState<string | null>(null);

  const handleConfirmClear = () => {
    if (clearConfirmUser) {
      onClear(clearConfirmUser);
      setClearConfirmUser(null);
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="title-section">{t("permissions")}</h2>
          <Badge variant="secondary">{permissions.length}</Badge>
        </div>

        {permissions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t("noPermissions")}
          </div>
        ) : (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full min-w-[540px]">
              <thead>
                <tr className="bg-muted/20 text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">
                    {t("user")}
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
                {permissions.map((permission) => {
                  const isPending = pendingUser === permission.user;
                  return (
                    <tr
                      key={permission.user}
                      className="hover:bg-accent transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-sm font-medium truncate">
                        {permission.user}
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
                          onClick={() => setClearConfirmUser(permission.user)}
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
        )}
      </div>

      <AlertDialog
        open={clearConfirmUser !== null}
        onOpenChange={(open) => {
          if (!open) setClearConfirmUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clearPermissionsTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("clearPermissionsDescription", {
                user: clearConfirmUser,
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
