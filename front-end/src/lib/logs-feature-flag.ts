/**
 * Logs Feature Flag for Frontend
 *
 * Controls access to the logs feature based on environment.
 * - Production: Logs are disabled (coming soon)
 * - Development: Logs are fully enabled
 */

/**
 * Check if logs feature is enabled based on the current environment
 * @returns true if logs are enabled, false otherwise
 */
export const isLogsEnabled = (): boolean => {
  // In Vite, use import.meta.env.MODE to check the environment
  const isDev = import.meta.env.MODE === "development";

  // Enable logs only in development
  return isDev;
};

/**
 * Get logs feature status for display purposes
 * @returns object with enabled status and display text
 */
export const getLogsFeatureStatus = () => {
  const enabled = isLogsEnabled();
  return {
    enabled,
    statusText: enabled ? "Available" : "Coming Soon",
    description: enabled
      ? "Track user actions and system events in real-time"
      : "Advanced logging and audit trail functionality is coming soon to production environments",
  };
};
