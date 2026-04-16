import { expect, test } from "@playwright/test";

const apiUrl = process.env.API_URL || "http://localhost:3001";

test.describe("Smoke Tests @p0 @smoke", () => {
  test("API health endpoint returns ok", async () => {
    await expect(async () => {
      const response = await fetch(`${apiUrl}/health`);
      expect(response.ok).toBeTruthy();
      const body = await response.json();
      expect(body.status).toBe("ok");
      expect(body.database.status).toBe("connected");
    }).toPass({ timeout: 10_000 });
  });

  test("API liveness endpoint returns ok", async () => {
    await expect(async () => {
      const response = await fetch(`${apiUrl}/livez`);
      expect(response.ok).toBeTruthy();
      const body = await response.json();
      expect(body.status).toBe("ok");
    }).toPass({ timeout: 10_000 });
  });

  test("Frontend loads sign-in page", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible();
  });
});
