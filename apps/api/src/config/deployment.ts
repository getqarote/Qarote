/**
 * Deployment mode detection and validation
 */

import { deploymentConfig } from "./index";

/**
 * Check if running in cloud mode
 */
export const isCloudMode = () => deploymentConfig.isCloud();

/**
 * Check if running in self-hosted mode
 */
export const isSelfHostedMode = () => deploymentConfig.isSelfHosted();

/**
 * Check if running in demo mode (demo.qarote.io)
 * When true, destructive operations are blocked and a demo banner is shown.
 */
export const isDemoMode = () => process.env.DEMO_MODE === "true";
