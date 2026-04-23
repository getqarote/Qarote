/**
 * Type-only exports for frontend and type-consumer use.
 *
 * Rule: TypeScript type consumers (frontend tRPC client, etc.) import AppRouter
 * from here. Runtime code that needs the actual router (server.ts, tests) must
 * import directly from "@/trpc/router" — not from this file.
 */

// Derive AppRouter from the EE router so the type includes all CE + EE routes.
import type { appRouter } from "./router";

export type AppRouter = typeof appRouter;
