import crypto from "node:crypto";

import { beforeAll, describe, expect, it, vi } from "vitest";

import type { LicenseData } from "../license.interfaces";
import {
  signLicenseData,
  verifyLicenseSignature,
} from "../license-crypto.service";

vi.mock("@/core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// The vitest.setup.ts provides a real RSA private key in process.env.LICENSE_PRIVATE_KEY
const TEST_PRIVATE_KEY = process.env.LICENSE_PRIVATE_KEY!;
let TEST_PUBLIC_KEY: string;

beforeAll(() => {
  // Derive the public key from the private key
  const privateKeyObject = crypto.createPrivateKey(TEST_PRIVATE_KEY);
  TEST_PUBLIC_KEY = crypto
    .createPublicKey(privateKeyObject)
    .export({ type: "spki", format: "pem" }) as string;
});

const makeLicenseData = (
  overrides: Partial<LicenseData> = {}
): LicenseData => ({
  licenseKey: "RABBIT-ENT-ABCDEF1234567890-CAFEBABE",
  tier: "ENTERPRISE",
  customerEmail: "test@example.com",
  issuedAt: "2024-01-01T00:00:00.000Z",
  expiresAt: "2025-01-01T00:00:00.000Z",
  features: ["workspace_management", "alerting"],
  maxInstances: 5,
  ...overrides,
});

describe("signLicenseData", () => {
  it("returns a non-empty string", () => {
    const signature = signLicenseData(makeLicenseData(), TEST_PRIVATE_KEY);
    expect(typeof signature).toBe("string");
    expect(signature.length).toBeGreaterThan(0);
  });

  it("produces a base64-encoded string", () => {
    const signature = signLicenseData(makeLicenseData(), TEST_PRIVATE_KEY);
    // Valid base64 can be decoded without error
    expect(() => Buffer.from(signature, "base64")).not.toThrow();
    expect(Buffer.from(signature, "base64").length).toBeGreaterThan(0);
  });

  it("produces a valid RSA-SHA256 signature that can be verified with the public key", () => {
    const data = makeLicenseData();
    const signature = signLicenseData(data, TEST_PRIVATE_KEY);
    expect(verifyLicenseSignature(data, signature, TEST_PUBLIC_KEY)).toBe(true);
  });

  it("throws an error with 'License signing failed' when given an invalid private key", () => {
    expect(() => signLicenseData(makeLicenseData(), "not-a-real-key")).toThrow(
      "License signing failed"
    );
  });
});

describe("verifyLicenseSignature", () => {
  it("returns true for a valid signature produced by signLicenseData", () => {
    const data = makeLicenseData();
    const signature = signLicenseData(data, TEST_PRIVATE_KEY);
    expect(verifyLicenseSignature(data, signature, TEST_PUBLIC_KEY)).toBe(true);
  });

  it("returns false when the licenseKey is tampered with", () => {
    const data = makeLicenseData();
    const signature = signLicenseData(data, TEST_PRIVATE_KEY);
    const tamperedData = {
      ...data,
      licenseKey: "RABBIT-ENT-TAMPERED-00000000",
    };
    expect(
      verifyLicenseSignature(tamperedData, signature, TEST_PUBLIC_KEY)
    ).toBe(false);
  });

  it("returns false when the expiresAt is tampered with", () => {
    const data = makeLicenseData();
    const signature = signLicenseData(data, TEST_PRIVATE_KEY);
    const tamperedData = { ...data, expiresAt: "2099-01-01T00:00:00.000Z" };
    expect(
      verifyLicenseSignature(tamperedData, signature, TEST_PUBLIC_KEY)
    ).toBe(false);
  });

  it("returns false when the features are tampered with", () => {
    const data = makeLicenseData();
    const signature = signLicenseData(data, TEST_PRIVATE_KEY);
    const tamperedData = { ...data, features: ["admin_access", "unlimited"] };
    expect(
      verifyLicenseSignature(tamperedData, signature, TEST_PUBLIC_KEY)
    ).toBe(false);
  });

  it("returns false when using a different (wrong) public key", () => {
    const data = makeLicenseData();
    const signature = signLicenseData(data, TEST_PRIVATE_KEY);

    // Generate a different RSA key pair
    const { publicKey: wrongPublicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const wrongPublicPem = wrongPublicKey.export({
      type: "spki",
      format: "pem",
    }) as string;

    expect(verifyLicenseSignature(data, signature, wrongPublicPem)).toBe(false);
  });

  it("returns false for a malformed signature string", () => {
    const data = makeLicenseData();
    expect(
      verifyLicenseSignature(data, "not-valid-base64!!!", TEST_PUBLIC_KEY)
    ).toBe(false);
  });

  it("returns false (does not throw) on crypto errors", () => {
    const data = makeLicenseData();
    // Valid base64 but not a real signature
    const fakeSignature = Buffer.from("fake-signature-data").toString("base64");
    expect(verifyLicenseSignature(data, fakeSignature, TEST_PUBLIC_KEY)).toBe(
      false
    );
  });
});
