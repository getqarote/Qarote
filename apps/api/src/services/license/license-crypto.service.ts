/**
 * Cryptographic License Service
 * Handles RSA-SHA256 signing/verification (legacy) and JWT RS256 signing/verification (new)
 */

import crypto from "node:crypto";

import * as jose from "jose";

import { logger } from "@/core/logger";

import type { LicenseData, LicenseJwtPayload } from "./license.interfaces";
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
    const pem = publicKeyPem || LICENSE_PUBLIC_KEY;
    const publicKey = await jose.importSPKI(pem, "RS256");

    const { payload } = await jose.jwtVerify(jwt, publicKey, {
      issuer: "qarote",
    });

    return {
      sub: payload.sub!,
      tier: payload.tier as LicenseJwtPayload["tier"],
      features: payload.features as LicenseJwtPayload["features"],
      iss: "qarote",
      iat: payload.iat!,
      exp: payload.exp!,
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

// ─── Legacy RSA-SHA256 (kept for migration compatibility) ────────────

/**
 * Sign license data with private key (legacy format)
 * @deprecated Use signLicenseJwt instead
 */
export function signLicenseData(data: LicenseData, privateKey: string): string {
  try {
    const dataToSign = JSON.stringify({
      licenseKey: data.licenseKey,
      tier: data.tier,
      customerEmail: data.customerEmail,
      issuedAt: data.issuedAt,
      expiresAt: data.expiresAt,
      features: data.features,
      maxInstances: data.maxInstances,
    });

    const sign = crypto.createSign("RSA-SHA256");
    sign.update(dataToSign);
    sign.end();

    return sign.sign(privateKey, "base64");
  } catch (error) {
    logger.error({ error }, "Failed to sign license data");
    throw new Error("License signing failed", { cause: error });
  }
}

/**
 * Verify license signature with public key (legacy format)
 * @deprecated Use verifyLicenseJwt instead
 */
export function verifyLicenseSignature(
  data: LicenseData,
  signature: string,
  publicKey: string
): boolean {
  try {
    const dataToVerify = JSON.stringify({
      licenseKey: data.licenseKey,
      tier: data.tier,
      customerEmail: data.customerEmail,
      issuedAt: data.issuedAt,
      expiresAt: data.expiresAt,
      features: data.features,
      maxInstances: data.maxInstances,
    });

    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(dataToVerify);
    verify.end();

    return verify.verify(publicKey, signature, "base64");
  } catch (error) {
    logger.error({ error }, "Failed to verify license signature");
    return false;
  }
}
