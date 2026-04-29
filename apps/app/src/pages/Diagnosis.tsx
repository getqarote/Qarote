import { useState } from "react";
import { useTranslation } from "react-i18next";

import { RefreshCw, Zap } from "lucide-react";

import { formatRelativeAgo } from "@/lib/formatRelativeAgo";

import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";
import { DiagnosisSummary } from "@/components/diagnosis/DiagnosisSummary";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useServerContext } from "@/contexts/ServerContext";

import { useDiagnosis } from "@/hooks/queries/useDiagnosis";

export default function Diagnosis() {
  const { t } = useTranslation("diagnosis");

  const WINDOW_OPTIONS = [
    { value: 30, label: t("window.30min") },
    { value: 60, label: t("window.1h") },
    { value: 120, label: t("window.2h") },
    { value: 240, label: t("window.4h") },
    { value: 480, label: t("window.8h") },
  ];
  const { selectedServerId } = useServerContext();
  const [windowMinutes, setWindowMinutes] = useState(120);

  const {
    data,
    isLoading,
    error,
    errorCode,
    refetch,
    isRefetching,
    isPreview,
    hiddenCount,
    severitySummary,
  } = useDiagnosis(selectedServerId, windowMinutes, {
    serverExists: !!selectedServerId,
  });

  if (!selectedServerId) {
    return <NoServerConfigured />;
  }

  const isPreconditionFailed = errorCode === "PRECONDITION_FAILED";
  const isForbidden = errorCode === "FORBIDDEN";

  const diagnoses = data?.diagnoses ?? [];

  // Prefer backend-computed summary (always covers ALL diagnoses including
  // hidden ones, giving free users an accurate urgency signal).
  // Fall back to local computation only if the backend field is absent
  // (e.g. during a rolling deploy before the new API is live).
  const summary = severitySummary ?? {
    total: diagnoses.length,
    critical: diagnoses.filter((d) => d.severity === "CRITICAL").length,
    high: diagnoses.filter((d) => d.severity === "HIGH").length,
    medium: diagnoses.filter((d) => d.severity === "MEDIUM").length,
    low: diagnoses.filter((d) => d.severity === "LOW").length,
    info: diagnoses.filter((d) => d.severity === "INFO").length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={String(windowMinutes)}
            onValueChange={(v) => setWindowMinutes(Number(v))}
          >
            <SelectTrigger className="w-[110px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOW_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`}
            />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Metadata row */}
        {data && (
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              {t("metadata.analyzedAgo", {
                time: formatRelativeAgo(data.analyzedAt, t("justNow")),
              })}
            </span>
            <span>·</span>
            <span>
              {t("metadata.snapshots", { count: data.snapshotCount })}
            </span>
            <span>·</span>
            <span>{t("metadata.queues", { count: data.queueCount })}</span>
            <span>·</span>
            <span>{t("metadata.window", { minutes: data.windowMinutes })}</span>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card h-32 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Forbidden — plan upgrade required (legacy — now soft-previewed) */}
        {!isLoading && isForbidden && (
          <div className="rounded-lg border border-border bg-card px-6 py-10 text-center space-y-2">
            <p className="font-medium text-foreground">
              {t("error.forbidden")}
            </p>
          </div>
        )}

        {/* Precondition failed — no snapshots yet */}
        {!isLoading && isPreconditionFailed && (
          <div className="rounded-lg border border-border bg-card px-6 py-10 text-center space-y-2">
            <p className="font-medium text-foreground">
              {t("empty.noSnapshots")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("empty.noSnapshotsDescription")}
            </p>
          </div>
        )}

        {/* Generic error */}
        {!isLoading && error && !isPreconditionFailed && !isForbidden && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-8 text-center space-y-3">
            <p className="text-sm text-destructive">{t("error.generic")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t("refresh")}
            </Button>
          </div>
        )}

        {/* Empty — no anomalies */}
        {!isLoading &&
          !error &&
          diagnoses.length === 0 &&
          data &&
          !isPreview && (
            <div className="rounded-lg border border-border bg-card px-6 py-10 text-center space-y-2">
              <p className="font-medium text-foreground">{t("empty.title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("empty.description", { minutes: windowMinutes })}
              </p>
            </div>
          )}

        {/* Results */}
        {!isLoading && !error && diagnoses.length > 0 && (
          <div className="space-y-4">
            <DiagnosisSummary summary={summary} />
            {diagnoses.map((d) => (
              <DiagnosisCard
                key={`${d.queueName}-${d.vhost}-${d.rule}`}
                rule={d.rule}
                severity={d.severity}
                queueName={d.queueName}
                vhost={d.vhost}
                description={d.description}
                recommendation={d.recommendation}
                timeline={d.timeline}
                detectedAt={d.detectedAt}
              />
            ))}
          </div>
        )}

        {/* Soft-preview teaser — shown when backend has hidden findings */}
        {!isLoading && !error && isPreview && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                {hiddenCount > 0
                  ? t("preview.bannerHidden", { count: hiddenCount })
                  : t("preview.banner", {
                      shown: diagnoses.length,
                      total: diagnoses.length + hiddenCount,
                    })}
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              className="shrink-0 text-xs h-7"
              onClick={() =>
                window.open(
                  "https://qarote.io/pricing",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              {t("preview.upgrade")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
