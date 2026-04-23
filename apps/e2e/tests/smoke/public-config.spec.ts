import { expect, test } from "@playwright/test";

const apiUrl = process.env.API_URL || "http://localhost:3001";

test.describe("Public Config Endpoint @p0 @smoke", () => {
  test("should return app configuration flags", async () => {
    const response = await fetch(`${apiUrl}/trpc/public.getConfig`);
    expect(response.ok).toBeTruthy();

    const body = await response.json();
    const config = body.result?.data;

    expect(config).toBeDefined();
    expect(typeof config.registrationEnabled).toBe("boolean");
    expect(typeof config.emailEnabled).toBe("boolean");
    expect(typeof config.oauthEnabled).toBe("boolean");

  });

  test("should reflect selfhosted defaults @selfhosted", async () => {
    test.skip(
      process.env.DEPLOYMENT_MODE === "cloud",
      "Selfhosted mode only"
    );

    const response = await fetch(`${apiUrl}/trpc/public.getConfig`);
    const body = await response.json();
    const config = body.result?.data;

    // Selfhosted E2E defaults: email disabled, registration enabled
    expect(config.emailEnabled).toBe(false);
    expect(config.registrationEnabled).toBe(true);
  });
});
