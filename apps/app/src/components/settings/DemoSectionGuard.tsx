import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";

import { Lock } from "lucide-react";

import { isDemoMode } from "@/lib/runtimeConfig";

import type { ReactNode } from "react";

/**
 * Sections hidden on the public demo. Everything here is either an account or
 * tenancy surface that has no meaning on a shared showcase (members, roles,
 * SSO, SMTP, billing, audit) or, in the case of `llm`, a place where a visitor
 * would be invited to paste an API key onto a server they do not own.
 *
 * `agent-access` is deliberately NOT here: minting and managing an agent key is
 * the demo's headline flow, and the cockpit's "Manage keys" button routes
 * straight to it.
 *
 * This is presentation only. It removes the invitation, not the capability —
 * the procedures remain reachable over the API, so the server-side demo guard
 * is what actually prevents writes and LLM spend.
 */
const DEMO_BLOCKED_SECTIONS = new Set([
  "llm",
  "members",
  "roles",
  "sso",
  "smtp",
  "license",
  "organization",
  "plans",
  "team",
  "audit",
  "digest",
]);

export function DemoSectionGuard({ children }: { children: ReactNode }) {
  const { t } = useTranslation("settings");
  const { pathname } = useLocation();

  if (!isDemoMode()) return <>{children}</>;

  // First segment after /settings/ — "roles/new" and "roles/:id" resolve to
  // "roles" so nested routes inherit the parent's decision.
  const section = pathname.split("/settings/")[1]?.split("/")[0] ?? "";
  if (!DEMO_BLOCKED_SECTIONS.has(section)) return <>{children}</>;

  return (
    <div className="rounded-lg border border-border bg-card px-6 py-8 text-center">
      <Lock
        className="mx-auto mb-3 h-5 w-5 text-muted-foreground"
        aria-hidden="true"
      />
      <h2 className="title-section text-foreground">
        {t("demoBlocked.heading")}
      </h2>
      <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
        {t("demoBlocked.body")}
      </p>
    </div>
  );
}
