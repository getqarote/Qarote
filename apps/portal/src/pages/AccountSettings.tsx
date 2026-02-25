import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useAuth } from "@/contexts/AuthContext";

const AccountSettings = () => {
  const { user } = useAuth();
  const { t } = useTranslation("portal");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("accountSettings.title")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("accountSettings.description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("accountSettings.profileInfo")}</CardTitle>
          <CardDescription>
            {t("accountSettings.profileDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {t("accountSettings.email")}
            </label>
            <p className="mt-1">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {t("accountSettings.name")}
            </label>
            <p className="mt-1">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {t("accountSettings.role")}
            </label>
            <p className="mt-1">{user?.role}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSettings;
