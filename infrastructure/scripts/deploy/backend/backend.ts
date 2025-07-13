/**
 * Backend deployment to Dokku
 */
import fs from "node:fs/promises";
import {
  Logger,
  executeCommand,
  sshCommand,
  checkDokkuConnection,
  getAppNames,
  isRunningInCI,
  Paths,
  type Environment,
  type EnvConfig,
} from "../../utils";

/**
 * Deploy backend to Dokku
 */
export async function deployBackend(
  config: EnvConfig,
  environment: Environment
): Promise<void> {
  Logger.info("Deploying backend to Dokku...");

  const { backend: backendApp, postgres: postgresDb } =
    getAppNames(environment);

  // Check if Dokku host is accessible
  if (!(await checkDokkuConnection(config.DOKKU_HOST))) {
    Logger.error(`Cannot connect to Dokku host: ${config.DOKKU_HOST}`);
    Logger.error("Please ensure:");
    Logger.error("1. Dokku is installed on the server");
    Logger.error(
      "2. Your SSH key is properly configured for the rabbithq user"
    );
    Logger.error("3. You can connect via: ssh rabbithq@${config.DOKKU_HOST}");
    Logger.error("4. The rabbithq user has sudo access to run Dokku commands");
    process.exit(1);
  }

  // Add SSH key to dokku user for Git operations
  Logger.info("Ensuring SSH key is added to dokku user...");
  try {
    // Skip key addition in CI environment (GitHub Actions)
    if (isRunningInCI()) {
      // In CI, the SSH key is already available via ssh-agent
      Logger.info(
        "Running in CI environment with SSH agent, skipping key file operations"
      );
    } else {
      // For local development, add the key from file
      const publicKey = await fs.readFile(Paths.sshKeyPublicPath, "utf-8");

      await sshCommand(
        config.DOKKU_HOST,
        `echo '${publicKey.trim()}' | sudo dokku ssh-keys:add admin`
      );

      Logger.success("SSH key added to dokku user successfully");
    }
  } catch (error) {
    Logger.warning(
      "SSH key might already be added to dokku user, continuing..."
    );
    Logger.warning(String(error));
  }

  // Create app if it doesn't exist
  const appExistsResult = await sshCommand(
    config.DOKKU_HOST,
    `dokku apps:exists ${backendApp}`
  );
  if (appExistsResult.exitCode !== 0) {
    Logger.info(`Creating Dokku app: ${backendApp}`);
    await sshCommand(config.DOKKU_HOST, `dokku apps:create ${backendApp}`);
  }

  await setupDatabase(config, environment, backendApp, postgresDb);
  await configureEnvironment(config, backendApp, environment);
  await configureDomain(config, backendApp);
  await configureSsl(config, backendApp);
  await configureHealthChecks(config, backendApp);
  await deployCode(config, environment, backendApp);

  Logger.success("Backend deployed successfully!");
  Logger.info(`Backend URL: https://${config.DOMAIN_BACKEND}`);
  Logger.info(
    "Database migrations run automatically during deployment via app.json predeploy hook!"
  );
}

/**
 * Set up database for the application
 */
async function setupDatabase(
  config: EnvConfig,
  environment: Environment,
  backendApp: string,
  postgresDb: string
): Promise<void> {
  // For staging, link to existing database instead of creating new one
  if (environment === "staging") {
    // Check if database link exists
    const linksResult = await sshCommand(
      config.DOKKU_HOST,
      `dokku postgres:links rabbit-hq-db`
    );

    if (!linksResult.stdout.includes(backendApp)) {
      Logger.info(`Linking existing database: rabbit-hq-db`);
      await sshCommand(
        config.DOKKU_HOST,
        `dokku postgres:link rabbit-hq-db ${backendApp}`
      );
    }
  } else {
    // Production: Create dedicated database if it doesn't exist
    const dbExistsResult = await sshCommand(
      config.DOKKU_HOST,
      `dokku postgres:exists ${postgresDb}`
    );
    if (dbExistsResult.exitCode !== 0) {
      Logger.info(`Creating PostgreSQL database: ${postgresDb}`);
      await sshCommand(
        config.DOKKU_HOST,
        `dokku postgres:create ${postgresDb}`
      );
      await sshCommand(
        config.DOKKU_HOST,
        `dokku postgres:link ${postgresDb} ${backendApp}`
      );
    }
  }
}

