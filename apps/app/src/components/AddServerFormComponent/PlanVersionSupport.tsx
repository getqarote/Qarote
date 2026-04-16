import { useTranslation } from "react-i18next";

import { ArrowUpCircle, CheckCircle, Info, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useCurrentPlan } from "@/hooks/queries/usePlans";
import { useUser } from "@/hooks/ui/useUser";

const LTS_VERSIONS = ["3.12", "3.13", "4.0", "4.1"];
const ALL_3X_VERSIONS = [
  "3.13",
  "3.12",
  "3.11",
  "3.10",
  "3.9",
  "3.8",
  "3.7",
  "3.6",
  "3.5",
  "3.4",
  "3.3",
  "3.2",
  "3.1",
  "3.0",
];
const ALL_4X_VERSIONS = ["4.2", "4.1", "4.0"];

export const PlanVersionSupport = () => {
  const { t } = useTranslation("dashboard");
  const { userPlan } = useUser();
  const { data: planData, isLoading } = useCurrentPlan();

  if (isLoading || !planData) {
    return null;
  }

  const supportedVersions = planData.planFeatures.supportedRabbitMqVersions;
  const isFreePlan = userPlan === "FREE";
  const allVersions = isFreePlan
    ? LTS_VERSIONS
    : [...ALL_3X_VERSIONS, ...ALL_4X_VERSIONS];

  const ltsSummary = LTS_VERSIONS.filter((v) => supportedVersions.includes(v))
    .map((v) => `${v} ${t("ltsSuffix")}`)
    .join(", ");

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
      <Info className="h-3.5 w-3.5 shrink-0" />
      <span>
        {t("supportedOnYourPlan")} {ltsSummary || supportedVersions.join(", ")}
      </span>
      <span className="opacity-40">·</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="link"
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground underline"
          >
            {t("seeAllVersions")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-3" align="start">
          <p className="text-sm font-medium text-foreground">
            {t("versionSupportTitle")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allVersions.map((version) => {
              const isSupported = supportedVersions.includes(version);
              const isLts = LTS_VERSIONS.includes(version);
              return (
                <Badge
                  key={version}
                  variant="outline"
                  className={`flex items-center gap-1 text-xs ${
                    isSupported
                      ? "bg-success-muted text-success border-success/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {isSupported ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {version}
                  {isLts && ` ${t("ltsSuffix")}`}
                </Badge>
              );
            })}
          </div>
          {isFreePlan && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <ArrowUpCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{t("versionSupportFreeHint")}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {t("versionSupportUnsupportedHint")}
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
};
