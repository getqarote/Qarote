import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SetUserPermissionsFormProps {
  vhosts: Array<{ name: string }>;
  vhostsLoading: boolean;
  selectedVHost: string;
  onSelectedVHostChange: (vhost: string) => void;
  configureRegexp: string;
  onConfigureRegexpChange: (value: string) => void;
  writeRegexp: string;
  onWriteRegexpChange: (value: string) => void;
  readRegexp: string;
  onReadRegexpChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function SetUserPermissionsForm({
  vhosts,
  vhostsLoading,
  selectedVHost,
  onSelectedVHostChange,
  configureRegexp,
  onConfigureRegexpChange,
  writeRegexp,
  onWriteRegexpChange,
  readRegexp,
  onReadRegexpChange,
  onSubmit,
  isPending,
}: SetUserPermissionsFormProps) {
  const { t } = useTranslation("users");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="title-section">{t("setPermission")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("virtualHost")}
            </label>
            <Select
              value={selectedVHost}
              onValueChange={onSelectedVHostChange}
              disabled={vhostsLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vhosts.map((vhost) => (
                  <SelectItem key={vhost.name} value={vhost.name}>
                    {vhost.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <RegexField
            label={t("configureRegexp")}
            tooltip={t("configureRegexpTooltip")}
            value={configureRegexp}
            onChange={onConfigureRegexpChange}
          />
          <RegexField
            label={t("writeRegexp")}
            tooltip={t("writeRegexpTooltip")}
            value={writeRegexp}
            onChange={onWriteRegexpChange}
          />
          <RegexField
            label={t("readRegexp")}
            tooltip={t("readRegexpTooltip")}
            value={readRegexp}
            onChange={onReadRegexpChange}
          />
          <div>
            <Button
              className="btn-primary"
              onClick={onSubmit}
              disabled={isPending}
            >
              {isPending ? t("setting") : t("setPermission")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Labelled regex input with a tooltip-triggered help affordance on the
 * label. The HelpCircle icon reveals the "what does this regex control"
 * explanation on hover/focus. Extracted because the three regex fields
 * (configure/write/read) were identical except for copy.
 */
function RegexField({
  label,
  tooltip,
  value,
  onChange,
}: {
  label: ReactNode;
  tooltip: ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <label className="text-sm font-medium mb-2 cursor-help flex items-center gap-1">
            {label}
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
          </label>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=".*"
      />
    </div>
  );
}
