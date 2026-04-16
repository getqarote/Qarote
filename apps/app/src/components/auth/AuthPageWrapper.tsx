import { ReactNode } from "react";

import { AuthBackground } from "@/components/auth/AuthBackground";
import { Card } from "@/components/ui/card";

interface AuthPageWrapperProps {
  children: ReactNode;
}

/**
 * Full-screen centered card wrapper used by all unauthenticated /
 * invitation-acceptance pages (sign in, sign up, accept invitation,
 * accept org invitation, verify email, reset password). Fills the
 * viewport, centers a max-width card, and hands off to whatever
 * `CardHeader` / `CardContent` the caller provides.
 *
 * Intentionally NO glassmorphism (`backdrop-blur`, `bg-card/95`,
 * `border-border/20`, `shadow-2xl`) — the original `PageWrapper`
 * used all four, which is the AI-slop tell the audit flagged. The
 * quiet default `<Card>` treatment fits the "friendly, technical,
 * trustworthy" brand and doesn't fight the operator's eye.
 *
 * `AuthBackground` adds the atmospheric layer (dot grid, floating
 * message packets, rabbit mascot) behind the card without affecting
 * card stacking or interaction — it's `pointer-events-none` and
 * `aria-hidden` throughout.
 */
export function AuthPageWrapper({ children }: AuthPageWrapperProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <AuthBackground />
      <Card className="relative w-full max-w-md">{children}</Card>
    </div>
  );
}
