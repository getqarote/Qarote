import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PixelChevronDown } from "@/components/ui/pixel-chevron-down";

interface SetVHostLimitsFormProps {
  maxConnections: string;
  onMaxConnectionsChange: (value: string) => void;
  maxQueues: string;
  onMaxQueuesChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function SetVHostLimitsForm({
  maxConnections,
  onMaxConnectionsChange,
  maxQueues,
  onMaxQueuesChange,
  onSubmit,
  isPending,
}: SetVHostLimitsFormProps) {
  const { t } = useTranslation("vhosts");
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <Button
        variant="outline"
        className="rounded-none w-full justify-center"
        onClick={() => setExpanded(true)}
      >
        {t("setLimits")}
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="flex items-center justify-between w-full px-4 py-3 bg-muted/30 border-b border-border hover:bg-muted/50 transition-colors"
      >
        <h2 className="title-section">{t("setLimits")}</h2>
        <PixelChevronDown className="h-4 w-auto shrink-0 text-muted-foreground" />
      </button>
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 max-w-lg">
          <div>
            <Label htmlFor="maxConnections" className="mb-2">
              {t("maxConnections")}
            </Label>
            <Input
              id="maxConnections"
              type="number"
              min="0"
              value={maxConnections}
              onChange={(e) => onMaxConnectionsChange(e.target.value)}
              placeholder={t("leaveEmptyForNoLimit")}
            />
          </div>
          <div>
            <Label htmlFor="maxQueues" className="mb-2">
              {t("maxQueues")}
            </Label>
            <Input
              id="maxQueues"
              type="number"
              min="0"
              value={maxQueues}
              onChange={(e) => onMaxQueuesChange(e.target.value)}
              placeholder={t("leaveEmptyForNoLimit")}
            />
          </div>
          <div>
            <Button
              className="btn-primary"
              onClick={onSubmit}
              disabled={isPending}
            >
              {isPending ? t("setting") : t("setLimits")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
