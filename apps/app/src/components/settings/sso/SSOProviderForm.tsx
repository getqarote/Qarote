import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { IconTrash } from "@/components/ui/icons";
import { Switch } from "@/components/ui/switch";

import {
  useRegisterSsoProvider,
  useSetSsoEnforcement,
  useUpdateSsoProvider,
} from "@/hooks/queries/useSsoProvider";

import { DeleteSSOProviderDialog } from "./DeleteSSOProviderDialog";
import {
  buildOidcCallbackUrl,
  buildSamlAcsUrl,
  emptyFormValues,
  formValuesToApiPayload,
  providerConfigToFormValues,
} from "./ssoHelpers";
import { SSOProtocolCard } from "./SSOProtocolCard";
import type { ProviderConfig, SSOFormValues } from "./types";

/**
 * Unified SSO provider form. Handles both "set up a new provider" and
 * "edit an existing provider" via a discriminated union on `mode`. In
 * edit mode it also surfaces the enforcement banner (instantly toggles
 * whether password sign-in is blocked for the org) and the read-only
 * redirect URL inside the provider card.
 */
type SSOProviderFormProps =
  | {
      mode: "setup";
      onRefetch: () => void;
    }
  | {
      mode: "edit";
      initialData: ProviderConfig;
      onRefetch: () => void;
    };

export function SSOProviderForm(props: SSOProviderFormProps) {
  const { t } = useTranslation("sso");

  const [values, setValues] = useState<SSOFormValues>(() =>
    props.mode === "edit"
      ? providerConfigToFormValues(props.initialData)
      : emptyFormValues
  );
  const [enforced, setEnforced] = useState(
    props.mode === "edit" ? props.initialData.enforced : false
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const updateMutation = useUpdateSsoProvider({
    onSuccess: () => {
      toast.success(t("saveSuccess"));
      props.onRefetch();
    },
    onError: (error) => toast.error(error.message || t("saveError")),
  });

  const registerMutation = useRegisterSsoProvider({
    onSuccess: () => {
      toast.success(t("saveSuccess"));
      props.onRefetch();
    },
    onError: (error) => toast.error(error.message || t("saveError")),
  });

  const enforcementMutation = useSetSsoEnforcement({
    onError: (error) => toast.error(error.message || t("saveError")),
  });

  const activeMutation =
    props.mode === "edit" ? updateMutation : registerMutation;

  const handlePatch = (patch: Partial<SSOFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
  };

  const handleEnforce = (next: boolean) => {
    setEnforced(next); // optimistic — refetch reconciles on settle
    enforcementMutation.mutate(
      { enforced: next },
      { onError: () => setEnforced(!next) }
    );
  };

  const handleSave = () => {
    const payload = formValuesToApiPayload(values);
    if (props.mode === "edit") {
      updateMutation.mutate({ enabled: true, ...payload });
    } else {
      registerMutation.mutate(payload);
    }
  };

  const providerId =
    props.mode === "edit" ? props.initialData.providerId : undefined;
  const oidcCallbackUrl = buildOidcCallbackUrl(providerId);
  const samlAcsUrl = buildSamlAcsUrl(providerId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {props.mode === "edit" ? t("description") : t("setupDescription")}
        </p>
      </div>

      {/* Enforcement banner — edit mode only (a provider exists to enforce) */}
      {props.mode === "edit" && (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg border px-3.5 py-3 text-[13px]",
            enforced
              ? "border-success/30 bg-success-muted"
              : "border-border bg-muted/50 text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              enforced ? "bg-success" : "bg-muted-foreground/40"
            )}
            aria-hidden="true"
          />
          <p>{enforced ? t("statusEnforced") : t("statusNotEnforced")}</p>
          <Switch
            checked={enforced}
            disabled={enforcementMutation.isPending}
            onCheckedChange={handleEnforce}
            aria-label={t("enforceToggleLabel")}
            className="ml-auto"
          />
        </div>
      )}

      <SSOProtocolCard
        values={values}
        onChange={handlePatch}
        mode={props.mode}
        oidcCallbackUrl={oidcCallbackUrl}
        samlAcsUrl={samlAcsUrl}
      />

      {/* Action row — save left, delete right when editing */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={activeMutation.isPending}
        >
          {activeMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("saving")}
            </>
          ) : props.mode === "setup" ? (
            t("saveAndContinue")
          ) : (
            t("save")
          )}
        </Button>

        {props.mode === "edit" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDeleteOpen(true)}
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <IconTrash className="h-4 w-auto shrink-0" aria-hidden="true" />
            {t("delete")}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{t("formFootnote")}</p>

      {props.mode === "edit" && (
        <DeleteSSOProviderDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          onDeleted={props.onRefetch}
        />
      )}
    </div>
  );
}
