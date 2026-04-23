import semver from "semver";
import { describe, expect, it } from "vitest";

/**
 * Test suite for update checker prerelease filtering
 * Verifies that prerelease versions (beta, alpha, rc) are excluded
 * so that notification emails are only sent for stable releases
 */
describe("Update Checker - Prerelease Filtering", () => {
  /**
   * Replicates the tag filtering logic from release-notifier.cron.ts getLatestVersion()
   */
  function filterAndSortTags(
    tags: Array<{ name: string }>
  ): { version: string; tagName: string } | null {
    const versions: Array<{ version: string; tagName: string }> = [];
    for (const tag of tags) {
      const normalized = tag.name.startsWith("v")
        ? tag.name.slice(1)
        : tag.name;

      if (semver.valid(normalized) && !semver.prerelease(normalized)) {
        versions.push({ version: normalized, tagName: tag.name });
      }
    }

    if (versions.length === 0) return null;

    versions.sort((a, b) => semver.compare(a.version, b.version));
    return versions[versions.length - 1];
  }

  describe("Prerelease detection with semver.prerelease()", () => {
    it("should detect beta versions as prerelease", () => {
      expect(semver.prerelease("1.0.0-beta.1")).toEqual(["beta", 1]);
      expect(semver.prerelease("2.0.0-beta")).toEqual(["beta"]);
    });

    it("should detect alpha versions as prerelease", () => {
      expect(semver.prerelease("1.0.0-alpha.1")).toEqual(["alpha", 1]);
      expect(semver.prerelease("1.0.0-alpha")).toEqual(["alpha"]);
    });

    it("should detect rc versions as prerelease", () => {
      expect(semver.prerelease("1.0.0-rc.1")).toEqual(["rc", 1]);
      expect(semver.prerelease("1.0.0-rc")).toEqual(["rc"]);
    });

    it("should return null for stable versions", () => {
      expect(semver.prerelease("1.0.0")).toBeNull();
      expect(semver.prerelease("2.5.3")).toBeNull();
    });
  });

  describe("Tag filtering excludes prereleases", () => {
    it("should exclude beta tags", () => {
      const tags = [
        { name: "v1.0.0" },
        { name: "v1.1.0-beta.1" },
        { name: "v1.1.0-beta.2" },
      ];

      const result = filterAndSortTags(tags);
      expect(result).toEqual({ version: "1.0.0", tagName: "v1.0.0" });
    });

    it("should exclude alpha tags", () => {
      const tags = [{ name: "v1.0.0" }, { name: "v2.0.0-alpha.1" }];

      const result = filterAndSortTags(tags);
      expect(result).toEqual({ version: "1.0.0", tagName: "v1.0.0" });
    });

    it("should exclude rc tags", () => {
      const tags = [{ name: "v1.0.0" }, { name: "v1.1.0-rc.1" }];

      const result = filterAndSortTags(tags);
      expect(result).toEqual({ version: "1.0.0", tagName: "v1.0.0" });
    });

    it("should return null when all tags are prereleases", () => {
      const tags = [
        { name: "v1.0.0-beta.1" },
        { name: "v1.0.0-alpha.1" },
        { name: "v1.0.0-rc.1" },
      ];

      const result = filterAndSortTags(tags);
      expect(result).toBeNull();
    });

    it("should return the latest stable version when mixed with prereleases", () => {
      const tags = [
        { name: "v1.0.0" },
        { name: "v1.1.0-beta.1" },
        { name: "v1.0.1" },
        { name: "v1.2.0-alpha.1" },
        { name: "v1.1.0" },
        { name: "v2.0.0-rc.1" },
      ];

      const result = filterAndSortTags(tags);
      expect(result).toEqual({ version: "1.1.0", tagName: "v1.1.0" });
    });

    it("should handle tags without v prefix", () => {
      const tags = [{ name: "1.0.0" }, { name: "1.1.0-beta.1" }];

      const result = filterAndSortTags(tags);
      expect(result).toEqual({ version: "1.0.0", tagName: "1.0.0" });
    });
  });

  describe("Email notification scenarios", () => {
    it("should not trigger email when latest is a beta ahead of current", () => {
      const currentVersion = "1.0.0";
      const tags = [{ name: "v1.0.0" }, { name: "v1.1.0-beta.1" }];

      const latest = filterAndSortTags(tags);
      // Latest stable is 1.0.0, same as current — no update
      expect(latest).not.toBeNull();
      expect(semver.gt(latest!.version, currentVersion)).toBe(false);
    });

    it("should trigger email when a new stable version is released", () => {
      const currentVersion = "1.0.0";
      const tags = [
        { name: "v1.0.0" },
        { name: "v1.1.0-beta.1" },
        { name: "v1.1.0" }, // stable release
      ];

      const latest = filterAndSortTags(tags);
      expect(latest).not.toBeNull();
      expect(semver.gt(latest!.version, currentVersion)).toBe(true);
      expect(latest!.version).toBe("1.1.0");
    });

    it("should not trigger email for beta even if version number is higher", () => {
      const currentVersion = "1.0.0";
      const tags = [
        { name: "v1.0.0" },
        { name: "v5.0.0-beta.1" }, // much higher but prerelease
      ];

      const latest = filterAndSortTags(tags);
      expect(latest).not.toBeNull();
      expect(semver.gt(latest!.version, currentVersion)).toBe(false);
    });
  });
});
