import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";

import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Infinity as InfinityIcon,
  Lock,
  Play,
} from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/date-utils";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

import { SettingsUpgradePrompt } from "@/components/settings/SettingsUpgradePrompt";
import { SettingsFormSkeleton } from "@/components/skeletons/SettingsSkeleton";
import { Button } from "@/components/ui/button";
import { IconSparkle } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

type LlmProvider = "MANAGED" | "ANTHROPIC" | "OPENAI" | "OLLAMA";

const PROVIDER_KEY: Record<LlmProvider, string> = {
  MANAGED: "managed",
  ANTHROPIC: "anthropic",
  OPENAI: "openai",
  OLLAMA: "ollama",
};

/** Inline quota box shown inside the selected Qarote-managed card. */
function ManagedQuota() {
  const { t, i18n } = useTranslation("settings");
  const { data } = trpc.workspace.llm.quotaCurrent.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  if (!data) return null;

  // MANAGED is selected but the saved config isn't metered yet (disabled, or
  // last saved as BYOK) — explain how to activate rather than show an empty box.
  if (data.mode !== "managed") {
    return (
      <div className="rounded-lg border border-border bg-secondary/50 p-4">
        <p className="text-sm text-muted-foreground">
          {t("llm.managed.enableHint")}
        </p>
      </div>
    );
  }

  const unlimited = data.cap === null;
  const ratio = unlimited ? 0 : Math.min(data.used / Math.max(data.cap, 1), 1);

  return (
    <div className="rounded-lg border border-border bg-secondary/50 p-4">
      {unlimited ? (
        <p className="flex items-center gap-2 text-sm">
          <InfinityIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
          {t("llm.quota.unlimited")}
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-heading text-lg font-semibold">
              {t("llm.managed.explainsLabel")}: {data.used}{" "}
              <span className="font-sans text-sm font-normal text-muted-foreground">
                / {data.cap} {t("llm.managed.thisMonth")}
              </span>
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {t("llm.managed.resets", {
                date: formatDate(data.resetDate, i18n.language, {
                  month: "short",
                  day: "numeric",
                }),
              })}
            </p>
          </div>
          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={data.used}
            aria-valuemin={0}
            aria-valuemax={data.cap}
            aria-valuetext={`${data.used} / ${data.cap}`}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("llm.managed.cachedNote")}
          </p>
        </>
      )}
    </div>
  );
}

/** A green "unlimited / private" callout used by the BYOK and local cards. */
function UnlimitedCallout({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success-muted px-3 py-2.5 text-sm text-success">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>
        <span className="font-semibold">{title}</span>
        {desc ? ` — ${desc}` : ""}
      </span>
    </div>
  );
}

interface ProviderCardProps {
  value: LlmProvider;
  selected: boolean;
  onSelect: () => void;
  badges: { label: string; primary?: boolean }[];
  children?: React.ReactNode;
}

/** One provider option (prototype radio-card): native radio for a11y, carrot
 * border + ring when selected, with an expandable config body. */
