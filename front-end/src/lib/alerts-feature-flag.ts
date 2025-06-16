/**
 * Alerts Feature Flag for Frontend
 *
 * Controls access to the alerts feature based on environment.
 * - Production: Alerts are disabled (coming soon)
 * - Development: Alerts are fully enabled
 */

/**
 * Check if alerts feature is enabled based on the current environment
 * @returns true if alerts are enabled, false otherwise
 */
export const isAlertsEnabled = (): boolean => {
  // In Vite, use import.meta.env.MODE to check the environment
  const isDev = import.meta.env.MODE === "development";

  // Enable alerts only in development
  return isDev;
};

/**
 * Get the current environment mode
 * @returns current environment mode
 */
export const getCurrentEnvironment = (): string => {
  return import.meta.env.MODE || "production";
};

/**
 * Check if we're in development mode
 * @returns true if in development mode
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.MODE === "development";
};
