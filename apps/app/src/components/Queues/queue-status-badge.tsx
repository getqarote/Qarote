import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";

const STATE_STYLES: Record<string, string> = {
  running: "bg-success-muted text-success hover:bg-success-muted",
  down: "bg-destructive/10 text-destructive hover:bg-destructive/10",
  crashed: "bg-destructive/10 text-destructive hover:bg-destructive/10",
  stopped: "bg-muted text-muted-foreground hover:bg-muted",
  minority: "bg-warning-muted text-warning hover:bg-warning-muted",
};

const STATE_KEYS: Record<string, string> = {
  running: "stateRunning",
  down: "stateDown",
  crashed: "stateCrashed",
  stopped: "stateStopped",
  minority: "stateMinority",
};

const TOOLTIP_KEYS: Record<string, string> = {
  down: "stateDownTooltip",
  crashed: "stateCrashedTooltip",
  stopped: "stateStoppedTooltip",
  minority: "stateMinorityTooltip",
};

export function QueueStatusBadge({ state }: { state: string }) {
  const { t } = useTranslation("queues");
  const normalized = (state ?? "").toString().trim().toLowerCase();
  const className = STATE_STYLES[normalized];
  const labelKey = STATE_KEYS[normalized];
  const tooltipKey = TOOLTIP_KEYS[normalized];

  if (!className) {
    return <Badge variant="outline">{state}</Badge>;
  }

  return (
    <Badge className={className} title={tooltipKey ? t(tooltipKey) : undefined}>
      {labelKey ? t(labelKey) : state}
    </Badge>
  );
}
