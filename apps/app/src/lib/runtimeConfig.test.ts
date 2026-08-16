// @vitest-environment jsdom

/**
 * Pins the build-time-wins invariant of `runtimeConfig.ts`.
 *
 * Six scenarios per accessor: build-time set / runtime set / both / neither.
 * The defaults are the whole API contract — they decide whether a missing
 * tenant configuration silently breaks (apiUrl/portalUrl: `undefined` so
 * callers can fail loud) or quietly degrades (deploymentMode → selfhosted).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getApiUrl,
  getDeploymentMode,
  getPortalUrl,
  isDemoMode,
  openPortalPath,
} from "@/lib/runtimeConfig";

function setRuntimeConfig(patch: Partial<Window["__QAROTE_CONFIG__"]>) {
  window.__QAROTE_CONFIG__ = { ...(window.__QAROTE_CONFIG__ ?? {}), ...patch };
}

describe("runtimeConfig", () => {
  beforeEach(() => {
    // Hermetic baseline: clear the build-time vars so the "unset" cases test
    // the real resolution chain regardless of a developer's local `.env`
    // (which sets VITE_API_URL / VITE_PORTAL_URL / VITE_DEPLOYMENT_MODE for
    // `pnpm dev`). Without this, those vars leak into `import.meta.env` and
    // build-time always wins — green in CI (no `.env`), red locally.
    vi.stubEnv("VITE_API_URL", undefined);
    vi.stubEnv("VITE_PORTAL_URL", undefined);
    vi.stubEnv("VITE_DEPLOYMENT_MODE", undefined);
    vi.stubEnv("VITE_DEMO_MODE", undefined);
    window.__QAROTE_CONFIG__ = undefined;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.__QAROTE_CONFIG__ = undefined;
  });

  describe("getApiUrl", () => {
    it("build-time wins over runtime", () => {
      vi.stubEnv("VITE_API_URL", "https://build.example");
      setRuntimeConfig({ apiUrl: "https://runtime.example" });
      expect(getApiUrl()).toBe("https://build.example");
    });

    it("falls through to runtime when build-time is unset", () => {
      setRuntimeConfig({ apiUrl: "https://runtime.example" });
      expect(getApiUrl()).toBe("https://runtime.example");
    });

    it("returns undefined when neither is set — callers must handle", () => {
      expect(getApiUrl()).toBeUndefined();
    });
  });

  describe("getPortalUrl", () => {
    it("build-time wins over runtime", () => {
      vi.stubEnv("VITE_PORTAL_URL", "https://portal.build");
      setRuntimeConfig({ portalUrl: "https://portal.runtime" });
      expect(getPortalUrl()).toBe("https://portal.build");
    });

    it("falls through to runtime when build-time is unset", () => {
      setRuntimeConfig({ portalUrl: "https://portal.runtime" });
      expect(getPortalUrl()).toBe("https://portal.runtime");
    });

    it("returns undefined when both are absent", () => {
      expect(getPortalUrl()).toBeUndefined();
    });
  });

  describe("isDemoMode", () => {
    it("returns true only for literal 'true'", () => {
      vi.stubEnv("VITE_DEMO_MODE", "true");
      expect(isDemoMode()).toBe(true);
    });

    it("returns false for empty/missing/non-true values", () => {
      expect(isDemoMode()).toBe(false);
      vi.stubEnv("VITE_DEMO_MODE", "");
      expect(isDemoMode()).toBe(false);
      vi.stubEnv("VITE_DEMO_MODE", "false");
      expect(isDemoMode()).toBe(false);
      vi.stubEnv("VITE_DEMO_MODE", "1");
      expect(isDemoMode()).toBe(false);
    });

    it("honors runtime config when build-time unset", () => {
      setRuntimeConfig({ demoMode: "true" });
      expect(isDemoMode()).toBe(true);
    });
  });

  describe("getDeploymentMode", () => {
    it("returns 'cloud' when build-time is exactly 'cloud'", () => {
      vi.stubEnv("VITE_DEPLOYMENT_MODE", "cloud");
      expect(getDeploymentMode()).toBe("cloud");
    });

    it("defaults to 'selfhosted' when nothing is set", () => {
      expect(getDeploymentMode()).toBe("selfhosted");
    });

    it("collapses legacy aliases to 'selfhosted'", () => {
      vi.stubEnv("VITE_DEPLOYMENT_MODE", "community");
      expect(getDeploymentMode()).toBe("selfhosted");
      vi.stubEnv("VITE_DEPLOYMENT_MODE", "enterprise");
      expect(getDeploymentMode()).toBe("selfhosted");
    });

    it("honors runtime 'cloud' when build-time is absent", () => {
      setRuntimeConfig({ deploymentMode: "cloud" });
      expect(getDeploymentMode()).toBe("cloud");
    });

    it("build-time wins over conflicting runtime (cloud beats selfhosted)", () => {
      vi.stubEnv("VITE_DEPLOYMENT_MODE", "cloud");
      setRuntimeConfig({ deploymentMode: "selfhosted" });
      expect(getDeploymentMode()).toBe("cloud");
    });

    it("build-time wins over conflicting runtime (selfhosted beats cloud)", () => {
      vi.stubEnv("VITE_DEPLOYMENT_MODE", "selfhosted");
      setRuntimeConfig({ deploymentMode: "cloud" });
      expect(getDeploymentMode()).toBe("selfhosted");
    });
  });

  describe("openPortalPath", () => {
    let openSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    });

    afterEach(() => {
      openSpy.mockRestore();
    });

    it("no-ops when no portal URL is configured", () => {
      openPortalPath("/purchase");
      expect(openSpy).not.toHaveBeenCalled();
    });

    it("opens the concatenated URL with build-time portal", () => {
      vi.stubEnv("VITE_PORTAL_URL", "https://portal.build");
      openPortalPath("/purchase");
      expect(openSpy).toHaveBeenCalledWith(
        "https://portal.build/purchase",
        "_blank",
        "noopener,noreferrer"
      );
    });

    it("opens the concatenated URL with runtime portal when build-time is unset", () => {
      setRuntimeConfig({ portalUrl: "https://portal.runtime" });
      openPortalPath("/some/path");
      expect(openSpy).toHaveBeenCalledWith(
        "https://portal.runtime/some/path",
        "_blank",
        "noopener,noreferrer"
      );
    });
  });
});
