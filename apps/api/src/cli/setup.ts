/* eslint-disable no-console */
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";

// Colors (disabled if not a terminal)
const isTTY = process.stdout.isTTY;
const c = {
  green: (s: string) => (isTTY ? `\x1b[32m${s}\x1b[0m` : s),
  red: (s: string) => (isTTY ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s: string) => (isTTY ? `\x1b[33m${s}\x1b[0m` : s),
  bold: (s: string) => (isTTY ? `\x1b[1m${s}\x1b[0m` : s),
  dim: (s: string) => (isTTY ? `\x1b[2m${s}\x1b[0m` : s),
};

function createPrompt() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const ask = (question: string, defaultValue?: string): Promise<string> =>
    new Promise((resolve) => {
      const suffix = defaultValue ? ` ${c.dim(`[${defaultValue}]`)}` : "";
      rl.question(`  ${question}${suffix}: `, (answer) => {
        resolve(answer.trim() || defaultValue || "");
      });
    });

  const confirm = (question: string, defaultYes = false): Promise<boolean> =>
    new Promise((resolve) => {
      const hint = defaultYes ? "Y/n" : "y/N";
      rl.question(`  ${question} (${hint}): `, (answer) => {
        const a = answer.trim().toLowerCase();
        resolve(a === "" ? defaultYes : a === "y" || a === "yes");
      });
    });

  /** Prompt for sensitive input without echoing to the terminal. */
  const askSecret = (question: string): Promise<string> =>
    new Promise((resolve) => {
      rl.pause();
      const mutedOutput = new Writable({ write: (_c, _e, cb) => cb() });
      const secretRl = createInterface({
        input: process.stdin,
        output: mutedOutput,
        terminal: true,
      });
      process.stdout.write(`  ${question}: `);
      secretRl.question("", (answer) => {
        secretRl.close();
        process.stdout.write("\n");
        rl.resume();
        resolve(answer.trim());
      });
    });

  return { rl, ask, confirm, askSecret };
}

async function testDatabaseConnection(
  url: string
): Promise<{ ok: true; version: string } | { ok: false; error: string }> {
  let pool;
  try {
    const pg = await import("pg");
    const Pool = pg.default?.Pool || pg.Pool;
    pool = new Pool({
      connectionString: url,
      connectionTimeoutMillis: 5000,
    });
    const result = await pool.query("SELECT version()");
    const version = result.rows[0]?.version || "unknown";
    const short = version.match(/PostgreSQL [\d.]+/)?.[0] || version;
    return { ok: true, version: short };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown connection error";
    return { ok: false, error: message };
  } finally {
    await pool?.end();
  }
}

function section(title: string) {
  console.log("");
  console.log(c.bold(`  ${title}`));
  console.log(c.dim(`  ${"─".repeat(title.length)}`));
}

