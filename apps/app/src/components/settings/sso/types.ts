/**
 * Client-side shapes for the SSO settings UI. The raw shape comes from
 * the tRPC `sso.getProviderConfig` endpoint, but the form surface
 * needs a stable flat contract so every extracted component can
 * consume and emit the same set of fields regardless of whether
 * they're editing an existing provider or setting up a new one.
 */

export type SSOProviderType = "oidc" | "saml";

/**
 * Raw provider config as returned from the tRPC endpoint. OIDC and
 * SAML configs are nested under `oidcConfig` / `samlConfig`. The
 * form flattens these into a single `SSOFormValues` for editing.
 */
export interface ProviderConfig {
  enabled: boolean;
  buttonLabel: string;
  providerId: string;
  domain: string;
  type: SSOProviderType;
  oidcConfig: Record<string, unknown> | null;
  samlConfig: Record<string, unknown> | null;
}

/**
 * Flat form state used by the unified `SSOProviderForm`. Fields are
 * strings (never undefined) so controlled inputs have a stable value
 * on first render. Empty string means "not set" — the submission
 * handler maps empty → `undefined` when talking to the API.
 */
export interface SSOFormValues {
  type: SSOProviderType;
  oidcDiscoveryUrl: string;
  oidcClientId: string;
  oidcClientSecret: string;
  samlMetadataUrl: string;
  domain: string;
}
