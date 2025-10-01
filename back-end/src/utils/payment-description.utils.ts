/**
 * Utility functions for transforming payment descriptions to be user-friendly
 */

/**
 * Transforms payment descriptions from technical format to user-friendly format
 *
 * @param description - The original payment description (can be null)
 * @param plan - The subscription plan (e.g., 'DEVELOPER', 'PROFESSIONAL')
 * @param billingInterval - The billing interval (e.g., 'MONTH', 'YEAR')
 * @returns A user-friendly payment description
 *
 * @example
 * transformPaymentDescription('Payment for sub_123', 'DEVELOPER', 'MONTH')
 * Returns: 'Payment for developer plan (monthly)'
 *
 * @example
 * transformPaymentDescription('Failed payment for sub_123', 'PROFESSIONAL', 'YEAR')
 * Returns: 'Failed payment for professional plan (yearly)'
 */
export function transformPaymentDescription(
  description: string | null,
  plan: string,
  billingInterval: string
): string {
  // Handle null description
  if (!description) {
    const planName = plan.toLowerCase().replace("_", " ");
    const intervalText = billingInterval === "YEAR" ? "yearly" : "monthly";
    return `Payment for ${planName} plan (${intervalText})`;
  }

  // If it's already a user-friendly description, return as is
  if (description.includes("plan (") && !description.includes("sub_")) {
    return description;
  }

  // Transform technical descriptions
  if (description.includes("sub_")) {
    const planName = plan.toLowerCase().replace("_", " ");
    const intervalText = billingInterval === "YEAR" ? "yearly" : "monthly";
    const prefix = description.toLowerCase().includes("failed")
      ? "Failed"
      : "Payment";

    return `${prefix} for ${planName} plan (${intervalText})`;
  }

  // Return original description if we can't transform it
  return description;
}

/**
 * Generates a new user-friendly payment description for webhook events
 *
 * @param subscriptionId - The Stripe subscription ID
 * @param plan - The subscription plan
 * @param billingInterval - The billing interval
 * @param isFailed - Whether this is a failed payment
 * @returns A user-friendly payment description
 *
 * @example
 * generatePaymentDescription('sub_123', 'DEVELOPER', 'MONTH', false)
 * Returns: 'Payment for developer plan (monthly)'
 */
export function generatePaymentDescription(
  subscriptionId: string,
  plan: string,
  billingInterval: string,
  isFailed = false
): string {
  const planName = plan.toLowerCase().replace("_", " ");
  const intervalText = billingInterval === "YEAR" ? "yearly" : "monthly";
  const prefix = isFailed ? "Failed" : "Payment";

  return `${prefix} for ${planName} plan (${intervalText})`;
}
