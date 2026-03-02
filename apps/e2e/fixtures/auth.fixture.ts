import fs from "node:fs";
import path from "node:path";
import { type BrowserContext, type Page, test as base } from "@playwright/test";

const AUTH_TOKENS_FILE = path.resolve(import.meta.dirname, "../.auth-tokens.json");

type AuthFixtures = {
  adminPage: Page;
  readonlyPage: Page;
};

/**
 * Read pre-acquired auth tokens from the file written by global-setup.
 * This avoids hitting the login API rate limiter across workers.
 */
function getAuthToken(email: string): { token: string; user: Record<string, unknown> } {
  const raw = fs.readFileSync(AUTH_TOKENS_FILE, "utf-8");
  let tokens: Record<string, { token: string; user: Record<string, unknown> }>;
  try {
    tokens = JSON.parse(raw);
  } catch (cause) {
    throw new Error(`Failed to parse ${AUTH_TOKENS_FILE}: ${cause}`, { cause });
  }
  const entry = tokens[email];
  if (!entry) {
    throw new Error(`No cached auth token for ${email}. Did global-setup run?`);
  }
  return entry;
}

/**
 * Create a new browser page with auth token pre-injected into localStorage.
 * The app reads `auth_token` and `auth_user` from localStorage on mount.
 */
async function createAuthenticatedPage(
  context: BrowserContext,
  email: string
): Promise<Page> {
  const { token, user } = getAuthToken(email);

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
    const context = await browser.newContext();
    const page = await createAuthenticatedPage(context, "admin@e2e-test.local");
    await use(page);
    await context.close();
  },

  readonlyPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await createAuthenticatedPage(context, "readonly@e2e-test.local");
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
