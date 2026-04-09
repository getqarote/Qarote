import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SMTPStatusCardProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  source: "database" | "environment";
}

/**
 * Top-level status card for the SMTP settings page. Shows the
 * enable/disable switch and a source badge (database or
 * environment) so the admin knows whether the current values were
 * configured via this UI or injected at container startup.
 */
export function SMTPStatusCard({
  enabled,
  onEnabledChange,
  source,
}: SMTPStatusCardProps) {
  const { t } = useTranslation("smtp");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("status")}</CardTitle>
          <Badge variant="secondary">
            {source === "database" ? t("sourceDatabase") : t("sourceEnv")}
          </Badge>
        </div>
        <CardDescription>{t("statusDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <Switch
            id="smtp-enabled"
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
          <Label htmlFor="smtp-enabled">
            {enabled ? t("enabled") : t("disabled")}
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
