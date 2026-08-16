import { useTranslation } from "react-i18next";

import { ArrowUpCircle, CheckCircle2 } from "lucide-react";

import type { ParsedRabbitMQUrl, Provenance } from "@/lib/rabbitmqUrlParser";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import { useCurrentPlan } from "@/hooks/queries/usePlans";

/** The connection fields surfaced in the detection table. */
interface DetectedValues {
  host: string;
  port: number;
  amqpPort: number;
  useHttps: boolean;
  username?: string;
  password?: string;
  vhost?: string;
}

interface ConfirmConnectionCardProps {
  version?: string;
  clusterName?: string;
  /** Current connection values to display in the detection table. */
  values: DetectedValues;
  /** Per-field provenance from the URL parse, when the user pasted a URL. */
  provenance?: ParsedRabbitMQUrl["provenance"];
  onUpgrade?: () => void;
}

const PILL_STYLES: Record<Provenance, string> = {
  detected: "border-success/40 bg-success-muted text-success",
  inferred: "border-primary/40 bg-accent text-primary",
  defaulted: "border-border text-muted-foreground",
};

export const ConfirmConnectionCard = ({
  version,
  clusterName,
  values,
  provenance,
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
      <div className="space-y-3 rounded-lg border border-warning/40 bg-warning-muted p-4">
        <div className="flex items-start gap-3">
          <ArrowUpCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
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

  // Reached via "Detect →" the card shows what was parsed from the URL with no
  // live round-trip, so version/cluster are absent. Reached via "Test
  // connection" the broker actually responded — reflect that in the header.
  const isLiveConnection = !!version;
  const p = provenance;
  const masked = values.password
    ? "•".repeat(Math.min(values.password.length, 12))
    : "—";

  const rows: Array<{ label: string; value: string; prov: Provenance }> = [
    {
      label: t("prov.host"),
      value: values.host || "—",
      prov: p?.host ?? "detected",
    },
    {
      label: t("prov.mgmtPort"),
      value: String(values.port ?? ""),
      prov: p?.port ?? "detected",
    },
    {
      label: t("prov.amqpPort"),
      value: String(values.amqpPort ?? ""),
      prov: p?.amqpPort ?? "detected",
    },
    {
      label: t("prov.tls"),
      value: values.useHttps ? t("prov.tlsOn") : t("prov.tlsOff"),
      prov: p?.useHttps ?? "detected",
    },
    {
      label: t("prov.username"),
      value: values.username || "—",
      prov: p?.username ?? (values.username ? "detected" : "defaulted"),
    },
    {
      label: t("prov.password"),
      value: masked,
      prov: values.password ? "detected" : "defaulted",
    },
    {
      label: t("prov.vhost"),
      value: values.vhost || "/",
      prov: p?.vhost ?? (values.vhost ? "detected" : "defaulted"),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-success">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">
          {isLiveConnection
            ? t("connectionConfirmed")
            : t("connectionDetected")}
        </p>
      </div>

      {(version || clusterName) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {version && (
            <span>
              {t("detectedVersionLabel")}:{" "}
              <span className="font-mono text-foreground">{version}</span>
            </span>
          )}
          {clusterName && (
            <span className="truncate">
              {t("detectedClusterLabel")}:{" "}
              <span className="font-mono text-foreground">{clusterName}</span>
            </span>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        {rows.map((r) => (
          <div
            key={r.label}
            className="grid grid-cols-[120px_1fr_auto] items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
          >
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {r.label}
            </span>
            <span className="truncate font-mono text-sm text-foreground">
              {r.value}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
                PILL_STYLES[r.prov]
              )}
            >
              {t(`prov.${r.prov}`)}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("prov.legend")}
      </p>
    </div>
  );
};
