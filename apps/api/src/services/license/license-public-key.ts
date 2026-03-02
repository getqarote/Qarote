/**
 * Fallback RSA public key for license verification
 *
 * In production, set the LICENSE_PUBLIC_KEY environment variable to the real
 * RSA public key. The env var is checked first in license-crypto.service.ts.
 *
 * This inline constant is a last-resort fallback for local/dev use.
 * The placeholder value below is intentionally invalid — it will be rejected
 * at runtime with a clear error if no env var is provided.
 *
 * The corresponding private key is kept secret on Qarote Cloud
 * and used to sign license JWTs at purchase/renewal time.
 */
export const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
REPLACE_WITH_YOUR_ACTUAL_RSA_PUBLIC_KEY
-----END PUBLIC KEY-----`;
