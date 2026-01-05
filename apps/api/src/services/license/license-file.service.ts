/**
 * License File Service
 * Handles reading, parsing, and validating license files
 */

import fs from "node:fs/promises";
import path from "node:path";

import { getInstanceId } from "@/core/instance-fingerprint";
import { logger } from "@/core/logger";

import { licenseConfig } from "@/config";

import type {
  LicenseFile,
  LicenseValidationResult,
} from "./license.interfaces";
import { verifyLicenseSignature } from "./license-crypto.service";

/**
 * Read license file from filesystem
 */
export async function readLicenseFile(
  filePath?: string
): Promise<LicenseFile | null> {
  try {
    const licensePath = filePath || licenseConfig.licenseFilePath;

    // Resolve absolute path
    const absolutePath = path.isAbsolute(licensePath)
      ? licensePath
      : path.join(process.cwd(), licensePath);

    // Check if file exists
    try {
      await fs.access(absolutePath);
    } catch {
      logger.warn({ path: absolutePath }, "License file not found");
      return null;
    }

    // Read file
    const fileContent = await fs.readFile(absolutePath, "utf-8");
    const licenseData = JSON.parse(fileContent) as LicenseFile;

    // Validate structure
    if (!licenseData.licenseKey || !licenseData.signature) {
      throw new Error("Invalid license file structure");
    }

    return licenseData;
  } catch (error) {
    logger.error({ error }, "Failed to read license file");
    return null;
  }
}

/**
 * Validate license file offline
 */
export async function validateLicenseFileOffline(
  licenseFile: LicenseFile | null,
  publicKey?: string
): Promise<LicenseValidationResult> {
  if (!licenseFile) {
    return {
      valid: false,
      reason: "license_file_not_found",
      message: "License file not found",
    };
  }

  // Get public key
  const key = publicKey || licenseConfig.publicKey;
  if (!key) {
    return {
      valid: false,
      reason: "public_key_not_configured",
      message: "License public key not configured",
    };
  }

  // 1. Verify cryptographic signature
  const isValidSignature = verifyLicenseSignature(
    licenseFile,
    licenseFile.signature,
    key
  );

  if (!isValidSignature) {
    return {
      valid: false,
      reason: "invalid_signature",
      message: "License signature verification failed",
    };
  }

  // 2. Check expiration (skip if null - perpetual license)
  if (licenseFile.expiresAt !== null) {
    const expiresAt = new Date(licenseFile.expiresAt);
    const now = new Date();

    if (expiresAt < now) {
      return {
        valid: false,
        reason: "expired",
        message: `License expired on ${expiresAt.toISOString()}`,
      };
    }
  }

  // 3. Check instance ID if specified
  if (licenseFile.instanceId) {
    const currentInstanceId = getInstanceId();
    if (currentInstanceId !== licenseFile.instanceId) {
      return {
        valid: false,
        reason: "instance_mismatch",
        message: "License instance ID does not match current instance",
      };
    }
  }

  // 4. License is valid
  return {
    valid: true,
    license: licenseFile,
  };
}

/**
 * Check if a feature is included in license
 */
export function hasFeature(license: LicenseFile, feature: string): boolean {
  return license.features.includes(feature);
}
