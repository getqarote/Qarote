import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Must be done before importing the module under test so the module-level
// `turnstileEnabled` constant picks up the mocked env value.
const setSecret = (value: string | undefined) => {
  if (value === undefined) {
    delete process.env.TURNSTILE_SECRET_KEY;
  } else {
    process.env.TURNSTILE_SECRET_KEY = value;
  }
};

describe("verifyTurnstileToken", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  it("returns true immediately when TURNSTILE_SECRET_KEY is not set", async () => {
    setSecret(undefined);
    const { verifyTurnstileToken } = await import("../turnstile.service.js");
    expect(await verifyTurnstileToken("any-token")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns true when Cloudflare reports success", async () => {
    setSecret("test-secret");
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const { verifyTurnstileToken } = await import("../turnstile.service.js");
    expect(await verifyTurnstileToken("valid-token", "1.2.3.4")).toBe(true);
  });

  it("fails closed (returns false) on non-2xx HTTP response", async () => {
    setSecret("test-secret");
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Bad Gateway", { status: 502 })
    );

    const { verifyTurnstileToken } = await import("../turnstile.service.js");
    expect(await verifyTurnstileToken("any-token")).toBe(false);
  });

  it("returns false when Cloudflare reports failure", async () => {
    setSecret("test-secret");
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false }), { status: 200 })
    );

    const { verifyTurnstileToken } = await import("../turnstile.service.js");
    expect(await verifyTurnstileToken("invalid-token")).toBe(false);
  });

  it("fails closed (returns false) on malformed JSON response", async () => {
    setSecret("test-secret");
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("not valid json", { status: 200 })
    );

    const { verifyTurnstileToken } = await import("../turnstile.service.js");
    expect(await verifyTurnstileToken("any-token")).toBe(false);
  });

  it("fails open (returns true) on network error", async () => {
    setSecret("test-secret");
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    const { verifyTurnstileToken } = await import("../turnstile.service.js");
    expect(await verifyTurnstileToken("any-token")).toBe(true);
  });

  it("includes remoteip in the Cloudflare request body when provided", async () => {
    setSecret("test-secret");
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const { verifyTurnstileToken } = await import("../turnstile.service.js");
    await verifyTurnstileToken("tok", "5.6.7.8");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.remoteip).toBe("5.6.7.8");
    expect(body.secret).toBe("test-secret");
    expect(body.response).toBe("tok");
  });
});

describe("turnstileEnabled", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  it("is false when secret is not set", async () => {
    setSecret(undefined);
    const { turnstileEnabled } = await import("../turnstile.service.js");
    expect(turnstileEnabled).toBe(false);
  });

  it("is true when secret is set", async () => {
    setSecret("some-secret");
    const { turnstileEnabled } = await import("../turnstile.service.js");
    expect(turnstileEnabled).toBe(true);
  });
});
