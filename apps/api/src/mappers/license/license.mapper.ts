/**
 * Mapper for transforming Prisma License to API response format
 * Converts Date objects to ISO strings for JSON serialization
 */

import type {
  LicenseApiResponse,
  PrismaLicenseWithDates,
} from "./license.interfaces";

/**
 * Mapper for transforming Prisma License to API response format
 */
export class LicenseMapper {
  /**
   * Map a single Prisma License to LicenseApiResponse
   * Converts Date objects to ISO strings for JSON serialization
   */
  static toApiResponse(license: PrismaLicenseWithDates): LicenseApiResponse {
    return {
      id: license.id,
      licenseKey: license.licenseKey,
      tier: license.tier,
      expiresAt: license.expiresAt?.toISOString() ?? null,
      customerEmail: license.customerEmail,
      workspaceId: license.workspaceId,
      lastValidatedAt: license.lastValidatedAt?.toISOString() ?? null,
      isActive: license.isActive,
      stripeCustomerId: license.stripeCustomerId,
      stripePaymentId: license.stripePaymentId,
      instanceId: license.instanceId,
      createdAt: license.createdAt.toISOString(),
      updatedAt: license.updatedAt.toISOString(),
    };
  }

  /**
   * Map an array of Prisma License to LicenseApiResponse[]
   */
  static toApiResponseArray(
    licenses: PrismaLicenseWithDates[]
  ): LicenseApiResponse[] {
    return licenses.map(this.toApiResponse);
  }
}

