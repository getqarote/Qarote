import crypto from "node:crypto";

import { beforeAll, describe, expect, it, vi } from "vitest";

import type { LicenseData, LicenseJwtPayload } from "../license.interfaces";
import {
  signLicenseData,
  signLicenseJwt,
  verifyLicenseJwt,
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

// ─── JWT (new format) ────────────────────────────────────────────────

const makeJwtPayload = (
  overrides: Partial<Omit<LicenseJwtPayload, "iss" | "iat">> = {}
): Omit<LicenseJwtPayload, "iss" | "iat"> => ({
  sub: "lic-test-123",
  tier: "DEVELOPER",
  features: ["alerting", "slack_integration"],
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  ...overrides,
});

describe("signLicenseJwt", () => {
  it("returns a compact JWT string with 3 dot-separated parts", async () => {
    const jwt = await signLicenseJwt(makeJwtPayload(), TEST_PRIVATE_KEY);
    expect(typeof jwt).toBe("string");
    expect(jwt.split(".")).toHaveLength(3);
  });

  it("produces a JWT that can be verified with the public key", async () => {
    const payload = makeJwtPayload();
    const jwt = await signLicenseJwt(payload, TEST_PRIVATE_KEY);
    const decoded = await verifyLicenseJwt(jwt, TEST_PUBLIC_KEY);

    expect(decoded).not.toBeNull();
    expect(decoded!.sub).toBe(payload.sub);
    expect(decoded!.tier).toBe(payload.tier);
    expect(decoded!.features).toEqual(payload.features);
    expect(decoded!.iss).toBe("qarote");
  });

  it("throws when given an invalid private key", async () => {
    await expect(
      signLicenseJwt(makeJwtPayload(), "not-a-real-key")
    ).rejects.toThrow("License JWT signing failed");
  });
});

describe("verifyLicenseJwt", () => {
  it("returns decoded payload for a valid JWT", async () => {
    const payload = makeJwtPayload();
    const jwt = await signLicenseJwt(payload, TEST_PRIVATE_KEY);
    const decoded = await verifyLicenseJwt(jwt, TEST_PUBLIC_KEY);

    expect(decoded).not.toBeNull();
    expect(decoded!.sub).toBe("lic-test-123");
    expect(decoded!.tier).toBe("DEVELOPER");
    expect(decoded!.features).toEqual(["alerting", "slack_integration"]);
    expect(decoded!.iss).toBe("qarote");
    expect(decoded!.iat).toEqual(expect.any(Number));
    expect(decoded!.exp).toEqual(expect.any(Number));
  });

  it("returns null for an expired JWT", async () => {
    const payload = makeJwtPayload({
      exp: Math.floor(Date.now() / 1000) - 60, // expired 1 minute ago
    });
    const jwt = await signLicenseJwt(payload, TEST_PRIVATE_KEY);
    const decoded = await verifyLicenseJwt(jwt, TEST_PUBLIC_KEY);

    expect(decoded).toBeNull();
  });

  it("returns null for a JWT signed with a different key", async () => {
    const { privateKey: wrongPrivateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });

    const jwt = await signLicenseJwt(
      makeJwtPayload(),
      wrongPrivateKey as string
    );
    const decoded = await verifyLicenseJwt(jwt, TEST_PUBLIC_KEY);

    expect(decoded).toBeNull();
  });

  it("returns null for garbage input", async () => {
    const decoded = await verifyLicenseJwt("not-a-jwt", TEST_PUBLIC_KEY);
    expect(decoded).toBeNull();
  });

  it("uses process.env.LICENSE_PUBLIC_KEY when no explicit key is provided", async () => {
    const payload = makeJwtPayload();
    const jwt = await signLicenseJwt(payload, TEST_PRIVATE_KEY);

    // Set the env var to our test public key
    const originalEnv = process.env.LICENSE_PUBLIC_KEY;
    process.env.LICENSE_PUBLIC_KEY = TEST_PUBLIC_KEY;

    try {
      // Call without explicit public key — should use env var
      const decoded = await verifyLicenseJwt(jwt);
      expect(decoded).not.toBeNull();
      expect(decoded!.sub).toBe(payload.sub);
    } finally {
      // Restore
      if (originalEnv === undefined) {
        delete process.env.LICENSE_PUBLIC_KEY;
      } else {
        process.env.LICENSE_PUBLIC_KEY = originalEnv;
      }
    }
  });
});
