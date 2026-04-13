import { useTranslation } from "react-i18next";

import { HelpCircle } from "lucide-react";

import { Queue } from "@/lib/api";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageStatisticsProps {
  queue: Queue;
}

export function MessageStatistics({ queue }: MessageStatisticsProps) {
  const { t } = useTranslation("queues");

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <h3 className="title-section">{t("messageStatistics")}</h3>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t("ready")}</p>
            <p className="text-xl font-semibold text-foreground font-mono tabular-nums">
              {queue.messages_ready.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {t("unacknowledged")}
            </p>
            <p
              className={`text-xl font-semibold font-mono tabular-nums ${
                queue.messages_unacknowledged > 1000
                  ? "text-destructive"
                  : queue.messages_unacknowledged > 0
                    ? "text-warning"
                    : "text-foreground"
              }`}
            >
              {queue.messages_unacknowledged.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("inRam")}</p>
            <p className="text-xl font-semibold text-foreground font-mono tabular-nums">
              {queue.messages_ram?.toLocaleString() || "0"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("persistent")}</p>
            <p className="text-xl font-semibold text-foreground font-mono tabular-nums">
              {queue.messages_persistent?.toLocaleString() || "0"}
            </p>
          </div>
        </div>
        <div className="pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">
                  {t("incoming")}
                </span>
                <Tooltip>
                  <TooltipTrigger aria-label={t("incomingRateInfo")}>
                    <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{t("incomingRateTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-lg font-semibold font-mono tabular-nums">
                {queue.message_stats?.publish_details?.rate?.toFixed(2) ||
                  "0.00"}{" "}
                msg/s
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">
                  {t("deliverGet")}
                </span>
                <Tooltip>
                  <TooltipTrigger aria-label={t("deliverGetRateInfo")}>
                    <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{t("deliverGetRateTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-lg font-semibold font-mono tabular-nums">
                {queue.message_stats?.deliver_get_details?.rate?.toFixed(2) ||
                  "0.00"}{" "}
                msg/s
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">
                  {t("redelivered")}
                </span>
                <Tooltip>
                  <TooltipTrigger aria-label={t("redeliveredRateInfo")}>
                    <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{t("redeliveredRateTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-lg font-semibold font-mono tabular-nums">
                {queue.message_stats?.redeliver_details?.rate?.toFixed(2) ||
                  "0.00"}{" "}
                msg/s
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">
                  {t("ack")}
                </span>
                <Tooltip>
                  <TooltipTrigger aria-label={t("ackRateInfo")}>
                    <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{t("ackRateTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-lg font-semibold font-mono tabular-nums">
                {queue.message_stats?.ack_details?.rate?.toFixed(2) || "0.00"}{" "}
                msg/s
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
