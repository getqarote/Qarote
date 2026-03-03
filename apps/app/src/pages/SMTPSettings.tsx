import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";

import { AlertCircle, CheckCircle, Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { isSelfHostedMode } from "@/lib/featureFlags";

import { AppSidebar } from "@/components/AppSidebar";
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
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";

import { useAuth } from "@/contexts/AuthContextDefinition";

import {
  useSelfhostedSmtpSettings,
  useSmtpTestConnection,
  useSmtpUpdate,
} from "@/hooks/queries/useSelfhostedSmtp";

interface SMTPSettingsData {
  source: "database" | "environment";
  enabled: boolean;
  host?: string | null;
  port?: number | null;
  user?: string | null;
  pass?: string | null;
  fromEmail?: string | null;
  service?: string | null;
  oauthClientId?: string | null;
  oauthClientSecret?: string | null;
  oauthRefreshToken?: string | null;
}

function SMTPForm({
  initialData,
  onRefetch,
}: {
  initialData: SMTPSettingsData;
  onRefetch: () => void;
}) {
  const { t } = useTranslation("smtp");

  const updateMutation = useSmtpUpdate({
    onSuccess: () => {
      toast.success(t("saveSuccess"));
      onRefetch();
    },
    onError: (error) => {
      toast.error(error.message || t("saveError"));
    },
  });

  const testMutation = useSmtpTestConnection({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(t("testSuccess"));
      } else {
        toast.error(data.error || t("testError"));
      }
    },
    onError: (error) => {
      toast.error(error.message || t("testError"));
    },
  });

  // Form state
  const [enabled, setEnabled] = useState(initialData.enabled);
  const [host, setHost] = useState(initialData.host || "");
  const [port, setPort] = useState(initialData.port ?? 587);
  const [fromEmail, setFromEmail] = useState(initialData.fromEmail || "");
  const [user, setUser] = useState(initialData.user || "");
  const [pass, setPass] = useState(initialData.pass || "");
  const [service, setService] = useState(initialData.service || "");
  const [oauthClientId, setOauthClientId] = useState(
    initialData.oauthClientId || ""
  );
  const [oauthClientSecret, setOauthClientSecret] = useState(
    initialData.oauthClientSecret || ""
  );
  const [oauthRefreshToken, setOauthRefreshToken] = useState(
    initialData.oauthRefreshToken || ""
  );
  const [testEmail, setTestEmail] = useState("");

  const handleSave = () => {
    updateMutation.mutate({
      enabled,
      host: host || undefined,
      port: port || undefined,
      user: user || undefined,
      pass: pass || undefined,
      fromEmail: fromEmail || undefined,
      service: service || undefined,
      oauthClientId: oauthClientId || undefined,
      oauthClientSecret: oauthClientSecret || undefined,
      oauthRefreshToken: oauthRefreshToken || undefined,
    });
  };

  const handleTestConnection = () => {
    if (!testEmail) {
      toast.error(t("recipientRequired"));
      return;
    }
    testMutation.mutate({ recipientEmail: testEmail });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <Mail className="h-8 w-8" />
        <div>
          <h1 className="title-page">{t("title")}</h1>
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
              id="smtp-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              className="data-[state=checked]:bg-gradient-button"
            />
            <Label htmlFor="smtp-enabled">
              {enabled ? t("enabled") : t("disabled")}
            </Label>
          </div>
        </CardContent>
      </Card>

      {enabled && (
        <>
          {/* Server Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>{t("server")}</CardTitle>
              <CardDescription>{t("serverDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">{t("host")}</Label>
                  <Input
                    id="smtp-host"
                    placeholder={t("hostPlaceholder")}
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">{t("port")}</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="from-email">{t("fromEmail")}</Label>
                <Input
                  id="from-email"
                  placeholder={t("fromEmailPlaceholder")}
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Authentication */}
          <Card>
            <CardHeader>
              <CardTitle>{t("authentication")}</CardTitle>
              <CardDescription>
                {t("authenticationDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-user">{t("user")}</Label>
                <Input
                  id="smtp-user"
                  placeholder={t("userPlaceholder")}
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-pass">{t("pass")}</Label>
                <Input
                  id="smtp-pass"
                  type="password"
                  placeholder={t("passPlaceholder")}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* OAuth2 Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>{t("oauth2")}</CardTitle>
              <CardDescription>{t("oauth2Description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-service">{t("service")}</Label>
                <Input
                  id="smtp-service"
                  placeholder={t("servicePlaceholder")}
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oauth-client-id">{t("oauthClientId")}</Label>
                <Input
                  id="oauth-client-id"
                  placeholder={t("oauthClientIdPlaceholder")}
                  value={oauthClientId}
                  onChange={(e) => setOauthClientId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oauth-client-secret">
                  {t("oauthClientSecret")}
                </Label>
                <Input
                  id="oauth-client-secret"
                  type="password"
                  placeholder={t("oauthClientSecretPlaceholder")}
                  value={oauthClientSecret}
                  onChange={(e) => setOauthClientSecret(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oauth-refresh-token">
                  {t("oauthRefreshToken")}
                </Label>
                <Input
                  id="oauth-refresh-token"
                  type="password"
                  placeholder={t("oauthRefreshTokenPlaceholder")}
                  value={oauthRefreshToken}
                  onChange={(e) => setOauthRefreshToken(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Test Connection */}
          <Card>
            <CardHeader>
              <CardTitle>{t("test")}</CardTitle>
              <CardDescription>{t("testDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Label htmlFor="test-recipient-email" className="sr-only">
                  {t("recipientEmail")}
                </Label>
                <Input
                  id="test-recipient-email"
                  placeholder={t("recipientEmailPlaceholder")}
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testMutation.isPending || !testEmail}
                >
                  {testMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {t("sendTestEmail")}
                </Button>
              </div>

              {testMutation.data && (
                <div className="pt-2">
                  {testMutation.data.success ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span>{t("testSuccess")}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      <span>{testMutation.data.error}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
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

function SMTPSettingsPage() {
  const { t } = useTranslation("smtp");
  const { user } = useAuth();

  const {
    data: settings,
    isLoading,
    refetch,
  } = useSelfhostedSmtpSettings({
    enabled: isSelfHostedMode() && user?.role === "ADMIN",
  });

  // Only accessible in self-hosted mode by admin users
  if (!isSelfHostedMode() || (user && user.role !== "ADMIN")) {
    return <Navigate to="/" replace />;
  }

  if (isLoading || !settings) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="container mx-auto p-6">
              <p className="text-muted-foreground">{t("loading")}</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="page-layout">
        <AppSidebar />
        <main className="main-content-scrollable">
          <SMTPForm
            key={JSON.stringify(settings)}
            initialData={settings}
            onRefetch={refetch}
          />
        </main>
      </div>
    </SidebarProvider>
  );
}

export default SMTPSettingsPage;
