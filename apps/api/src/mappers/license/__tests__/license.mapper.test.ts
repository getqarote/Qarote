import { describe, expect, it } from "vitest";

import type { PrismaLicenseWithDates } from "../license.interfaces";
import { LicenseMapper } from "../license.mapper";

const baseLicense: PrismaLicenseWithDates = {
  id: "lic-1",
  licenseKey: "RABBIT-DEV-AABB-1234",
  tier: "DEVELOPER",
  expiresAt: new Date("2026-12-31T00:00:00Z"),
  customerEmail: "user@example.com",
  workspaceId: null,
  lastValidatedAt: null,
  isActive: true,
  stripeCustomerId: null,
  stripePaymentId: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("LicenseMapper", () => {
  it("maps jwtContent from the latest fileVersion", () => {
    const license: PrismaLicenseWithDates = {
      ...baseLicense,
      fileVersions: [{ fileContent: "eyJhbGciOiJSUzI1NiJ9.test.jwt" }],
    };

    const result = LicenseMapper.toApiResponse(license);

    expect(result.jwtContent).toBe("eyJhbGciOiJSUzI1NiJ9.test.jwt");
  });

  it("returns jwtContent as null when no fileVersions exist", () => {
    const result = LicenseMapper.toApiResponse(baseLicense);

    expect(result.jwtContent).toBeNull();
  });

  it("returns jwtContent as null when fileVersions array is empty", () => {
    const license: PrismaLicenseWithDates = {
      ...baseLicense,
      fileVersions: [],
    };

    const result = LicenseMapper.toApiResponse(license);

    expect(result.jwtContent).toBeNull();
  });

  it("maps an array of licenses with toApiResponseArray", () => {
    const licenses: PrismaLicenseWithDates[] = [
      {
        ...baseLicense,
        fileVersions: [{ fileContent: "jwt-1" }],
      },
      {
        ...baseLicense,
        id: "lic-2",
        fileVersions: [],
      },
    ];

    const results = LicenseMapper.toApiResponseArray(licenses);

    expect(results).toHaveLength(2);
    expect(results[0].jwtContent).toBe("jwt-1");
    expect(results[1].jwtContent).toBeNull();
  });
});
