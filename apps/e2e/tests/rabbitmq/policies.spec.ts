import { test, expect } from "../../fixtures/test-base.js";
import { mockPolicy } from "../../helpers/factories/policy.factory.js";
import { mockTrpcQuery } from "../../helpers/trpc-mock.js";

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const QUEUE_POLICY = mockPolicy({
  name: "max-length-policy",
  pattern: "^orders\\.",
  "apply-to": "queues",
  definition: { "max-length": 50000, overflow: "drop-head" },
  priority: 10,
});

const EXCHANGE_POLICY = mockPolicy({
  name: "federation-policy",
  pattern: ".*",
  "apply-to": "exchanges",
  definition: { "federation-upstream-set": "all" },
  priority: 0,
});

// ---------------------------------------------------------------------------
// Navigation & page shell
// ---------------------------------------------------------------------------

test.describe("Policies Page Navigation @p0", () => {
  test("should navigate to policies page", async ({ adminPage }) => {
    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage).toHaveURL(/\/policies/);
    await expect(
      adminPage.getByRole("heading", { name: /policies/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show no-server state when not connected", async ({
    adminPage,
  }) => {
    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/no rabbitmq server configured/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show Policies link in sidebar", async ({ adminPage }) => {
    await adminPage.goto("/");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("link", { name: /policies/i })
    ).toBeVisible({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// Table rendering
// ---------------------------------------------------------------------------

test.describe("Policies Table @p1", () => {
  test("should render column headers", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
    ]);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage.getByText(/name/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(adminPage.getByText(/pattern/i).first()).toBeVisible();
    await expect(adminPage.getByText(/apply to/i).first()).toBeVisible();
    await expect(adminPage.getByText(/priority/i).first()).toBeVisible();
    await expect(adminPage.getByText(/definition/i).first()).toBeVisible();
  });

  test("should display policy name and pattern", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
    ]);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage.getByText("max-length-policy")).toBeVisible({
      timeout: 15_000,
    });
    await expect(adminPage.getByText(/\^orders\\/)).toBeVisible();
  });

  test("should display apply-to badge", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
    ]);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage.getByText("queues")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("should display priority value", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
    ]);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage.getByText("10")).toBeVisible({ timeout: 15_000 });
  });

  test("should display definition key preview", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
    ]);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    // Preview shows first two definition keys in braces
    await expect(adminPage.getByText(/max-length/)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("should show empty state when no policies exist", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", []);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage.getByText(/no policies/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("should show policy count in heading", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
      EXCHANGE_POLICY,
    ]);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage.getByText("2")).toBeVisible({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// Definition expand / collapse
// ---------------------------------------------------------------------------

test.describe("Policy Definition Expand @p1", () => {
  test("should expand full JSON on definition click", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
    ]);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    // Click the definition preview button to expand
    await adminPage
      .getByTitle(/expand.*definition|click to expand/i)
      .first()
      .click();

    await expect(adminPage.getByText(/"max-length": 50000/)).toBeVisible({
      timeout: 5_000,
    });
    await expect(adminPage.getByText(/"overflow": "drop-head"/)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Create policy dialog (admin)
// ---------------------------------------------------------------------------

test.describe("Create Policy Dialog @p1", () => {
  test("should show Create policy button for admin", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", []);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("button", { name: /create policy/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should open dialog when Create policy button is clicked", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", []);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await adminPage.getByRole("button", { name: /create policy/i }).click();

    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
    await expect(
      adminPage.getByRole("heading", { name: /create policy/i })
    ).toBeVisible();
  });

  test("dialog should contain all form fields", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", []);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");
    await adminPage.getByRole("button", { name: /create policy/i }).click();
    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

    await expect(
      adminPage.getByRole("textbox", { name: /policy name/i })
    ).toBeVisible();
    await expect(
      adminPage.getByRole("textbox", { name: /pattern/i })
    ).toBeVisible();
    await expect(
      adminPage.getByRole("combobox", { name: /apply to/i })
    ).toBeVisible();
    await expect(
      adminPage.getByRole("spinbutton", { name: /priority/i })
    ).toBeVisible();
    await expect(adminPage.getByRole("textbox", { name: /definition/i })).toBeVisible();
  });

  test("should show Common keys hint section", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", []);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");
    await adminPage.getByRole("button", { name: /create policy/i }).click();
    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

    await adminPage.getByRole("button", { name: /common keys/i }).click();
    await expect(adminPage.getByText(/ha-mode/i)).toBeVisible({
      timeout: 3_000,
    });
    await expect(adminPage.getByText(/message-ttl/i)).toBeVisible();
    await expect(adminPage.getByText(/max-length/i)).toBeVisible();
  });

  test("should show validation error for empty definition", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", []);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");
    await adminPage.getByRole("button", { name: /create policy/i }).click();
    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

    // Fill required fields but leave definition as empty {}
    await adminPage
      .getByRole("textbox", { name: /policy name/i })
      .fill("test-policy");

    await adminPage.getByRole("button", { name: /create policy/i }).last().click();

    await expect(
      adminPage.getByText(/at least one key/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test("should show validation error for invalid JSON in definition", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", []);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");
    await adminPage.getByRole("button", { name: /create policy/i }).click();
    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

    await adminPage
      .getByRole("textbox", { name: /policy name/i })
      .fill("test-policy");

    const textarea = adminPage.getByRole("textbox", { name: /definition/i });
    await textarea.fill("not-valid-json");

    await adminPage.getByRole("button", { name: /create policy/i }).last().click();

    await expect(
      adminPage.getByText(/valid json/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test("should close dialog on cancel", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", []);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");
    await adminPage.getByRole("button", { name: /create policy/i }).click();
    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

    await adminPage.getByRole("button", { name: /cancel/i }).click();

    await expect(adminPage.getByRole("dialog")).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

// ---------------------------------------------------------------------------
// Edit policy dialog (admin)
// ---------------------------------------------------------------------------

test.describe("Edit Policy @p1", () => {
  test("should show edit button per row for admin", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
    ]);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("button", { name: /edit policy/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("edit dialog should pre-populate name field (disabled)", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
    ]);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await adminPage.getByRole("button", { name: /edit policy/i }).first().click();
    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

    const nameField = adminPage.getByRole("textbox", { name: /policy name/i });
    await expect(nameField).toHaveValue("max-length-policy");
    await expect(nameField).toBeDisabled();
  });

  test("edit dialog should pre-populate definition JSON", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
    ]);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await adminPage.getByRole("button", { name: /edit policy/i }).first().click();
    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

    await expect(
      adminPage.getByRole("textbox", { name: /definition/i })
    ).toContainText("max-length");
  });
});

