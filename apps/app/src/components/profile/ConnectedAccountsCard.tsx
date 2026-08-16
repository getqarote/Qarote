import { useTranslation } from "react-i18next";

import { Building2, Loader2, Mail, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alertDialog";
import { Button } from "@/components/ui/button";

import {
  FAILED_TO_UNLINK_LAST_ACCOUNT,
  useConnectedAccounts,
  useUnlinkAccount,
} from "@/hooks/queries/useConnectedAccounts";
import { useRevokeOtherSessions } from "@/hooks/queries/useSessions";

import { VerifyChip } from "./VerifyChip";

/** Brand-colored Google "G" (prototype `.chan__ic`). */
function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.2 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5Z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 16 3 9.1 7.6 6.3 14.7Z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.6 35.6 26.9 37 24 37c-5.2 0-9.6-3.5-11.2-8.3l-6.5 5C9.1 40.4 16 45 24 45Z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5C39.9 41 44 36 44 24c0-1.2-.1-2.3-.4-3.5Z"
      />
    </svg>
  );
}

/**
 * "Connected accounts" card (prototype `.scard`): the sign-in methods linked to
 * the account, each unlinkable unless it's the last (better-auth enforces that
 * server-side; we also hide the control when only one remains). Carries the
 * "Active sessions" row too, matching the prototype's single card.
 */
export function ConnectedAccountsCard({ email }: { email: string }) {
  const { t } = useTranslation("profile");
  const { data: accounts, isLoading } = useConnectedAccounts();
  const unlink = useUnlinkAccount();
  const revoke = useRevokeOtherSessions();

  const handleUnlink = (providerId: string, accountId: string) => {
    if (unlink.isPending) return;
    unlink.mutate(
      { providerId, accountId },
      {
        onSuccess: () => toast.success(t("connectedAccounts.unlinkSuccess")),
        onError: (err) =>
          toast.error(
            err.message === FAILED_TO_UNLINK_LAST_ACCOUNT
              ? t("connectedAccounts.lastAccountError")
              : t("connectedAccounts.unlinkError")
          ),
      }
    );
  };

  const handleRevoke = () => {
    if (revoke.isPending) return;
    revoke.mutate(undefined, {
      onSuccess: () => toast.success(t("sessions.revokedSuccess")),
      onError: () => toast.error(t("sessions.revokedFailed")),
    });
  };

  const canUnlink = (accounts?.length ?? 0) > 1;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold">{t("connectedAccounts.title")}</h3>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-2">
          {(accounts ?? []).map((account) => {
            // Anything that isn't the password "credential" or a known social
            // provider is an SSO link; its raw providerId (e.g. "org-{id}")
            // must not leak — collapse to a generic label + icon.
            const kind =
              account.providerId === "credential"
                ? "credential"
                : account.providerId === "google"
                  ? "google"
                  : "sso";
            const label = t(`connectedAccounts.providers.${kind}`);
            const isUnlinking =
              unlink.isPending &&
              unlink.variables?.accountId === account.accountId;

            return (
              <div
                key={account.id}
                className="flex items-center gap-3 border-b border-border py-3.5 first:pt-2"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary"
                  aria-hidden="true"
                >
                  {kind === "google" ? (
                    <GoogleGlyph />
                  ) : kind === "credential" ? (
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {email}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <VerifyChip verified>
                    {t("connectedAccounts.connected")}
                  </VerifyChip>
                  {canUnlink && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={unlink.isPending}
                          aria-label={t("connectedAccounts.unlinkProvider", {
                            provider: label,
                          })}
                        >
                          {isUnlinking && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          )}
                          {t("connectedAccounts.disconnect")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("connectedAccounts.confirmTitle")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("connectedAccounts.confirmDesc", {
                              provider: label,
                            })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {t("connectedAccounts.cancel")}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              handleUnlink(
                                account.providerId,
                                account.accountId
                              )
                            }
                          >
                            {t("connectedAccounts.confirm")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            );
          })}

          {/* Active sessions (prototype merges this row into the card). */}
          <div className="flex items-center gap-3 py-3.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary"
              aria-hidden="true"
            >
              <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t("sessions.title")}</p>
              <p className="text-xs text-muted-foreground">
                {t("sessions.hint")}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={revoke.isPending}
                >
                  {revoke.isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {t("sessions.signOutOthers")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("sessions.confirmTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("sessions.confirmDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("sessions.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRevoke}>
                    {t("sessions.confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}
