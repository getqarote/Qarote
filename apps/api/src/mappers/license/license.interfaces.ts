/**
 * License API Response Types
 *
 * Types for license-related API responses with proper date serialization.
 */

export type PrismaLicenseWithDates = {
  id: string;
  licenseKey: string;
  tier: string;
  expiresAt: Date | null;
  customerEmail: string;
  workspaceId: string | null;
  lastValidatedAt: Date | null;
  isActive: boolean;
  stripeCustomerId: string | null;
  stripePaymentId: string | null;
  instanceId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LicenseApiResponse = {
  id: string;
  licenseKey: string;
  tier: string;
  expiresAt: string | null;
  customerEmail: string;
  workspaceId: string | null;
  lastValidatedAt: string | null;
  isActive: boolean;
  stripeCustomerId: string | null;
  stripePaymentId: string | null;
  instanceId: string | null;
  createdAt: string;
  updatedAt: string;
};

