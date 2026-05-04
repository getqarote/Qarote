import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { UserRole } from "@/lib/api";
import { trpc } from "@/lib/trpc/client";

import { PixelEmail } from "@/components/ui/pixel-email";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useWorkspace } from "@/hooks/ui/useWorkspace";

/**
 * Bottom-of-Home teaser for the Daily Digest. Quiet, optional, never
 * shouts — the digest is a habit, not an action item. Two states:
 *
 *   - Off / not configured  → invitation to set up, contextualised to
 *     the current workspace so multi-workspace users know which one
 *     they'd be enabling
 *   - On                    → confirmation it's running for this
 *     workspace + a soft link to settings
 *
 * Renders nothing for non-admin users: the underlying tRPC procedure
 * `workspace.digest.getSettings` is admin-only and throws FORBIDDEN
 * for members, which would pollute the React Query error log on every
 * Home mount. We gate at the component boundary so the request is
 * never issued for non-admins.
 */
export function HomePulse() {
  const { t } = useTranslation("dashboard");
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;

  const { data: settings, isSuccess } =
    trpc.workspace.digest.getSettings.useQuery(undefined, {
      enabled: isAdmin && !!workspace?.id,
      staleTime: 60_000,
    });

  // Hide for non-admins, while loading, on error, and when workspace
  // context isn't resolved — a teaser for an unknown destination is
  // just noise, and an error response leaves `settings` undefined.
  if (!isAdmin || !workspace || !isSuccess) return null;

  const isEnabled = settings?.enabled === true;
  // Translated fallback so the rendered copy never reads "Daily digest
  // is on for ." when `workspace.name` is null/empty.
  const workspaceName =
    workspace.name && workspace.name.length > 0
      ? workspace.name
      : t("home.pulse.workspaceFallback");
  // Don't fabricate a delivery time. If the backend hasn't scheduled
  // one yet, render the alternate subline instead of "around 08:00 UTC"
  // which would be confidently wrong.
  const scheduledTime = settings?.scheduledTime ?? null;

  return (
    <aside
      aria-label={t("home.pulse.ariaLabel")}
      className="flex items-center gap-4 rounded-lg border border-dashed border-border bg-muted/20 px-5 py-3"
    >
      <PixelEmail
        aria-hidden="true"
        className="h-5 w-auto shrink-0 text-muted-foreground"
      />
      <div className="flex-1 min-w-0">
        {isEnabled ? (
          <>
            <p className="text-sm font-medium text-foreground leading-tight">
              {t("home.pulse.enabledHeadline", { workspace: workspaceName })}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-tight">
              {scheduledTime
                ? t("home.pulse.enabledSubline", { time: scheduledTime })
                : t("home.pulse.enabledSublineNoTime")}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground leading-tight">
              {t("home.pulse.invitationHeadline")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-tight">
              {t("home.pulse.invitationSubline", { workspace: workspaceName })}
            </p>
          </>
        )}
      </div>
      <Link
        to="/settings/digest"
        className="shrink-0 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:underline"
      >
        {isEnabled ? t("home.pulse.configure") : t("home.pulse.setUp")}
      </Link>
    </aside>
  );
}
