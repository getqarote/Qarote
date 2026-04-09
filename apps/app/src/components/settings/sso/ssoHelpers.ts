import { toast } from "sonner";

import type { ProviderConfig, SSOFormValues, SSOProviderType } from "./types";

/**
 * Sentinel string rendered in the client-secret field when an
 * existing provider already has a secret stored on the server.
 * The field starts out as dots so the operator can tell "there's
 * a secret there" without the API ever sending the real value back
 * to the client. Submitting the form without editing this field
 * keeps the stored secret — the submission handler maps a pristine
 * REDACTED value back to "don't change".
 */
const REDACTED = "••••••••";

/**
 * Resolves the public API base URL the browser should use for
 * building SSO callback links. Checks a runtime `window.__QAROTE_CONFIG__`
 * (injected by the self-hosted container at startup) first, then
 * falls back to the build-time Vite env. Returns an empty string if
 * neither source is configured, in which case the callback URLs are
 * hidden until save.
 */
function getApiUrl(): string {
  const config = (window as unknown as Record<string, unknown>)
    .__QAROTE_CONFIG__ as { apiUrl?: string } | undefined;
  return import.meta.env.VITE_API_URL ?? config?.apiUrl ?? "";
}

/**
 * Builds the OIDC callback URL the operator needs to register at
 * their IdP. Returns an empty string when no API URL is available
 * or no provider ID is known yet (e.g. setup mode before first save).
 */
export function buildOidcCallbackUrl(providerId: string | undefined): string {
  const apiUrl = getApiUrl();
  if (!apiUrl || !providerId) return "";
  return `${apiUrl}/api/auth/sso/callback/${providerId}`;
}

/**
 * Builds the SAML2 ACS URL for the given provider. Same empty-string
 * semantics as `buildOidcCallbackUrl` — returns "" when either the
 * API URL or provider ID is missing.
 */
export function buildSamlAcsUrl(providerId: string | undefined): string {
  const apiUrl = getApiUrl();
  if (!apiUrl || !providerId) return "";
  return `${apiUrl}/api/auth/sso/saml2/callback/${providerId}`;
}

/**
 * Copies a string to the clipboard and surfaces a toast on success
 * or failure. Takes the `t()` function so the caller's i18n scope
 * controls the toast copy — the helper stays i18n-agnostic itself.
 */
export async function copyToClipboard(
  text: string,
  t: (key: string, opts?: Record<string, unknown>) => string
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(t("copied"));
  } catch {
    toast.error(
      t("copyError", { defaultValue: "Failed to copy to clipboard" })
    );
  }
}

/**
 * Maps a raw `ProviderConfig` (from the API) into flat form values.
 * Client secret is replaced with `REDACTED` when a secret is known
 * to exist server-side, so the operator sees dots and knows there's
 * a stored value without the server ever transmitting it.
 */
export function providerConfigToFormValues(
  config: ProviderConfig
): SSOFormValues {
  return {
    type: config.type,
    oidcDiscoveryUrl:
      (config.oidcConfig?.discoveryEndpoint as string | undefined) ?? "",
    oidcClientId: (config.oidcConfig?.clientId as string | undefined) ?? "",
    oidcClientSecret: config.oidcConfig?.clientSecret ? REDACTED : "",
    samlMetadataUrl:
      (config.samlConfig?.metadataUrl as string | undefined) ?? "",
    domain: config.domain ?? "",
  };
}

/**
 * Empty initial form values used in setup mode. Every string field
 * starts as "" so controlled inputs have a stable value.
 */
export const emptyFormValues: SSOFormValues = {
  type: "oidc",
  oidcDiscoveryUrl: "",
  oidcClientId: "",
  oidcClientSecret: "",
  samlMetadataUrl: "",
  domain: "",
};

/**
 * Converts flat form values into the API submission payload. Empty
 * strings are mapped to `undefined` so the server can tell "user
 * didn't touch this field" from "user cleared this field to an
 * empty value".
 *
 * If the client secret is still the `REDACTED` sentinel, we don't
 * send it at all — the server keeps whatever it already has.
 */
export function formValuesToApiPayload(values: SSOFormValues): {
  type: SSOProviderType;
  oidcDiscoveryUrl?: string;
  oidcClientId?: string;
  oidcClientSecret?: string;
  samlMetadataUrl?: string;
  domain?: string;
} {
  const clientSecret = values.oidcClientSecret;
  return {
    type: values.type,
    oidcDiscoveryUrl: values.oidcDiscoveryUrl || undefined,
    oidcClientId: values.oidcClientId || undefined,
    oidcClientSecret:
      clientSecret && clientSecret !== REDACTED ? clientSecret : undefined,
    samlMetadataUrl: values.samlMetadataUrl || undefined,
    domain: values.domain || undefined,
  };
}
