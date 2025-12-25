import { createTRPCReact } from "@trpc/react-query";

import type { AppRouter } from "../../../../api/src/trpc/types";

/**
 * Create tRPC React hooks
 * Strongly-typed React hooks from AppRouter type signature
 */
export const trpc = createTRPCReact<AppRouter>();
