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

interface VHostPermission {
  user: string;
  vhost: string;
  configure: string;
  write: string;
  read: string;
}

interface VHostPermissionsTableProps {
  permissions: VHostPermission[];
  /**
   * The user whose permission row is currently being cleared, or null if
   * no clear is in flight. Only that row's Clear button shows the loading
   * state — we do not globally disable every row's button.
   */
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
                <TableHead>{t("user")}</TableHead>
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
                  const isPending = pendingUser === permission.user;
                  return (
                    <TableRow key={permission.user}>
                      <TableCell className="font-medium">
                        {permission.user}
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
                          onClick={() => onClear(permission.user)}
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
