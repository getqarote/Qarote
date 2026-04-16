import { useTranslation } from "react-i18next";

interface UserLimitsProps {
  limits: {
    max_connections?: number;
    max_channels?: number;
  };
}

export function UserLimits({ limits }: UserLimitsProps) {
  const { t } = useTranslation("users");

  const hasConnections = limits.max_connections !== undefined;
  const hasChannels = limits.max_channels !== undefined;

  if (!hasConnections && !hasChannels) return null;

  return (
    <div className="space-y-3">
      <h2 className="title-section">{t("limitsLabel")}</h2>
      <div className="grid grid-cols-2 gap-8">
        {hasConnections && (
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              {t("maxConnections")}
            </div>
            <div className="text-2xl font-mono tabular-nums text-foreground">
              {limits.max_connections}
            </div>
          </div>
        )}
        {hasChannels && (
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              {t("maxChannels")}
            </div>
            <div className="text-2xl font-mono tabular-nums text-foreground">
              {limits.max_channels}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
