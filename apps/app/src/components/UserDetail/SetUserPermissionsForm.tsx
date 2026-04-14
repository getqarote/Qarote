import { ReactNode, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ChevronDown, HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
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

/**
 * Validates whether a string is a valid regular expression.
 * Returns `null` if valid, or a human-readable error string.
 */
function validateRegex(pattern: string): string | null {
  try {
    new RegExp(pattern);
    return null;
  } catch {
    return "invalid";
  }
}

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
  const [expanded, setExpanded] = useState(false);

  const configureError = useMemo(
    () => validateRegex(configureRegexp),
    [configureRegexp]
  );
  const writeError = useMemo(() => validateRegex(writeRegexp), [writeRegexp]);
  const readError = useMemo(() => validateRegex(readRegexp), [readRegexp]);

  const hasValidationErrors = configureError || writeError || readError;

  const handleSubmit = useCallback(() => {
    if (hasValidationErrors) return;
    onSubmit();
  }, [hasValidationErrors, onSubmit]);

  if (!expanded) {
    return (
      <Button
        variant="outline"
        className="rounded-none w-full justify-center"
        onClick={() => setExpanded(true)}
      >
        {t("addPermission")}
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
        <h2 className="title-section">{t("setPermission")}</h2>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="p-4">
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
            error={configureError ? t("invalidRegex") : undefined}
            hint={t("regexHint")}
          />
          <RegexField
            label={t("writeRegexp")}
            tooltip={t("writeRegexpTooltip")}
            value={writeRegexp}
            onChange={onWriteRegexpChange}
            error={writeError ? t("invalidRegex") : undefined}
            hint={t("regexHint")}
          />
          <RegexField
            label={t("readRegexp")}
            tooltip={t("readRegexpTooltip")}
            value={readRegexp}
            onChange={onReadRegexpChange}
            error={readError ? t("invalidRegex") : undefined}
            hint={t("regexHint")}
          />
          <div>
            <Button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={isPending || !!hasValidationErrors}
            >
              {isPending ? t("setting") : t("setPermission")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegexField({
  label,
  tooltip,
  value,
  onChange,
  error,
  hint,
}: {
  label: ReactNode;
  tooltip: ReactNode;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
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
        placeholder="^$"
        className={error ? "border-destructive" : undefined}
        aria-invalid={!!error}
      />
      {error ? (
        <p className="text-sm text-destructive mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      ) : null}
    </div>
  );
}
