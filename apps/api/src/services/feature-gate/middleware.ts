/**
 * tRPC middleware that gates a procedure on a single feature.
 *
 * Internally calls `resolveFeatureGate` so call sites get the structured
 * `shape.data.gate` payload consumed by `<FeatureGateCard>` for free, with
 * no per-router migration.
 *
 * Pre-ADR-002 this lived in `core/feature-flags.ts`. It moved here as
 * part of the boundary collapse — middleware is composition layer code,
 * which belongs alongside the resolver, not next to the license read.
 */

import type { PremiumFeature } from "@/config/features";

import { throwGateError } from "./error";
import { resolveFeatureGate } from "./resolver";

/**
 * Require a premium feature middleware for tRPC procedures.
 *
 * Forwards `serverId` from the procedure input so the capability axis
 * can scope its decision per-broker. Routers whose input doesn't carry
 * `serverId` are unaffected.
 *
 * The middleware does NOT consume preview results — callers that need
 * plan-tiered previews must call `resolveFeatureGate` directly inside the
 * procedure body.
 */
export function requirePremiumFeature(feature: PremiumFeature) {
  // @ts-expect-error - tRPC provides correct types when used with .use()
  return async (opts) => {
    const organizationId = opts.ctx?.organizationId as string | undefined;

    // Pull serverId out of raw input the same way `workspaceProcedure`
    // does (`opts.input` is undefined at middleware time). Anything not a
    // non-empty string is treated as absent.
    let serverId: string | undefined;
    try {
      const rawInput = (await opts.getRawInput?.()) as
        | { serverId?: unknown }
        | undefined;
      if (
        rawInput &&
        typeof rawInput.serverId === "string" &&
        rawInput.serverId.trim() !== ""
      ) {
        serverId = rawInput.serverId;
      }
    } catch {
      // getRawInput failures are non-fatal — the gate still runs without
      // serverId, matching the pre-capability-axis behaviour.
    }

    const gate = await resolveFeatureGate(feature, {
      organizationId,
      serverId,
    });

    if (gate.kind === "blocked") throwGateError(gate);
    return opts.next();
  };
}
