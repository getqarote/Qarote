import { useTranslation } from "react-i18next";

import { ChevronUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  VHostListItem,
  VHostsTableRow,
} from "@/components/VHostsList/VHostsTableRow";

interface VHostsTableProps {
  vhosts: VHostListItem[];
  /**
   * Builds the detail-page path for a given vhost. Passed as a route
   * (not a navigate callback) so the row can render a real `<Link>` —
   * see `VHostsTableRow` for the keyboard/screen-reader rationale.
   */
  buildHref: (vhost: VHostListItem) => string;
  onDelete: (vhost: VHostListItem) => void;
}

export function VHostsTable({ vhosts, buildHref, onDelete }: VHostsTableProps) {
  const { t } = useTranslation("vhosts");

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
                    {t("name")}
                    <ChevronUp className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>{t("usersCol")}</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    {t("ready")}
                    <ChevronUp className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    {t("unacked")}
                    <ChevronUp className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    {t("total")}
                    <ChevronUp className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">
                  {t("common:actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vhosts.map((vhost) => (
                <VHostsTableRow
                  key={vhost.name}
                  vhost={vhost}
                  href={buildHref(vhost)}
                  onDelete={() => onDelete(vhost)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
