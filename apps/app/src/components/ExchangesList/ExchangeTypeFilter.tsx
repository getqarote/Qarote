import { useTranslation } from "react-i18next";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ExchangeTypeFilterValue =
  | "all"
  | "direct"
  | "fanout"
  | "topic"
  | "headers";

interface ExchangeTypeFilterProps {
  value: ExchangeTypeFilterValue;
  onChange: (value: ExchangeTypeFilterValue) => void;
}

/**
 * Tab bar for filtering the exchanges list by type. The "all" tab is
 * the default; selecting a type narrows the list below. Extracted so
 * the values are type-safe (no stray string literals) and the tab
 * ordering stays identical to the overview cards above it.
 */
export function ExchangeTypeFilter({
  value,
  onChange,
}: ExchangeTypeFilterProps) {
  const { t } = useTranslation("exchanges");

  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as ExchangeTypeFilterValue)}
    >
      <TabsList>
        <TabsTrigger value="all">{t("all")}</TabsTrigger>
        <TabsTrigger value="direct">{t("direct")}</TabsTrigger>
        <TabsTrigger value="fanout">{t("fanout")}</TabsTrigger>
        <TabsTrigger value="topic">{t("topic")}</TabsTrigger>
        <TabsTrigger value="headers">{t("headers")}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
