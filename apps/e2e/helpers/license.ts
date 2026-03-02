/**
 * E2E License Test Helper
 * Generates signed license JWTs for testing the selfhosted activation flow.
 *
 * The RSA key pair below is for E2E tests ONLY — never use in production.
 * The corresponding public key is set in .env.test as LICENSE_PUBLIC_KEY
 * so the API server verifies these test JWTs.
 */

import * as jose from "jose";

export const E2E_LICENSE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDTT8Jxz+z2JUOo
k1EPw96MZnMCLnN5zkep7zLQf1fKx19Tn5Aj8++O6pdox9uScxMSgqclzEoB17Xw
OuohUbeuZ7ytqOX1PN5pqxdfNI7+EuQoQLN6k52Jme44bJqoaIGjPUPfzGlcdzsS
xdBsYvElj8sWKqXoxVgZ4LioQyZiUhgmg25YdO8qS24LoqGZ7qdRzLsy9EMGP07G
haI+ATAkl5dUzDPpeda8rzHVO+qJXmO6+8FxeM67OvwhloxzPlxJmUqxLAsq+ocl
qz7ydQyY2u4WUm455ISQZLxWWFJ0Ap3UfKrbPUopJ2VnVT2WY0CpSua7BSc9s4ie
0MKXw65rAgMBAAECggEAAQTOZATytjhs5/tS6OSD0yGHt2skg3MO2bnbVjozNjCz
SLkHDOkOu5UpOi6H9U7UY4soUGkJsvjGb0gI5nj1BS8SYudJIAFkSclmJgOofTrE
SW9lFqjEiMWqhA5kY0siwngEg5bO3xme3B+tS0S/hEk10tCisJqSs1T47d+MNMtW
N02V6Q9LCd9F50bfqoaEcIcvxjsi+4GuMW1LFiPJDlAGNHk/+WKvQdb0/sueSjki
Z4CpIhvt908l1umMLl3khPu7ugO+Buxt2z7Xtb7A3gVEr68gi2VQOTnFURMF1KDv
Xgq40bui3CWLwhnZtMm+Qo4uP8AB+hLKzIwYGAiSoQKBgQD4V+wvk0AXGPZcH0Df
6QY1sxI4VpRG67fSiJIfN0TMqUn4lF3FhYUNlf5/xKtVip3lHaiDqyWY/N1HFM9m
5ADO1aeUKdb1tyWLr5X1CI637TvhbxByUhhfHqub5EM4QP+mkIuMVEn4MAbx9d7W
VE5W9pJfANHASmzI9pz9RghyCwKBgQDZ048NGDkqoSKx0ZwAx74LR8xxIULVUD/V
+wMAxXuMUWeBc2PHWZ5vw9wfIXy3ef4TUAFalrb3mJJpn95uoQhHXKzkE+b/CYpn
rBIxKHpRxlRXovPpECBI33UdmbJjNjMDwukoGOD2DhRZC9rdI8sy3IWXXdg7RKWQ
2U6AX/bRIQKBgBGXGLGd+nIoYHrR8+RoOvpevrGi4EnNtG2DIuZ3IbZlX0nuKF4v
QOdfcnFWWtRqRxjNavw4iSc28e1w+efNyojb9Uy3UfSBjnVAcJy0iHdapF0pYr7W
Nce3Amy+VEyNvg3sOxYrejnMHRHSWoBP5GSgfmmgQzsdimsJnMELztlVAoGALScW
gx9fUj/eoj+R9/NvqIT0kwrTAMbGxMNohvNovdht/T5/E2a3WfGeonFdmebWzQgL
j8yoFsDwsKZsBECrJ6fFSu35NyqyHvVjO/9pA6R5/USRDOHD33c6nq0qdjhY8NGp
ZR9rGnYmr6KudqKhz2Q46PySAw8ixtjU1fWOgyECgYAINbnc8phG8O9/85h+zrgo
DodZHmQDmUffDKmnH2X0REfHNQybc8gBrxhl7Rl1ZvwYvv4Yr39DG/ZjI/OaBERU
wuqqxb0FhsIYjaGoX9aTzAtW6Id1jsJJTTweXdV+NWwEG6i+U57SxLv0elnGFa1F
YHpc80ZN2RClEG2ziIc4Ew==
-----END PRIVATE KEY-----`;

export const E2E_LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA00/Ccc/s9iVDqJNRD8Pe
jGZzAi5zec5Hqe8y0H9XysdfU5+QI/PvjuqXaMfbknMTEoKnJcxKAde18DrqIVG3
rme8rajl9TzeaasXXzSO/hLkKECzepOdiZnuOGyaqGiBoz1D38xpXHc7EsXQbGLx
JY/LFiql6MVYGeC4qEMmYlIYJoNuWHTvKktuC6Khme6nUcy7MvRDBj9OxoWiPgEw
JJeXVMwz6XnWvK8x1TvqiV5juvvBcXjOuzr8IZaMcz5cSZlKsSwLKvqHJas+8nUM
mNruFlJuOeSEkGS8VlhSdAKd1Hyq2z1KKSdlZ1U9lmNAqUrmuwUnPbOIntDCl8Ou
awIDAQAB
-----END PUBLIC KEY-----`;

/** All premium features available in the system */
export const ALL_PREMIUM_FEATURES = [
  "workspace_management",
  "alerting",
  "slack_integration",
  "webhook_integration",
  "data_export",
  "advanced_alert_rules",
];

/**
 * Generate a signed license JWT for E2E testing.
 */
export async function generateTestLicenseJwt(options: {
  tier?: string;
  features?: string[];
  expiresInSeconds?: number;
}): Promise<string> {
  const {
    tier = "DEVELOPER",
    features = ALL_PREMIUM_FEATURES,
    expiresInSeconds = 3600,
  } = options;

  const privateKey = await jose.importPKCS8(E2E_LICENSE_PRIVATE_KEY, "RS256");

  const jwt = await new jose.SignJWT({
    tier,
    features,
  } as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: "RS256" })
    .setSubject("e2e-test-license")
    .setIssuer("qarote")
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(privateKey);

  return jwt;
}
