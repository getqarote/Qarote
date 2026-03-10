import { describe, expect, it } from "vitest";

import type { PrismaUserWithDates } from "../auth.interfaces";
import { UserMapper } from "../auth.mapper";

const baseUser: PrismaUserWithDates = {
  id: "user-1",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  role: "MEMBER",
  workspaceId: "ws-1",
  isActive: true,
  emailVerified: true,
  lastLogin: new Date("2026-03-01T00:00:00Z"),
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-02-01T00:00:00Z"),
};

describe("UserMapper", () => {
  it("serialises dates to ISO strings", () => {
    const result = UserMapper.toApiResponse(baseUser);

    expect(result.lastLogin).toBe("2026-03-01T00:00:00.000Z");
    expect(result.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(result.updatedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("handles null lastLogin", () => {
    const result = UserMapper.toApiResponse({ ...baseUser, lastLogin: null });

    expect(result.lastLogin).toBeNull();
  });

  it('derives authProvider "google" when googleId is present', () => {
    const result = UserMapper.toApiResponse({
      ...baseUser,
      googleId: "google-123",
    });

    expect(result.authProvider).toBe("google");
  });

  it('derives authProvider "password" when googleId is null', () => {
    const result = UserMapper.toApiResponse({
      ...baseUser,
      googleId: null,
    });

    expect(result.authProvider).toBe("password");
  });

  it("omits authProvider when googleId is not in the select", () => {
    const result = UserMapper.toApiResponse(baseUser);

    expect(result.authProvider).toBeUndefined();
  });

  it("includes pendingEmail when present", () => {
    const result = UserMapper.toApiResponse({
      ...baseUser,
      pendingEmail: "new@example.com",
    });

    expect(result.pendingEmail).toBe("new@example.com");
  });

  it("includes subscription when present", () => {
    const result = UserMapper.toApiResponse({
      ...baseUser,
      subscription: { plan: "DEVELOPER", status: "ACTIVE" },
    });

    expect(result.subscription).toEqual({
      plan: "DEVELOPER",
      status: "ACTIVE",
    });
  });

  it("maps an array of users", () => {
    const results = UserMapper.toApiResponseArray([baseUser, baseUser]);

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("user-1");
  });
});