export async function runSetup(): Promise<void> {
  if (!process.stdin.isTTY) {
    console.error(
      "Interactive setup requires a terminal. Run with: ./qarote setup"
    );
    console.error(
      "For non-interactive setup, create a .env file manually — see docs."
    );
    process.exit(1);
  }

  const { rl, ask, confirm, askSecret } = createPrompt();

  console.log("");
  console.log(c.bold("  Qarote Setup"));
  console.log(c.dim("  ============"));
  console.log(
    c.dim("  Press Enter to accept defaults, or type a value to override.")
  );

  // Check for existing .env
  const envPath = join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    const overwrite = await confirm(
      c.yellow(".env already exists. Overwrite?")
    );
    if (!overwrite) {
      console.log("\n  Aborted.\n");
      rl.close();
      process.exit(0);
    }
  }

  // ─── Database ──────────────────────────────────────────────────────
  section("Database");

  let dbUrl = "";
  while (!dbUrl) {
    const input = await ask("PostgreSQL URL");
    if (!input) {
      console.log(
        c.red("    Required.") +
          c.dim(" Example: postgresql://user:pass@localhost:5432/qarote")
      );
      continue;
    }

    process.stdout.write("  Testing connection... ");
    const result = await testDatabaseConnection(input);
    if (result.ok) {
      console.log(c.green(`✓ Connected (${result.version})`));
      dbUrl = input;
    } else {
      console.log(c.red("✗ Failed"));
      console.log(c.dim(`    ${result.error}`));
      const retry = await confirm("Try a different URL?", true);
      if (!retry) {
        console.log("\n  Aborted.\n");
        rl.close();
        process.exit(1);
      }
    }
  }

  // ─── Server ────────────────────────────────────────────────────────
  section("Server");

  let port = "";
  while (!port) {
    const input = await ask("Port", "3000");
    const n = Number(input);
    if (Number.isInteger(n) && n > 0 && n <= 65535) {
      port = input;
    } else {
      console.log(c.red("    Must be an integer between 1 and 65535"));
    }
  }
  const host = await ask("Host", "0.0.0.0");

  // ─── Email ─────────────────────────────────────────────────────────
  section("Email");

  const enableEmail = await confirm("Enable email (SMTP)?");

  let smtpHost = "";
  let smtpPort = "";
  let smtpUser = "";
  let smtpPass = "";

  if (enableEmail) {
    smtpHost = await ask("SMTP host");
    smtpPort = await ask("SMTP port", "587");
    smtpUser = await ask("SMTP user");
    smtpPass = await ask("SMTP password");
  }

  // ─── Admin Account ───────────────────────────────────────────────
  section("Admin Account");

  const createAdmin = await confirm(
    "Create an admin account during first boot?",
    true
  );

  let adminEmail = "";
  let adminPassword = "";

  if (createAdmin) {
    while (!adminEmail) {
      const input = await ask("Admin email");
      if (!input) {
        console.log(
          c.red("    Required.") + c.dim(" Example: admin@example.com")
        );
        continue;
      }
      if (!input.includes("@") || !input.includes(".")) {
        console.log(c.red("    Please enter a valid email address."));
        continue;
      }
      adminEmail = input;
    }

    while (!adminPassword) {
      const input = await askSecret("Admin password");
      if (!input || input.length < 8) {
        console.log(c.red("    Must be at least 8 characters."));
        continue;
      }
      const confirm2 = await askSecret("Confirm admin password");
      if (input !== confirm2) {
        console.log(c.red("    Passwords do not match. Try again."));
        continue;
      }
      adminPassword = input;
    }
  }

  // ─── Registration ───────────────────────────────────────────────
  section("Registration");

  let enableRegistration = await confirm(
    "Allow public user registration?",
    true
  );

  if (!createAdmin && !enableRegistration) {
    console.log(
      c.red(
        "    You must enable registration or create an admin account for first boot."
      )
    );
    enableRegistration = true;
    console.log(c.yellow("    Registration has been enabled automatically."));
  }

  // ─── SSO ────────────────────────────────────────────────────────────
  section("SSO (Single Sign-On)");

  const enableSso = await confirm("Enable SSO authentication?");

  let ssoType = "oidc";
  let ssoOidcDiscoveryUrl = "";
  let ssoOidcClientId = "";
  let ssoOidcClientSecret = "";
  let ssoSamlMetadataUrl = "";
  let apiUrl = "";
  let frontendUrl = "";
  let ssoTenant = "default";
  let ssoProduct = "qarote";
  let ssoButtonLabel = "Sign in with SSO";

  if (enableSso) {
    ssoType = await ask("SSO type (oidc/saml)", "oidc");
    while (ssoType !== "oidc" && ssoType !== "saml") {
      console.log(c.red("    Must be 'oidc' or 'saml'"));
      ssoType = await ask("SSO type (oidc/saml)", "oidc");
    }

    if (ssoType === "oidc") {
      while (!ssoOidcDiscoveryUrl) {
        ssoOidcDiscoveryUrl = await ask("OIDC discovery URL");
        if (!ssoOidcDiscoveryUrl) {
          console.log(
            c.red("    Required.") +
              c.dim(
                " Example: http://localhost:8180/realms/qarote/.well-known/openid-configuration"
              )
          );
        }
      }
      while (!ssoOidcClientId) {
        ssoOidcClientId = await ask("OIDC client ID");
        if (!ssoOidcClientId) {
          console.log(c.red("    Required.") + c.dim(" Example: qarote"));
        }
      }
      while (!ssoOidcClientSecret) {
        ssoOidcClientSecret = await askSecret("OIDC client secret");
        if (!ssoOidcClientSecret) {
          console.log(c.red("    Required."));
        }
      }
    } else {
      while (!ssoSamlMetadataUrl) {
        ssoSamlMetadataUrl = await ask("SAML metadata URL");
        if (!ssoSamlMetadataUrl) {
          console.log(
            c.red("    Required.") +
              c.dim(" Example: https://your-idp.com/metadata.xml")
          );
        }
      }
    }

    // URLs for SSO callbacks — default based on port
    apiUrl = await ask("Backend API URL", `http://localhost:${port}`);
    frontendUrl = await ask("Frontend URL", "http://localhost:8080");
    ssoTenant = await ask("SSO tenant", "default");
    ssoProduct = await ask("SSO product", "qarote");
    ssoButtonLabel = await ask("SSO button label", "Sign in with SSO");
  }

  // ─── Generate secrets ──────────────────────────────────────────────
  section("Security");

  process.stdout.write("  Generating secure secrets... ");
  const jwtSecret = randomBytes(64).toString("hex");
  const encryptionKey = randomBytes(64).toString("hex");
  console.log(c.green("done"));

  // ─── Write .env ────────────────────────────────────────────────────
  const lines: string[] = [
    "# Generated by: qarote setup",
    `# ${new Date().toISOString()}`,
    "",
    "# Database",
    `DATABASE_URL=${dbUrl}`,
    "",
    "# Server",
    `PORT=${port}`,
    `HOST=${host}`,
    "",
    "# Security (auto-generated — do not share)",
    `JWT_SECRET=${jwtSecret}`,
    `ENCRYPTION_KEY=${encryptionKey}`,
  ];

  // Email
  lines.push("", "# Email");
  lines.push(`ENABLE_EMAIL=${enableEmail}`);
  if (enableEmail) {
    lines.push(`SMTP_HOST=${smtpHost}`);
    lines.push(`SMTP_PORT=${smtpPort}`);
    lines.push(`SMTP_USER=${smtpUser}`);
    lines.push(`SMTP_PASS=${smtpPass}`);
  }

  // Registration
  lines.push("", "# Registration");
  lines.push(`ENABLE_REGISTRATION=${enableRegistration}`);

  // SSO
  if (enableSso) {
    lines.push("", "# SSO");
    lines.push(`SSO_ENABLED=true`);
    lines.push(`SSO_TYPE=${ssoType}`);
    if (ssoType === "oidc") {
      lines.push(`SSO_OIDC_DISCOVERY_URL=${ssoOidcDiscoveryUrl}`);
      lines.push(`SSO_OIDC_CLIENT_ID=${ssoOidcClientId}`);
      lines.push(`SSO_OIDC_CLIENT_SECRET=${ssoOidcClientSecret}`);
    } else {
      lines.push(`SSO_SAML_METADATA_URL=${ssoSamlMetadataUrl}`);
    }
    lines.push(`API_URL=${apiUrl}`);
    lines.push(`FRONTEND_URL=${frontendUrl}`);
    lines.push(`SSO_TENANT=${ssoTenant}`);
    lines.push(`SSO_PRODUCT=${ssoProduct}`);
    lines.push(`SSO_BUTTON_LABEL=${ssoButtonLabel}`);
  }

  // Admin bootstrap
  if (adminEmail && adminPassword) {
    lines.push("", "# Admin (auto-removed after first boot)");
    const escapeEnvValue = (v: string) =>
      `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    lines.push(`ADMIN_EMAIL=${escapeEnvValue(adminEmail)}`);
    lines.push(`ADMIN_PASSWORD=${escapeEnvValue(adminPassword)}`);
  }

  lines.push(""); // trailing newline

  writeFileSync(envPath, lines.join("\n"), { mode: 0o600 });

  // ─── Summary ───────────────────────────────────────────────────────
  console.log("");
  console.log(c.green("  ✓ .env created at ") + c.bold(envPath));
  console.log("");

  console.log(c.dim("  Configuration summary:"));
  console.log(c.dim(`    Database:     ${dbUrl.replace(/:[^@]*@/, ":***@")}`));
  console.log(c.dim(`    Port:         ${port}`));
  console.log(
    c.dim(`    Email:        ${enableEmail ? "enabled" : "disabled"}`)
  );
  console.log(
    c.dim(
      `    Admin:        ${adminEmail ? adminEmail : "none (register via web)"}`
    )
  );
  console.log(
    c.dim(
      `    Registration: ${enableRegistration ? "open" : "invitation-only"}`
    )
  );
  console.log(
    c.dim(
      `    SSO:          ${enableSso ? `enabled (${ssoType})` : "disabled"}`
    )
  );
  console.log("");
  console.log("  Next steps:");
  console.log(`    ${c.bold("Start Qarote:")}  ./qarote`);
  console.log(`    ${c.bold("Open:")}          http://localhost:${port}`);
  console.log("");

  rl.close();
}
