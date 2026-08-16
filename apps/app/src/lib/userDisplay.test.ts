import { describe, expect, it } from "vitest";

import { displayName, initials } from "./userDisplay";

describe("displayName", () => {
  it("prefers first + last name", () => {
    expect(displayName({ firstName: "Ada", lastName: "Lovelace" })).toBe(
      "Ada Lovelace"
    );
  });

  it("uses first name alone when last is empty", () => {
    expect(
      displayName({ firstName: "Ada", lastName: "", email: "a@x.io" })
    ).toBe("Ada");
  });

  it("falls back to composed name when first/last are blank", () => {
    expect(
      displayName({ firstName: "", lastName: "", name: "Grace Hopper" })
    ).toBe("Grace Hopper");
  });

  it("falls back to capitalised email local-part", () => {
    expect(displayName({ email: "brice@qarote.io" })).toBe("Brice");
  });

  it("returns the full email when there is no local part", () => {
    expect(displayName({ email: "@weird" })).toBe("@weird");
  });

  it("returns empty string for null/undefined", () => {
    expect(displayName(null)).toBe("");
    expect(displayName(undefined)).toBe("");
    expect(displayName({})).toBe("");
  });

  it("ignores whitespace-only names", () => {
    expect(
      displayName({ firstName: "  ", lastName: "  ", email: "z@x.io" })
    ).toBe("Z");
  });
});

describe("initials", () => {
  it("uses first + last initials", () => {
    expect(initials({ firstName: "Ada", lastName: "Lovelace" })).toBe("AL");
  });

  it("uses a single initial when only first name is set", () => {
    expect(initials({ firstName: "Ada", lastName: "" })).toBe("A");
  });

  it("derives from composed name", () => {
    expect(initials({ name: "Grace Hopper" })).toBe("GH");
  });

  it("derives two letters from a dotted email local-part", () => {
    expect(initials({ email: "ada.lovelace@x.io" })).toBe("AL");
  });

  it("derives from a plain email local-part", () => {
    expect(initials({ email: "brice@qarote.io" })).toBe("BR");
  });

  it("defaults to ? when nothing is available", () => {
    expect(initials({})).toBe("?");
    expect(initials(null)).toBe("?");
  });
});
