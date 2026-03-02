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
