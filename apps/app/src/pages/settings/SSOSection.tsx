import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";

import {
  AlertCircle,
  CheckCircle,
  Copy,
  Loader2,
  Shield,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";

import { isSelfHostedMode } from "@/lib/featureFlags";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import { useAuth } from "@/contexts/AuthContextDefinition";

import {
  useSelfhostedSsoSettings,
  useSsoTestConnection,
  useSsoUpdate,
} from "@/hooks/queries/useSelfhostedSso";

interface SSOSettingsData {
  source: "database" | "environment";
  enabled: boolean;
  type: "oidc" | "saml";
  oidcDiscoveryUrl?: string | null;
  oidcClientId?: string | null;
  oidcClientSecret?: string | null;
  samlMetadataUrl?: string | null;
  apiUrl?: string | null;
  frontendUrl?: string | null;
  tenant?: string | null;
  product?: string | null;
  buttonLabel?: string | null;
}

function SSOForm({
  initialData,
  onRefetch,
}: {
  initialData: SSOSettingsData;
  onRefetch: () => void;
}) {
  const { t } = useTranslation("sso");

  const updateMutation = useSsoUpdate({
    onSuccess: () => {
      toast.success(t("saveSuccess"));
      onRefetch();
    },
    onError: (error) => {
      toast.error(error.message || t("saveError"));
    },
  });

  const testMutation = useSsoTestConnection({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(t("testSuccess", { issuer: data.issuer }));
      } else {
        toast.error(data.error || t("testError"));
      }
    },
    onError: (error) => {
      toast.error(error.message || t("testError"));
    },
  });

  const [enabled, setEnabled] = useState(initialData.enabled);
  const [type, setType] = useState<"oidc" | "saml">(initialData.type);
  const [oidcDiscoveryUrl, setOidcDiscoveryUrl] = useState(
    initialData.oidcDiscoveryUrl || ""
  );
  const [oidcClientId, setOidcClientId] = useState(
    initialData.oidcClientId || ""
  );
  const [oidcClientSecret, setOidcClientSecret] = useState(
    initialData.oidcClientSecret || ""
  );
  const [samlMetadataUrl, setSamlMetadataUrl] = useState(
    initialData.samlMetadataUrl || ""
  );
  const [apiUrl, setApiUrl] = useState(initialData.apiUrl || "");
  const [frontendUrl, setFrontendUrl] = useState(initialData.frontendUrl || "");
  const [tenant, setTenant] = useState(initialData.tenant || "default");
  const [product, setProduct] = useState(initialData.product || "qarote");
  const [buttonLabel, setButtonLabel] = useState(
    initialData.buttonLabel || "Sign in with SSO"
  );

  const handleSave = () => {
    updateMutation.mutate({
      enabled,
      type,
      oidcDiscoveryUrl: oidcDiscoveryUrl || undefined,
      oidcClientId: oidcClientId || undefined,
      oidcClientSecret: oidcClientSecret || undefined,
      samlMetadataUrl: samlMetadataUrl || undefined,
      apiUrl: apiUrl || undefined,
      frontendUrl: frontendUrl || undefined,
      tenant: tenant || undefined,
      product: product || undefined,
      buttonLabel: buttonLabel || undefined,
    });
  };

  const handleTestConnection = () => {
    if (!oidcDiscoveryUrl) {
      toast.error(t("discoveryUrlRequired"));
      return;
    }
    testMutation.mutate({ discoveryUrl: oidcDiscoveryUrl });
  };

  const callbackUrl = apiUrl ? `${apiUrl}/sso/callback` : "";
  const acsUrl = apiUrl ? `${apiUrl}/sso/acs` : "";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("copied"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("status")}</CardTitle>
            {initialData.source === "database" ? (
              <Badge variant="default">{t("sourceDatabase")}</Badge>
            ) : (
              <Badge variant="secondary">{t("sourceEnv")}</Badge>
            )}
          </div>
          <CardDescription>{t("statusDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Switch
              id="sso-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              className="data-[state=checked]:bg-gradient-button"
            />
            <Label htmlFor="sso-enabled">
              {enabled ? t("enabled") : t("disabled")}
            </Label>
          </div>
        </CardContent>
      </Card>

      {enabled && (
        <>
          {/* Protocol Selection */}
          <Card>
            <CardHeader>
              <CardTitle>{t("protocol")}</CardTitle>
              <CardDescription>{t("protocolDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("ssoType")}</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as "oidc" | "saml")}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oidc">
                      OIDC {t("recommended")}
                    </SelectItem>
                    <SelectItem value="saml">SAML 2.0</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === "oidc" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="discovery-url">
                      {t("oidcDiscoveryUrl")}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="discovery-url"
                        placeholder="https://your-idp.com/realms/qarote/.well-known/openid-configuration"
                        value={oidcDiscoveryUrl}
                        onChange={(e) => setOidcDiscoveryUrl(e.target.value)}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleTestConnection}
                        disabled={testMutation.isPending || !oidcDiscoveryUrl}
                        title={t("testConnection")}
                        aria-label={t("testConnection")}
                      >
                        {testMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wifi className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-id">{t("oidcClientId")}</Label>
                    <Input
                      id="client-id"
                      placeholder="qarote"
                      value={oidcClientId}
                      onChange={(e) => setOidcClientId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-secret">
                      {t("oidcClientSecret")}
                    </Label>
                    <Input
                      id="client-secret"
                      type="password"
                      placeholder={t("clientSecretPlaceholder")}
                      value={oidcClientSecret}
                      onChange={(e) => setOidcClientSecret(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="saml-metadata">{t("samlMetadataUrl")}</Label>
                  <Input
                    id="saml-metadata"
                    placeholder="https://your-idp.com/metadata.xml"
                    value={samlMetadataUrl}
                    onChange={(e) => setSamlMetadataUrl(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* URLs */}
          <Card>
            <CardHeader>
              <CardTitle>{t("urls")}</CardTitle>
              <CardDescription>{t("urlsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-url">{t("apiUrl")}</Label>
                <Input
                  id="api-url"
                  placeholder="http://localhost:3000"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frontend-url">{t("frontendUrl")}</Label>
                <Input
                  id="frontend-url"
                  placeholder="http://localhost:8080"
                  value={frontendUrl}
                  onChange={(e) => setFrontendUrl(e.target.value)}
                />
              </div>

              {callbackUrl && (
                <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertCircle className="h-4 w-4" />
                    {t("registerInIdP")}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-background px-2 py-1 rounded flex-1">
                        {callbackUrl}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(callbackUrl)}
                        aria-label={t("copyToClipboard")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {type === "saml" && (
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-background px-2 py-1 rounded flex-1">
                          {acsUrl}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(acsUrl)}
                          aria-label={t("copyToClipboard")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t("displaySettings")}</CardTitle>
              <CardDescription>
                {t("displaySettingsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="button-label">{t("buttonLabel")}</Label>
                <Input
                  id="button-label"
                  placeholder="Sign in with SSO"
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tenant">{t("tenant")}</Label>
                  <Input
                    id="tenant"
                    placeholder="default"
                    value={tenant}
                    onChange={(e) => setTenant(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product">{t("product")}</Label>
                  <Input
                    id="product"
                    placeholder="qarote"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test result */}
          {testMutation.data && (
            <Card>
              <CardContent className="pt-6">
                {testMutation.data.success ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>
                      {t("testSuccess", {
                        issuer: testMutation.data.issuer,
                      })}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    <span>{testMutation.data.error}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Save */}
      <Card>
        <CardFooter className="pt-6 flex justify-between">
          <Button
            className="bg-gradient-button hover:bg-gradient-button-hover text-white"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("save")
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

const SSOSection = () => {
  const { user } = useAuth();

  const {
    data: settings,
    isLoading,
    refetch,
  } = useSelfhostedSsoSettings({
    enabled: isSelfHostedMode() && user?.role === "ADMIN",
  });

  if (!isSelfHostedMode() || (user && user.role !== "ADMIN")) {
    return <Navigate to="/settings/profile" replace />;
  }

  if (isLoading || !settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <SSOForm
      key={JSON.stringify(settings)}
      initialData={settings}
      onRefetch={refetch}
    />
  );
};

export default SSOSection;
