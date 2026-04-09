import { useTranslation } from "react-i18next";

import { Building2 } from "lucide-react";

import { OrgMyInvitationsCard } from "./OrgMyInvitationsCard";

/**
 * Render branch for users who aren't in an organization yet. Shows a
 * small header explaining the state, then — if they've been invited
 * somewhere — the list of pending invitations they can accept.
 *
 * First-time users hit this view right after sign-up. Accepting an
 * invitation from here automatically moves them into the "in org"
 * branch on the next render cycle (the TanStack Query cache
 * invalidates `getCurrent` and the parent re-renders).
 */
export function NoOrgView() {
  const { t } = useTranslation("profile");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-semibold">{t("org.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("org.notInOrg")}</p>
        </div>
      </div>
      <OrgMyInvitationsCard alreadyInOrg={false} />
    </div>
  );
}
