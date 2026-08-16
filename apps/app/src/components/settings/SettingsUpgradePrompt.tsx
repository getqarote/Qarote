import type { ReactNode } from "react";

interface SettingsUpgradePromptProps {
  /**
   * Glyph rendered inside the canonical rounded-square container, e.g.
   * `<Lock className="h-6 w-6" />`. Sized by the caller.
   */
  icon: ReactNode;
  /**
   * Icon tone: "primary" (accent bg + carrot glyph — plan/enterprise gates)
   * or "muted" (permission-forbidden states).
   */
  tone?: "primary" | "muted";
  title: string;
  body: string;
  /** The CTA button(s), laid out in a centered row. */
  children?: ReactNode;
  /** Optional footer note under the CTA. */
  note?: ReactNode;
}

/**
 * The single source of truth for settings "locked / upgrade" empty states —
 * a centered card with a rounded-square icon, title, body, a centered CTA
 * row, and an optional footer note. SSO, Audit log, AI Explain, and Roles all
 * render through this so only their content differs, never the chrome.
 */
export function SettingsUpgradePrompt({
  icon,
  tone = "primary",
  title,
  body,
  children,
  note,
}: SettingsUpgradePromptProps) {
  return (
    <div className="rounded-xl border border-border bg-card px-7 py-11 text-center">
      <span
        className={`mx-auto mb-[18px] flex h-[50px] w-[50px] items-center justify-center rounded-[13px] ${
          tone === "muted"
            ? "bg-muted text-muted-foreground"
            : "bg-accent text-primary"
        }`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <h3 className="text-[19px] font-semibold tracking-tight">{title}</h3>
      <p className="mx-auto mt-2 max-w-[48ch] text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      {children ? (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {children}
        </div>
      ) : null}
      {note ? (
        <p className="mt-6 text-xs text-muted-foreground">{note}</p>
      ) : null}
    </div>
  );
}
