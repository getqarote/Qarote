import type { Page } from "@playwright/test";

/**
 * Intercept a tRPC procedure in Playwright, correctly handling httpBatchLink.
 *
 * tRPC's httpBatchLink batches multiple procedures into a single HTTP request:
 *   URL:  /trpc/proc1,proc2?batch=1&input=...
 *   Body: [{result1}, {result2}]
 *
 * This helper intercepts any /trpc/* request that includes the target procedure,
 * replaces only that procedure's response in the batch, and forwards the rest.
 */
export async function mockTrpcQuery(
  page: Page,
  procedure: string,
  data: unknown
): Promise<void> {
  await page.route("**/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const segment = url.pathname.split("/trpc/")[1] || "";
    const procedures = segment.split(",");
    const index = procedures.indexOf(procedure);

    if (index === -1) {
      return route.continue();
    }

    const mockEntry = { result: { data } };

    if (procedures.length === 1) {
      // Only our target procedure in this batch
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockEntry]),
      });
    }

    // Multi-procedure batch: fetch real responses, replace only our target
    try {
      const response = await route.fetch();
      const body = await response.json();
      body[index] = mockEntry;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    } catch {
      // If upstream fetch fails, build a minimal batch response
      const batch = procedures.map((_, i) =>
        i === index
          ? mockEntry
          : { error: { code: "INTERNAL_SERVER_ERROR", message: "mocked" } }
      );
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(batch),
      });
    }
  });
}

/**
 * Intercept a tRPC mutation and return an INTERNAL_SERVER_ERROR response.
 * Works for both queries and mutations since both use the same /trpc/* URL pattern.
 */
export async function mockTrpcMutationError(
  page: Page,
  procedure: string,
  message: string
): Promise<void> {
  await page.route("**/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const segment = url.pathname.split("/trpc/")[1] || "";
    const procedures = segment.split(",");
    const index = procedures.indexOf(procedure);

    if (index === -1) {
      return route.continue();
    }

    const errorEntry = {
      error: {
        message,
        code: -32603,
        data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
      },
    };

    if (procedures.length === 1) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([errorEntry]),
      });
    }

    // Multi-procedure batch: fetch real responses, replace only our target
    try {
      const response = await route.fetch();
      const body = await response.json();
      body[index] = errorEntry;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    } catch {
      // If upstream fetch fails, build a minimal batch response
      const batch = procedures.map((_, i) =>
        i === index
          ? errorEntry
          : { error: { code: -32603, message: "mocked", data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 } } }
      );
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(batch),
      });
    }
  });
}