function ProviderCard({
  value,
  selected,
  onSelect,
  badges,
  children,
}: ProviderCardProps) {
  const { t } = useTranslation("settings");
  const key = PROVIDER_KEY[value];
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 transition-colors",
        selected
          ? "border-primary ring-1 ring-primary/40"
          : "border-border hover:border-foreground/20"
      )}
    >
      {/* Only the header is the radio label, so clicks on the expanded body's
          inputs/buttons don't re-activate the radio via label propagation. */}
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="radio"
          name="llm-provider"
          value={value}
          checked={selected}
          onChange={onSelect}
          className="sr-only"
        />
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
            selected ? "border-primary" : "border-muted-foreground/40"
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full bg-primary",
              selected ? "opacity-100" : "opacity-0"
            )}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{t(`llm.card.${key}.title`)}</span>
            {badges.map((b) => (
              <span
                key={b.label}
                className={cn(
                  "rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide",
                  b.primary
                    ? "border-primary/40 bg-accent text-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                {b.label}
              </span>
            ))}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(`llm.card.${key}.desc`)}
          </p>
        </div>
      </label>

      {selected && children && (
        <div className="mt-4 space-y-4 border-t border-dashed border-border pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

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
      setApiKey("");
      void refetch();
    },
    onError: (err) => toast.error(err.message || t("llm.saveFailed")),
  });

  const testMutation = trpc.workspace.llm.testConnection.useMutation({
    onSuccess: (data) =>
      data.ok
        ? toast.success(t("llm.testConnectionSuccess"))
        : toast.error(t("llm.testConnectionFailure")),
    onError: () => toast.error(t("llm.testConnectionFailure")),
  });

  const [provider, setProvider] = useState<LlmProvider>("MANAGED");
  const [enabled, setEnabled] = useState(false);
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [ollamaEndpoint, setOllamaEndpoint] = useState("");
  const [ollamaModel, setOllamaModel] = useState("");
  // Preserved across saves but not exposed (advanced override, not in the
  // prototype) — updateConfig rewrites it, so we round-trip the saved value.
  const [endpointOverride, setEndpointOverride] = useState("");

  // Hydrate the form from the server once. After that the form owns its state,
  // so a background refetch (e.g. the quota query refocus) can't silently undo
  // an unsaved provider change. A save re-opens the gate to pick up saved values.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!config || hydrated.current) return;
    hydrated.current = true;
    /* eslint-disable react-hooks/set-state-in-effect */
    setProvider(config.provider as LlmProvider);
    setEnabled(config.enabled);
    setModel(config.model ?? "");
    setOllamaEndpoint(config.ollamaEndpoint ?? "");
    setOllamaModel(config.ollamaModel ?? "");
    setEndpointOverride(config.endpointOverride ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [config]);

  const handleSave = () => {
    hydrated.current = false; // re-sync from the saved values after refetch
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
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("llm.title")}
          </h2>
        </div>
        <SettingsUpgradePrompt
          icon={<IconSparkle className="h-6 w-auto" />}
          title={t("llm.upgradeTitle")}
          body={t("llm.upgradeDescription")}
        >
          <Button asChild>
            <Link to="/settings/subscription">
              {t("llm.quota.upgradeLink")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </SettingsUpgradePrompt>
      </div>
    );
  }

  if (isLoading) {
    return <SettingsFormSkeleton fields={2} />;
  }

  // Test connection probes the SAVED config (the backend has no input), so a
  // result on unsaved edits would be misleading — gate it behind a clean form.
  const dirty =
    !!config &&
    (provider !== config.provider ||
      enabled !== config.enabled ||
      (model || "") !== (config.model ?? "") ||
      (ollamaEndpoint || "") !== (config.ollamaEndpoint ?? "") ||
      (ollamaModel || "") !== (config.ollamaModel ?? "") ||
      apiKey !== "");

  const keyField = (placeholder: string) => (
    <div className="space-y-1.5">
      <Label htmlFor="llm-apiKey">{t("llm.apiKey")}</Label>
      <div className="relative">
        <Input
          id="llm-apiKey"
          type={showKey ? "text" : "password"}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={config?.hasApiKey ? t("llm.apiKeySaved") : placeholder}
          autoComplete="off"
          className="pr-10 font-mono"
        />
        <button
          type="button"
          onClick={() => setShowKey((s) => !s)}
          aria-label={showKey ? t("llm.hideKey") : t("llm.showKey")}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
        >
          {showKey ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );

  const modelField = (placeholder: string) => (
    <div className="space-y-1.5">
      <Label htmlFor="llm-model">{t("llm.model")}</Label>
      <Input
        id="llm-model"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        placeholder={placeholder}
        className="font-mono"
      />
    </div>
  );

  const testButton = (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => testMutation.mutate()}
        disabled={testMutation.isPending || !config || dirty}
      >
        <Play className="h-3.5 w-3.5" aria-hidden />
        {t("llm.testConnection")}
      </Button>
      {dirty && (
        <p className="text-xs text-muted-foreground">
          {t("llm.testAfterSave")}
        </p>
      )}
    </div>
  );

  const byokCallout = (
    <UnlimitedCallout
      icon={<Check className="h-4 w-4" />}
      title={t("llm.byok.unlimitedTitle")}
      desc={t("llm.byok.unlimitedDesc")}
    />
  );

  const select = (p: LlmProvider) => {
    setProvider(p);
    if (p === "MANAGED") setModel("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("llm.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <Trans
            i18nKey="llm.intro"
            ns="settings"
            components={{
              code: <code className="font-mono text-primary" />,
            }}
          />
        </p>
      </div>

      <div role="radiogroup" aria-label={t("llm.title")} className="space-y-3">
        <ProviderCard
          value="MANAGED"
          selected={provider === "MANAGED"}
          onSelect={() => select("MANAGED")}
          badges={[
            { label: t("llm.badge.recommended"), primary: true },
            { label: t("llm.badge.zeroConfig") },
          ]}
        >
          <ManagedQuota />
        </ProviderCard>

        <ProviderCard
          value="ANTHROPIC"
          selected={provider === "ANTHROPIC"}
          onSelect={() => select("ANTHROPIC")}
          badges={[{ label: t("llm.badge.byok") }]}
        >
          {keyField("sk-ant-...")}
          {modelField("claude-sonnet-4-5")}
          {testButton}
          {byokCallout}
        </ProviderCard>

        <ProviderCard
          value="OPENAI"
          selected={provider === "OPENAI"}
          onSelect={() => select("OPENAI")}
          badges={[{ label: t("llm.badge.byok") }]}
        >
          {keyField("sk-...")}
          {modelField("gpt-5")}
          {testButton}
          {byokCallout}
        </ProviderCard>

        <ProviderCard
          value="OLLAMA"
          selected={provider === "OLLAMA"}
          onSelect={() => select("OLLAMA")}
          badges={[{ label: t("llm.badge.ollamaOffline") }]}
        >
          <p className="flex items-center gap-2 text-sm text-success">
            <Lock className="h-4 w-4 shrink-0" aria-hidden />
            {t("llm.ollama.privacy")}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="llm-ollamaEndpoint">
              {t("llm.ollama.baseUrl")}
            </Label>
            <Input
              id="llm-ollamaEndpoint"
              value={ollamaEndpoint}
              onChange={(e) => setOllamaEndpoint(e.target.value)}
              placeholder="http://localhost:11434"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="llm-ollamaModel">{t("llm.ollama.modelName")}</Label>
            <Input
              id="llm-ollamaModel"
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              placeholder="llama3.1:8b"
              className="font-mono"
            />
          </div>
          {testButton}
          <UnlimitedCallout
            icon={<Check className="h-4 w-4" />}
            title={t("llm.byok.unlimitedTitle")}
            desc={t("llm.ollama.unlimitedDesc")}
          />
        </ProviderCard>
      </div>

      {/* Footer: active provider + enable + save */}
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("llm.activeProvider")}{" "}
          <span className="font-mono text-foreground">
            {t(`llm.card.${PROVIDER_KEY[provider]}.title`)}
          </span>
        </p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              aria-label={t("llm.enabled")}
            />
            {t("llm.enabled")}
          </label>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {t("llm.save")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LlmSection;
