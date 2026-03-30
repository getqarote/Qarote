import { test, expect } from "../../fixtures/test-base.js";
import {
  createUser,
  uniqueEmail,
} from "../../helpers/factories/user.factory.js";

test.describe("Workspace Creation @p0", () => {
  test("should redirect new user without workspace to workspace setup", async ({
    page,
    db,
    api,
  }) => {
    // Create a user with no workspace
    const email = uniqueEmail("no-ws");
    const prisma = await db.getClient();
    const { user, password } = await createUser(prisma, {
      email,
      workspaceId: null,
    });
    db.track("User", user.id);

    // Login via UI
    await page.goto("/auth/sign-in");
    await page.getByPlaceholder("Enter your email").fill(email);
    await page.getByPlaceholder("Enter your password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect to onboarding
    await page.waitForURL("**/onboarding", { timeout: 15_000 });
  });

  test("admin user with workspace should go to dashboard", async ({
    adminPage,
  }) => {
    await adminPage.goto("/");
    await expect(adminPage).toHaveURL("/");
  });
});
