/**
 * Shared formatting helpers for the Plans page. Kept in a plain `.ts`
 * file (no JSX) so they can be imported by any card or helper
 * component without pulling in React render cost.
 */

/**
 * Formats a numeric limit into a localized display string. `null` or
 * `undefined` means "no limit" and returns the translated
 * "unlimited" label.
 */
export function formatLimit(
  value: number | null | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  if (value === null || value === undefined) return t("plans.limits.unlimited");
  return t("plans.limits.upTo", { count: value });
}

/**
 * Formats a price in cents into a rounded dollar display string.
 * Zero renders as `$0` (free tier). Non-zero values are rounded to
 * whole dollars because the pricing grid doesn't need cents.
 */
function formatPrice(cents: number): string {
  if (cents === 0) return "$0";
  return `$${Math.round(cents / 100)}`;
}

/**
 * Converts a yearly total (in cents) into the equivalent monthly
 * price (also in cents). Used when showing "yearly billing: $X/mo"
 * on yearly-cycle plan cards.
 */
function yearlyToMonthly(yearlyCents: number): number {
  return Math.round(yearlyCents / 12);
}

/**
 * Plan shape returned by the tRPC `getAllPlans` endpoint. Flat, with
 * every feature as a boolean or a "coming_soon" sentinel for RBAC.
 * Kept here (not in a shared types file) because no other surface
 * consumes this shape.
 */
export interface ApiPlan {
  plan: string;
  displayName: string;
  description: string;
  maxServers: number | null;
  maxWorkspaces: number | null;
  maxUsers: number | null;
  monthlyPrice: number;
  yearlyPrice: number;
  hasCommunitySupport: boolean;
  hasPrioritySupport: boolean;
  hasAdvancedAnalytics: boolean;
  hasAlerts: boolean;
  hasTopologyVisualization: boolean;
  hasRoleBasedAccess: boolean | "coming_soon";
  hasSsoSamlOidc: boolean;
  hasSoc2Compliance: boolean;
  isPopular: boolean;
  ltsOnly: boolean;
}

export type BillingInterval = "monthly" | "yearly";

/**
 * Builds the display pricing for a given plan and billing interval.
 * Returns the primary price, the localized period label ("month"),
 * and optionally an alternate-interval reference price so the card
 * can show "$X/mo, billed monthly: $Y/mo".
 */
export function getPlanPricing(
  plan: ApiPlan,
  billingInterval: BillingInterval,
  t: (key: string, opts?: Record<string, unknown>) => string
): {
  price: string;
  periodLabel: string;
  originalPrice?: string;
  altPriceLabel?: string;
} {
  const periodLabel = t("plans.period.month");

  if (plan.monthlyPrice === 0) {
    return { price: formatPrice(0), periodLabel };
  }

  if (billingInterval === "yearly") {
    const monthlyEquivalent = yearlyToMonthly(plan.yearlyPrice);
    return {
      price: formatPrice(monthlyEquivalent),
      periodLabel,
      originalPrice: formatPrice(plan.monthlyPrice),
      altPriceLabel: t("plans.billingToggle.billedMonthly"),
    };
  }

  const yearlyMonthly = yearlyToMonthly(plan.yearlyPrice);
  return {
    price: formatPrice(plan.monthlyPrice),
    periodLabel,
    originalPrice: formatPrice(yearlyMonthly),
    altPriceLabel: t("plans.billingToggle.billedYearly"),
  };
}
