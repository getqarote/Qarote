/**
 * Cryptographic License Service
 * Handles JWT RS256 signing/verification for license keys
 */

import * as jose from "jose";

import { logger } from "@/core/logger";

import type { LicenseJwtPayload } from "./license.interfaces";
import { LICENSE_PUBLIC_KEY } from "./license-public-key";

// ─── JWT (new format) ────────────────────────────────────────────────

/**
 * Sign a license JWT with the private key (cloud-side only)
 */
export async function signLicenseJwt(
  payload: Omit<LicenseJwtPayload, "iss" | "iat">,
  privateKeyPem: string
): Promise<string> {
  try {
    const privateKey = await jose.importPKCS8(privateKeyPem, "RS256");

    const jwt = await new jose.SignJWT({
      tier: payload.tier,
      features: payload.features,
    } as unknown as jose.JWTPayload)
      .setProtectedHeader({ alg: "RS256" })
      .setSubject(payload.sub)
      .setIssuer("qarote")
      .setIssuedAt()
      .setExpirationTime(payload.exp)
      .sign(privateKey);

    return jwt;
  } catch (error) {
    logger.error({ error }, "Failed to sign license JWT");
    throw new Error("License JWT signing failed", { cause: error });
  }
}

/**
 * Verify and decode a license JWT using the baked-in public key
 * Returns the decoded payload if valid, null if invalid/expired
 */
export async function verifyLicenseJwt(
  jwt: string,
  publicKeyPem?: string
): Promise<LicenseJwtPayload | null> {
  try {
    const pem =
      publicKeyPem || process.env.LICENSE_PUBLIC_KEY || LICENSE_PUBLIC_KEY;

    if (pem.includes("REPLACE_WITH_YOUR_ACTUAL_RSA_PUBLIC_KEY")) {
      logger.error(
        "LICENSE_PUBLIC_KEY is still set to the placeholder value. " +
          "Set the LICENSE_PUBLIC_KEY environment variable to a real RSA public key."
      );
      return null;
    }

    const publicKey = await jose.importSPKI(pem, "RS256");

    const { payload } = await jose.jwtVerify(jwt, publicKey, {
      issuer: "qarote",
    });

    // Validate required claims are present
    if (!payload.sub || payload.iat == null || payload.exp == null) {
      logger.warn("License JWT missing required claims (sub, iat, or exp)");
      return null;
    }

    if (!payload.tier || !Array.isArray(payload.features)) {
      logger.warn("License JWT missing required fields (tier or features)");
      return null;
    }

    return {
      sub: payload.sub,
      tier: payload.tier as LicenseJwtPayload["tier"],
      features: payload.features as LicenseJwtPayload["features"],
      iss: "qarote",
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    // Expected for expired/invalid tokens — don't log as error
    if (error instanceof jose.errors.JWTExpired) {
      logger.warn("License JWT has expired");
    } else if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
      logger.warn("License JWT signature verification failed");
    } else {
      logger.error({ error }, "Failed to verify license JWT");
    }
    return null;
  }
}
