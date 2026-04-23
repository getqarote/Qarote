/**
 * Known-good OIDC discovery URL templates for the most common
 * identity providers Qarote operators use. Clicking a preset chip
 * prefills the Discovery URL field with a template the operator
 * can then edit — the `{{placeholder}}` markers are human-readable
 * hints, not i18n tokens (we keep these out of the translation
 * pipeline because they're literal IdP configuration patterns).
 *
 * Ordering is deliberate: self-hosted open-source providers first
 * (Keycloak + Authentik — the SRE/devops default), then hosted
 * SaaS alphabetically. This matches Qarote's "self-hosted, not
 * enterprise-stiff" brand positioning — operators using Keycloak
 * see their IdP listed first.
 *
 * When adding a new preset, verify the discovery URL pattern by
 * checking the IdP's docs — several vendors have multiple valid
 * patterns depending on tenancy model, and getting it wrong will
 * cost operators time during setup.
 */
interface SSOProviderPreset {
  /**
   * Stable identifier used as a React key and as the i18n key
   * suffix (e.g. "keycloak" → `presetKeycloak`).
   */
  id: string;
  /**
   * i18n key for the chip label, under the `sso` namespace.
   * Separate from `id` so translators can localize the display
   * name while the code still uses a stable English key.
   */
  labelKey: string;
  /**
   * OIDC discovery URL template. Contains `{{placeholder}}`
   * markers the operator replaces with their tenant or realm.
   * These are NOT i18next interpolation markers — they're visual
   * hints that stay in the field for the operator to overwrite.
   */
  template: string;
}

export const SSO_PROVIDER_PRESETS: readonly SSOProviderPreset[] = [
  {
    id: "keycloak",
    labelKey: "presetKeycloak",
    template:
      "https://{{your-keycloak}}/realms/{{realm}}/.well-known/openid-configuration",
  },
  {
    id: "authentik",
    labelKey: "presetAuthentik",
    template:
      "https://{{authentik.company.com}}/application/o/{{slug}}/.well-known/openid-configuration",
  },
  {
    id: "auth0",
    labelKey: "presetAuth0",
    template: "https://{{tenant}}.auth0.com/.well-known/openid-configuration",
  },
  {
    id: "okta",
    labelKey: "presetOkta",
    template: "https://{{your-org}}.okta.com/.well-known/openid-configuration",
  },
  {
    id: "google",
    labelKey: "presetGoogle",
    template: "https://accounts.google.com/.well-known/openid-configuration",
  },
  {
    id: "entra",
    labelKey: "presetEntra",
    template:
      "https://login.microsoftonline.com/{{tenant-id}}/v2.0/.well-known/openid-configuration",
  },
] as const;
