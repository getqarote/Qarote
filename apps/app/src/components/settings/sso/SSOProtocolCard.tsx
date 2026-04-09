import { ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { isCloudMode } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
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

import { useTestSsoConnection } from "@/hooks/queries/useSsoProvider";

import { SSO_PROVIDER_PRESETS } from "./ssoProviderPresets";
import type { SSOFormValues, SSOProviderType } from "./types";

interface SSOProtocolCardProps {
  values: SSOFormValues;
  onChange: (patch: Partial<SSOFormValues>) => void;
  /**
   * `setup` shows the "Start from a preset" chips row (first-time
   * configuration — operators need the head-start). `edit` hides
   * it because the operator has already committed to an IdP and
   * the chips would just be noise.
   */
  mode: "setup" | "edit";
}

/**
 * The heart of the SSO settings page. In a single card it holds:
 *
 *   1. A segmented control for OIDC vs SAML 2.0 (replacing the
 *      old dropdown — two options never warranted a dropdown)
 *   2. In setup mode: a "Start from a preset" chips row with
 *      known-good discovery URL templates for the 6 most common
 *      IdPs (Keycloak, Authentik, Auth0, Okta, Google, Entra)
 *   3. The protocol-specific fields (OIDC: discovery URL +
 *      client ID + client secret; SAML: metadata URL)
 *   4. A prominent "Test connection" action that verifies the
 *      discovery URL reaches a live IdP, with inline success /
 *      failure feedback
 *   5. In cloud mode: the email domain field for tenant routing.
 *      Merged into this card (the old separate "Display & Tenancy"
 *      card held a single field — chrome for chrome's sake)
 *
 * All of this used to live in three separate cards with awkward
 * transitions and hidden affordances. Consolidating follows the
 * design context principle "respect the user's working memory" —
 * the operator's mental model is "configure the IdP" as one task,
 * not three.
 */
export function SSOProtocolCard({
  values,
  onChange,
  mode,
}: SSOProtocolCardProps) {
  const { t } = useTranslation("sso");
  const fieldId = useId();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="title-section">{t("protocol")}</CardTitle>
        <CardDescription>{t("protocolDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Protocol picker — segmented control, not a dropdown */}
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

        {/* Email domain field — cloud mode only, merged in here
            instead of a separate one-field card */}
        {isCloudMode() && (
          <DomainField
            fieldId={fieldId}
            value={values.domain}
            onChange={(domain) => onChange({ domain })}
          />
        )}
      </CardContent>
    </Card>
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
    <div className="flex items-center gap-4">
      <Label className="shrink-0">{t("ssoType")}</Label>
      <div
        role="tablist"
        aria-label={t("ssoType")}
        className="inline-flex items-center rounded-lg border bg-muted/40 p-1"
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
        "inline-flex items-center rounded-md px-4 py-1.5 text-sm font-medium motion-safe:transition-colors",
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

  return (
    <div className="space-y-5">
      <DiscoveryUrlField
        fieldId={fieldId}
        value={values.oidcDiscoveryUrl}
        onChange={(oidcDiscoveryUrl) => onChange({ oidcDiscoveryUrl })}
      />

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-client-id`}>{t("oidcClientId")}</Label>
        <Input
          id={`${fieldId}-client-id`}
          placeholder="qarote"
          value={values.oidcClientId}
          onChange={(e) => onChange({ oidcClientId: e.target.value })}
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">{t("oidcClientIdHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-client-secret`}>
          {t("oidcClientSecret")}
        </Label>
        <Input
          id={`${fieldId}-client-secret`}
          type="password"
          placeholder={
            mode === "edit"
              ? t("clientSecretKeepPlaceholder")
              : t("clientSecretPlaceholder")
          }
          value={values.oidcClientSecret}
          onChange={(e) => onChange({ oidcClientSecret: e.target.value })}
          autoComplete="new-password"
        />
      </div>
    </div>
  );
}

// ─── Discovery URL + inline test action ────────────────────────

function DiscoveryUrlField({
  fieldId,
  value,
  onChange,
}: {
  fieldId: string;
  value: string;
  onChange: (value: string) => void;
}) {
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
    if (!value) {
      toast.error(t("discoveryUrlRequired"));
      return;
    }
    testMutation.mutate({ discoveryUrl: value });
  };

  const hasResult = testMutation.data !== undefined;
  const isPending = testMutation.isPending;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={`${fieldId}-discovery-url`}>
          {t("oidcDiscoveryUrl")}
        </Label>
        <ConnectionStatusBadge
          isPending={isPending}
          result={testMutation.data}
        />
      </div>

      <div className="flex gap-2">
        <Input
          id={`${fieldId}-discovery-url`}
          placeholder="https://your-idp.com/.well-known/openid-configuration"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={isPending || !value}
          className="shrink-0"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
          ) : (
            <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
          )}
          {isPending
            ? t("testing")
            : hasResult
              ? t("testAgain")
              : t("testConnection")}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("oidcDiscoveryUrlHint")}
      </p>

      {testMutation.data && <TestConnectionResult result={testMutation.data} />}
    </div>
  );
}

function ConnectionStatusBadge({
  isPending,
  result,
}: {
  isPending: boolean;
  result: { success: boolean } | undefined;
}) {
  const { t } = useTranslation("sso");

  if (isPending) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        {t("testing")}
      </span>
    );
  }

  if (result?.success) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <CheckCircle className="h-3 w-3" aria-hidden="true" />
        {t("statusValid")}
      </span>
    );
  }

  if (result && !result.success) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
        <AlertCircle className="h-3 w-3" aria-hidden="true" />
        {t("testError")}
      </span>
    );
  }

  return (
    <span className="text-xs text-muted-foreground">{t("statusUntested")}</span>
  );
}

/**
 * Larger inline callout below the discovery URL field when a test
 * has completed. Separate from the header badge because the header
 * badge is the at-a-glance status indicator, while this is the
 * full message (issuer or error detail) the operator needs for
 * debugging.
 */
function TestConnectionResult({
  result,
}: {
  result: { success: boolean; issuer?: string; error?: string };
}) {
  const { t } = useTranslation("sso");

  if (result.success) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-md border border-success/30 bg-success-muted p-3 text-sm">
        <CheckCircle
          className="h-4 w-4 text-success mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="font-medium text-success">
            {t("testSuccess", { issuer: result.issuer })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <AlertCircle
        className="h-4 w-4 text-destructive mt-0.5 shrink-0"
        aria-hidden="true"
      />
      <p className="text-destructive break-words min-w-0">{result.error}</p>
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

// ─── Cloud-mode domain field ───────────────────────────────────

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
    <div className="space-y-2 pt-2 border-t">
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
