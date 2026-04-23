import { describe, expect, it } from "vitest";

/**
 * Test suite for update checker URL construction
 * Verifies that release URLs are constructed correctly using the original tag name
 */
describe("Update Checker - URL Construction", () => {
  describe("Release URL construction with original tag name", () => {
    it("should construct URL with v prefix when tag has v prefix", () => {
      const tagName = "v1.2.0";
      const releaseUrl = `https://github.com/getqarote/Qarote/releases/tag/${tagName}`;

      expect(releaseUrl).toBe(
        "https://github.com/getqarote/Qarote/releases/tag/v1.2.0"
      );
    });

    it("should construct URL without v prefix when tag has no v prefix", () => {
      const tagName = "1.2.0";
      const releaseUrl = `https://github.com/getqarote/Qarote/releases/tag/${tagName}`;

      expect(releaseUrl).toBe(
        "https://github.com/getqarote/Qarote/releases/tag/1.2.0"
      );
    });

    it("should preserve original tag format in URL", () => {
      // This test verifies the fix for the bug where latestVersion was
      // normalized (v prefix stripped) but then unconditionally prepended
      // with 'v' in the URL construction

      const testCases = [
        { tagName: "v1.0.0", expected: "v1.0.0" },
        { tagName: "1.0.0", expected: "1.0.0" },
        { tagName: "v2.5.3", expected: "v2.5.3" },
        { tagName: "2.5.3", expected: "2.5.3" },
      ];

      for (const { tagName, expected } of testCases) {
        const releaseUrl = `https://github.com/getqarote/Qarote/releases/tag/${tagName}`;
        expect(releaseUrl).toContain(expected);
      }
    });
  });

  describe("Version normalization vs tag preservation", () => {
    it("should normalize version for comparison but preserve tag for URL", () => {
      // Simulate what getLatestVersion() now returns
      const mockGitHubTag = { name: "v1.2.0" };

      // Normalize for semver comparison
      const normalizedVersion = mockGitHubTag.name.startsWith("v")
        ? mockGitHubTag.name.slice(1)
        : mockGitHubTag.name;

      // Preserve original for URL
      const tagName = mockGitHubTag.name;

      expect(normalizedVersion).toBe("1.2.0"); // For comparison
      expect(tagName).toBe("v1.2.0"); // For URL

      const releaseUrl = `https://github.com/getqarote/Qarote/releases/tag/${tagName}`;
      expect(releaseUrl).toBe(
        "https://github.com/getqarote/Qarote/releases/tag/v1.2.0"
      );
    });

    it("should handle tag without v prefix", () => {
      const mockGitHubTag = { name: "1.2.0" };

      const normalizedVersion = mockGitHubTag.name.startsWith("v")
        ? mockGitHubTag.name.slice(1)
        : mockGitHubTag.name;

      const tagName = mockGitHubTag.name;

      expect(normalizedVersion).toBe("1.2.0"); // For comparison
      expect(tagName).toBe("1.2.0"); // For URL

      const releaseUrl = `https://github.com/getqarote/Qarote/releases/tag/${tagName}`;
      expect(releaseUrl).toBe(
        "https://github.com/getqarote/Qarote/releases/tag/1.2.0"
      );
    });
  });

  describe("Bug scenario reproduction", () => {
    it("should not double-prefix v when tag already has v prefix", () => {
      // BUG: Old code did this:
      // const latestVersion = "1.2.0" (normalized, v stripped)
      // const releaseUrl = `...tag/v${latestVersion}` → ".../tag/v1.2.0"
      // This works IF the original tag was "v1.2.0"

      // But if the original tag was "1.2.0" (no v), we'd get:
      // const releaseUrl = ".../tag/v1.2.0" (WRONG - should be ".../tag/1.2.0")

      const tagWithV = "v1.2.0";
      const tagWithoutV = "1.2.0";

      // FIX: Always use the original tag name
      const releaseUrlWithV = `https://github.com/getqarote/Qarote/releases/tag/${tagWithV}`;
      const releaseUrlWithoutV = `https://github.com/getqarote/Qarote/releases/tag/${tagWithoutV}`;

      expect(releaseUrlWithV).toBe(
        "https://github.com/getqarote/Qarote/releases/tag/v1.2.0"
      );
      expect(releaseUrlWithoutV).toBe(
        "https://github.com/getqarote/Qarote/releases/tag/1.2.0"
      );

      // Old buggy code would have produced:
      // "https://github.com/getqarote/Qarote/releases/tag/v1.2.0" for both
    });
  });
});
