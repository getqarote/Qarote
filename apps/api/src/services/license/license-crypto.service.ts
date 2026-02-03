/**
 * Cryptographic License Service
 * Handles RSA-SHA256 signing and verification of license files
 */

import crypto from "node:crypto";

import { logger } from "@/core/logger";

import type { LicenseData } from "./license.interfaces";

/**
 * Sign license data with private key
 */
export function signLicenseData(data: LicenseData, privateKey: string): string {
  try {
    // Create the data to sign (exclude signature field)
    const dataToSign = JSON.stringify({
      licenseKey: data.licenseKey,
      tier: data.tier,
      customerEmail: data.customerEmail,
      issuedAt: data.issuedAt,
      expiresAt: data.expiresAt,
      features: data.features,
      maxInstances: data.maxInstances,
    });

    // Sign with RSA-SHA256
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(dataToSign);
    sign.end();

    const signature = sign.sign(privateKey, "base64");

    return signature;
  } catch (error) {
    logger.error({ error }, "Failed to sign license data");
    throw new Error("License signing failed");
  }
}

/**
 * Verify license signature with public key
 */
export function verifyLicenseSignature(
  data: LicenseData,
  signature: string,
  publicKey: string
): boolean {
  try {
    // Create the data that was signed (exclude signature field)
    const dataToVerify = JSON.stringify({
      licenseKey: data.licenseKey,
      tier: data.tier,
      customerEmail: data.customerEmail,
      issuedAt: data.issuedAt,
      expiresAt: data.expiresAt,
      features: data.features,
      maxInstances: data.maxInstances,
    });

    // Verify signature
    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(dataToVerify);
    verify.end();

    return verify.verify(publicKey, signature, "base64");
  } catch (error) {
    logger.error({ error }, "Failed to verify license signature");
    return false;
  }
}
