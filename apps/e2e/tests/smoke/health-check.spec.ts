import { expect, test } from "@playwright/test";

test.describe("Smoke Tests @p0 @smoke", () => {
  test("API health endpoint returns ok", async ({ request }) => {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    const response = await request.get(`${apiUrl}/api/health`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.database.status).toBe("connected");
  });

  test("API liveness endpoint returns ok", async ({ request }) => {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    const response = await request.get(`${apiUrl}/api/livez`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  test("Frontend loads sign-in page", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await expect(
      page.getByRole("heading", { name: /sign in/i })
    ).toBeVisible();
  });
});
