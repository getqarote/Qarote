import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserLimitsProps {
  limits: {
    max_connections?: number;
    max_channels?: number;
  };
}

/**
 * Displays a user's connection and channel limits. Only rendered when the
 * user has at least one limit set — an empty card is noise.
 *
 * Numbers use Fragment Mono + tabular-nums because limits are the
 * operational values SREs scan for. Following the "numbers are sacred"
 * design principle.
 */
export function UserLimits({ limits }: UserLimitsProps) {
  const { t } = useTranslation("users");

  const hasConnections = limits.max_connections !== undefined;
  const hasChannels = limits.max_channels !== undefined;

  if (!hasConnections && !hasChannels) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="title-section">{t("limitsLabel")}</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
