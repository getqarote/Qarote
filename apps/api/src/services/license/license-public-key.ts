/**
 * Baked-in RSA public key for license verification
 *
 * This key is embedded in the source code so self-hosted instances
 * can verify license JWTs offline without any env var configuration.
 *
 * The corresponding private key is kept secret on Qarote Cloud
 * and used to sign license JWTs at purchase/renewal time.
 */
export const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
REPLACE_WITH_YOUR_ACTUAL_RSA_PUBLIC_KEY
-----END PUBLIC KEY-----`;
