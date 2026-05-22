import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";

import { QuotaUsageWidget } from "@/components/llm/QuotaUsageWidget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

type LlmProvider = "ANTHROPIC" | "OPENAI" | "OLLAMA" | "MANAGED";

const LlmSection = () => {
  const { t } = useTranslation("settings");
  const { userPlan } = useUser();
  const hasAccess =
    userPlan === UserPlan.DEVELOPER || userPlan === UserPlan.ENTERPRISE;

  const {
    data: config,
    isLoading,
    refetch,
  } = trpc.workspace.llm.getConfig.useQuery(undefined, { enabled: hasAccess });

  const updateMutation = trpc.workspace.llm.updateConfig.useMutation({
    onSuccess: () => {
      toast.success(t("llm.saved"));
      // Clear the plaintext API key from local state so the secret no longer
      // sits in component memory or the password input after a successful save.
      setApiKey("");
      void refetch();
    },
    onError: (err) => toast.error(err.message || t("llm.saveFailed")),
  });

  const testMutation = trpc.workspace.llm.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(t("llm.testConnectionSuccess"));
      } else {
        toast.error(t("llm.testConnectionFailure"));
      }
    },
    onError: () => toast.error(t("llm.testConnectionFailure")),
  });

  const [provider, setProvider] = useState<LlmProvider>("MANAGED");
  const [enabled, setEnabled] = useState(false);
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [ollamaEndpoint, setOllamaEndpoint] = useState("");
  const [ollamaModel, setOllamaModel] = useState("");
  const [endpointOverride, setEndpointOverride] = useState("");

  useEffect(() => {
    if (config) {
      setProvider(config.provider as LlmProvider);
      setEnabled(config.enabled);
      setModel(config.model ?? "");
      setOllamaEndpoint(config.ollamaEndpoint ?? "");
      setOllamaModel(config.ollamaModel ?? "");
      setEndpointOverride(config.endpointOverride ?? "");
    }
  }, [config]);

  const handleProviderChange = (v: string) => {
    const next = v as LlmProvider;
    setProvider(next);
    if (next === "MANAGED") setModel("");
  };

  const handleSave = () => {
    updateMutation.mutate({
      provider,
      enabled,
      model: model || null,
      apiKey: apiKey || null,
      ollamaEndpoint: ollamaEndpoint || null,
      ollamaModel: ollamaModel || null,
      endpointOverride: endpointOverride || null,
    });
  };

  if (!hasAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("llm.upgradeTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {t("llm.upgradeDescription")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const isManaged = provider === "MANAGED";
  const needsApiKey = provider === "ANTHROPIC" || provider === "OPENAI";
  const isOllama = provider === "OLLAMA";

  return (
    <div className="space-y-6">
      <QuotaUsageWidget />

      <Card>
        <CardHeader>
          <CardTitle>{t("llm.title")}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {t("llm.description")}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="llm-provider">{t("llm.provider")}</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger id="llm-provider">
                <SelectValue placeholder={t("llm.selectProvider")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANAGED">
                  {t("llm.providerManaged")}
                </SelectItem>
                <SelectItem value="ANTHROPIC">
                  {t("llm.providerAnthropic")}
                </SelectItem>
                <SelectItem value="OPENAI">
                  {t("llm.providerOpenai")}
                </SelectItem>
                <SelectItem value="OLLAMA">
                  {t("llm.providerOllama")}
                </SelectItem>
              </SelectContent>
            </Select>
            {isManaged && (
              <p className="text-muted-foreground text-sm">
                {t("llm.managedModelNote")}
              </p>
            )}
          </div>

          {needsApiKey && (
            <div className="space-y-2">
              <Label htmlFor="llm-apiKey">{t("llm.apiKey")}</Label>
              <Input
                id="llm-apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  config?.hasApiKey
                    ? t("llm.apiKeySaved")
                    : t("llm.apiKeyPlaceholder")
                }
                autoComplete="off"
              />
            </div>
          )}

          {isOllama && (
            <>
              <div className="space-y-2">
                <Label htmlFor="llm-ollamaEndpoint">
                  {t("llm.ollamaEndpoint")}
                </Label>
                <Input
                  id="llm-ollamaEndpoint"
                  value={ollamaEndpoint}
                  onChange={(e) => setOllamaEndpoint(e.target.value)}
                  placeholder={t("llm.ollamaEndpointPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="llm-ollamaModel">{t("llm.ollamaModel")}</Label>
                <Input
                  id="llm-ollamaModel"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder={t("llm.ollamaModelPlaceholder")}
                />
              </div>
            </>
          )}

          {!isManaged && (
            <div className="space-y-2">
              <Label htmlFor="llm-model">{t("llm.model")}</Label>
              <Input
                id="llm-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={t("llm.modelPlaceholder")}
              />
            </div>
          )}

          {(needsApiKey || isOllama) && (
            <div className="space-y-2">
              <Label htmlFor="llm-endpointOverride">
                {t("llm.endpointOverride")}
              </Label>
              <Input
                id="llm-endpointOverride"
                value={endpointOverride}
                onChange={(e) => setEndpointOverride(e.target.value)}
                placeholder={t("llm.endpointOverridePlaceholder")}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="llm-enabled">{t("llm.enabled")}</Label>
            <Switch
              id="llm-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("llm.save")}
            </Button>
            {!isManaged && (
              <Button
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending || !config}
              >
                {testMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : testMutation.data?.ok ? (
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                ) : testMutation.isError ? (
                  <XCircle className="mr-2 h-4 w-4 text-destructive" />
                ) : null}
                {t("llm.testConnection")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LlmSection;
