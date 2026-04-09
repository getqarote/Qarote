import { useId } from "react";
import { useTranslation } from "react-i18next";

import { AlertCircle, CheckCircle, Loader2, Wifi } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useTestSsoConnection } from "@/hooks/queries/useSsoProvider";

import type { SSOFormValues, SSOProviderType } from "./types";

interface SSOProtocolCardProps {
  values: SSOFormValues;
  onChange: (patch: Partial<SSOFormValues>) => void;
}

/**
 * The protocol configuration card shared by both the edit and the
 * setup forms. Contains:
 *
 *   - A type picker (OIDC vs SAML 2.0)
 *   - OIDC fields: discovery URL with inline "Test connection" button,
 *     client ID, client secret
 *   - SAML fields: metadata URL
 *
 * The parent owns the form state and passes it down via `values` +
 * `onChange`. This lets both the edit form (hydrated from an existing
 * provider) and the setup form (starting empty) share exactly the
 * same UI — the original code duplicated 150 lines between `SSOForm`
 * and `SetupForm` that differed only in initial values.
 *
 * The test-connection mutation is owned here rather than at the
 * parent, because the result toast and the inline success/error
 * message only matter inside this card — the parent doesn't need
 * to coordinate them.
 */
export function SSOProtocolCard({ values, onChange }: SSOProtocolCardProps) {
  const { t } = useTranslation("sso");
  const fieldId = useId();

  const testMutation = useTestSsoConnection({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(t("testSuccess", { issuer: data.issuer }));
      } else {
        toast.error(data.error || t("testError"));
      }
    },
    onError: (error) => toast.error(error.message || t("testError")),
  });

  const handleTestConnection = () => {
    if (!values.oidcDiscoveryUrl) {
      toast.error(t("discoveryUrlRequired"));
      return;
    }
    testMutation.mutate({ discoveryUrl: values.oidcDiscoveryUrl });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("protocol")}</CardTitle>
        <CardDescription>{t("protocolDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t("ssoType")}</Label>
          <Select
            value={values.type}
            onValueChange={(v) => onChange({ type: v as SSOProviderType })}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oidc">OIDC {t("recommended")}</SelectItem>
              <SelectItem value="saml">SAML 2.0</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {values.type === "oidc" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-discovery-url`}>
                {t("oidcDiscoveryUrl")}
              </Label>
              <div className="flex gap-2">
                <Input
                  id={`${fieldId}-discovery-url`}
                  placeholder="https://your-idp.com/realms/qarote/.well-known/openid-configuration"
                  value={values.oidcDiscoveryUrl}
                  onChange={(e) =>
                    onChange({ oidcDiscoveryUrl: e.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleTestConnection}
                  disabled={testMutation.isPending || !values.oidcDiscoveryUrl}
                  title={t("testConnection")}
                  aria-label={t("testConnection")}
                >
                  {testMutation.isPending ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Wifi className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
              {testMutation.data && (
                <TestConnectionResult result={testMutation.data} />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-client-id`}>
                {t("oidcClientId")}
              </Label>
              <Input
                id={`${fieldId}-client-id`}
                placeholder="qarote"
                value={values.oidcClientId}
                onChange={(e) => onChange({ oidcClientId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-client-secret`}>
                {t("oidcClientSecret")}
              </Label>
              <Input
                id={`${fieldId}-client-secret`}
                type="password"
                placeholder={t("clientSecretPlaceholder")}
                value={values.oidcClientSecret}
                onChange={(e) => onChange({ oidcClientSecret: e.target.value })}
                autoComplete="new-password"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-saml-metadata`}>
              {t("samlMetadataUrl")}
            </Label>
            <Input
              id={`${fieldId}-saml-metadata`}
              placeholder="https://your-idp.com/metadata.xml"
              value={values.samlMetadataUrl}
              onChange={(e) => onChange({ samlMetadataUrl: e.target.value })}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Inline success/error indicator rendered below the discovery URL
 * input after a test-connection attempt. Separate from the toast
 * because the operator often wants to see the result persist on
 * screen while they debug — toasts disappear after a few seconds.
 */
function TestConnectionResult({
  result,
}: {
  result: { success: boolean; issuer?: string; error?: string };
}) {
  const { t } = useTranslation("sso");

  if (result.success) {
    return (
      <div className="mt-1 flex items-center gap-2 text-success text-sm">
        <CheckCircle className="h-4 w-4" aria-hidden="true" />
        <span>{t("testSuccess", { issuer: result.issuer })}</span>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-2 text-destructive text-sm">
      <AlertCircle className="h-4 w-4" aria-hidden="true" />
      <span>{result.error}</span>
    </div>
  );
}