// ---------------------------------------------------------------------------
// Delete policy dialog (admin)
// ---------------------------------------------------------------------------

test.describe("Delete Policy @p1", () => {
  test("should show delete button per row for admin", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
    ]);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("button", { name: /delete policy/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should open confirm dialog on delete click", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
    ]);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await adminPage
      .getByRole("button", { name: /delete policy/i })
      .first()
      .click();

    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByText("max-length-policy")).toBeVisible();
  });

  test("should dismiss confirm dialog on cancel", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
    ]);

    await adminPage.goto("/policies");
    await adminPage.waitForLoadState("domcontentloaded");

    await adminPage
      .getByRole("button", { name: /delete policy/i })
      .first()
      .click();

    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
    await adminPage.getByRole("button", { name: /cancel/i }).click();

    await expect(adminPage.getByRole("dialog")).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

test.describe("Policies Access Control @p1", () => {
  test("non-admin can view policies page", async ({ readonlyPage }) => {
    await mockTrpcQuery(readonlyPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
    ]);

    await readonlyPage.goto("/policies");
    await readonlyPage.waitForLoadState("domcontentloaded");

    await expect(
      readonlyPage.getByRole("heading", { name: /policies/i })
    ).toBeVisible({ timeout: 15_000 });
    await expect(readonlyPage.getByText("max-length-policy")).toBeVisible();
  });

  test("non-admin does not see Create policy button", async ({
    readonlyPage,
  }) => {
    await mockTrpcQuery(readonlyPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
    ]);

    await readonlyPage.goto("/policies");
    await readonlyPage.waitForLoadState("domcontentloaded");

    await expect(
      readonlyPage.getByRole("button", { name: /create policy/i })
    ).not.toBeVisible({ timeout: 15_000 });
  });

  test("non-admin does not see edit or delete buttons", async ({
    readonlyPage,
  }) => {
    await mockTrpcQuery(readonlyPage, "rabbitmq.policies.getPolicies", [
      QUEUE_POLICY,
    ]);

    await readonlyPage.goto("/policies");
    await readonlyPage.waitForLoadState("domcontentloaded");

    await expect(
      readonlyPage.getByRole("button", { name: /edit policy/i })
    ).not.toBeVisible({ timeout: 15_000 });
    await expect(
      readonlyPage.getByRole("button", { name: /delete policy/i })
    ).not.toBeVisible();
  });
});
