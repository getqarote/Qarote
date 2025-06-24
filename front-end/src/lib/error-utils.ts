/**
 * Enhanced error message parsing for plan validation errors
 */

export interface ParsedPlanError {
  isVersionError: boolean;
  isFeatureError: boolean;
  currentPlan: string;
  requiredPlan: string;
  feature?: string;
  version?: string;
  supportedVersions?: string[];
  upgradeMessage: string;
}

export function parsePlanValidationError(error: Error): ParsedPlanError | null {
  const message = error.message;

  // Check for RabbitMQ version errors
  const versionMatch = message.match(
    /RabbitMQ version ([\d.]+) is not available on the (\w+) plan\. Upgrade to (.+?) plan\. Supported versions for \w+ plan: (.+)/
  );

  if (versionMatch) {
    const [, version, currentPlan, requiredPlan, supportedVersionsStr] =
      versionMatch;
    const supportedVersions = supportedVersionsStr.split(", ");

    return {
      isVersionError: true,
      isFeatureError: false,
      currentPlan,
      requiredPlan,
      version,
      supportedVersions,
      upgradeMessage: `Your ${currentPlan} plan only supports RabbitMQ ${supportedVersions.join(", ")} LTS. Upgrade to ${requiredPlan} plan to connect to RabbitMQ ${version}.`,
    };
  }

  // Check for other plan validation errors
  const featureMatch = message.match(
    /(.+?) is not available on the (\w+) plan\. Upgrade to (.+?) plan/
  );

  if (featureMatch) {
    const [, feature, currentPlan, requiredPlan] = featureMatch;

    return {
      isVersionError: false,
      isFeatureError: true,
      currentPlan,
      requiredPlan,
      feature,
      upgradeMessage: `${feature} requires ${requiredPlan} plan. Please upgrade to access this feature.`,
    };
  }

  return null;
}

/**
 * Generate user-friendly error message component props
 */
export function generateErrorProps(error: Error) {
  const parsedError = parsePlanValidationError(error);

  if (parsedError) {
    return {
      title: parsedError.isVersionError
        ? "RabbitMQ Version Not Supported"
        : "Feature Not Available",
      message: parsedError.upgradeMessage,
      action: parsedError.isVersionError
        ? "Try connecting to a supported version or upgrade your plan"
        : "Upgrade your plan to access this feature",
      variant: "warning" as const,
    };
  }

  return {
    title: "Connection Error",
    message: error.message,
    action: "Please check your connection details and try again",
    variant: "destructive" as const,
  };
}
