import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { UserProfile } from "@/lib/api/authTypes";
import { logger } from "@/lib/logger";
import { displayName, initials } from "@/lib/userDisplay";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  useCancelEmailChange,
  useRequestEmailChange,
  useResendVerification,
  useUpdateProfile,
  useVerificationStatus,
} from "@/hooks/queries/useProfile";

import { VerifyChip } from "./VerifyChip";

import { extractErrorMessage } from "@/pages/settings/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Identity card (prototype `.scard` + `.avatar-up` + `.row2` + `.savebar`):
 * avatar, first/last name, and email with a verify chip. Owns its own form
 * state and mutations (Information Expert) so the page shell stays a thin
 * composition.
 *
 * Email is editable only for password accounts — a social/SSO sign-in owns the
 * address. Changing it goes through the real verification flow (new address +
 * current password → confirmation email), so a password field appears inline
 * once the email is edited rather than saving silently.
 */
export function IdentityCard({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation("profile");
  const updateProfile = useUpdateProfile();
  const requestEmailChange = useRequestEmailChange();
  const cancelEmailChange = useCancelEmailChange();
  const resendVerification = useResendVerification();
  const { data: verification } = useVerificationStatus();

  const canEditEmail = profile.authProvider === "password";

  const [firstName, setFirstName] = useState(profile.firstName ?? "");
  const [lastName, setLastName] = useState(profile.lastName ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [password, setPassword] = useState("");

  // Re-sync from the canonical profile when it changes (a save invalidates the
  // session query → refetch). Without this, inputs freeze at their initial
  // values and drift from the live header; the dirty check would also stick.
  // Password is intentionally not reset here.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setFirstName(profile.firstName ?? "");
    setLastName(profile.lastName ?? "");
    setEmail(profile.email ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile.firstName, profile.lastName, profile.email]);

  const nameDirty =
    firstName !== (profile.firstName ?? "") ||
    lastName !== (profile.lastName ?? "");
  const emailDirty =
    canEditEmail && email !== profile.email && EMAIL_RE.test(email);

  const pending = verification?.hasPendingEmailChange
    ? verification.pendingEmail
    : null;

  const busy =
    updateProfile.isPending ||
    requestEmailChange.isPending ||
    cancelEmailChange.isPending;

  // Save is live when there's something to persist; an email change additionally
  // needs the current password to authorize it.
  const canSave = nameDirty || (emailDirty && password.length > 0);

  const handleSave = async () => {
    // Guard against a double-fire (rapid click / Enter repeat) before the
    // disabled state commits — would otherwise send two email-change requests.
    if (busy || !canSave) return;
    try {
      if (nameDirty) {
        await updateProfile.mutateAsync({ firstName, lastName });
      }
      if (emailDirty) {
        await requestEmailChange.mutateAsync({ newEmail: email, password });
        // The change is pending until confirmed, so snap the input back to the
        // current address; the pending banner now carries the requested one.
        setEmail(profile.email ?? "");
        setPassword("");
        toast.success(t("toast.verificationEmailSent"));
      } else if (nameDirty) {
        toast.success(t("toast.profileUpdated"));
      }
    } catch (error) {
      logger.error("Profile save error:", error);
      toast.error(t("toast.profileUpdateFailed"), {
        description: extractErrorMessage(error),
      });
    }
  };

  const handleVerify = () => {
    if (resendVerification.isPending) return;
    resendVerification.mutate(
      { type: "SIGNUP" },
      {
        onSuccess: () => toast.success(t("toast.verificationEmailSent")),
        onError: (err) =>
          toast.error(t("identity.verifyFailed"), {
            description: extractErrorMessage(err),
          }),
      }
    );
  };

  const handleCancelEmailChange = () => {
    if (cancelEmailChange.isPending) return;
    cancelEmailChange.mutate(undefined, {
      onSuccess: () => toast.success(t("toast.emailChangeCancelled")),
      onError: (err) => toast.error(extractErrorMessage(err)),
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Avatar */}
      <div className="mb-5 flex items-center gap-4">
        {profile.image ? (
          <img
            src={profile.image}
            alt=""
            className="h-[60px] w-[60px] rounded-[14px] object-cover"
          />
        ) : (
          <span
            className="flex h-[60px] w-[60px] items-center justify-center rounded-[14px] bg-primary font-heading text-xl font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            {initials(profile)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{displayName(profile)}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {profile.email}
          </p>
        </div>
      </div>

      {/* Names */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">{t("identity.firstName")}</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">{t("identity.lastName")}</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={busy}
          />
        </div>
      </div>

      {/* Email */}
      <div className="mt-3.5 space-y-1.5">
        <Label htmlFor="email">{t("identity.email")}</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={!canEditEmail}
            disabled={busy}
            className={cn(
              "min-w-[12rem] flex-1 font-mono",
              !canEditEmail &&
                "cursor-not-allowed bg-muted/40 text-muted-foreground"
            )}
          />
          <VerifyChip verified={!!profile.emailVerified}>
            {profile.emailVerified
              ? t("identity.verified")
              : t("identity.unverified")}
          </VerifyChip>
          {!profile.emailVerified && !emailDirty && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleVerify}
              disabled={resendVerification.isPending}
            >
              {t("identity.verify")}
            </Button>
          )}
        </div>

        {/* Inline confirm: changing the email needs the current password. */}
        {emailDirty && (
          <div className="space-y-1.5 pt-1.5">
            <Label htmlFor="emailChangePassword">
              {t("identity.confirmPassword")}
            </Label>
            <Input
              id="emailChangePassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("identity.confirmPasswordPlaceholder")}
              autoComplete="current-password"
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              {t("identity.emailChangeHint")}
            </p>
          </div>
        )}

        {/* Pending email change. */}
        {pending && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning/40 bg-warning-muted px-3 py-2 text-xs text-warning">
            <span>{t("identity.pendingEmail", { email: pending })}</span>
            <button
              type="button"
              onClick={handleCancelEmailChange}
              disabled={cancelEmailChange.isPending}
              className="font-medium underline underline-offset-2 hover:no-underline"
            >
              {t("identity.cancelChange")}
            </button>
          </div>
        )}
      </div>

      {/* Save bar */}
      <div className="mt-5 flex justify-end border-t border-border pt-4">
        <Button onClick={handleSave} disabled={!canSave || busy}>
          {t("identity.save")}
        </Button>
      </div>
    </div>
  );
}
