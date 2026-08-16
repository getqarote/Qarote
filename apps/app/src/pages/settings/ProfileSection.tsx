import { useTranslation } from "react-i18next";

import { ConnectedAccountsCard } from "@/components/profile/ConnectedAccountsCard";
import { DeleteAccountCard } from "@/components/profile/DeleteAccountCard";
import { IdentityCard } from "@/components/profile/IdentityCard";
import { PasswordCard } from "@/components/profile/PasswordCard";
import { ProfileLoading } from "@/components/profile/ProfileLoading";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useProfile } from "@/hooks/queries/useProfile";

/**
 * `/settings/profile` — the operator's personal account. A SectionHead over a
 * stack of cards (prototype `.scard`): identity, password (password accounts
 * only), connected accounts + sessions, and the delete-account danger zone.
 * Each card owns its own form state and mutations; this shell just composes
 * them.
 */
const ProfileSection = () => {
  const { t } = useTranslation("profile");
  const { data: profileData, isLoading } = useProfile();
  const profile = profileData?.user;

  if (isLoading) {
    return <ProfileLoading />;
  }

  if (!profile) {
    return (
      <Alert>
        <AlertDescription>{t("failedToLoad")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("section.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("section.subtitle")}
        </p>
      </div>

      <IdentityCard profile={profile} />

      {/* Password only for password accounts — social/SSO-only has none. */}
      {profile.authProvider === "password" && <PasswordCard />}

      <ConnectedAccountsCard email={profile.email} />

      {profile.email && <DeleteAccountCard email={profile.email} />}
    </div>
  );
};

export default ProfileSection;
