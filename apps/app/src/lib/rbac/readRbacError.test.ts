/**
 * Tests for the wire-shape extractor that pulls the structured RBAC cause
 * payload off a thrown tRPC error. The contract is critical: any shape
 * change breaks WorkspaceForbidden and PageErrorOrGate.
 */

import { describe, expect, it } from "vitest";

import { readRbacError } from "./readRbacError";

describe("readRbacError", () => {
  it("extracts a well-formed WORKSPACE_PERMISSION cause", () => {
    const err = { data: { cause: { code: "WORKSPACE_PERMISSION" } } };
    const result = readRbacError(err);
    expect(result?.code).toBe("WORKSPACE_PERMISSION");
  });

  it("extracts LAST_OWNER_BLOCKED cause", () => {
    const err = { data: { cause: { code: "LAST_OWNER_BLOCKED" } } };
    expect(readRbacError(err)?.code).toBe("LAST_OWNER_BLOCKED");
  });

  it("extracts INVITER_ROLE_INSUFFICIENT cause", () => {
    const err = { data: { cause: { code: "INVITER_ROLE_INSUFFICIENT" } } };
    expect(readRbacError(err)?.code).toBe("INVITER_ROLE_INSUFFICIENT");
  });

  it("returns null for null / undefined / non-objects", () => {
    expect(readRbacError(null)).toBeNull();
    expect(readRbacError(undefined)).toBeNull();
    expect(readRbacError("string error")).toBeNull();
    expect(readRbacError(42)).toBeNull();
  });

  it("returns null when data is missing or null", () => {
    expect(readRbacError({})).toBeNull();
    expect(readRbacError({ data: null })).toBeNull();
    expect(readRbacError({ data: undefined })).toBeNull();
  });

  it("returns null when data.cause is missing or null", () => {
    expect(readRbacError({ data: {} })).toBeNull();
    expect(readRbacError({ data: { cause: null } })).toBeNull();
  });

  it("returns null for an unknown cause code", () => {
    expect(
      readRbacError({ data: { cause: { code: "UNKNOWN_CODE" } } })
    ).toBeNull();
    expect(readRbacError({ data: { cause: { code: "" } } })).toBeNull();
  });

  it("returns null when cause.code is not a string", () => {
    expect(readRbacError({ data: { cause: { code: 42 } } })).toBeNull();
    expect(readRbacError({ data: { cause: { code: null } } })).toBeNull();
    expect(readRbacError({ data: { cause: {} } })).toBeNull();
  });

  it("returns null for a generic tRPC FORBIDDEN without cause payload", () => {
    const err = { message: "FORBIDDEN", data: { code: "FORBIDDEN" } };
    expect(readRbacError(err)).toBeNull();
  });
});
