import { useTranslation } from "react-i18next";

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

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border">
        <h2 className="title-section">{t("permissions")}</h2>
        <Badge variant="secondary">{permissions.length}</Badge>
      </div>

      <div className="flex items-center px-4 py-2 bg-muted/20 border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="flex-1 min-w-0">{t("user")}</span>
        <span className="w-32 text-right">{t("configureRegexp")}</span>
        <span className="w-32 text-right">{t("writeRegexp")}</span>
        <span className="w-32 text-right">{t("readRegexp")}</span>
        <span className="w-24 text-right">{t("common:actions")}</span>
      </div>

      {permissions.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          {t("noPermissions")}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {permissions.map((permission) => {
            const isPending = pendingUser === permission.user;
            return (
              <div
                key={permission.user}
                className="flex items-center px-4 py-3 hover:bg-accent transition-colors"
              >
                <span className="flex-1 min-w-0 font-mono text-sm font-medium truncate">
                  {permission.user}
                </span>
                <span className="w-32 text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {permission.configure}
                </span>
                <span className="w-32 text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {permission.write}
                </span>
                <span className="w-32 text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {permission.read}
                </span>
                <span className="w-24 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onClear(permission.user)}
                    disabled={isPending}
                  >
                    {isPending ? t("clearing") : t("clear")}
                  </Button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
