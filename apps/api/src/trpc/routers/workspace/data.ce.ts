/**
 * CE stub — workspace data export is an EE feature.
 * The real dataRouter lives in src/ee/routers/workspace/data.ts and is
 * composed into the workspace router by src/ee/trpc/routers/workspace/index.ts.
 */
import { router } from "@/trpc/trpc";

export const dataRouter = router({});
