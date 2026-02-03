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
  expiresAt: string;
  features: string[];
  maxInstances?: number;
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
  expiresAt: string;
  features: string[];
  maxInstances?: number;
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
  expiresAt: Date;
  stripeCustomerId?: string;
  stripePaymentId?: string;
  stripeSubscriptionId?: string; // For annual subscriptions with auto-renewal
}

/**
 * Options for validating a license
 */
export interface ValidateLicenseOptions {
  licenseKey: string;
}

/**
 * Options for generating a license file
 */
export interface GenerateLicenseFileOptions {
  licenseKey: string;
  tier: UserPlan;
  customerEmail: string;
  expiresAt: Date;
  features: string[];
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
  expiresAt: Date;
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

/**
 * Result of renewing a license
 */
export interface RenewLicenseResult {
  license: {
    id: string;
    licenseKey: string;
    tier: UserPlan;
    customerEmail: string;
    expiresAt: Date;
    isActive: boolean;
    workspaceId: string | null;
    stripeCustomerId: string | null;
    stripePaymentId: string | null;
    stripeSubscriptionId: string | null;
    currentVersion: number;
    createdAt: Date;
    updatedAt: Date;
  };
  newVersion: number;
}
