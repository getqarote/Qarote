import path from "node:path";

import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(import.meta.dirname, ".env.test") });

const API_PORT = Number(process.env.PORT) || 3001;
const APP_PORT = Number(process.env.APP_PORT) || 8081;
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
      command: "pnpm --filter=qarote-api dev",
      url: `${API_URL}/livez`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      cwd: path.resolve(import.meta.dirname, "../.."),
      env: {
        ...(process.env as Record<string, string>),
        DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE || "selfhosted",
        PORT: String(API_PORT),
        NODE_ENV: "test",
        // z.coerce.boolean() treats "false" as true (Boolean("false") === true).
        // Use empty string so Boolean("") === false, or "true" to enable.
        ENABLE_EMAIL: process.env.ENABLE_EMAIL || "",
        ENABLE_OAUTH: process.env.ENABLE_OAUTH || "",
        SENTRY_ENABLED: "",
        ENABLE_NOTION: "",
      },
    },
    {
      command: `pnpm --filter=qarote-app dev --port ${APP_PORT}`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      cwd: path.resolve(import.meta.dirname, "../.."),
      env: {
        ...(process.env as Record<string, string>),
        VITE_API_URL: API_URL,
        VITE_DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE || "selfhosted",
      },
    },
  ],

  projects: [
    // --- Self-Hosted Mode (Primary — most tests run here, no license) ---
    {
      name: "selfhosted",
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
        "license/**",
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

    // --- Self-Hosted Licensed Mode (SSO, license validation, all features) ---
    {
      name: "selfhosted-licensed",
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
