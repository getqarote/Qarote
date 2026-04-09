import { useTranslation } from "react-i18next";

import { ChevronUp } from "lucide-react";

import type { RabbitMQUser } from "@/lib/api/userTypes";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UsersTableRow } from "@/components/UsersList/UsersTableRow";

interface UsersTableProps {
  users: RabbitMQUser[];
  /**
   * Builds the detail-page path for a given user. Passed as a route
   * (not a navigate callback) so the row can render a real `<Link>` —
   * see `UsersTableRow` for the keyboard/screen-reader rationale.
   */
  buildHref: (user: RabbitMQUser) => string;
  onDelete: (user: RabbitMQUser) => void;
}

export function UsersTable({ users, buildHref, onDelete }: UsersTableProps) {
  const { t } = useTranslation("users");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="title-section">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  <div className="flex items-center gap-1">
                    {t("nameCo")}
                    <ChevronUp className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>{t("tags")}</TableHead>
                <TableHead>{t("canAccessVhosts")}</TableHead>
                <TableHead>{t("hasPassword")}</TableHead>
                <TableHead className="w-[100px]">
                  {t("common:actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <UsersTableRow
                  key={user.name}
                  user={user}
                  href={buildHref(user)}
                  onDelete={() => onDelete(user)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
