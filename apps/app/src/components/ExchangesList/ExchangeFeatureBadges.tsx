import { useTranslation } from "react-i18next";

import { FeatureBadge } from "@/components/ui/feature-badge";

import type { ExchangeListItem } from "./types";

interface ExchangeFeatureBadgesProps {
  exchange: Pick<ExchangeListItem, "durable" | "auto_delete" | "arguments">;
}

export function ExchangeFeatureBadges({
  exchange,
}: ExchangeFeatureBadgesProps) {
  const { t } = useTranslation("exchanges");
  const hasArgs =
    exchange.arguments != null && Object.keys(exchange.arguments).length > 0;

  return (
    <>
      {exchange.durable && (
        <FeatureBadge label="D" tooltip={t("featureDurable")} />
      )}
      {exchange.auto_delete && (
        <FeatureBadge label="AD" tooltip={t("featureAutoDelete")} />
      )}
      {hasArgs && <FeatureBadge label="Args" tooltip={t("featureArgs")} />}
    </>
  );
}
