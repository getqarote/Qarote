import { describe, expect, it } from "vitest";

import {
  generateInvitationToken,
  hashInvitationToken,
} from "@/auth/invitation-tokens";

describe("invitation-tokens", () => {
  it("generates a 32-byte hex token", () => {
    const token = generateInvitationToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique tokens across calls", () => {
    const a = generateInvitationToken();
    const b = generateInvitationToken();
    expect(a).not.toBe(b);
  });

  it("hashes a token to a 64-char SHA-256 hex string", () => {
    const hash = hashInvitationToken("any-input");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input always hashes to the same output", () => {
    expect(hashInvitationToken("abc")).toBe(hashInvitationToken("abc"));
  });

  it("is collision-resistant for distinct inputs", () => {
    expect(hashInvitationToken("a")).not.toBe(hashInvitationToken("b"));
  });

  it("matches the SQL backfill (encode(digest(token, 'sha256'), 'hex'))", () => {
    // Reference value computed via:
    //   psql -c "SELECT encode(digest('hello', 'sha256'), 'hex')"
    expect(hashInvitationToken("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });
});
