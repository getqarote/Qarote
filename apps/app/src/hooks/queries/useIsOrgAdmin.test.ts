/**
 * Unit tests for `useIsOrgAdmin` — the tri-state org admin hook.
 *
 * Mirrors the contract of `useIsWorkspaceAdmin` (workspace-scope sibling):
 *   null   — loading
 *   true   — current user is OWNER or ADMIN of their org
 *   false  — anything else (unauthenticated, no org, MEMBER role, etc.)
 *
 * Component code is allowed to branch on `=== null` to render a skeleton
 * instead of flashing a forbidden state. Breaking this contract would
 * reintroduce the redirect-while-loading regression these guards exist
 * to prevent — so this is the test that pins it.
 */

// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

type OrgQueryReturn = {
  data: { role: string } | undefined;
  isLoading: boolean;
};

let currentReturn: OrgQueryReturn = { data: undefined, isLoading: true };

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    organization: {
      management: {
        getCurrent: {
          useQuery: () => currentReturn,
        },
      },
    },
  },
}));

vi.mock("@/contexts/AuthContextDefinition", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

import { useIsOrgAdmin } from "./useOrganization";

describe("useIsOrgAdmin", () => {
  it("returns null while the query is loading", () => {
    currentReturn = { data: undefined, isLoading: true };
    const { result } = renderHook(() => useIsOrgAdmin());
    expect(result.current).toBeNull();
  });

  it("returns false when the query resolves with no data", () => {
    currentReturn = { data: undefined, isLoading: false };
    const { result } = renderHook(() => useIsOrgAdmin());
    expect(result.current).toBe(false);
  });

  it("returns false when the role is missing on the data payload", () => {
    currentReturn = { data: { role: "" }, isLoading: false };
    const { result } = renderHook(() => useIsOrgAdmin());
    expect(result.current).toBe(false);
  });

  it("returns true for OWNER", () => {
    currentReturn = { data: { role: "OWNER" }, isLoading: false };
    const { result } = renderHook(() => useIsOrgAdmin());
    expect(result.current).toBe(true);
  });

  it("returns true for ADMIN", () => {
    currentReturn = { data: { role: "ADMIN" }, isLoading: false };
    const { result } = renderHook(() => useIsOrgAdmin());
    expect(result.current).toBe(true);
  });

  it("returns false for MEMBER", () => {
    currentReturn = { data: { role: "MEMBER" }, isLoading: false };
    const { result } = renderHook(() => useIsOrgAdmin());
    expect(result.current).toBe(false);
  });

  it("returns false for an unknown role string", () => {
    currentReturn = { data: { role: "UNKNOWN" }, isLoading: false };
    const { result } = renderHook(() => useIsOrgAdmin());
    expect(result.current).toBe(false);
  });
});
