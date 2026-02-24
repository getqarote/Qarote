import { type BrowserContext, type Page, test as base } from "@playwright/test";

const ADMIN_CREDS = {
  email: "admin@e2e-test.local",
  password: "TestPassword123!",
};

const READONLY_CREDS = {
  email: "readonly@e2e-test.local",
  password: "TestPassword123!",
};

type AuthFixtures = {
  adminPage: Page;
  readonlyPage: Page;
};

/**
 * Call the login tRPC endpoint directly and return the JWT + user object.
 * This bypasses the UI login flow for speed.
 */
async function loginViaApi(
  apiUrl: string,
  email: string,
  password: string
): Promise<{ token: string; user: Record<string, unknown> }> {
  const response = await fetch(`${apiUrl}/trpc/auth.session.login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { email, password } }),
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${email}: ${response.status}`);
  }

  const data = await response.json();
  return data.result.data.json;
}

/**
 * Create a new browser page with auth token pre-injected into localStorage.
 * The app reads `auth_token` and `auth_user` from localStorage on mount.
 */
async function createAuthenticatedPage(
  context: BrowserContext,
  apiUrl: string,
  creds: { email: string; password: string }
): Promise<Page> {
  const { token, user } = await loginViaApi(apiUrl, creds.email, creds.password);

  const page = await context.newPage();

  // Inject auth state before any navigation
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_user", JSON.stringify(user));
    },
    { token, user }
  );

  return page;
}

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    const context = await browser.newContext();
    const page = await createAuthenticatedPage(context, apiUrl, ADMIN_CREDS);
    await use(page);
    await context.close();
  },

  readonlyPage: async ({ browser }, use) => {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    const context = await browser.newContext();
    const page = await createAuthenticatedPage(
      context,
      apiUrl,
      READONLY_CREDS
    );
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
