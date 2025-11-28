import ReactGA from "react-ga4";

import { logger } from "@/lib/logger";

const GA_MEASUREMENT_ID = "G-4MM5ZSTE2F";

/**
 * Initialize Google Analytics 4
 * Should be called once when the app starts
 */
export function initializeGA(): void {
  if (typeof window === "undefined") {
    logger.warn("window is undefined (likely SSR). GA tracking will not work.");
    return;
  }

  try {
    ReactGA.initialize(GA_MEASUREMENT_ID);
    logger.debug("Google Analytics initialized");
  } catch (error) {
    logger.error("Failed to initialize Google Analytics:", error);
  }
}

/**
 * Track a purchase event
 */
export function trackPurchase(params: {
  transaction_id: string;
  value: number;
  currency: string;
}): void {
  try {
    ReactGA.event("purchase", {
      transaction_id: params.transaction_id,
      value: params.value,
      currency: params.currency,
    });
    logger.debug("GA purchase event tracked", params);
  } catch (error) {
    logger.error("Failed to track purchase event:", error, { params });
  }
}

/**
 * Track a sign up event
 */
export function trackSignUp(params: {
  method: string;
  email?: string;
  user_id?: string;
}): void {
  try {
    ReactGA.event("sign_up", {
      method: params.method,
      ...(params.email && { email: params.email }),
      ...(params.user_id && { user_id: params.user_id }),
    });
    logger.debug("GA sign up event tracked", params);
  } catch (error) {
    logger.error("Failed to track sign up event:", error, { params });
  }
}
