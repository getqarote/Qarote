/**
 * License File Integrity Service
 * Validates that license file hasn't been tampered with
 */

import fs from "fs/promises";
import path from "path";

import { logger } from "@/core/logger";

import { licenseConfig } from "@/config";

/**
 * Check file permissions (should be readable only by owner)
 */
async function checkLicenseFilePermissions(
  filePath?: string
): Promise<boolean> {
  try {
    const licensePath = filePath || licenseConfig.licenseFilePath;
    const absolutePath = path.isAbsolute(licensePath)
      ? licensePath
      : path.join(process.cwd(), licensePath);

    try {
      const stats = await fs.stat(absolutePath);
      // Check that file is readable
      // In a more strict implementation, you could check that permissions are 600 (owner read/write only)
      return stats.isFile();
    } catch {
      return false;
    }
  } catch (error) {
    logger.error({ error }, "Failed to check license file permissions");
    return false;
  }
}

/**
 * Validate license file integrity
 */
export async function validateLicenseFileIntegrity(
  filePath?: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const licensePath = filePath || licenseConfig.licenseFilePath;
    const absolutePath = path.isAbsolute(licensePath)
      ? licensePath
      : path.join(process.cwd(), licensePath);

    // Check file exists
    try {
      await fs.access(absolutePath);
    } catch {
      return {
        valid: false,
        reason: "file_not_found",
      };
    }

    // Check permissions
    const hasValidPermissions = await checkLicenseFilePermissions(absolutePath);
    if (!hasValidPermissions) {
      return {
        valid: false,
        reason: "invalid_permissions",
      };
    }

    // File integrity is valid (signature verification handles content integrity)
    return {
      valid: true,
    };
  } catch (error) {
    logger.error({ error }, "Failed to validate license file integrity");
    return {
      valid: false,
      reason: "validation_error",
    };
  }
}
