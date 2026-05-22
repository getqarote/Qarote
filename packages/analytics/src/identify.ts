/**
 * Identify payload builders. Used by both backend (posthog-node) and frontend
 * (posthog-js) to ensure user / group properties are emitted consistently.
 *
 * `$set` overwrites on every call (use for mutable traits like plan_tier).
 * `$set_once` only writes if the property is currently unset (use for first-touch
 * attribution like signup_referral_source).
 */

import type { AcquisitionChannel, PlanTier } from "./events";

export interface IdentifyUserInput {
  id: string;
  email: string;
  planTier?: PlanTier;
  isTrial?: boolean;
  workspaceId?: string;
  organizationId?: string;
  seatCount?: number;
  serverCount?: number;
  isSelfHosted?: boolean;
  // First-touch attribution (only emitted if defined; consumed via $set_once)
  signupReferralSource?: string | null;
  signupDiscoveryQuery?: string | null;
  signupAt?: string | Date;
  initialUtmSource?: string | null;
  initialUtmMedium?: string | null;
  initialUtmCampaign?: string | null;
  initialUtmTerm?: string | null;
  initialUtmContent?: string | null;
  initialReferrer?: string | null;
  initialLandingPage?: string | null;
  acquisitionChannel?: AcquisitionChannel;
}

export interface IdentifyPayload {
  distinctId: string;
  $set: Record<string, unknown>;
  $set_once: Record<string, unknown>;
}

function omitNullish<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out as T;
}

function toIso(d: string | Date | undefined): string | undefined {
  if (!d) return undefined;
  return d instanceof Date ? d.toISOString() : d;
}

export function buildIdentifyPayload(user: IdentifyUserInput): IdentifyPayload {
  const $set = omitNullish({
    email: user.email,
    plan_tier: user.planTier,
    is_trial: user.isTrial,
    seat_count: user.seatCount,
    server_count: user.serverCount,
    is_self_hosted: user.isSelfHosted,
  });

  const $set_once = omitNullish({
    signup_referral_source: user.signupReferralSource,
    signup_discovery_query: user.signupDiscoveryQuery,
    signup_at: toIso(user.signupAt),
    initial_utm_source: user.initialUtmSource,
    initial_utm_medium: user.initialUtmMedium,
    initial_utm_campaign: user.initialUtmCampaign,
    initial_utm_term: user.initialUtmTerm,
    initial_utm_content: user.initialUtmContent,
    initial_referrer: user.initialReferrer,
    initial_landing_page: user.initialLandingPage,
    acquisition_channel: user.acquisitionChannel,
  });

  return { distinctId: user.id, $set, $set_once };
}

/**
 * Super-properties to attach to every event for consistent slicing.
 * Same shape backend and frontend.
 */
export interface SuperProperties {
  app?: "web" | "app" | "portal" | "api";
  plan_tier?: PlanTier;
  workspace_id?: string;
  organization_id?: string;
  is_trial?: boolean;
}

export function buildSuperProperties(
  user: {
    planTier?: PlanTier;
    isTrial?: boolean;
    workspaceId?: string;
    organizationId?: string;
    app?: SuperProperties["app"];
  }
): SuperProperties {
  return omitNullish({
    app: user.app,
    plan_tier: user.planTier,
    workspace_id: user.workspaceId,
    organization_id: user.organizationId,
    is_trial: user.isTrial,
  });
}

export interface OrganizationGroupTraits {
  plan_tier?: PlanTier;
  mrr?: number;
  seat_count?: number;
  created_at?: string;
}

export function buildOrganizationGroup(
  organizationId: string,
  traits: OrganizationGroupTraits
): { groupKey: string; groupType: "organization"; properties: OrganizationGroupTraits } {
  return {
    groupKey: organizationId,
    groupType: "organization",
    properties: omitNullish(traits as Record<string, unknown>) as OrganizationGroupTraits,
  };
}

/**
 * Derive an acquisition channel from raw UTM/referrer signals. Conservative
 * defaults — keep the heuristic boring.
 */
export function deriveAcquisitionChannel(input: {
  utmMedium?: string | null;
  utmSource?: string | null;
  referrer?: string | null;
}): AcquisitionChannel {
  const medium = (input.utmMedium ?? "").toLowerCase();
  const source = (input.utmSource ?? "").toLowerCase();

  if (
    ["cpc", "ppc", "paid", "paid-social", "paidsocial", "display"].includes(medium) ||
    medium.startsWith("paid")
  ) {
    return "paid";
  }
  if (medium === "organic" || source === "google" || source === "bing" || source === "duckduckgo") {
    return "organic";
  }
  if (medium === "referral" || (input.referrer && input.referrer.length > 0)) {
    return "referral";
  }
  if (input.utmSource || input.utmMedium) {
    return "referral";
  }
  return "direct";
}
