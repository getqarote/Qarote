/**
 * Main server configuration utilities - routes to environment-specific scripts
 */
import { Logger } from "../utils";
import { HetznerServer } from "./common";
import {
  setupStagingInfrastructure,
  provisionStagingApplicationServer,
  provisionStagingDatabaseServer,
  configureStagingApplicationServer,
  configureStagingDatabaseServer,
} from "./servers-staging";
import {
  setupProductionInfrastructure,
  provisionProductionApplicationServer,
  provisionProductionDatabaseServer,
  configureProductionApplicationServer,
  configureProductionDatabaseServer,
} from "./servers-production";

/**
 * Main infrastructure setup function - routes to environment-specific implementation
 */
export async function setupInfrastructure(
  environment: string,
  sshKeyId: number
): Promise<{
  appServer: HetznerServer;
  dbServer: HetznerServer;
  databaseUrl?: string;
}> {
  Logger.info(`Setting up ${environment} infrastructure...`);

  if (environment === "production") {
    const result = await setupProductionInfrastructure(sshKeyId);
    return {
      appServer: result.appServer,
      dbServer: result.dbServer,
    };
  } else if (environment === "staging") {
    return await setupStagingInfrastructure(sshKeyId);
  } else {
    throw new Error(`Unsupported environment: ${environment}`);
  }
}

// Export environment-specific functions for direct use
export {
  // Staging exports
  
  
  
  

  // Production exports
  
  
  
  
};
