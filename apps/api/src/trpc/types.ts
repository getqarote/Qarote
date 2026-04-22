/**
 * Type-only exports for frontend consumption
 * This file only exports types and does not import runtime code
 */

// AppRouter type is derived from the EE router (CE + EE routes).
// All callers import from here — never directly from ee/trpc/router.
import type { appRouter } from "../ee/trpc/router";

export type AppRouter = typeof appRouter;
