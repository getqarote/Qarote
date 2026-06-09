import { trpc } from "@/lib/trpc/client";

/** Billing overview (payment method + recent payments) for the caller's org. */
export function useBillingOverview() {
  return trpc.payment.billing.getBillingOverview.useQuery();
}

/** Opens a Stripe billing-portal session (returns a redirect URL). */
export function useBillingPortalSession() {
  return trpc.payment.billing.createBillingPortalSession.useMutation();
}
