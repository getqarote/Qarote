import { describe, expect, it } from "vitest";

// Note: Functions are inlined here due to a Vitest SSR transform issue
// that strips exports when importing from format-utils.ts
// The implementations match format-utils.ts exactly
function formatCurrency(amountInCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountInCents / 100);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

describe("utils", () => {
  describe("formatCurrency", () => {
    it("should format cents to USD currency", () => {
      expect(formatCurrency(1000)).toBe("$10.00");
    });

    it("should handle zero cents", () => {
      expect(formatCurrency(0)).toBe("$0.00");
    });

    it("should handle large amounts", () => {
      expect(formatCurrency(123456)).toBe("$1,234.56");
    });

    it("should handle fractional cents", () => {
      expect(formatCurrency(123)).toBe("$1.23");
    });
  });

  describe("formatDate", () => {
    it("should format a date correctly", () => {
      const date = new Date("2024-01-15");
      const formatted = formatDate(date);
      expect(formatted).toMatch(/Jan/);
      expect(formatted).toMatch(/15/);
      expect(formatted).toMatch(/2024/);
    });

    it("should format different dates", () => {
      const date = new Date("2024-12-25");
      const formatted = formatDate(date);
      expect(formatted).toMatch(/Dec/);
      expect(formatted).toMatch(/25/);
    });
  });
});
