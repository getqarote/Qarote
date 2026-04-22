/**
 * Type-only exports for frontend consumption
 * This file only exports types and does not import runtime code
 */

// AppRouter type comes from the EE router which includes all CE + EE routes.
// CE callers that need the type should import from here, not directly from ee/.
export type { AppRouter } from "../ee/trpc/router";
