import { ssoService } from "@/services/auth/sso.service";

import { rateLimitedPublicProcedure, router } from "@/trpc/trpc";

/**
 * SSO router
 * Provides SSO configuration for the frontend.
 * SSO authentication flow is handled by the SSO controller (redirect-based).
 */
export const ssoRouter = router({
  /**
   * Get SSO configuration for the frontend
   */
  getConfig: rateLimitedPublicProcedure.query(async () => {
    const cfg = ssoService.effectiveConfig;
    return {
      enabled: cfg.enabled,
      buttonLabel: cfg.buttonLabel,
      type: cfg.type,
    };
  }),
});
