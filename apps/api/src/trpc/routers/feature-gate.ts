import { z } from "zod";

import { prisma } from "@/core/prisma";

import {
  type FeatureGateResult,
  type FeatureKey,
  resolveFeatureGate,
} from "@/services/feature-gate";

import { FEATURES } from "@/config/features";

import { rateLimitedProcedure, router } from "../trpc";

/**
 * Evaluate the unified feature gate for the caller (ADR-002).
 *
 * Used by `useFeatureGate` on the frontend to render `<FeatureGateCard>`
 * proactively (page entry, sidebar badges) instead of waiting for a gated
 * procedure to throw. The resolver is the same one used inside throw-paths,
 * so proactive and reactive views never disagree.
 */
const FEATURE_KEYS = Object.values(FEATURES) as [FeatureKey, ...FeatureKey[]];

export const featureGateRouter = router({
  // Rate-limited (vs unbound protectedProcedure) — pages can mount multiple
  // <FeatureGateCard> instances and the standard limiter prevents fan-out
  // abuse from console scripts.
  evaluate: rateLimitedProcedure
    .input(
      z.object({
        feature: z.enum(FEATURE_KEYS),
        serverId: z.string().optional(),
        // Per-object subject (discriminated union). Used by the
        // capability axis for per-object rules — e.g. `message_spy`
        // blocks streams. Future kinds (vhost, exchange) extend the
        // union without bloating the input shape.
        subject: z
          .discriminatedUnion("kind", [
            z.object({
              kind: z.literal("queue"),
              queueType: z.enum(["classic", "quorum", "stream"]),
            }),
          ])
          .optional(),
      })
    )
    .query(async ({ ctx, input }): Promise<FeatureGateResult> => {
      const orgInfo = await ctx.resolveOrg();

      // Cross-org guard: when `serverId` is supplied, ensure it belongs
      // to the caller's org. Without this, a user in org A could probe
      // org B's broker capabilities (low-severity info leak — what
      // plugins are enabled). We silently drop `serverId` rather than
      // throwing because evaluating without it is still a meaningful
      // license/plan resolution.
      let serverId = input.serverId;
      if (serverId && orgInfo?.organizationId) {
        const owns = await prisma.rabbitMQServer.findFirst({
          where: {
            id: serverId,
            workspace: { organizationId: orgInfo.organizationId },
          },
          select: { id: true },
        });
        if (!owns) {
          serverId = undefined;
        }
      } else if (serverId && !orgInfo?.organizationId) {
        // No org context but a serverId was supplied — refuse to scope
        // the evaluation; fall back to license/plan only.
        serverId = undefined;
      }

      return resolveFeatureGate(input.feature, {
        organizationId: orgInfo?.organizationId,
        locale: ctx.locale,
        serverId,
        subject: input.subject,
      });
    }),
});
