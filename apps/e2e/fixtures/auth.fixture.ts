import fs from "node:fs";
import path from "node:path";
import { type BrowserContext, type Page, test as base } from "@playwright/test";

const AUTH_TOKENS_FILE = path.resolve(
  import.meta.dirname,
  "../.auth-tokens.json"
);

type AuthFixtures = {
  adminPage: Page;
  readonlyPage: Page;
};

/**
 * Read pre-acquired auth cookies from the file written by global-setup.
 * This avoids hitting the login API rate limiter across workers.
 */
function getAuthData(email: string): {
  cookie: string;
  user: Record<string, unknown>;
} {
  const raw = fs.readFileSync(AUTH_TOKENS_FILE, "utf-8");
  let tokens: Record<string, { cookie: string; user: Record<string, unknown> }>;
  try {
    tokens = JSON.parse(raw);
  } catch (cause) {
    throw new Error(`Failed to parse ${AUTH_TOKENS_FILE}: ${cause}`, { cause });
  }
  const entry = tokens[email];
  if (!entry) {
    throw new Error(`No cached auth data for ${email}. Did global-setup run?`);
  }
  return entry;
}

/**
 * Parse cookie string into individual cookie objects for Playwright.
 * sameSite: "Lax" is set explicitly so cross-port localhost requests
 * (frontend 8081 → API 3001) include the cookie reliably.
 */
function parseCookies(
  cookieString: string,
  baseUrl: string
): Array<{
  name: string;
  value: string;
  domain: string;
  path: string;
  sameSite: "Lax";
}> {
  const url = new URL(baseUrl);
  return cookieString
    .split("; ")
    .filter(Boolean)
    .map((c) => {
      const [name, ...valueParts] = c.split("=");
      return {
        name: name.trim(),
        value: valueParts.join("="),
        domain: url.hostname,
        path: "/",
        sameSite: "Lax" as const,
      };
    });
}

/**
 * Create a new browser page with auth cookies pre-injected.
 * The app uses cookie-based sessions via better-auth.
 */
async function createAuthenticatedPage(
  context: BrowserContext,
  email: string
): Promise<Page> {
  const { cookie } = getAuthData(email);
  const baseUrl =
    process.env.VITE_APP_URL || process.env.APP_URL || "http://localhost:5173";

  // Inject session cookies into the browser context
  const cookies = parseCookies(cookie, baseUrl);
  if (cookies.length > 0) {
    await context.addCookies(cookies);
  }

  const page = await context.newPage();
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
    const page = await createAuthenticatedPage(
      context,
      "readonly@e2e-test.local"
    );
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
