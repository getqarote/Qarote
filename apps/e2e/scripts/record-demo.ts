import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../../..", "assets");
const BASE_URL = process.env.DEMO_URL || "http://localhost:8080";
const EMAIL = process.env.DEMO_EMAIL || "admin@qarote.io";
const PASSWORD = process.env.DEMO_PASSWORD || "password";

async function recordDemo() {
  const browser = await chromium.launch({ headless: true });

  // ── Log in first (off-camera) to get a session cookie ────────────────────
  const authContext = await browser.newContext();
  const authPage = await authContext.newPage();
  await authPage.goto(`${BASE_URL}/auth/sign-in`);
  await authPage.waitForLoadState("domcontentloaded");
  await authPage.getByPlaceholder("Enter your email").fill(EMAIL);
  await authPage.getByPlaceholder("Enter your password").fill(PASSWORD);
  await authPage.getByRole("button", { name: "Sign in", exact: true }).click();
  await authPage.waitForURL("**/", { timeout: 15_000 });
  const cookies = await authContext.cookies();
  await authContext.close();

  // ── Start recording ───────────────────────────────────────────────────────
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1440, height: 900 },
    },
  });

  // Inject the authenticated session into the recording context
  await context.addCookies(cookies);

  const page = await context.newPage();

  // ── 1. Open dashboard — wait until fully rendered before acting ──────────
  await page.goto(BASE_URL);
  // Wait for the Add server button to be visible (page fully rendered)
  const addServerCta = page.getByRole("button", { name: "Add server" }).first();
  await addServerCta.waitFor({ state: "visible", timeout: 15_000 });
  // Pause so the viewer sees the empty dashboard before we click
  await page.waitForTimeout(1500);

  // ── 2. Click "Add server" CTA on the empty dashboard ─────────────────────
  await addServerCta.click();

  // ── 3. Dialog opens — type the server URL ────────────────────────────────
  const urlInput = page.locator("#server-url");
  await urlInput.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(600);
  await urlInput.fill(
    "b-73d862a3-8128-4920-b28e-016ee401aed9.mq.eu-west-3.on.aws"
  );
  // Wait for the 500ms debounce + parse attempt
  await page.waitForTimeout(1000);

  // ── 4. Expand "Enter details manually" disclosure ────────────────────────
  const manualToggle = page.getByRole("button", {
    name: "Enter details manually",
  });
  if (await manualToggle.isVisible()) {
    await manualToggle.click();
    await page.waitForTimeout(400);
  }

  // ── 5. Fill in credentials ────────────────────────────────────────────────
  const usernameInput = page.locator('input[name="username"]');
  await usernameInput.waitFor({ state: "visible", timeout: 10_000 });
  await usernameInput.clear();
  await usernameInput.fill("admin");
  await page.waitForTimeout(300);

  const passwordInput = page.locator('input[name="password"]');
  await passwordInput.fill("admin1234567");
  await page.waitForTimeout(500);

  // ── 6. Click "Test connection" ────────────────────────────────────────────
  const testBtn = page.getByRole("button", { name: "Test connection" });
  await testBtn.waitFor({ state: "visible", timeout: 10_000 });
  await testBtn.click();

  // Wait for the test to resolve (success → auto-advances to step 2)
  await page.waitForTimeout(5000);

  // ── 7. Step 2 — click "Add server" to confirm ────────────────────────────
  const addServerSubmit = page.getByRole("button", { name: "Add server" });
  await addServerSubmit.waitFor({ state: "visible", timeout: 15_000 });
  await addServerSubmit.click();

  // ── 8. Wait for dashboard data to load ───────────────────────────────────
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);

  // ── 9. Scroll to the bottom of the dashboard ────────────────────────────
  await page.evaluate(() => {
    const main = document.querySelector("main.main-content-scrollable");
    if (main) main.scrollTo({ top: main.scrollHeight, behavior: "smooth" });
  });
  await page.waitForTimeout(2500);

  // ── Done ──────────────────────────────────────────────────────────────────
  await context.close();
  await browser.close();

  console.log(`\nVideo saved to: ${OUTPUT_DIR}`);
  console.log(
    'Convert to GIF:\n  ffmpeg -i assets/<video>.webm -vf "fps=15,scale=1280:-1:flags=lanczos" assets/demo.gif'
  );
}

recordDemo().catch((err) => {
  console.error(err);
  process.exit(1);
});
