import { logger } from "./logger";

/**
 * Initialize dataLayer if it doesn't exist
 * @returns true if dataLayer exists or was created, false otherwise
 */
function ensureDataLayer(): boolean {
  if (typeof window === "undefined") {
    logger.warn(
      "window.dataLayer: window is undefined (likely SSR). GTM tracking will not work."
    );
    return false;
  }

  if (!window.dataLayer) {
    logger.warn(
      "window.dataLayer does not exist. Creating it, but GTM may not be properly initialized."
    );
    window.dataLayer = [];
  }

  if (!Array.isArray(window.dataLayer)) {
    logger.error(
      "window.dataLayer exists but is not an array. GTM tracking may fail.",
      { dataLayer: window.dataLayer }
    );
    return false;
  }

  return true;
}

/**
 * Push an event to Google Tag Manager dataLayer
 */
function pushToDataLayer(data: Record<string, unknown>): void {
  try {
    const dataLayerExists = ensureDataLayer();

    if (!dataLayerExists) {
      logger.warn("Cannot push to dataLayer: dataLayer is not available", {
        event: data,
      });
      return;
    }

    if (!window.dataLayer) {
      logger.error(
        "window.dataLayer is still undefined after ensureDataLayer(). This should not happen."
      );
      return;
    }

    window.dataLayer.push(data);
    logger.debug("GTM event pushed", data);
  } catch (error) {
    logger.error("Failed to push to dataLayer:", error, { event: data });
  }
}

/**
 * Track a sign up click event (when user clicks to go to sign up page)
 */
export function trackSignUpClick(params?: {
  source?: string;
  location?: string;
}): void {
  pushToDataLayer({
    event: "sign_up_click",
    ...(params?.source && { source: params.source }),
    ...(params?.location && { location: params.location }),
  });
}
