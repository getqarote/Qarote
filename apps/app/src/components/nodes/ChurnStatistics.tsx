import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";

interface ChurnRateItem {
  count: number;
  rate: number;
}

interface ChurnRates {
  connectionCreated: ChurnRateItem;
  connectionClosed: ChurnRateItem;
  channelCreated: ChurnRateItem;
  channelClosed: ChurnRateItem;
  queueDeclared: ChurnRateItem;
  queueCreated: ChurnRateItem;
  queueDeleted: ChurnRateItem;
}

interface ChurnStatisticsProps {
  churnRates?: ChurnRates;
  isLoading: boolean;
}

function formatRate(rate: number): string {
  return rate.toFixed(2) + "/s";
}

interface ChurnGroupProps {
  title: string;
  rows: { label: string; item: ChurnRateItem }[];
}

const ChurnGroup = ({ title, rows }: ChurnGroupProps) => (
  <div className="border border-border rounded-lg overflow-hidden">
    <div className="flex items-center px-4 py-2 border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      <span className="flex-1">{title}</span>
      <span className="w-24 text-right text-[10px] font-medium tracking-wide text-muted-foreground/70">
        rate/s
      </span>
    </div>
    <div className="divide-y divide-border">
      {rows.map(({ label, item }) => (
        <div
          key={label}
          className="flex items-center px-4 py-2.5 text-sm hover:bg-muted/20 transition-colors"
        >
          <span className="flex-1 text-xs text-muted-foreground">{label}</span>
          <span className="w-24 text-right font-mono tabular-nums text-xs">
            {formatRate(item.rate)}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export const ChurnStatistics = ({
  churnRates,
  isLoading,
}: ChurnStatisticsProps) => {
  const { t } = useTranslation("nodes");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-muted/30">
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="divide-y divide-border">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center px-4 py-2.5 gap-8">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!churnRates) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ChurnGroup
        title={t("churnStatistics.connectionOperations")}
        rows={[
          {
            label: t("churnStatistics.created"),
            item: churnRates.connectionCreated,
          },
          {
            label: t("churnStatistics.closed"),
            item: churnRates.connectionClosed,
          },
        ]}
      />
      <ChurnGroup
        title={t("churnStatistics.channelOperations")}
        rows={[
          {
            label: t("churnStatistics.created"),
            item: churnRates.channelCreated,
          },
          {
            label: t("churnStatistics.closed"),
            item: churnRates.channelClosed,
          },
        ]}
      />
      <ChurnGroup
        title={t("churnStatistics.queueOperations")}
        rows={[
          {
            label: t("churnStatistics.declared"),
            item: churnRates.queueDeclared,
          },
          {
            label: t("churnStatistics.created"),
            item: churnRates.queueCreated,
          },
          {
            label: t("churnStatistics.deleted"),
            item: churnRates.queueDeleted,
          },
        ]}
      />
    </div>
  );
};
