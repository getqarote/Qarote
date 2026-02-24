import { test, expect } from "../../fixtures/test-base.js";
import { uniqueEmail, createUser } from "../../helpers/factories/user.factory.js";

test.describe("Password Reset Flow @p1", () => {
  test("should show forgot password form", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(
      page.getByRole("heading", { name: /forgot password/i })
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Enter your email address")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send reset link/i })
    ).toBeVisible();
  });

  test("should submit forgot password form for existing user", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await page.getByPlaceholder("Enter your email address").fill("admin@e2e-test.local");
    await page.getByRole("button", { name: /send reset link/i }).click();

    // Should show success state or at least not show an error
    // (email may not actually send in test mode, but the API should accept it)
    await expect(
      page.getByText(/check your email|reset instructions|sent/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should navigate back to sign-in from forgot password", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await page.getByRole("link", { name: /sign in/i }).click();
    await page.waitForURL("**/sign-in");
  });

  test("should show reset password form with valid token", async ({
    page,
    db,
  }) => {
    // Create a password reset token directly in DB
    const prisma = await db.getClient();
    const user = await prisma.user.findUnique({
      where: { email: "admin@e2e-test.local" },
    });

    const resetToken = `e2e-reset-${Date.now()}`;
    await prisma.passwordReset.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });
    db.track("PasswordReset", resetToken);

    await page.goto(`/reset-password?token=${resetToken}`);

    await expect(
      page.getByRole("heading", { name: /reset.*password/i })
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Enter your new password")
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Confirm your new password")
    ).toBeVisible();
  });

  test("should show password requirements on the reset form", async ({
    page,
    db,
  }) => {
    const prisma = await db.getClient();
    const user = await prisma.user.findUnique({
      where: { email: "admin@e2e-test.local" },
    });

    const resetToken = `e2e-reset-req-${Date.now()}`;
    await prisma.passwordReset.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await page.goto(`/reset-password?token=${resetToken}`);
    await page.getByPlaceholder("Enter your new password").fill("weak");

    // Password requirements should appear
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });
});
