/**
 * License API Client
 */

import { BaseApiClient } from "./baseClient";

export interface License {
  id: string;
  licenseKey: string;
  tier: "FREE" | "DEVELOPER" | "ENTERPRISE";
  expiresAt: Date | null;
  customerEmail: string;
  workspaceId: string | null;
  lastValidatedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LicensePurchaseRequest {
  tier: "DEVELOPER" | "ENTERPRISE";
  billingInterval: "monthly" | "yearly";
}

export interface LicensePurchaseResponse {
  checkoutUrl: string;
}

export interface LicenseValidationRequest {
  licenseKey: string;
  instanceId?: string;
}

export interface LicenseValidationResponse {
  valid: boolean;
  license?: License;
  message?: string;
}

export class LicenseApiClient extends BaseApiClient {
  async getLicenses(): Promise<{ licenses: License[] }> {
    return this.request<{ licenses: License[] }>("/portal/licenses");
  }

  async purchaseLicense(
    data: LicensePurchaseRequest
  ): Promise<LicensePurchaseResponse> {
    return this.request<LicensePurchaseResponse>("/portal/licenses/purchase", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async validateLicense(
    data: LicenseValidationRequest
  ): Promise<LicenseValidationResponse> {
    return this.request<LicenseValidationResponse>("/license/validate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async downloadLicense(licenseId: string): Promise<Blob> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${this.baseUrl}/portal/licenses/${licenseId}/download`,
      {
        headers,
      }
    );

    if (!response.ok) {
      throw new Error("Failed to download license");
    }

    return response.blob();
  }
}
