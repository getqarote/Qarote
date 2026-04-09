/**
 * Client-side shapes for the SMTP settings UI. Mirror the server
 * `SmtpSettings` response closely but are flattened into form-
 * friendly strings (empty string = "not set") so controlled inputs
 * have stable values from first render.
 */

export interface SMTPSettingsData {
  /**
   * Where the current settings are sourced from: `database` means
   * the admin configured them via this UI, `environment` means
   * they come from env vars at startup (read-only hint to the UI
   * so it can label the badge).
   */
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

/**
 * Flat form state used by the SMTP form cards. Strings are never
 * undefined so controlled inputs render without warnings. The
 * submission handler maps empty strings back to `undefined` for
 * the API payload.
 */
export interface SMTPFormValues {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  service: string;
  oauthClientId: string;
  oauthClientSecret: string;
  oauthRefreshToken: string;
}

/**
 * Converts a raw `SMTPSettingsData` from the API into flat form
 * values. Nulls become empty strings; a missing port defaults to
 * the standard SMTP submission port (587).
 */
export function smtpSettingsToFormValues(
  settings: SMTPSettingsData
): SMTPFormValues {
  return {
    enabled: settings.enabled,
    host: settings.host ?? "",
    port: settings.port ?? 587,
    user: settings.user ?? "",
    pass: settings.pass ?? "",
    fromEmail: settings.fromEmail ?? "",
    service: settings.service ?? "",
    oauthClientId: settings.oauthClientId ?? "",
    oauthClientSecret: settings.oauthClientSecret ?? "",
    oauthRefreshToken: settings.oauthRefreshToken ?? "",
  };
}

/**
 * Flat form values → API update payload. Empty strings collapse
 * to `undefined` so the server can distinguish "user didn't touch
 * this field" from "user cleared this field to an empty value".
 */
export function smtpFormValuesToPayload(values: SMTPFormValues): {
  enabled: boolean;
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  fromEmail?: string;
  service?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthRefreshToken?: string;
} {
  return {
    enabled: values.enabled,
    host: values.host || undefined,
    port: values.port || undefined,
    user: values.user || undefined,
    pass: values.pass || undefined,
    fromEmail: values.fromEmail || undefined,
    service: values.service || undefined,
    oauthClientId: values.oauthClientId || undefined,
    oauthClientSecret: values.oauthClientSecret || undefined,
    oauthRefreshToken: values.oauthRefreshToken || undefined,
  };
}
