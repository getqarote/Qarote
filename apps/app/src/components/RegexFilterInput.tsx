import { forwardRef, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { AlertCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PixelX } from "@/components/ui/pixel-x";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RegexFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /**
   * Compact mode omits the regex hint (used inside toolbars where the
   * hint would compete with other UI). The placeholder still mentions
   * regex support so the feature stays discoverable.
   */
  compact?: boolean;
  /**
   * Short keyboard-shortcut hint displayed at the right edge of the
   * input (e.g. "/"). Rendered as a subtle kbd badge. Hidden while the
   * input is focused or contains text.
   */
  shortcutHint?: string;
}

/**
 * Regex filter input used on list pages. The operator types a pattern
 * and the list filters case-insensitively; invalid regexes fall back
 * to a substring match (see `filterByRegex`).
 *
 * Includes a search icon, a regex-supporting placeholder, an inline
 * clear button, an optional keyboard-shortcut badge, and a labelled
 * hint describing regex support (via `aria-describedby`). All of these
 * exist because the regex feature was previously invisible to users
 * who didn't read the source code.
 *
 * When the current value is not a valid regex, an AlertCircle icon
 * appears to the left of the clear button with a tooltip explaining
 * the fallback to substring matching. This prevents silent deception:
 * the operator asked for regex, and we quietly fell back — they
 * deserve to know.
 *
 * Forwards the ref so pages can focus it from a keyboard shortcut
 * (VHostsPage and UsersPage bind "/").
 */
export const RegexFilterInput = forwardRef<
  HTMLInputElement,
  RegexFilterInputProps
>(function RegexFilterInput(
  { value, onChange, placeholder, compact = false, shortcutHint },
  ref
) {
  const { t } = useTranslation("common");
  const [focused, setFocused] = useState(false);
  const hintId = useId();
  const hasValue = value.length > 0;
  const showShortcut = !!shortcutHint && !focused && !hasValue;

  const isRegexInvalid = useMemo(() => {
    if (!value) return false;
    try {
      new RegExp(value);
      return false;
    } catch {
      return true;
    }
  }, [value]);

  return (
    <div className="w-full max-w-sm">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={ref}
          type="text"
          role="searchbox"
          placeholder={placeholder ?? t("filterPlaceholder")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label={t("filter")}
          aria-describedby={compact ? undefined : hintId}
          aria-invalid={isRegexInvalid || undefined}
          className="pl-9 pr-16"
        />
        {showShortcut && (
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-5 items-center rounded border border-border bg-background px-1.5 font-mono text-[10px] font-semibold text-foreground/80 shadow-[0_1px_0_0_hsl(var(--border))]"
          >
            {shortcutHint}
          </kbd>
        )}
        {hasValue && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {isRegexInvalid && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="flex h-7 w-7 items-center justify-center text-warning"
                      aria-label={t("regexInvalid")}
                    >
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("regexInvalid")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange("")}
              aria-label={t("clearFilter")}
              className="h-7 w-7"
            >
              <PixelX className="h-3.5 w-auto shrink-0" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
      {!compact && (
        <p id={hintId} className="mt-1.5 text-xs text-muted-foreground">
          {t("filterHint")}
        </p>
      )}
    </div>
  );
});
