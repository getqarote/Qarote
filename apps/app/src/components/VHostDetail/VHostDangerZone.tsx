import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VHostDangerZoneProps {
  vhostName: string;
  onDeleteClick: () => void;
}

export function VHostDangerZone({
  vhostName,
  onDeleteClick,
}: VHostDangerZoneProps) {
  const { t } = useTranslation("vhosts");

  const isDefault = vhostName === "/";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="title-section text-destructive">
          {t("dangerZone")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={onDeleteClick}
          disabled={isDefault}
          title={isDefault ? t("cannotDeleteDefault") : undefined}
        >
          {t("deleteVhost")}
        </Button>
        {isDefault && (
          <p className="text-sm text-muted-foreground mt-2">
            {t("cannotDeleteDefault")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
