import { useTranslation } from "react-i18next";

import { ArrowUpCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useCurrentPlan } from "@/hooks/queries/usePlans";

interface ConfirmConnectionCardProps {
  version?: string;
  clusterName?: string;
  host: string;
  onUpgrade?: () => void;
}

export const ConfirmConnectionCard = ({
  version,
  clusterName,
  host,
  onUpgrade,
}: ConfirmConnectionCardProps) => {
  const { t } = useTranslation("dashboard");
  const { data: planData } = useCurrentPlan();

  const supportedVersions = planData?.planFeatures.supportedRabbitMqVersions;
  // Compare on the major.minor prefix — supported list is e.g. ["3.12", "3.13"]
  const detectedMajorMinor = version?.split(".").slice(0, 2).join(".");
  const isUnsupported =
    !!detectedMajorMinor &&
    !!supportedVersions &&
    !supportedVersions.includes(detectedMajorMinor);

  if (isUnsupported) {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning-muted p-4 space-y-3">
        <div className="flex items-start gap-3">
          <ArrowUpCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {t("unsupportedVersionTitle")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("unsupportedVersionDescription", { version })}
            </p>
          </div>
        </div>
        {onUpgrade && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onUpgrade}
            className="w-full sm:w-auto"
          >
            {t("upgradePlan")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-success/30 bg-success-muted p-4 space-y-3">
      <div className="flex items-center gap-2 text-success">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">{t("connectionConfirmed")}</p>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        {version && (
          <div className="space-y-0.5">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("detectedVersionLabel")}
            </dt>
            <dd className="font-mono text-foreground">{version}</dd>
          </div>
        )}
        {clusterName && (
          <div className="space-y-0.5">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("detectedClusterLabel")}
            </dt>
            <dd className="font-mono text-foreground truncate">
              {clusterName}
            </dd>
          </div>
        )}
        <div className="space-y-0.5">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("detectedHostLabel")}
          </dt>
          <dd className="font-mono text-foreground truncate">{host}</dd>
        </div>
      </dl>
    </div>
  );
};
