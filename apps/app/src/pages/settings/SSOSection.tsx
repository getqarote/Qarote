import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertCircle,
  CheckCircle,
  Copy,
  Loader2,
  Shield,
  Trash2,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";

import { isCloudMode } from "@/lib/featureFlags";

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
  useDeleteSsoProvider,
  useRegisterSsoProvider,
  useSsoProviderConfig,
  useTestSsoConnection,
  useUpdateSsoProvider,
} from "@/hooks/queries/useSsoProvider";

const REDACTED = "••••••••";

function getApiUrl(): string {
  const config = (window as unknown as Record<string, unknown>)
    .__QAROTE_CONFIG__ as { apiUrl?: string } | undefined;
  return import.meta.env.VITE_API_URL ?? config?.apiUrl ?? "";
}

// ─── SSOForm (update existing provider) ──────────────────────────────────────

interface ProviderConfig {
  enabled: boolean;
  buttonLabel: string;
  providerId: string;
  type: "oidc" | "saml";
  oidcConfig: Record<string, unknown> | null;
  samlConfig: Record<string, unknown> | null;
}

function SSOForm({
  initialData,
  onRefetch,
}: {
  initialData: ProviderConfig;
  onRefetch: () => void;
}) {
  const { t } = useTranslation("sso");
  const apiUrl = getApiUrl();

  const [enabled, setEnabled] = useState(initialData.enabled);
  const [type, setType] = useState<"oidc" | "saml">(initialData.type);
  const [oidcDiscoveryUrl, setOidcDiscoveryUrl] = useState(
    (initialData.oidcConfig?.discoveryEndpoint as string) || ""
  );
  const [oidcClientId, setOidcClientId] = useState(
    (initialData.oidcConfig?.clientId as string) || ""
  );
  const [oidcClientSecret, setOidcClientSecret] = useState(
    initialData.oidcConfig?.clientSecret ? REDACTED : ""
  );
  const [samlMetadataUrl, setSamlMetadataUrl] = useState(
    (initialData.samlConfig?.metadataUrl as string) || ""
  );
  const [buttonLabel, setButtonLabel] = useState(initialData.buttonLabel);

  const updateMutation = useUpdateSsoProvider({
    onSuccess: () => {
      toast.success(t("saveSuccess"));
      onRefetch();
    },
    onError: (error) => toast.error(error.message || t("saveError")),
  });

  const deleteMutation = useDeleteSsoProvider({
    onSuccess: () => {
      toast.success(
        t("deleteSuccess", { defaultValue: "SSO provider deleted" })
      );
      onRefetch();
    },
    onError: (error) =>
      toast.error(
        error.message ||
          t("deleteError", { defaultValue: "Failed to delete provider" })
      ),
  });

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

  const handleSave = () => {
    updateMutation.mutate({
      enabled,
      type,
      oidcDiscoveryUrl: oidcDiscoveryUrl || undefined,
      oidcClientId: oidcClientId || undefined,
      oidcClientSecret: oidcClientSecret || undefined,
      samlMetadataUrl: samlMetadataUrl || undefined,
      buttonLabel,
    });
  };

  const handleDelete = () => {
    if (
      !confirm(
        t("deleteConfirm", {
          defaultValue:
            "Delete SSO provider? This will disable SSO for all users.",
        })
      )
    )
      return;
    deleteMutation.mutate();
  };

  const handleTestConnection = () => {
    if (!oidcDiscoveryUrl) {
      toast.error(t("discoveryUrlRequired"));
      return;
    }
    testMutation.mutate({ discoveryUrl: oidcDiscoveryUrl });
  };

  const oidcCallbackUrl = apiUrl
    ? `${apiUrl}/api/auth/sso/callback/${initialData.providerId}`
    : "";
  const samlAcsUrl = apiUrl
    ? `${apiUrl}/api/auth/sso/saml2/callback/${initialData.providerId}`
    : "";

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      toast.error(
        t("copyError", { defaultValue: "Failed to copy to clipboard" })
      );
    }
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
            {isCloudMode() ? (
              <Badge variant="default">
                {t("cloudLabel", { defaultValue: "Cloud (per-workspace)" })}
              </Badge>
            ) : (
              <Badge variant="secondary">
                {t("selfHostedLabel", { defaultValue: "Self-hosted" })}
              </Badge>
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
          {/* Protocol */}
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
                        type="button"
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

          {/* Callback URLs */}
          {(oidcCallbackUrl || samlAcsUrl) && (
            <Card>
              <CardHeader>
                <CardTitle>{t("urls")}</CardTitle>
                <CardDescription>{t("urlsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertCircle className="h-4 w-4" />
                    {t("registerInIdP")}
                  </div>
                  <div className="space-y-2">
                    {type === "oidc" && oidcCallbackUrl && (
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-background px-2 py-1 rounded flex-1">
                          {oidcCallbackUrl}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(oidcCallbackUrl)}
                          aria-label={t("copyToClipboard")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {type === "saml" && samlAcsUrl && (
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-background px-2 py-1 rounded flex-1">
                          {samlAcsUrl}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(samlAcsUrl)}
                          aria-label={t("copyToClipboard")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t("displaySettings")}</CardTitle>
              <CardDescription>
                {t("displaySettingsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="button-label">{t("buttonLabel")}</Label>
                <Input
                  id="button-label"
                  placeholder="Sign in with SSO"
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                />
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

      {/* Actions */}
      <Card>
        <CardFooter className="pt-6 flex justify-between">
          <Button
            type="button"
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
          <Button
            type="button"
            variant="outline"
            className="text-destructive border-destructive hover:bg-destructive hover:text-white"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("delete", { defaultValue: "Delete provider" })}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ─── SetupForm (first-time provider registration) ────────────────────────────

function SetupForm({ onRefetch }: { onRefetch: () => void }) {
  const { t } = useTranslation("sso");
  const apiUrl = getApiUrl();

  const [type, setType] = useState<"oidc" | "saml">("oidc");
  const [oidcDiscoveryUrl, setOidcDiscoveryUrl] = useState("");
  const [oidcClientId, setOidcClientId] = useState("");
  const [oidcClientSecret, setOidcClientSecret] = useState("");
  const [samlMetadataUrl, setSamlMetadataUrl] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Sign in with SSO");

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

  const registerMutation = useRegisterSsoProvider({
    onSuccess: () => {
      toast.success(t("saveSuccess"));
      onRefetch();
    },
    onError: (error) => toast.error(error.message || t("saveError")),
  });

  const handleRegister = () => {
    registerMutation.mutate({
      type,
      oidcDiscoveryUrl: oidcDiscoveryUrl || undefined,
      oidcClientId: oidcClientId || undefined,
      oidcClientSecret: oidcClientSecret || undefined,
      samlMetadataUrl: samlMetadataUrl || undefined,
      buttonLabel,
    });
  };

  const handleTestConnection = () => {
    if (!oidcDiscoveryUrl) {
      toast.error(t("discoveryUrlRequired"));
      return;
    }
    testMutation.mutate({ discoveryUrl: oidcDiscoveryUrl });
  };

  const oidcCallbackUrl = apiUrl ? `${apiUrl}/api/auth/sso/callback/...` : "";
  const samlAcsUrl = apiUrl ? `${apiUrl}/api/auth/sso/saml2/callback/...` : "";

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      toast.error(
        t("copyError", { defaultValue: "Failed to copy to clipboard" })
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("setupDescription", {
              defaultValue:
                "Configure your SSO provider to enable single sign-on.",
            })}
          </p>
        </div>
      </div>

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
                <SelectItem value="oidc">OIDC {t("recommended")}</SelectItem>
                <SelectItem value="saml">SAML 2.0</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "oidc" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setup-discovery-url">
                  {t("oidcDiscoveryUrl")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="setup-discovery-url"
                    placeholder="https://your-idp.com/realms/qarote/.well-known/openid-configuration"
                    value={oidcDiscoveryUrl}
                    onChange={(e) => setOidcDiscoveryUrl(e.target.value)}
                  />
                  <Button
                    type="button"
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
                <Label htmlFor="setup-client-id">{t("oidcClientId")}</Label>
                <Input
                  id="setup-client-id"
                  placeholder="qarote"
                  value={oidcClientId}
                  onChange={(e) => setOidcClientId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-client-secret">
                  {t("oidcClientSecret")}
                </Label>
                <Input
                  id="setup-client-secret"
                  type="password"
                  placeholder={t("clientSecretPlaceholder")}
                  value={oidcClientSecret}
                  onChange={(e) => setOidcClientSecret(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="setup-saml-metadata">
                {t("samlMetadataUrl")}
              </Label>
              <Input
                id="setup-saml-metadata"
                placeholder="https://your-idp.com/metadata.xml"
                value={samlMetadataUrl}
                onChange={(e) => setSamlMetadataUrl(e.target.value)}
              />
            </div>
          )}

          {testMutation.data && (
            <div className="mt-2">
              {testMutation.data.success ? (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    {t("testSuccess", { issuer: testMutation.data.issuer })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{testMutation.data.error}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {apiUrl && (
        <Card>
          <CardHeader>
            <CardTitle>{t("urls")}</CardTitle>
            <CardDescription>{t("urlsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="h-4 w-4" />
                {t("registerInIdP")}
              </div>
              <div className="space-y-2">
                {type === "oidc" && (
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-background px-2 py-1 rounded flex-1">
                      {oidcCallbackUrl}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(oidcCallbackUrl)}
                      aria-label={t("copyToClipboard")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {type === "saml" && (
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-background px-2 py-1 rounded flex-1">
                      {samlAcsUrl}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(samlAcsUrl)}
                      aria-label={t("copyToClipboard")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("displaySettings")}</CardTitle>
          <CardDescription>{t("displaySettingsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="setup-button-label">{t("buttonLabel")}</Label>
            <Input
              id="setup-button-label"
              placeholder="Sign in with SSO"
              value={buttonLabel}
              onChange={(e) => setButtonLabel(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardFooter className="pt-6">
          <Button
            type="button"
            className="bg-gradient-button hover:bg-gradient-button-hover text-white"
            onClick={handleRegister}
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
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

// ─── SSOSection (main export) ─────────────────────────────────────────────────

const SSOSection = () => {
  const { user } = useAuth();

  const {
    data: providerConfig,
    isLoading,
    refetch,
  } = useSsoProviderConfig({ enabled: user?.role === "ADMIN" });

  if (user?.role !== "ADMIN") {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!providerConfig) {
    return <SetupForm onRefetch={refetch} />;
  }

  return (
    <SSOForm
      key={providerConfig.providerId}
      initialData={providerConfig}
      onRefetch={refetch}
    />
  );
};

export default SSOSection;
