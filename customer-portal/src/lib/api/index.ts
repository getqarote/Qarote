import { AuthApiClient, type User as UserType } from "./authClient";
import { type License as LicenseType,LicenseApiClient } from "./licenseClient";

export const authClient = new AuthApiClient();
export const licenseClient = new LicenseApiClient();

// Re-export types
export type User = UserType;
export type License = LicenseType;
