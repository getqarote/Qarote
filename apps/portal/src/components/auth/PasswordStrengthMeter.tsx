import { useTranslation } from "react-i18next";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Inline password-strength feedback for sign-up — replaces the always-on list
 * of five requirement bullets with a compact 4-segment bar that colours in
 * real time, plus (only while the field is focused) a short list of the rules
 * not yet satisfied. Nothing shows until the first character is typed, so the
 * form stays calm at rest.
 *
 * The five rules mirror `passwordSchema` exactly; the score maps to four
 * buckets (weak / fair / good / strong) so the bar reads at a glance.
 */
const RULES = [
  { key: "req8Chars", test: (p: string) => p.length >= 8 },
  { key: "reqLowercase", test: (p: string) => /[a-z]/.test(p) },
  { key: "reqUppercase", test: (p: string) => /[A-Z]/.test(p) },
  { key: "reqNumber", test: (p: string) => /[0-9]/.test(p) },
  { key: "reqSpecial", test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
] as const;

// 0–5 satisfied rules → one of four buckets.
const BUCKETS = [
  {
    label: "passwordStrength.weak",
    bar: "bg-destructive",
    text: "text-destructive",
  },
  { label: "passwordStrength.fair", bar: "bg-warning", text: "text-warning" },
  { label: "passwordStrength.good", bar: "bg-primary", text: "text-primary" },
  { label: "passwordStrength.strong", bar: "bg-success", text: "text-success" },
] as const;

function bucketFor(score: number): 0 | 1 | 2 | 3 {
  if (score <= 2) return 0;
  if (score === 3) return 1;
  if (score === 4) return 2;
  return 3;
}

interface PasswordStrengthMeterProps {
  password: string;
  /** Reveal the unmet-rules hint (caller passes the field's focus state). */
  showRules?: boolean;
}

export function PasswordStrengthMeter({
  password,
  showRules,
}: PasswordStrengthMeterProps) {
  const { t } = useTranslation("auth");

  // Calm at rest — the bar only appears once the user starts typing.
  if (!password) return null;

  const results = RULES.map((r) => ({ key: r.key, ok: r.test(password) }));
  const score = results.filter((r) => r.ok).length;
  const bucket = bucketFor(score);
  const meta = BUCKETS[bucket];
  const unmet = results.filter((r) => !r.ok);

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                i <= bucket ? meta.bar : "bg-border"
              )}
            />
          ))}
        </div>
        <span
          className={cn("font-mono text-[11px] font-medium", meta.text)}
          aria-live="polite"
        >
          {t(meta.label)}
        </span>
      </div>

      {showRules && unmet.length > 0 && (
        <ul className="space-y-0.5">
          {unmet.map((r) => (
            <li
              key={r.key}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <X
                className="h-3 w-3 shrink-0 text-muted-foreground/60"
                aria-hidden="true"
              />
              {t(`passwordReq.${r.key}`)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
