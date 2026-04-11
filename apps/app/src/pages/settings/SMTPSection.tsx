import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";

import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { UserRole } from "@/lib/api";
import { isSelfHostedMode } from "@/lib/featureFlags";

import { SMTPAuthCard } from "@/components/settings/smtp/SMTPAuthCard";
import { SMTPOAuth2Card } from "@/components/settings/smtp/SMTPOAuth2Card";
import { SMTPServerCard } from "@/components/settings/smtp/SMTPServerCard";
import { SMTPStatusCard } from "@/components/settings/smtp/SMTPStatusCard";
import { SMTPTestCard } from "@/components/settings/smtp/SMTPTestCard";
import {
  type SMTPFormValues,
  smtpFormValuesToPayload,
  type SMTPSettingsData,
  smtpSettingsToFormValues,
} from "@/components/settings/smtp/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/contexts/AuthContextDefinition";

import {
  useSelfhostedSmtpSettings,
  useSmtpUpdate,
} from "@/hooks/queries/useSelfhostedSmtp";

/**
 * SMTP settings page for self-hosted instances. Admins configure
 * host/port/credentials and verify with a test email before
 * enabling outbound email across the app (invitations,
 * verifications, alerts).
 *
 * Composition shell — all cards are extracted into
 * `components/settings/smtp/` and the form state is collapsed
 * into a single `SMTPFormValues` object so each card takes
 * `values` + a `onChange(patch)` callback.
 *
 * Hidden on cloud mode (where SMTP is managed centrally) and for
 * non-admins (who redirect to their profile instead).
 */
const SMTPSection = () => {
  const { user } = useAuth();

  const {
    data: settings,
    isLoading,
    refetch,
  } = useSelfhostedSmtpSettings({
    enabled: isSelfHostedMode() && user?.role === UserRole.ADMIN,
  });

  // Cloud mode has central SMTP, and non-admins have no business
  // here — redirect to the profile page instead of rendering an
  // empty forbidden state.
  if (!isSelfHostedMode() || (user && user.role !== UserRole.ADMIN)) {
    return <Navigate to="/settings/profile" replace />;
  }

  if (isLoading || !settings) {
    return <SMTPLoadingSkeleton />;
  }

  return (
    <SMTPForm
      key={JSON.stringify(settings)}
      initialData={settings}
      onRefetch={refetch}
    />
  );
};

export default SMTPSection;

/**
 * Inner form component — kept as a child of the section so the
 * parent can force a remount via `key` whenever the server-side
 * settings change, resetting the form to the new values without
 * needing an effect.
 */
function SMTPForm({
  initialData,
  onRefetch,
}: {
  initialData: SMTPSettingsData;
  onRefetch: () => void;
}) {
  const { t } = useTranslation("smtp");

  const [values, setValues] = useState<SMTPFormValues>(() =>
    smtpSettingsToFormValues(initialData)
  );

  const updateMutation = useSmtpUpdate({
    onSuccess: () => {
      toast.success(t("saveSuccess"));
      onRefetch();
    },
    onError: (error) => {
      toast.error(error.message || t("saveError"));
    },
  });

  const handlePatch = (patch: Partial<SMTPFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = () => {
    updateMutation.mutate(smtpFormValuesToPayload(values));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <SMTPStatusCard
        enabled={values.enabled}
        onEnabledChange={(enabled) => handlePatch({ enabled })}
        source={initialData.source}
      />

      {values.enabled && (
        <>
          <SMTPServerCard values={values} onChange={handlePatch} />
          <SMTPAuthCard values={values} onChange={handlePatch} />
          <SMTPOAuth2Card values={values} onChange={handlePatch} />
          <SMTPTestCard />
        </>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2
                  className="h-4 w-4 mr-2 animate-spin"
                  aria-hidden="true"
                />
                {t("saving")}
              </>
            ) : (
              t("save")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SMTPLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
