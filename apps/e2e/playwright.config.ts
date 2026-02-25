import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(import.meta.dirname, ".env.test") });

const API_PORT = Number(process.env.PORT) || 3001;
const APP_PORT = 8081;
const BASE_URL = `http://localhost:${APP_PORT}`;
const API_URL = process.env.API_URL || `http://localhost:${API_PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"], ["list"]]
    : [["html"], ["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",

  webServer: [
    {
      command: `DEPLOYMENT_MODE=${process.env.DEPLOYMENT_MODE || "community"} PORT=${API_PORT} NODE_ENV=test pnpm --filter=qarote-api dev`,
      url: `${API_URL}/livez`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      cwd: path.resolve(import.meta.dirname, "../.."),
    },
    {
      command: `VITE_API_URL=${API_URL} VITE_DEPLOYMENT_MODE=${process.env.DEPLOYMENT_MODE || "community"} pnpm --filter=qarote-app dev --port ${APP_PORT}`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      cwd: path.resolve(import.meta.dirname, "../.."),
    },
  ],

  projects: [
    // --- Community Mode (Primary — most tests run here) ---
    {
      name: "community",
      testMatch: [
        "smoke/**",
        "auth/sign-up.spec.ts",
        "auth/sign-in.spec.ts",
        "auth/password-reset.spec.ts",
        "auth/invitation.spec.ts",
        "auth/google-oauth.spec.ts",
        "auth/sso.spec.ts",
        "workspace/**",
        "rabbitmq/**",
        "alerts/**",
        "profile/**",
      ],
      use: {
        ...devices["Desktop Chrome"],
      },
    },

    // --- Cloud Mode (SaaS features: billing, OAuth, email verification) ---
    {
      name: "cloud",
      testMatch: [
        "smoke/**",
        "auth/sign-up.spec.ts",
        "auth/sign-in.spec.ts",
        "auth/google-oauth.spec.ts",
        "billing/**",
      ],
      use: {
        ...devices["Desktop Chrome"],
      },
    },

    // --- Enterprise Mode (SSO, license validation) ---
    {
      name: "enterprise",
      testMatch: [
        "smoke/**",
        "auth/sign-in.spec.ts",
        "auth/sso.spec.ts",
        "rabbitmq/**",
      ],
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
