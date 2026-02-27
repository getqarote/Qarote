/**
 * License Migration Service
 * Handles backward compatibility for existing enterprise users
 * who have a license file on disk (LICENSE_FILE_PATH env var).
 *
 * At startup, if LICENSE_FILE_PATH is set and no license_jwt exists in DB,
 * reads the old JSON license file, verifies its signature, and stores it
 * in SystemSetting so the new feature-flags system can read it.
 */

import fs from "node:fs/promises";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import type { LicenseFile } from "./license.interfaces";
import { verifyLicenseSignature } from "./license-crypto.service";
import { LICENSE_PUBLIC_KEY } from "./license-public-key";

/**
 * Migrate a legacy license file to the SystemSetting table.
 * Called once at startup. Safe to call multiple times (idempotent).
 */
export async function migrateLegacyLicenseFile(): Promise<void> {
  const filePath = process.env.LICENSE_FILE_PATH;

  if (!filePath) {
    return; // No legacy file configured — nothing to migrate
  }

  // Check if a license already exists in the database
  const existing = await prisma.systemSetting.findUnique({
    where: { key: "license_jwt" },
  });

  if (existing) {
    logger.info(
      "License already exists in database — skipping legacy file migration"
    );
    return;
  }

  // Read the legacy license file
  let fileContent: string;
  try {
    fileContent = await fs.readFile(filePath, "utf-8");
  } catch (error) {
    logger.warn(
      { error, filePath },
      "Could not read legacy license file. Skipping migration."
    );
    return;
  }

  // Parse and verify the legacy license
  let licenseFile: LicenseFile;
  try {
    licenseFile = JSON.parse(fileContent);
  } catch {
    logger.warn(
      { filePath },
      "Legacy license file is not valid JSON. Skipping migration."
    );
    return;
  }

  if (!licenseFile.signature) {
    logger.warn(
      { filePath },
      "Legacy license file has no signature. Skipping migration."
    );
    return;
  }

  // Verify signature using the baked-in public key
  const publicKey = process.env.LICENSE_PUBLIC_KEY || LICENSE_PUBLIC_KEY;

  const isValid = verifyLicenseSignature(
    {
      licenseKey: licenseFile.licenseKey,
      tier: licenseFile.tier,
      customerEmail: licenseFile.customerEmail,
      issuedAt: licenseFile.issuedAt,
      expiresAt: licenseFile.expiresAt,
      features: licenseFile.features,
      maxInstances: licenseFile.maxInstances,
    },
    licenseFile.signature,
    publicKey
  );

  if (!isValid) {
    logger.warn(
      { filePath },
      "Legacy license file signature verification failed. Skipping migration."
    );
    return;
  }

  // Check expiry
  const expiresAt = new Date(licenseFile.expiresAt);
  if (expiresAt < new Date()) {
    logger.warn(
      { filePath, expiresAt: licenseFile.expiresAt },
      "Legacy license file has expired. Skipping migration."
    );
    return;
  }

  // Store the verified legacy license in SystemSetting
  // Prefix with "legacy:" so feature-flags can detect the format
  const legacyValue = `legacy:${fileContent}`;

  await prisma.systemSetting.create({
    data: {
      key: "license_jwt",
      value: legacyValue,
    },
  });

  logger.info(
    {
      tier: licenseFile.tier,
      expiresAt: licenseFile.expiresAt,
      features: licenseFile.features,
    },
    "Migrated legacy license file to database. You can now remove LICENSE_FILE_PATH from your environment."
  );
}
