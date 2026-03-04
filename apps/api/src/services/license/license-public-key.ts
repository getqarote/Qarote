/**
 * Production RSA public key for license verification
 *
 * This key is used to verify license JWTs signed by Qarote Cloud.
 * The corresponding private key is kept secret on the cloud server.
 *
 * Self-hosted users can override this by setting the LICENSE_PUBLIC_KEY
 * environment variable (e.g. for staging or custom deployments).
 */
export const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnflPd0TdiuJ1wicUY+am
XT9UI59nrcMg2BespAGUkgUbJ2kE1QudUYhE+2JP+0vxhmwu+qm7Nn9UMWmBg7TW
7kkNvO711fT26f30dsSPCHGLHY7vLAflMk5xFfxXP9+5L1gLRHJXzOGE61xb+LkI
TJkUnUuQTlFfjel4VFjhuBFfhcWnMioqA0e/rizapAz9EbOuoBvharWQ2gHBOqs3
y/XLCfB1/VuijNHylBSeNj3gHW4gwSYgFAt6y7Vfw9pZuETEioBYJUf+m9t+G/is
t/yqGGX3lQeRVy6jAhEMziE0KlbzKQKSGqrNsWOfqO4p75ONtdpePP7KEByUzD0g
UQIDAQAB
-----END PUBLIC KEY-----`;
