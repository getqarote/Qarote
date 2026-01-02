/**
 * License Type Definitions
 * Centralized interface definitions for license-related types
 */

import { UserPlan } from "@prisma/client";

/**
 * License data structure used for signing and verification
 */
export interface LicenseData {
  licenseKey: string;
  tier: string;
  customerEmail: string;
  issuedAt: string;
  expiresAt: string | null; // null means perpetual (never expires)
  features: string[];
  maxInstances?: number;
  instanceId?: string;
}

/**
 * License file structure as stored on disk
 */
export interface LicenseFile {
  version: string;
  licenseKey: string;
  tier: string;
  customerEmail: string;
  issuedAt: string;
  expiresAt: string | null; // null means perpetual (never expires)
  features: string[];
  maxInstances?: number;
  instanceId?: string;
  signature: string;
}

/**
 * Result of license file validation
 */
export interface LicenseValidationResult {
  valid: boolean;
  license?: LicenseFile;
  reason?: string;
  message?: string;
}

/**
 * Options for generating a new license
 */
export interface GenerateLicenseOptions {
  tier: UserPlan;
  customerEmail: string;
  workspaceId?: string;
  expiresAt?: Date;
  stripeCustomerId?: string;
  stripePaymentId?: string;
}

/**
 * Options for validating a license
 */
export interface ValidateLicenseOptions {
  licenseKey: string;
  instanceId?: string;
}

/**
 * Options for generating a license file
 */
export interface GenerateLicenseFileOptions {
  licenseKey: string;
  tier: UserPlan;
  customerEmail: string;
  expiresAt: Date | null;
  features: string[];
  instanceId?: string;
  maxInstances?: number;
}

/**
 * Result of generating a license file
 */
export interface GenerateLicenseFileResult {
  licenseFile: LicenseFile;
}

/**
 * Validated license information returned from license validation
 */
interface ValidatedLicense {
  id: string;
  tier: UserPlan;
  expiresAt: Date | null;
  isActive: boolean;
  customerEmail: string;
  workspaceId: string | null;
}

/**
 * License validation response
 */
export interface LicenseValidationResponse {
  valid: boolean;
  license?: ValidatedLicense;
  message?: string;
}
