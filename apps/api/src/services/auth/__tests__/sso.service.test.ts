import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/core/prisma";

import { ssoService } from "../sso.service";

vi.mock("@/core/prisma", () => ({
  prisma: {
    ssoState: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn(),
      delete: vi.fn(),
    },
    ssoAuthCode: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock BoxyHQ Jackson to prevent ESM import failures in test environment
vi.mock("@boxyhq/saml-jackson", () => ({
  controllers: vi.fn().mockResolvedValue({
    oauthController: {},
    connectionAPIController: {},
  }),
}));

describe("SSOService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore fire-and-forget mock to prevent unhandled rejections
    vi.mocked(prisma.ssoState.deleteMany).mockResolvedValue({
      count: 0,
    } as never);
    vi.mocked(prisma.ssoAuthCode.deleteMany).mockResolvedValue({
      count: 0,
    } as never);
  });

  describe("generateStateToken", () => {
    it("returns a 64-character hex string (32 random bytes)", async () => {
      vi.mocked(prisma.ssoState.create).mockResolvedValue({} as never);

      const state = await ssoService.generateStateToken();

      expect(state).toMatch(/^[a-f0-9]{64}$/);
    });

    it("creates an ssoState record in the database", async () => {
      vi.mocked(prisma.ssoState.create).mockResolvedValue({} as never);

      await ssoService.generateStateToken();

      expect(prisma.ssoState.create).toHaveBeenCalledTimes(1);
    });

    it("sets expiresAt approximately 10 minutes from now", async () => {
      vi.mocked(prisma.ssoState.create).mockResolvedValue({} as never);

      const before = Date.now();
      await ssoService.generateStateToken();
      const after = Date.now();

      const callArgs = vi.mocked(prisma.ssoState.create).mock.calls[0][0];
      const expiresAt = callArgs.data.expiresAt as Date;
      const tenMinutesMs = 10 * 60 * 1000;

      expect(expiresAt.getTime()).toBeGreaterThan(before + tenMinutesMs - 1000);
      expect(expiresAt.getTime()).toBeLessThan(after + tenMinutesMs + 1000);
    });

    it("returns unique tokens on each call", async () => {
      vi.mocked(prisma.ssoState.create).mockResolvedValue({} as never);

      const state1 = await ssoService.generateStateToken();
      const state2 = await ssoService.generateStateToken();

      expect(state1).not.toBe(state2);
    });
  });

  describe("validateStateToken", () => {
    it("returns false for an empty string", async () => {
      const result = await ssoService.validateStateToken("");
      expect(result).toBe(false);
    });

    it("returns false when state does not exist in DB (delete returns null)", async () => {
      vi.mocked(prisma.ssoState.delete).mockRejectedValue(
        new Error("Record not found")
      );

      const result = await ssoService.validateStateToken("nonexistent-state");
      expect(result).toBe(false);
    });

    it("returns false when state is expired (expiresAt < now)", async () => {
      vi.mocked(prisma.ssoState.delete).mockResolvedValue({
        id: "state-id",
        state: "some-state",
        expiresAt: new Date(Date.now() - 60_000), // expired 1 minute ago
      } as never);

      const result = await ssoService.validateStateToken("some-state");
      expect(result).toBe(false);
    });

    it("returns true when state exists and is not expired", async () => {
      vi.mocked(prisma.ssoState.delete).mockResolvedValue({
        id: "state-id",
        state: "some-state",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // expires in 5 minutes
      } as never);

      const result = await ssoService.validateStateToken("some-state");
      expect(result).toBe(true);
    });

    it("consumes the token by deleting it (single-use)", async () => {
      vi.mocked(prisma.ssoState.delete).mockResolvedValue({
        id: "state-id",
        state: "some-state",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      } as never);

      await ssoService.validateStateToken("some-state");

      expect(prisma.ssoState.delete).toHaveBeenCalledWith({
        where: { state: "some-state" },
      });
    });
  });

  describe("storeAuthCode", () => {
    it("returns a 64-character hex code", async () => {
      vi.mocked(prisma.ssoAuthCode.create).mockResolvedValue({} as never);

      const code = await ssoService.storeAuthCode(
        "jwt-token",
        { id: "user-1" },
        false
      );

      expect(code).toMatch(/^[a-f0-9]{64}$/);
    });

    it("creates an ssoAuthCode record with the jwt, userData, and isNewUser", async () => {
      vi.mocked(prisma.ssoAuthCode.create).mockResolvedValue({} as never);

      const userData = { id: "user-1", email: "user@example.com" };
      await ssoService.storeAuthCode("jwt-token", userData, true);

      expect(prisma.ssoAuthCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            jwt: "jwt-token",
            userData,
            isNewUser: true,
          }),
        })
      );
    });

    it("sets expiresAt approximately 60 seconds from now", async () => {
      vi.mocked(prisma.ssoAuthCode.create).mockResolvedValue({} as never);

      const before = Date.now();
      await ssoService.storeAuthCode("jwt-token", {}, false);
      const after = Date.now();

      const callArgs = vi.mocked(prisma.ssoAuthCode.create).mock.calls[0][0];
      const expiresAt = callArgs.data.expiresAt as Date;

      expect(expiresAt.getTime()).toBeGreaterThan(before + 59_000);
      expect(expiresAt.getTime()).toBeLessThan(after + 61_000);
    });

    it("returns unique codes on each call", async () => {
      vi.mocked(prisma.ssoAuthCode.create).mockResolvedValue({} as never);

      const code1 = await ssoService.storeAuthCode("jwt-1", {}, false);
      const code2 = await ssoService.storeAuthCode("jwt-2", {}, false);

      expect(code1).not.toBe(code2);
    });
  });

  describe("exchangeAuthCode", () => {
    it("returns null when code does not exist (delete fails)", async () => {
      vi.mocked(prisma.ssoAuthCode.delete).mockRejectedValue(
        new Error("Record not found")
      );

      const result = await ssoService.exchangeAuthCode("nonexistent-code");
      expect(result).toBeNull();
    });

    it("returns null when code is expired (expiresAt < now)", async () => {
      vi.mocked(prisma.ssoAuthCode.delete).mockResolvedValue({
        id: "code-id",
        code: "some-code",
        jwt: "jwt-token",
        userData: { id: "user-1" },
        isNewUser: false,
        expiresAt: new Date(Date.now() - 60_000), // expired 1 minute ago
      } as never);

      const result = await ssoService.exchangeAuthCode("some-code");
      expect(result).toBeNull();
    });

    it("returns { jwt, user, isNewUser } when code is valid and not expired", async () => {
      const userData = { id: "user-1", email: "user@example.com" };
      vi.mocked(prisma.ssoAuthCode.delete).mockResolvedValue({
        id: "code-id",
        code: "some-code",
        jwt: "valid-jwt",
        userData,
        isNewUser: true,
        expiresAt: new Date(Date.now() + 30_000), // expires in 30 seconds
      } as never);

      const result = await ssoService.exchangeAuthCode("some-code");

      expect(result).not.toBeNull();
      expect(result?.jwt).toBe("valid-jwt");
      expect(result?.user).toEqual(userData);
      expect(result?.isNewUser).toBe(true);
    });

    it("consumes the code by deleting it (single-use)", async () => {
      vi.mocked(prisma.ssoAuthCode.delete).mockResolvedValue({
        id: "code-id",
        code: "some-code",
        jwt: "valid-jwt",
        userData: {},
        isNewUser: false,
        expiresAt: new Date(Date.now() + 30_000),
      } as never);

      await ssoService.exchangeAuthCode("some-code");

      expect(prisma.ssoAuthCode.delete).toHaveBeenCalledWith({
        where: { code: "some-code" },
      });
    });
  });
});
