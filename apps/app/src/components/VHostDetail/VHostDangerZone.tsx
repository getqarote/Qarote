import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

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
    <div className="rounded-lg border border-destructive/30 overflow-hidden">
      <div className="px-4 py-3 bg-destructive/5 border-b border-destructive/30">
        <h2 className="title-section text-destructive">{t("dangerZone")}</h2>
      </div>
      <div className="p-4">
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
      </div>
    </div>
  );
}
