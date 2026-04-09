import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserPermission {
  vhost: string;
  configure: string;
  write: string;
  read: string;
}

interface UserPermissionsTableProps {
  permissions: UserPermission[];
  /**
   * The vhost whose permission row is currently being cleared, or null if
   * no clear is in flight. Only that row's Clear button shows the loading
   * state — we do not globally disable every row's button, which would
   * make an operator wonder what's happening elsewhere in the table.
   */
  pendingVhost: string | null;
  onClear: (vhost: string) => void;
}

export function UserPermissionsTable({
  permissions,
  pendingVhost,
  onClear,
}: UserPermissionsTableProps) {
  const { t } = useTranslation("users");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="title-section flex items-center gap-2">
          {t("permissions")}
          <Badge variant="secondary">{permissions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("virtualHost")}</TableHead>
                <TableHead>{t("configureRegexp")}</TableHead>
                <TableHead>{t("writeRegexp")}</TableHead>
                <TableHead>{t("readRegexp")}</TableHead>
                <TableHead className="w-[100px]">
                  {t("common:actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    {t("noPermissions")}
                  </TableCell>
                </TableRow>
              ) : (
                permissions.map((permission) => {
                  const isPending = pendingVhost === permission.vhost;
                  return (
                    <TableRow key={permission.vhost}>
                      <TableCell className="font-mono text-sm">
                        {permission.vhost}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {permission.configure}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {permission.write}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {permission.read}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onClear(permission.vhost)}
                          disabled={isPending}
                        >
                          {isPending ? t("clearing") : t("clear")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
