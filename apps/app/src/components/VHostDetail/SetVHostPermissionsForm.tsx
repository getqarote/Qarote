import { ReactNode, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PixelChevronDown } from "@/components/ui/pixel-chevron-down";
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

function validateRegex(pattern: string): string | null {
  try {
    new RegExp(pattern);
    return null;
  } catch {
    return "invalid";
  }
}

interface SetVHostPermissionsFormProps {
  users: Array<{ name: string }>;
  selectedUser: string;
  onSelectedUserChange: (user: string) => void;
  configureRegexp: string;
  onConfigureRegexpChange: (value: string) => void;
  writeRegexp: string;
  onWriteRegexpChange: (value: string) => void;
  readRegexp: string;
  onReadRegexpChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function SetVHostPermissionsForm({
  users,
  selectedUser,
  onSelectedUserChange,
  configureRegexp,
  onConfigureRegexpChange,
  writeRegexp,
  onWriteRegexpChange,
  readRegexp,
  onReadRegexpChange,
  onSubmit,
  isPending,
}: SetVHostPermissionsFormProps) {
  const { t } = useTranslation("vhosts");
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
        {t("setPermission")}
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
        <PixelChevronDown className="h-2 w-auto shrink-0 text-muted-foreground" />
      </button>
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("user")}
            </label>
            <Select
              value={selectedUser}
              onValueChange={onSelectedUserChange}
              disabled={users.length === 0}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users.length > 0 ? (
                  users.map((user) => (
                    <SelectItem key={user.name} value={user.name}>
                      {user.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="admin">admin</SelectItem>
                )}
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
            tooltip={t("readRegexp")}
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
        placeholder=".*"
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
