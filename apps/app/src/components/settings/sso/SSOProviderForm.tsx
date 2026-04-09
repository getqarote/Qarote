import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";

import {
  useRegisterSsoProvider,
  useUpdateSsoProvider,
} from "@/hooks/queries/useSsoProvider";

import { DeleteSSOProviderDialog } from "./DeleteSSOProviderDialog";
import { SSOCallbackUrlsCard } from "./SSOCallbackUrlsCard";
import { SSODomainCard } from "./SSODomainCard";
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
 * `mode`:
 *
 *   - `mode: "setup"` — empty initial values, register mutation,
 *     no delete button, callback URLs card shows "save first"
 *   - `mode: "edit"` — hydrated from existing provider, update
 *     mutation, delete button, callback URLs card shows the real
 *     registered URLs
 *
 * The original code had two separate ~240-line components
 * (`SSOForm` and `SetupForm`) that were ~90% duplicated — identical
 * cards, identical fields, identical layout, but each with their own
 * local state and their own differently-named handlers. Collapsing
 * them into a single parametric form makes future changes land in
 * one place.
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
          props.mode === "edit"
            ? t("description")
            : t("setupDescription", {
                defaultValue:
                  "Configure your SSO provider to enable single sign-on.",
              })
        }
      />

      <SSOProtocolCard values={values} onChange={handlePatch} />

      <SSOCallbackUrlsCard
        type={values.type}
        oidcCallbackUrl={oidcCallbackUrl}
        samlAcsUrl={samlAcsUrl}
      />

      <SSODomainCard
        value={values.domain}
        onChange={(domain) => handlePatch({ domain })}
      />

      <Card>
        <CardFooter className="pt-6 flex justify-between">
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
            ) : (
              t("save")
            )}
          </Button>

          {props.mode === "edit" && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
              {t("delete", { defaultValue: "Delete provider" })}
            </Button>
          )}
        </CardFooter>
      </Card>

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