/**
 * Configure environment variables for the application
 */
async function configureEnvironment(
  config: EnvConfig,
  backendApp: string,
  environment: Environment
): Promise<void> {
  // Configure environment variables
  Logger.info("Configuring environment variables...");

  // Get the actual database URL from Dokku
  const dbUrlResult = await sshCommand(
    config.DOKKU_HOST,
    `dokku config:get ${backendApp} DATABASE_URL`
  );

  const actualDatabaseUrl =
    dbUrlResult.exitCode === 0 && dbUrlResult.stdout.trim()
      ? dbUrlResult.stdout.trim()
      : config.DATABASE_URL;

  // Set all environment variables
  const envVars = [
    `DOKKU_HOST=${config.DOKKU_HOST}`,
    `DOMAIN_BACKEND=${config.DOMAIN_BACKEND}`,
    `DOMAIN_FRONTEND=${config.DOMAIN_FRONTEND}`,
    `PORT=${config.PORT}`,
    `HOST=${config.HOST}`,
    `NODE_ENV=${config.NODE_ENV}`,
    `NODE_TLS_REJECT_UNAUTHORIZED=${config.NODE_TLS_REJECT_UNAUTHORIZED}`,
    `ENVIRONMENT=${config.ENVIRONMENT}`,
    `LOG_LEVEL=${config.LOG_LEVEL}`,
    `JWT_SECRET=${config.JWT_SECRET}`,
    `ENCRYPTION_KEY=${config.ENCRYPTION_KEY}`,
    `DATABASE_URL=${actualDatabaseUrl}`,
    `CORS_ORIGIN=${config.CORS_ORIGIN}`,
    `FRONTEND_URL=${config.FRONTEND_URL}`,
    `RESEND_API_KEY=${config.RESEND_API_KEY}`,
    `FROM_EMAIL=${config.FROM_EMAIL}`,
    `STRIPE_SECRET_KEY=${config.STRIPE_SECRET_KEY}`,
    `STRIPE_WEBHOOK_SECRET=${config.STRIPE_WEBHOOK_SECRET}`,
    `STRIPE_DEVELOPER_MONTHLY_PRICE_ID=${config.STRIPE_DEVELOPER_MONTHLY_PRICE_ID}`,
    `STRIPE_DEVELOPER_YEARLY_PRICE_ID=${config.STRIPE_DEVELOPER_YEARLY_PRICE_ID}`,
    `STRIPE_STARTUP_MONTHLY_PRICE_ID=${config.STRIPE_STARTUP_MONTHLY_PRICE_ID}`,
    `STRIPE_STARTUP_YEARLY_PRICE_ID=${config.STRIPE_STARTUP_YEARLY_PRICE_ID}`,
    `STRIPE_BUSINESS_MONTHLY_PRICE_ID=${config.STRIPE_BUSINESS_MONTHLY_PRICE_ID}`,
    `STRIPE_BUSINESS_YEARLY_PRICE_ID=${config.STRIPE_BUSINESS_YEARLY_PRICE_ID}`,
    `SENTRY_DSN=${config.SENTRY_DSN}`,
    `SENTRY_ENABLED=${config.SENTRY_ENABLED}`,
  ];

  await sshCommand(
    config.DOKKU_HOST,
    `dokku config:set ${backendApp} ${envVars.join(" ")}`
  );
}

/**
 * Configure domain for the application
 */
async function configureDomain(
  config: EnvConfig,
  backendApp: string
): Promise<void> {
  // Check if domain is already configured
  Logger.info(`Checking domain configuration...`);
  const domainResult = await sshCommand(
    config.DOKKU_HOST,
    `dokku domains:report ${backendApp} | grep -q "${config.DOMAIN_BACKEND}" || echo "domain-not-found"`
  );

  if (domainResult.stdout.includes("domain-not-found")) {
    // Set domain
    Logger.info(`Configuring domain: ${config.DOMAIN_BACKEND}`);
    await sshCommand(
      config.DOKKU_HOST,
      `dokku domains:set ${backendApp} ${config.DOMAIN_BACKEND}`
    );
  } else {
    Logger.info(
      `Domain ${config.DOMAIN_BACKEND} already configured, skipping setup`
    );
  }
}

/**
 * Configure SSL for the application
 */
