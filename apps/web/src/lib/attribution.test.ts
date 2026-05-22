import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { captureFirstTouch, getFirstTouch } from "./attribution";

const STORAGE_KEY = "qarote_first_touch_v1";

interface MockStorage {
  data: Record<string, string>;
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function makeStorage(): MockStorage {
  return {
    data: {},
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(this.data, k)
        ? this.data[k]!
        : null;
    },
    setItem(k, v) {
      this.data[k] = v;
    },
    removeItem(k) {
      delete this.data[k];
    },
  };
}

function setupBrowserGlobals(href: string, referrer = ""): MockStorage {
  const storage = makeStorage();
  vi.stubGlobal("window", {
    location: new URL(href),
    localStorage: storage,
  });
  vi.stubGlobal("document", { referrer });
  return storage;
}

describe("captureFirstTouch", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when there is no marketing signal", () => {
    const storage = setupBrowserGlobals("https://qarote.io/");
    expect(captureFirstTouch()).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("captures and persists UTM params on first hit", () => {
    const storage = setupBrowserGlobals(
      "https://qarote.io/?utm_source=twitter&utm_medium=social&utm_campaign=spring"
    );
    const ft = captureFirstTouch();
    expect(ft?.initialUtmSource).toBe("twitter");
    expect(ft?.initialUtmMedium).toBe("social");
    expect(ft?.initialUtmCampaign).toBe("spring");
    expect(ft?.initialLandingPage).toBe("/");
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("captures referrer from external origins, stripping query for safety", () => {
    setupBrowserGlobals(
      "https://qarote.io/blog?utm_source=tw",
      "https://news.ycombinator.com/item?id=42"
    );
    const ft = captureFirstTouch();
    // origin + path only — query strings can carry session tokens
    expect(ft?.initialReferrer).toBe("https://news.ycombinator.com/item");
    expect(ft?.initialLandingPage).toBe("/blog");
  });

  it("does not overwrite existing first-touch data", () => {
    const storage = setupBrowserGlobals("https://qarote.io/?utm_source=second");
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        initialUtmSource: "first",
        capturedAt: "2026-01-01T00:00:00Z",
      })
    );
    const ft = captureFirstTouch();
    expect(ft?.initialUtmSource).toBe("first");
  });

  it("treats utm_term / utm_content alone as a marketing signal", () => {
    const storage = setupBrowserGlobals(
      "https://qarote.io/?utm_term=rabbitmq+monitoring&utm_content=hero-cta"
    );
    const ft = captureFirstTouch();
    expect(ft?.initialUtmTerm).toBe("rabbitmq monitoring");
    expect(ft?.initialUtmContent).toBe("hero-cta");
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("rejects spoofed origins via strict URL compare (subdomain confusion)", () => {
    // `qarote.io.evil.tld` starts with our origin string but is a different
    // origin — ensure we treat it as external and capture the referrer.
    setupBrowserGlobals(
      "https://qarote.io/blog",
      "https://qarote.io.evil.tld/landing"
    );
    const ft = captureFirstTouch();
    expect(ft?.initialReferrer).toBe("https://qarote.io.evil.tld/landing");
    expect(ft?.initialLandingPage).toBe("/blog");
  });

  it("getFirstTouch reads stored value", () => {
    const storage = setupBrowserGlobals("https://qarote.io/");
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        initialUtmSource: "twitter",
        capturedAt: "2026-01-01T00:00:00Z",
      })
    );
    expect(getFirstTouch()?.initialUtmSource).toBe("twitter");
  });
});
