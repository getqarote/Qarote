import { ReactNode, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertCircle,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Play,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { useTestSsoConnection } from "@/hooks/queries/useSsoProvider";

import { copyToClipboard } from "./ssoHelpers";
import { SSO_PROVIDER_PRESETS } from "./ssoProviderPresets";
import type { SSOFormValues, SSOProviderType } from "./types";

interface SSOProtocolCardProps {
  values: SSOFormValues;
  onChange: (patch: Partial<SSOFormValues>) => void;
  /**
   * `setup` shows the "Start from a preset" chips row and hides the
   * read-only redirect URL (no provider exists yet). `edit` hides the
   * chips (the operator has committed to an IdP) and surfaces the
   * redirect URL to copy into the IdP.
   */
  mode: "setup" | "edit";
  /** OIDC callback URL — empty until the provider is created. */
  oidcCallbackUrl: string;
  /** SAML2 ACS URL — empty until the provider is created. */
  samlAcsUrl: string;
}

/**
 * The single provider card. In one card it holds: the OIDC/SAML
 * segmented control, a "Start from a preset" chips row (setup only),
 * the protocol-specific credential fields, the read-only redirect URL
 * (edit only), the auto-provision toggle, the allowed-domain field, and
 * a "Verify connection" action that probes the discovery URL.
 */
export function SSOProtocolCard({
  values,
  onChange,
  mode,
  oidcCallbackUrl,
  samlAcsUrl,
}: SSOProtocolCardProps) {
  const { t } = useTranslation("sso");
  const fieldId = useId();

  const redirectUrl = values.type === "oidc" ? oidcCallbackUrl : samlAcsUrl;

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-6">
      {/* Protocol picker — full-width segmented control */}
      <ProtocolSegmentedControl
        value={values.type}
        onChange={(type) => onChange({ type })}
      />

      {/* Preset chips — setup mode only */}
      {mode === "setup" && values.type === "oidc" && (
        <PresetChips
          onSelect={(template) => onChange({ oidcDiscoveryUrl: template })}
        />
      )}

      {/* Protocol-specific fields */}
      {values.type === "oidc" ? (
        <OidcFields
          fieldId={fieldId}
          values={values}
          onChange={onChange}
          mode={mode}
        />
      ) : (
        <SamlFields fieldId={fieldId} values={values} onChange={onChange} />
      )}

      {/* Redirect URL — read-only, edit mode only (provider exists) */}
      {mode === "edit" && redirectUrl && (
        <RedirectUrlRow
          fieldId={fieldId}
          label={
            values.type === "oidc" ? t("oidcCallbackLabel") : t("samlAcsLabel")
          }
          hint={values.type === "oidc" ? t("redirectUrlHint") : t("acsUrlHint")}
          url={redirectUrl}
        />
      )}

      <hr className="border-border" />

      {/* Auto-provision toggle */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor={`${fieldId}-autoprovision`} className="font-medium">
            {t("autoProvisionLabel")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("autoProvisionHint")}
          </p>
        </div>
        <Switch
          id={`${fieldId}-autoprovision`}
          checked={values.autoProvision}
          onCheckedChange={(autoProvision) => onChange({ autoProvision })}
        />
      </div>

      <hr className="border-border" />

      <DomainField
        fieldId={fieldId}
        value={values.domain}
        onChange={(domain) => onChange({ domain })}
      />

      {values.type === "oidc" && (
        <VerifyConnection discoveryUrl={values.oidcDiscoveryUrl} />
      )}
    </div>
  );
}

// ─── Segmented control ─────────────────────────────────────────

function ProtocolSegmentedControl({
  value,
  onChange,
}: {
  value: SSOProviderType;
  onChange: (value: SSOProviderType) => void;
}) {
  const { t } = useTranslation("sso");

  return (
    <div className="space-y-2">
      <Label>{t("ssoType")}</Label>
      <div
        role="tablist"
        aria-label={t("ssoType")}
        className="flex gap-[3px] rounded-full border border-border bg-muted/50 p-[3px]"
      >
        <SegmentButton
          active={value === "oidc"}
          onClick={() => onChange("oidc")}
        >
          {t("oidcLabel")}
          <Badge
            variant="secondary"
            className="ml-2 text-[10px] font-medium uppercase tracking-wide"
          >
            {t("recommended")}
          </Badge>
        </SegmentButton>
        <SegmentButton
          active={value === "saml"}
          onClick={() => onChange("saml")}
        >
          {t("samlLabel")}
        </SegmentButton>
      </div>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center rounded-full px-4 py-1.5 text-[13px] font-medium motion-safe:transition-colors",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// ─── Preset chips ──────────────────────────────────────────────

function PresetChips({ onSelect }: { onSelect: (template: string) => void }) {
  const { t } = useTranslation("sso");

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border/60 bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        {t("presetsLabel")}
      </div>
      <p className="text-xs text-muted-foreground">{t("presetsHint")}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {SSO_PROVIDER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.template)}
            className={cn(
              "inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground",
              "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
              "motion-safe:transition-colors",
              "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            {t(preset.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── OIDC fields ───────────────────────────────────────────────

function OidcFields({
  fieldId,
  values,
  onChange,
  mode,
}: {
  fieldId: string;
  values: SSOFormValues;
  onChange: (patch: Partial<SSOFormValues>) => void;
  mode: "setup" | "edit";
}) {
  const { t } = useTranslation("sso");
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-discovery-url`}>
          {t("oidcDiscoveryUrl")}
        </Label>
        <Input
          id={`${fieldId}-discovery-url`}
          placeholder="https://your-idp.com/.well-known/openid-configuration"
          value={values.oidcDiscoveryUrl}
          onChange={(e) => onChange({ oidcDiscoveryUrl: e.target.value })}
          autoComplete="off"
          className="font-mono text-xs"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-client-id`}>{t("oidcClientId")}</Label>
          <Input
            id={`${fieldId}-client-id`}
            placeholder="qarote-prod"
            value={values.oidcClientId}
            onChange={(e) => onChange({ oidcClientId: e.target.value })}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-client-secret`}>
            {t("oidcClientSecret")}
          </Label>
          <div className="relative">
            <Input
              id={`${fieldId}-client-secret`}
              type={showSecret ? "text" : "password"}
              placeholder={
                mode === "edit"
                  ? t("clientSecretKeepPlaceholder")
                  : t("clientSecretPlaceholder")
              }
              value={values.oidcClientSecret}
              onChange={(e) => onChange({ oidcClientSecret: e.target.value })}
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowSecret((s) => !s)}
              aria-label={showSecret ? t("hideSecret") : t("showSecret")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSecret ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SAML fields ───────────────────────────────────────────────

function SamlFields({
  fieldId,
  values,
  onChange,
}: {
  fieldId: string;
  values: SSOFormValues;
  onChange: (patch: Partial<SSOFormValues>) => void;
}) {
  const { t } = useTranslation("sso");

  return (
    <div className="space-y-2">
      <Label htmlFor={`${fieldId}-saml-metadata`}>{t("samlMetadataUrl")}</Label>
      <Input
        id={`${fieldId}-saml-metadata`}
        placeholder="https://your-idp.com/metadata.xml"
        value={values.samlMetadataUrl}
        onChange={(e) => onChange({ samlMetadataUrl: e.target.value })}
        autoComplete="off"
        className="font-mono text-xs"
      />
      <p className="text-xs text-muted-foreground">
        {t("samlMetadataUrlHint")}
      </p>
    </div>
  );
}

// ─── Redirect URL (read-only) ──────────────────────────────────

function RedirectUrlRow({
  fieldId,
  label,
  hint,
  url,
}: {
  fieldId: string;
  label: string;
  hint: string;
  url: string;
}) {
  const { t } = useTranslation("sso");

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <Label htmlFor={`${fieldId}-redirect`}>{label}</Label>
        <span className="text-xs text-muted-foreground">· {t("readOnly")}</span>
      </div>
      <div className="flex items-stretch overflow-hidden rounded-md border border-border bg-muted/50">
        <input
          id={`${fieldId}-redirect`}
          readOnly
          value={url}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-xs text-muted-foreground outline-none"
        />
        <button
          type="button"
          onClick={() => copyToClipboard(url, t)}
          aria-label={t("copyToClipboard")}
          className="flex shrink-0 items-center gap-1.5 border-l border-border bg-card px-3 font-mono text-[11px] text-muted-foreground hover:text-primary"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          {t("copyToClipboard")}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

// ─── Domain field ──────────────────────────────────────────────

function DomainField({
  fieldId,
  value,
  onChange,
}: {
  fieldId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation("sso");

  return (
    <div className="space-y-2">
      <Label htmlFor={`${fieldId}-domain`}>{t("domain")}</Label>
      <Input
        id={`${fieldId}-domain`}
        placeholder={t("domainPlaceholder")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      <p className="text-xs text-muted-foreground">{t("domainHint")}</p>
    </div>
  );
}

// ─── Verify connection ─────────────────────────────────────────

function VerifyConnection({ discoveryUrl }: { discoveryUrl: string }) {
  const { t } = useTranslation("sso");

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

  const handleTest = () => {
    if (!discoveryUrl) {
      toast.error(t("discoveryUrlRequired"));
      return;
    }
    testMutation.mutate({ discoveryUrl });
  };

  const isPending = testMutation.isPending;

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleTest}
        disabled={isPending || !discoveryUrl}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Play className="h-4 w-4" aria-hidden="true" />
        )}
        {isPending ? t("testing") : t("verifyConnection")}
      </Button>

      {testMutation.data && <TestConnectionResult result={testMutation.data} />}
    </div>
  );
}

function TestConnectionResult({
  result,
}: {
  result: { success: boolean; issuer?: string; error?: string };
}) {
  const { t } = useTranslation("sso");

  if (result.success) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success-muted p-3 text-sm">
        <CheckCircle
          className="mt-0.5 h-4 w-4 shrink-0 text-success"
          aria-hidden="true"
        />
        <p className="min-w-0 font-medium text-success">
          {t("testSuccess", { issuer: result.issuer })}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
        aria-hidden="true"
      />
      <p className="min-w-0 break-words text-destructive">{result.error}</p>
    </div>
  );
}
