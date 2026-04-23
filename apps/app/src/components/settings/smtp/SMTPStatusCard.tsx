import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
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
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <div>
          <h2 className="title-section">{t("status")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("statusDescription")}
          </p>
        </div>
        <Badge variant="secondary">
          {source === "database" ? t("sourceDatabase") : t("sourceEnv")}
        </Badge>
      </div>
      <div className="p-4">
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
      </div>
    </div>
  );
}
