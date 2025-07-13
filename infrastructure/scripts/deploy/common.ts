/**
 * Common types and utilities for deployment
 */
import { Logger, Environment, EnvConfig, FrontendEnvConfig } from "../utils";

/**
 * Component types for deployment
 */
export type Component = "all" | "backend" | "frontend";

/**
 * Deployment options
 */
export interface DeployOptions {
  environment: Environment;
  component: Component;
}

/**
 * Display deployment summary
 */
export function displayBackendDeploymentSummary(
  environment: Environment,
  config: EnvConfig
): void {
  Logger.success("Deployment completed successfully! 🎉");

  console.log("");
  console.log("🎯 Deployment Summary:");
  console.log(`   Environment: ${environment}`);
  console.log(`   Backend:     https://${config.DOMAIN_BACKEND}`);
  console.log(`   Frontend:    https://${config.DOMAIN_FRONTEND}`);
  console.log("");
  console.log("🔍 Next steps:");
  console.log(`   • Check status: npm run status:${environment}`);
  console.log(`   • View logs:    npm run logs:${environment}`);
  console.log(
    `   • Test API:     curl https://${config.DOMAIN_BACKEND}/health`
  );
  console.log("");
  Logger.success("Happy deploying! 🚀");
}

/**
 * Display frontend deployment summary
 */
export function displayFrontendDeploymentSummary(
  environment: Environment,
  config: FrontendEnvConfig
): void {
  Logger.success("Frontend deployment completed successfully! 🎉");

  console.log("");
  console.log("🎯 Frontend Deployment Summary:");
  console.log(`   Environment: ${environment}`);
  console.log(`   URL:         https://${config.DOMAIN_FRONTEND}`);
  console.log(`   API URL:     ${config.VITE_API_URL}`);
  console.log(`   Version:     ${config.VITE_APP_VERSION}`);
  console.log("");
  console.log("🔍 Next steps:");
  console.log(`   • Visit site:    https://${config.DOMAIN_FRONTEND}`);
  console.log(`   • View changes:  npm run logs:${environment}`);
  console.log(`   • Test API:      curl ${config.VITE_API_URL}/health`);
  console.log("");
  Logger.success("Happy deploying! 🚀");
}
