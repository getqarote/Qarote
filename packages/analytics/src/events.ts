/**
 * PostHog event registry — single source of truth for event names and shapes
 * across apps/api, apps/app, apps/portal, apps/web.
 *
 * Convention: snake_case, past tense.
 * See docs/posthog-events.md for the human-readable catalog.
 */

export type PlanTier = "free" | "developer" | "enterprise";
export type AcquisitionChannel =
  | "organic"
  | "paid"
  | "referral"
  | "direct"
  | "unknown";
export type AppName = "web" | "app" | "portal" | "api";

export type IntegrationProvider = "slack" | "email" | "notion" | "webhook";

export interface CommonProperties {
  app?: AppName;
  plan_tier?: PlanTier;
  workspace_id?: string;
  organization_id?: string;
  is_trial?: boolean;
}

interface RevenueProperties {
  revenue: number;
  currency: string;
  arr?: number;
  billing_interval: "monthly" | "annual";
}

/**
 * Map of event name → properties shape. Adding an event here makes it usable
 * with the typed `track()` helpers without changing any other code.
 */
export interface EventMap {
  // --- Auth / identity ---
  user_registered: {
    referral_source?: string | null;
    discovery_query?: string | null;
  };
  user_signed_in: { method: "password" | "google" | "sso" };
  user_signed_out: Record<string, never>;
  password_reset_requested: Record<string, never>;
  password_reset_completed: Record<string, never>;
  sso_login_completed: { provider: string; organization_id?: string };
  sso_login_failed: { provider: string; error_code: string };

  // --- Onboarding / activation ---
  onboarding_completed: { [key: string]: unknown };
  rabbitmq_server_connected: {
    version_major?: number | null;
    tls_enabled: boolean;
  };
  empty_state_cta_clicked: { state: string; cta: string };

  // --- Workspace / org ---
  workspace_created: {
    workspace_id: string;
    organization_id?: string;
    is_first_workspace?: boolean;
    name_length?: number;
    /** True when a managed-tier WorkspaceLlmConfig row was auto-provisioned
     *  for this workspace at creation. False when either the platform isn't
     *  configured for managed LLM or the feature isn't in the licensed
     *  surface. Lets us confirm cloud signups land in the "AI Explain works
     *  first try" bucket. */
    llm_auto_seeded?: boolean;
  };
  workspace_switched: { from_id?: string; to_id: string };
  organization_created: { is_auto_created: boolean };
  org_invitation_accepted: {
    organization_id: string;
    invited_role: string;
    workspace_assignments_count: number;
  };
  invitation_accepted: { workspace_id?: string; invited_role?: string };

  // --- Billing / monetization ---
  checkout_started: { plan_tier: PlanTier };
  payment_completed: {
    plan_tier?: PlanTier;
    plan?: string;
    [key: string]: unknown;
  };
  payment_cancelled: { plan?: string };
  plan_upgrade_initiated: { from_tier: PlanTier; to_tier: PlanTier };
  billing_portal_opened: Record<string, never>;
  subscription_created: RevenueProperties & { plan_tier: PlanTier };
  subscription_upgraded: RevenueProperties & {
    from_tier: PlanTier;
    to_tier: PlanTier;
    mrr_delta: number;
  };
  subscription_downgraded: {
    from_tier: PlanTier;
    to_tier: PlanTier;
    mrr_delta: number;
  };
  subscription_changed: {
    change_type: "created" | "upgraded" | "downgraded" | "canceled";
    from_tier?: PlanTier;
    to_tier?: PlanTier;
    mrr_delta?: number;
    revenue?: number;
  };
  subscription_canceled: {
    organization_id?: string;
    cancel_immediately?: boolean;
    reason?: string | null;
    has_feedback?: boolean;
  };
  invoice_paid: { revenue: number; currency: string };
  payment_failed: { amount?: number; attempt_count?: number; reason?: string };
  trial_started: { trial_days_remaining: number };
  trial_expired: Record<string, never>;
  feature_limit_hit: {
    feature: string;
    current_usage?: number;
    limit?: number;
    feature_quota_used_pct?: number;
  };
  license_activated: { tier?: string };
  selfhosted_license_activated: { tier?: string; expires_at?: string };
  selfhosted_license_deactivated: Record<string, never>;
  license_purchased: {
    plan: string;
    billing_interval?: string | null;
    license_id?: string;
    expires_at?: string;
    stripe_subscription_id?: string | null;
  };
  license_verification_failed: { reason: string; license_tier?: string };

  // --- EE features ---
  alert_rule_created: {
    severity: string;
    category?: string;
    condition_type: string;
    name_length: number;
  };
  alert_rule_modal_opened: Record<string, never>;
  integration_connected: { provider: IntegrationProvider };
  integration_disconnected: { provider: IntegrationProvider; reason?: string };

