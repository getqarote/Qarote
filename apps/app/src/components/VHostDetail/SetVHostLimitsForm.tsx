import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="title-section">{t("setLimits")}</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
