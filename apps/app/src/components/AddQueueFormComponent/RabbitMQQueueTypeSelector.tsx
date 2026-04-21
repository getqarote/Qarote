import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import { type RabbitMQQueueType } from "./constants";

interface RabbitMQQueueTypeSelectorProps {
  value: RabbitMQQueueType;
  onChange: (v: RabbitMQQueueType) => void;
}

const OPTIONS: Array<{
  value: RabbitMQQueueType;
  labelKey: string;
  descKey: string;
}> = [
  {
    value: "default",
    labelKey: "rabbitTypeDefault",
    descKey: "rabbitTypeDefaultDesc",
  },
  {
    value: "classic",
    labelKey: "rabbitTypeClassic",
    descKey: "rabbitTypeClassicDesc",
  },
  {
    value: "quorum",
    labelKey: "rabbitTypeQuorum",
    descKey: "rabbitTypeQuorumDesc",
  },
  {
    value: "stream",
    labelKey: "rabbitTypeStream",
    descKey: "rabbitTypeStreamDesc",
  },
];

export const RabbitMQQueueTypeSelector = ({
  value,
  onChange,
}: RabbitMQQueueTypeSelectorProps) => {
  const { t } = useTranslation("queues");
  const active = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">
        {t("rabbitTypeTitle")}
      </p>
      <div
        role="radiogroup"
        aria-label={t("rabbitTypeTitle")}
        className="inline-flex w-full rounded-md border border-border bg-muted/30 p-0.5 gap-0.5"
      >
        {OPTIONS.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(opt.labelKey)}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{t(active.descKey)}</p>
    </div>
  );
};
