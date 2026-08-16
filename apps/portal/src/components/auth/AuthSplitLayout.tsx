import { ReactNode } from "react";

import { AuthPanel } from "@/components/auth/AuthPanel";

interface AuthSplitLayoutProps {
  /** The form column body (fields, captcha, buttons, footer). */
  children: ReactNode;
  /** Optional header rendered above the body inside the centered box. */
  header?: ReactNode;
}

/**
 * Split auth layout (prototype "Screen 0"): form column on the left,
 * the always-night brand panel ({@link AuthPanel}) on the right.
 *
 * Used ONLY by SignIn + SignUp. The other unauthenticated pages
 * (accept-invitation, verify-email, reset-password) keep the centered
 * `AuthPageWrapper` card.
 *
 * Layout:
 * - 50/50 grid above 880px; below it the panel is hidden and the form
 *   spans full width.
 * - The form column owns its own `overflow-y-auto` so the long sign-up
 *   form scrolls cleanly inside the column without clipping the brand top
 *   or the panel.
 * - Content is vertically centered within the scroll area and capped at
 *   380px wide, matching the prototype `.auth__box`.
 */
export function AuthSplitLayout({ children, header }: AuthSplitLayoutProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-background [@media(min-width:881px)]:grid-cols-2">
      {/* ── Form column ─────────────────────────────────────────────── */}
      <div className="flex max-h-screen flex-col overflow-y-auto p-[clamp(24px,4vw,48px)]">
        <span className="inline-flex select-none items-center gap-2 font-heading text-[19px] font-semibold tracking-tight text-foreground">
          <img
            src="/images/new_icon.svg"
            alt=""
            aria-hidden="true"
            width={16}
            height={22}
            className="h-[22px] w-auto"
          />
          Qarote
        </span>
        <div className="flex flex-1 flex-col items-center justify-center py-8">
          <div className="w-full max-w-[380px]">
            {header}
            {children}
          </div>
        </div>
      </div>

      {/* ── Brand panel (≤880px: hidden) ────────────────────────────── */}
      <AuthPanel />
    </div>
  );
}
