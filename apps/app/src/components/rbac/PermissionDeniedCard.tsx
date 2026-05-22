import { Link } from "react-router";

import { ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface PermissionDeniedCardProps {
  /** Translated heading, e.g. t("accessDeniedTitle"). */
  title: string;
  /** Translated body, e.g. t("accessDenied"). */
  description: string;
  /** Path the CTA navigates to (workspace pages → "/", settings → "/settings/profile"). */
  returnTo: string;
  /** Translated CTA label, e.g. t("common:backToDashboard"). */
  returnLabel: string;
}

/**
 * Empty-state Card shown when a permission check resolves to denied.
 *
 * Configures `<EmptyState>` with the RBAC convention: `ShieldOff` icon
 * (not `Lock` — locks imply "key required", which suggests a way in;
 * `ShieldOff` reads "protection withdrawn from you"), default `<Button>`
 * variant (not destructive — role demotion isn't an error), and a CTA
 * that anchors the user on a known-good route.
 *
 * i18n lives in the caller — they own their namespace and the wording
 * appropriate to it (workspace-scope "ask an admin" vs. org-scope dry
 * factual, per docs/plans/rbac-require-admin-components.md §4.5).
 */
export function PermissionDeniedCard({
  title,
  description,
  returnTo,
  returnLabel,
}: PermissionDeniedCardProps) {
  return (
    <EmptyState
      icon={ShieldOff}
      title={title}
      description={description}
      action={
        <Button asChild>
          <Link to={returnTo}>{returnLabel}</Link>
        </Button>
      }
    />
  );
}
