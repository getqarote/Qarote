import { test, expect } from "../../fixtures/test-base.js";
import { mockTrpcQuery } from "../../helpers/trpc-mock.js";

const MOCK_DEFINITIONS = {
  rabbit_version: "3.13.0",
  rabbitmq_version: "3.13.0",
  users: [{ name: "guest", password_hash: "abc123", tags: "administrator" }],
  vhosts: [{ name: "/" }],
  queues: [],
  exchanges: [],
  bindings: [],
  policies: [],
};

test.describe("Definitions Page @p0", () => {
  test("should navigate to definitions page as admin", async ({
    adminPage,
  }) => {
    await adminPage.goto("/definitions");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage).toHaveURL(/\/definitions/);
  });

  test("should show no-server state when not connected", async ({
    adminPage,
  }) => {
    await adminPage.goto("/definitions");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/no rabbitmq server configured/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Definitions Export @p1", () => {
  test("should show export card with download button", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(
      adminPage,
      "rabbitmq.definitions.getDefinitions",
      MOCK_DEFINITIONS
    );

    await adminPage.goto("/definitions");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("button", { name: /download broker definitions/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show filename input pre-filled with today's date", async ({
    adminPage,
  }) => {
    await adminPage.goto("/definitions");
    await adminPage.waitForLoadState("domcontentloaded");

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const expectedDate = `${yyyy}-${mm}-${dd}`;

    await expect(
      adminPage.getByRole("textbox", { name: /filename/i })
    ).toHaveValue(new RegExp(expectedDate), { timeout: 15_000 });
  });
});

test.describe("Definitions Import @p1", () => {
  test("should show import card with file input and upload button", async ({
    adminPage,
  }) => {
    await adminPage.goto("/definitions");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage.locator('input[type="file"]')).toBeAttached({
      timeout: 15_000,
    });
    await expect(
      adminPage.getByRole("button", { name: /upload broker definitions/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("upload button should be disabled until a file is chosen", async ({
    adminPage,
  }) => {
    await adminPage.goto("/definitions");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("button", { name: /upload broker definitions/i })
    ).toBeDisabled({ timeout: 15_000 });
  });

  test("should show confirmation dialog before importing", async ({
    adminPage,
  }) => {
    await adminPage.goto("/definitions");
    await adminPage.waitForLoadState("domcontentloaded");

    const definitionsJson = JSON.stringify(MOCK_DEFINITIONS);
    const fileInput = adminPage.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "definitions.json",
      mimeType: "application/json",
      buffer: Buffer.from(definitionsJson),
    });

    await adminPage
      .getByRole("button", { name: /upload broker definitions/i })
      .click();

    await expect(
      adminPage.getByRole("dialog")
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      adminPage.getByRole("button", { name: /yes|confirm|import|overwrite/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should dismiss confirmation dialog on cancel", async ({
    adminPage,
  }) => {
    await adminPage.goto("/definitions");
    await adminPage.waitForLoadState("domcontentloaded");

    const fileInput = adminPage.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "definitions.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(MOCK_DEFINITIONS)),
    });

    await adminPage
      .getByRole("button", { name: /upload broker definitions/i })
      .click();

    await adminPage.getByRole("button", { name: /cancel/i }).click();

    await expect(adminPage.getByRole("dialog")).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe("Definitions Access Control @p1", () => {
  test("should not show definitions link in sidebar for non-admin", async ({
    readonlyPage,
  }) => {
    await readonlyPage.goto("/");
    await readonlyPage.waitForLoadState("domcontentloaded");

    await expect(
      readonlyPage.getByRole("link", { name: /definitions/i })
    ).not.toBeVisible({ timeout: 15_000 });
  });
});
