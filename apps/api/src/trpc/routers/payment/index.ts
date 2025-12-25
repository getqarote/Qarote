import { router } from "@/trpc/trpc";

import { billingRouter } from "./billing";
import { checkoutRouter } from "./checkout";
import { subscriptionRouter } from "./subscription";

/**
 * Payment router
 * Combines all payment-related routers
 */
export const paymentRouter = router({
  checkout: checkoutRouter,
  billing: billingRouter,
  subscription: subscriptionRouter,
});