async function configureSsl(
  config: EnvConfig,
  backendApp: string
): Promise<void> {
  // Check if Let's Encrypt is already configured
  Logger.info("Checking SSL certificate status...");
  const sslStatusResult = await sshCommand(
    config.DOKKU_HOST,
    `dokku letsencrypt:list | grep -q "${backendApp}" || echo "not-found"`
  );

  if (sslStatusResult.stdout.includes("not-found")) {
    Logger.info("Setting email for Let's Encrypt...");
    await sshCommand(
      config.DOKKU_HOST,
      `dokku letsencrypt:set ${backendApp} email tessierhuort@gmail.com`
    );

    // Configure Let's Encrypt SSL
    Logger.info("Setting up SSL certificate (first time)...");
    await sshCommand(
      config.DOKKU_HOST,
      `dokku letsencrypt:enable ${backendApp}`
    );

    Logger.info("Adding automatic SSL certificate renewal cron job...");
    await sshCommand(config.DOKKU_HOST, `dokku letsencrypt:cron-job --add`);
  } else {
    Logger.info("SSL certificate already configured, skipping setup");
  }
}

/**
 * Configure health checks for the application
 */
async function configureHealthChecks(
  config: EnvConfig,
  backendApp: string
): Promise<void> {
  // Configure health checks before deployment
  Logger.info("Configuring health checks for zero-downtime deployment...");
  await sshCommand(
    config.DOKKU_HOST,
    `dokku checks:set ${backendApp} web /health`
  );

  // Configure health check timeouts and parameters
  const healthCheckVars = [
    "DOKKU_CHECKS_WAIT=10", // Wait 10 seconds before first check
    "DOKKU_CHECKS_TIMEOUT=10", // 10 second timeout per check
    "DOKKU_CHECKS_ATTEMPTS=5", // Try 5 times before giving up
    "DOKKU_WAIT_TO_RETIRE=60", // Wait 60 seconds before retiring old container
  ];

  await sshCommand(
    config.DOKKU_HOST,
    `dokku config:set ${backendApp} ${healthCheckVars.join(" ")}`
  );
}

/**
 * Deploy code to Dokku
 */
async function deployCode(
  config: EnvConfig,
  environment: Environment,
  backendApp: string
): Promise<void> {
  // Deploy the app using regular git push from back-end directory
  Logger.info("Deploying backend application...");

  Logger.info("Checking if Dokku remote exists...");
  const remoteCheckResult = await executeCommand("git", [
    "remote",
    "get-url",
    `dokku-${environment}`,
  ]);

  const expectedRemoteUrl = `dokku@${config.DOKKU_HOST}:${backendApp}`;

  if (remoteCheckResult.exitCode !== 0) {
    Logger.info(`Adding Dokku remote: dokku-${environment}`);
    await executeCommand("git", [
      "remote",
      "add",
      `dokku-${environment}`,
      expectedRemoteUrl,
    ]);
  } else {
    // Check if the remote URL is correct
    const currentRemoteUrl = remoteCheckResult.stdout.trim();
    if (currentRemoteUrl !== expectedRemoteUrl) {
      Logger.info(
        `Updating Dokku remote URL from ${currentRemoteUrl} to ${expectedRemoteUrl}`
      );
      await executeCommand("git", [
        "remote",
        "set-url",
        `dokku-${environment}`,
        expectedRemoteUrl,
      ]);
    }
  }

  Logger.info("Dokku remote configured successfully");

  // Configure Git SSH command based on environment
  let gitEnv = { ...process.env };

  if (!isRunningInCI()) {
    // For local development, use the specific key file
    gitEnv.GIT_SSH_COMMAND = `ssh -i ${Paths.sshKeyPath} -o StrictHostKeyChecking=no`;
    Logger.info("Using local SSH key for Git operations");
  } else {
    // In CI, use the SSH agent that's already configured
    gitEnv.GIT_SSH_COMMAND = `ssh -o StrictHostKeyChecking=no`;
    Logger.info("Using SSH agent for Git operations (CI environment)");
  }

  const pushResult = await executeCommand(
    "git",
    ["push", `dokku-${environment}`, "main:master", "--force"],
    {
      stdio: "inherit",
      env: gitEnv,
    }
  );

  console.log(pushResult);

  if (pushResult.exitCode !== 0) {
    throw new Error("Failed to deploy backend application");
  }

  Logger.info("Backend application deployed successfully!");
}
