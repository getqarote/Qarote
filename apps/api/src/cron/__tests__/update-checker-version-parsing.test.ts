import semver from "semver";
import { describe, expect, it } from "vitest";

/**
 * Test suite for update checker version parsing
 * Verifies that version strings are normalized (v prefix stripped) to prevent semver.gt() errors
 */
describe("Update Checker - Version Parsing", () => {
  describe("Version prefix stripping", () => {
    it("should strip v prefix from version string", () => {
      const versionWithPrefix = "v1.0.0";
      const normalized = versionWithPrefix.startsWith("v")
        ? versionWithPrefix.slice(1)
        : versionWithPrefix;

      expect(normalized).toBe("1.0.0");
      expect(semver.valid(normalized)).toBe("1.0.0");
    });

    it("should not modify version string without v prefix", () => {
      const versionWithoutPrefix = "1.0.0";
      const normalized = versionWithoutPrefix.startsWith("v")
        ? versionWithoutPrefix.slice(1)
        : versionWithoutPrefix;

      expect(normalized).toBe("1.0.0");
      expect(semver.valid(normalized)).toBe("1.0.0");
    });

    it("should handle edge cases", () => {
      // Empty string
      const empty = "";
      const normalizedEmpty = empty.startsWith("v") ? empty.slice(1) : empty;
      expect(normalizedEmpty).toBe("");

      // Just 'v'
      const justV = "v";
      const normalizedJustV = justV.startsWith("v") ? justV.slice(1) : justV;
      expect(normalizedJustV).toBe("");

      // Multiple 'v' characters
      const multipleV = "vv1.0.0";
      const normalizedMultipleV = multipleV.startsWith("v")
        ? multipleV.slice(1)
        : multipleV;
      expect(normalizedMultipleV).toBe("v1.0.0"); // Only strips first 'v'
    });
  });

  describe("semver.gt() behavior with v prefix", () => {
    it("should correctly compare versions when both are normalized", () => {
      const current = "1.0.0"; // Normalized
      const latest = "1.1.0"; // Normalized

      expect(semver.gt(latest, current)).toBe(true);
      expect(semver.gt(current, latest)).toBe(false);
    });

    it("should handle v prefix in current version (semver auto-normalizes)", () => {
      const current = "v1.0.0"; // With v prefix
      const latest = "1.1.0"; // Normalized

      // semver library handles v prefix gracefully
      expect(semver.gt(latest, current)).toBe(true);
    });

    it("should handle v prefix in latest version (semver auto-normalizes)", () => {
      const current = "1.0.0"; // Normalized
      const latest = "v1.1.0"; // With v prefix

      // semver library handles v prefix gracefully
      expect(semver.gt(latest, current)).toBe(true);
    });

    it("should handle v prefix in both versions", () => {
      const current = "v1.0.0";
      const latest = "v1.1.0";

      // semver library handles v prefix gracefully
      expect(semver.gt(latest, current)).toBe(true);
    });

    it("should throw for invalid version strings", () => {
      // Empty strings
      expect(() => semver.gt("1.1.0", "")).toThrow();
      expect(() => semver.gt("", "1.0.0")).toThrow();

      // Invalid formats
      expect(() => semver.gt("invalid", "1.0.0")).toThrow();
      expect(() => semver.gt("1.1.0", "invalid")).toThrow();
    });

    it("should normalize versions for consistency", () => {
      const rawCurrent = "v1.0.0";
      const rawLatest = "v1.1.0";

      // Normalize both for consistency in code
      const current = rawCurrent.startsWith("v")
        ? rawCurrent.slice(1)
        : rawCurrent;
      const latest = rawLatest.startsWith("v") ? rawLatest.slice(1) : rawLatest;

      // Normalized versions work correctly
      expect(current).toBe("1.0.0");
      expect(latest).toBe("1.1.0");
      expect(semver.gt(latest, current)).toBe(true);
    });
  });

  describe("Version comparison scenarios", () => {
    it("should detect when update is available", () => {
      const current = "1.0.0";
      const latest = "1.1.0";
      expect(semver.gt(latest, current)).toBe(true);
    });

    it("should detect when already up to date", () => {
      const current = "1.1.0";
      const latest = "1.1.0";
      expect(semver.gt(latest, current)).toBe(false);
    });

    it("should detect when current is ahead (pre-release)", () => {
      const current = "1.2.0";
      const latest = "1.1.0";
      expect(semver.gt(latest, current)).toBe(false);
    });

    it("should handle patch version updates", () => {
      const current = "1.0.0";
      const latest = "1.0.1";
      expect(semver.gt(latest, current)).toBe(true);
    });

    it("should handle major version updates", () => {
      const current = "1.0.0";
      const latest = "2.0.0";
      expect(semver.gt(latest, current)).toBe(true);
    });
  });

  describe("GitHub tag format parsing", () => {
    it("should strip v prefix from GitHub tags", () => {
      const githubTag = "v1.2.3";
      const normalized = githubTag.startsWith("v")
        ? githubTag.slice(1)
        : githubTag;

      expect(normalized).toBe("1.2.3");
      expect(semver.valid(normalized)).toBe("1.2.3");
    });

    it("should handle tags without v prefix", () => {
      const githubTag = "1.2.3";
      const normalized = githubTag.startsWith("v")
        ? githubTag.slice(1)
        : githubTag;

      expect(normalized).toBe("1.2.3");
      expect(semver.valid(normalized)).toBe("1.2.3");
    });
  });
});
