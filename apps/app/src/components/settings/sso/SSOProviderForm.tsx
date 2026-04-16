import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PixelTrash } from "@/components/ui/pixel-trash";

import {
  useRegisterSsoProvider,
  useUpdateSsoProvider,
} from "@/hooks/queries/useSsoProvider";

import { DeleteSSOProviderDialog } from "./DeleteSSOProviderDialog";
import { SSOCallbackUrlsCard } from "./SSOCallbackUrlsCard";
import { SSOHeader } from "./SSOHeader";
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
 * Unified SSO provider form. Handles both "set up a new provider"
 * and "edit an existing provider" via a discriminated union on
 * `mode`. The two flows share the same cards but order them
 * differently:
 *
 *   - **Setup**: Header → Protocol (with preset chips) → Save
 *     Operators configuring for the first time get a provider
 *     preset head-start, then fill in credentials, then save.
 *     The callback URLs don't exist yet, so no URLs card appears.
 *
 *   - **Edit**: Header → **Callback URLs (at top)** → Protocol →
 *     Save/Delete. Operators editing an existing provider almost
 *     always came here to copy the callback URLs into their IdP
 *     (they rarely change the client ID / secret). URLs go first
 *     so they're the first thing on screen.
 *
 * The save button used to live in its own `<Card><CardFooter>`
 * wrapper — chrome for a single button. It's now a plain flex
 * div at the bottom with save on the left and (in edit mode)
 * delete on the right.
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

  const activeMutation =
    props.mode === "edit" ? updateMutation : registerMutation;

  const handlePatch = (patch: Partial<SSOFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = () => {
    const payload = formValuesToApiPayload(values);
    if (props.mode === "edit") {
      updateMutation.mutate({
        enabled: true,
        ...payload,
      });
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
      <SSOHeader
        title={t("title")}
        description={
          props.mode === "edit" ? t("description") : t("setupDescription")
        }
      />

      {/* Edit mode surfaces callback URLs first — that's usually
          what the operator came for */}
      {props.mode === "edit" && (
        <SSOCallbackUrlsCard
          type={values.type}
          oidcCallbackUrl={oidcCallbackUrl}
          samlAcsUrl={samlAcsUrl}
        />
      )}

      <SSOProtocolCard
        values={values}
        onChange={handlePatch}
        mode={props.mode}
      />

      {/* Plain action row — no Card wrapper. Save left, delete
          right when editing (space-between), save alone when
          setting up. */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={activeMutation.isPending}
        >
          {activeMutation.isPending ? (
            <>
              <Loader2
                className="h-4 w-4 mr-2 animate-spin"
                aria-hidden="true"
              />
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
            className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          >
            <PixelTrash
              className="h-4 w-auto shrink-0 mr-2"
              aria-hidden="true"
            />
            {t("delete")}
          </Button>
        )}
      </div>

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
