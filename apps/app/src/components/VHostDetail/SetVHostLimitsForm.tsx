import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <h2 className="title-section">{t("setLimits")}</h2>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("maxConnections")}
            </label>
            <Input
              type="number"
              min="0"
              value={maxConnections}
              onChange={(e) => onMaxConnectionsChange(e.target.value)}
              placeholder={t("leaveEmptyForNoLimit")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("maxQueues")}
            </label>
            <Input
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
