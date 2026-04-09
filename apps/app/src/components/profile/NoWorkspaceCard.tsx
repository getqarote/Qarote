import { useTranslation } from "react-i18next";

import { Building2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export const NoWorkspaceCard = () => {
  const { t } = useTranslation("profile");

  return (
    <Card>
      <CardContent className="text-center py-12">
        <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium">{t("workspace.noWorkspaceTitle")}</p>
        <p className="text-sm text-muted-foreground">
          {t("workspace.noWorkspaceDesc")}
        </p>
      </CardContent>
    </Card>
  );
};