  // --- Workspace members (collaboration) ---
  workspace_member_invited: { role: string };
  workspace_member_accepted: { role: string };

  // --- Marketing site (apps/web) ---
  pricing_page_viewed: { plan_tier_focused?: PlanTier };
  cta_clicked: { cta: string; location: string };
  feature_page_viewed: { feature: string };
  comparison_page_viewed: { competitor: string };
  signup_form_started: Record<string, never>;
  signup_form_submitted: Record<string, never>;
  signup_form_abandoned: { reason: "visibility" | "unload" };
  blog_post_viewed: { slug: string; reading_time_estimate?: number };
  scroll_depth_reached: { page: string; depth: 25 | 50 | 75 | 100 };
  sign_up_clicked: { location?: string };

  // --- Quiz (existing on apps/web) ---
  quiz_started: Record<string, never>;
  quiz_completed: { tier?: string };
  quiz_email_captured: { tier?: string };
  quiz_share_clicked: { tier?: string };
  quiz_cta_clicked: { tier: string };

  // --- LLM / AI features ---
  llm_explain_requested: { source?: string; [key: string]: unknown };
  llm_explain_persisted: { feature: string; from_cache: boolean; explanation_id: string };
  llm_explain_regenerated: { feature: string; explanation_id?: string | null };
  llm_explain_copied_markdown: { feature: string; explanation_id?: string | null };
  llm_explain_link_copied: { explanation_id: string; feature: string };
  ai_explain_rated: { rating: number; [key: string]: unknown };
  diagnosis_feedback: { rating: string; [key: string]: unknown };
  llm_quota_recorded: {
    feature: string;
    workspace_id: string;
    used: number;
    cap: number | null;
    input_tokens: number;
    output_tokens: number;
  };
  llm_quota_byok_used: {
    feature: string;
    workspace_id: string;
    provider: string;
  };

  // --- Scan flow ---
  scan_started: { server_id?: string; workspace_id?: string };
  scan_completed: {
    server_id?: string;
    workspace_id?: string;
    findings_count?: number;
  };
  scan_error: {
    server_id?: string;
    workspace_id?: string;
    error_code?: string;
  };
  scan_ai_explain_demo_clicked: { findings_count?: number };
  scan_findings_explored: { findings_count?: number };
  scan_alerts_configured: { findings_count?: number };
  scan_dashboard_continued: { findings_count?: number };

  // --- Account verification (portal) ---
  account_verified: { verification_type?: string };
  verification_resent: { [key: string]: unknown };
  google_sign_in_clicked: { mode?: string };
  user_signed_up: {
    referral_source?: string | null;
    method?: "password" | "google";
  };

  // --- License management (portal) ---
  purchase_page_viewed: { [key: string]: unknown };
  license_plan_selected: { tier?: string; [key: string]: unknown };
  license_purchase_initiated: { tier?: string; [key: string]: unknown };
  license_purchase_failed: {
    tier?: string;
    error_code?: string;
    [key: string]: unknown;
  };
  license_key_copied: { [key: string]: unknown };
  license_key_revealed: { [key: string]: unknown };

  // --- Feature gate / capability ---
  gate_evaluated: {
    feature: string;
    kind: string;
    blocked_by?: string | null;
    server_id?: string | null;
  };
  capability_changed: {
    server_id: string;
    had_firehose_before: boolean | null;
    has_firehose_after: boolean;
    plugin_count_before: number | null;
    plugin_count_after: number;
  };

  // --- Existing org / workspace flow ---
  org_member_invited: {
    organization_id: string;
    invited_role: string;
    workspace_assignments_count: number;
    email_sent: boolean;
  };
  invitation_registration_completed: {
    workspace_id?: string;
    invited_role?: string;
  };
  workspace_invitation_sent: {
    workspace_id: string;
    invited_role: string;
    email_sent: boolean;
  };
  workspace_deleted: { workspace_id: string };

  // --- Existing checkout / subscription lifecycle ---
  checkout_session_created: {
    plan: string;
    billing_interval: string;
    organization_id?: string;
  };
  subscription_renewal_initiated: {
    plan: string;
    billing_interval: string;
    organization_id?: string;
  };
  subscription_purchased: {
    plan: string;
    billing_interval?: string | null;
    organization_id?: string | null;
    stripe_subscription_id?: string | null;
    is_trial: boolean;
  };
  subscription_churned: {
    plan: string;
    billing_interval?: string;
    organization_id?: string | null;
    stripe_subscription_id?: string;
  };

  // --- Feedback / product input ---
  feedback_submitted: {
    feedback_type: string;
    feedback_category?: string | null;
    feedback_priority?: string | null;
    workspace_id?: string | null;
  };

  // --- Generic page view (manual, route-pattern only) ---
  $pageview: { route_name: string; app: AppName };
}

export type EventName = keyof EventMap;
export type EventProperties<E extends EventName> = EventMap[E];
