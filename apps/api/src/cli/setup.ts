/* eslint-disable no-console */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

import dotenv from "dotenv";

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
  const askSecret = (
    question: string,
    defaultValue?: string
  ): Promise<string> =>
    new Promise((resolve) => {
      rl.pause();
      const suffix = defaultValue ? ` ${c.dim(`[${defaultValue}]`)}` : "";
      process.stdout.write(`  ${question}${suffix}: `);
      const input = process.stdin;
      const wasRaw = input.isRaw;
      input.setRawMode(true);
      input.resume();
      let value = "";
      const onData = (buf: Buffer) => {
        const ch = buf.toString("utf8");
        if (ch === "\r" || ch === "\n") {
          input.removeListener("data", onData);
          input.setRawMode(wasRaw);
          process.stdout.write("\n");
          rl.resume();
          resolve(value.trim() || defaultValue || "");
          return;
        }
        if (ch === "\u0003") {
          process.stdout.write("\n");
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1);
          return;
        }
        if (ch.charCodeAt(0) < 32) return;
        value += ch;
      };
      input.on("data", onData);
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

  // Load existing .env values as defaults (if present)
  const envPath = join(process.cwd(), ".env");
  const prev: Record<string, string> = existsSync(envPath)
    ? dotenv.parse(readFileSync(envPath, "utf-8"))
    : {};

  if (Object.keys(prev).length > 0) {
    console.log(
      c.dim("  Existing .env found — current values shown as defaults.")
    );
  }

  const envBool = (key: string): boolean | undefined => {
    const v = prev[key]?.toLowerCase();
    if (v === undefined) return undefined;
    if (["true", "1", "yes", "y"].includes(v)) return true;
    if (["false", "0", "no", "n"].includes(v)) return false;
    return undefined;
  };

  // ─── Database ──────────────────────────────────────────────────────
  section("Database");

  let dbUrl = "";
  while (!dbUrl) {
    const input = await ask("PostgreSQL URL", prev.DATABASE_URL);
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
    const input = await ask("Port", prev.PORT || "3000");
    const n = Number(input);
    if (Number.isInteger(n) && n > 0 && n <= 65535) {
      port = input;
    } else {
      console.log(c.red("    Must be an integer between 1 and 65535"));
    }
  }
  const host = await ask("Host", prev.HOST || "0.0.0.0");

  // ─── Email ─────────────────────────────────────────────────────────
  section("Email");

  const enableEmail = await confirm(
    "Enable email (SMTP)?",
    envBool("ENABLE_EMAIL") ?? false
  );

  let smtpHost = "";
  let smtpPort = "";
  let smtpUser = "";
  let smtpPass = "";
  let fromEmail = "";
  let smtpService = "";
  let smtpOauthClientId = "";
  let smtpOauthClientSecret = "";
  let smtpOauthRefreshToken = "";

  if (enableEmail) {
    while (!smtpHost) {
      smtpHost = await ask("SMTP host", prev.SMTP_HOST);
      if (!smtpHost) {
        console.log(c.red("    Required.") + c.dim(" Example: smtp.gmail.com"));
      }
    }
    smtpPort = await ask("SMTP port", prev.SMTP_PORT || "587");
    fromEmail = await ask(
      "From email address",
      prev.FROM_EMAIL || "noreply@localhost"
    );
    smtpUser = await ask("SMTP user", prev.SMTP_USER);
    smtpPass = await askSecret(
      "SMTP password",
      prev.SMTP_PASS ? "••••••••" : undefined
    );
    if (smtpPass === "••••••••") {
      smtpPass = prev.SMTP_PASS;
    }

    const hadOAuth2 = !!prev.SMTP_OAUTH_CLIENT_ID;
    const useOAuth2 = await confirm(
      "Configure OAuth2 authentication?",
      hadOAuth2
    );
    if (useOAuth2) {
      // OAuth2 requires a user (email address of the account to send from)
      while (!smtpUser) {
        smtpUser = await ask("SMTP user (required for OAuth2)", prev.SMTP_USER);
        if (!smtpUser) {
          console.log(c.red("    Required for OAuth2 authentication."));
        }
      }
      smtpService = await ask(
        "SMTP service (e.g. gmail, outlook)",
        prev.SMTP_SERVICE || ""
      );
      while (!smtpOauthClientId) {
        smtpOauthClientId = await ask(
          "OAuth2 Client ID",
          prev.SMTP_OAUTH_CLIENT_ID
        );
        if (!smtpOauthClientId) {
          console.log(c.red("    Required."));
        }
      }
      while (!smtpOauthClientSecret) {
        smtpOauthClientSecret = await askSecret(
          "OAuth2 Client Secret",
          prev.SMTP_OAUTH_CLIENT_SECRET ? "••••••••" : undefined
        );
        if (smtpOauthClientSecret === "••••••••") {
          smtpOauthClientSecret = prev.SMTP_OAUTH_CLIENT_SECRET;
        }
        if (!smtpOauthClientSecret) {
          console.log(c.red("    Required."));
        }
      }
      while (!smtpOauthRefreshToken) {
        smtpOauthRefreshToken = await askSecret(
          "OAuth2 Refresh Token",
          prev.SMTP_OAUTH_REFRESH_TOKEN ? "••••••••" : undefined
        );
        if (smtpOauthRefreshToken === "••••••••") {
          smtpOauthRefreshToken = prev.SMTP_OAUTH_REFRESH_TOKEN;
        }
        if (!smtpOauthRefreshToken) {
          console.log(c.red("    Required."));
        }
      }
    }
  }

  // ─── Admin Account ───────────────────────────────────────────────
  section("Admin Account");

  const promptAdminCredentials = async (): Promise<{
    email: string;
    password: string;
  }> => {
    let email = "";
    while (!email) {
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
      email = input;
    }

    let password = "";
    while (!password) {
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
      password = input;
    }

    return { email, password };
  };

  const hadAdmin = !!prev.ADMIN_EMAIL;
  let adminEmail = "";
  let adminPassword = "";

  if (hadAdmin) {
    const keepAdmin = await confirm(
      `Keep existing admin account (${prev.ADMIN_EMAIL})?`,
      true
    );
    if (keepAdmin) {
      adminEmail = prev.ADMIN_EMAIL;
      adminPassword = prev.ADMIN_PASSWORD;
    } else {
      const createAdmin = await confirm(
        "Create a different admin account?",
        true
      );
      if (createAdmin) {
        const creds = await promptAdminCredentials();
        adminEmail = creds.email;
        adminPassword = creds.password;
      }
    }
  } else {
    const createAdmin = await confirm(
      "Create an admin account during first boot?",
      true
    );
    if (createAdmin) {
      const creds = await promptAdminCredentials();
      adminEmail = creds.email;
      adminPassword = creds.password;
    }
  }

  // ─── Registration ───────────────────────────────────────────────
  section("Registration");

  const regDefault = envBool("ENABLE_REGISTRATION") ?? true;
  let enableRegistration = await confirm(
    "Allow public user registration?",
    regDefault
  );

  if (!adminEmail && !enableRegistration) {
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

  const enableSso = await confirm(
    "Enable SSO authentication?",
    envBool("SSO_ENABLED") ?? false
  );

  let ssoType = "oidc";
  let ssoOidcDiscoveryUrl = "";
  let ssoOidcClientId = "";
  let ssoOidcClientSecret = "";
  let ssoSamlMetadataUrl = "";
  let apiUrl = "";
  let frontendUrl = "";
  let ssoButtonLabel = "Sign in with SSO";

  if (enableSso) {
    ssoType = await ask("SSO type (oidc/saml)", prev.SSO_TYPE || "oidc");
    while (ssoType !== "oidc" && ssoType !== "saml") {
      console.log(c.red("    Must be 'oidc' or 'saml'"));
      ssoType = await ask("SSO type (oidc/saml)", prev.SSO_TYPE || "oidc");
    }

    if (ssoType === "oidc") {
      while (!ssoOidcDiscoveryUrl) {
        ssoOidcDiscoveryUrl = await ask(
          "OIDC discovery URL",
          prev.SSO_OIDC_DISCOVERY_URL
        );
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
        ssoOidcClientId = await ask("OIDC client ID", prev.SSO_OIDC_CLIENT_ID);
        if (!ssoOidcClientId) {
          console.log(c.red("    Required.") + c.dim(" Example: qarote"));
        }
      }
      while (!ssoOidcClientSecret) {
        ssoOidcClientSecret = await askSecret(
          "OIDC client secret",
          prev.SSO_OIDC_CLIENT_SECRET ? "••••••••" : undefined
        );
        if (ssoOidcClientSecret === "••••••••") {
          ssoOidcClientSecret = prev.SSO_OIDC_CLIENT_SECRET;
        }
        if (!ssoOidcClientSecret) {
          console.log(c.red("    Required."));
        }
      }
    } else {
      while (!ssoSamlMetadataUrl) {
        ssoSamlMetadataUrl = await ask(
          "SAML metadata URL",
          prev.SSO_SAML_METADATA_URL
        );
        if (!ssoSamlMetadataUrl) {
          console.log(
            c.red("    Required.") +
              c.dim(" Example: https://your-idp.com/metadata.xml")
          );
        }
      }
    }

    // URLs for SSO callbacks — default based on port
    apiUrl = await ask(
      "Backend API URL",
      prev.API_URL || `http://localhost:${port}`
    );
    frontendUrl = await ask(
      "Frontend URL",
      prev.FRONTEND_URL || `http://localhost:${port}`
    );
    ssoButtonLabel = await ask(
      "SSO button label",
      prev.SSO_BUTTON_LABEL || "Sign in with SSO"
    );
  }

  // ─── Security secrets ─────────────────────────────────────────────
  section("Security");

  const jwtSecret = prev.JWT_SECRET || randomBytes(64).toString("hex");
  const encryptionKey = prev.ENCRYPTION_KEY || randomBytes(64).toString("hex");

  if (prev.JWT_SECRET && prev.ENCRYPTION_KEY) {
    console.log(c.green("  Preserved existing secrets."));
  } else {
    console.log(c.green("  Generated new secrets."));
  }

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

  // Helper: quote/escape a value for safe dotenv parsing
  const escapeEnvValue = (v: string) =>
    `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

  // Email
  lines.push("", "# Email");
  lines.push(`ENABLE_EMAIL=${enableEmail}`);
  if (enableEmail) {
    lines.push(`FROM_EMAIL=${escapeEnvValue(fromEmail)}`);
    lines.push(`SMTP_HOST=${smtpHost}`);
    lines.push(`SMTP_PORT=${smtpPort}`);
    lines.push(`SMTP_USER=${smtpUser}`);
    lines.push(`SMTP_PASS=${escapeEnvValue(smtpPass)}`);
    if (smtpOauthClientId) {
      if (smtpService) lines.push(`SMTP_SERVICE=${smtpService}`);
      lines.push(`SMTP_OAUTH_CLIENT_ID=${escapeEnvValue(smtpOauthClientId)}`);
      lines.push(
        `SMTP_OAUTH_CLIENT_SECRET=${escapeEnvValue(smtpOauthClientSecret)}`
      );
      lines.push(
        `SMTP_OAUTH_REFRESH_TOKEN=${escapeEnvValue(smtpOauthRefreshToken)}`
      );
    }
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
      lines.push(
        `SSO_OIDC_DISCOVERY_URL=${escapeEnvValue(ssoOidcDiscoveryUrl)}`
      );
      lines.push(`SSO_OIDC_CLIENT_ID=${escapeEnvValue(ssoOidcClientId)}`);
      lines.push(
        `SSO_OIDC_CLIENT_SECRET=${escapeEnvValue(ssoOidcClientSecret)}`
      );
    } else {
      lines.push(`SSO_SAML_METADATA_URL=${escapeEnvValue(ssoSamlMetadataUrl)}`);
    }
    lines.push(`API_URL=${escapeEnvValue(apiUrl)}`);
    lines.push(`FRONTEND_URL=${escapeEnvValue(frontendUrl)}`);
    lines.push(`SSO_BUTTON_LABEL=${escapeEnvValue(ssoButtonLabel)}`);
  }

  // Admin bootstrap
  if (adminEmail && adminPassword) {
    lines.push("", "# Admin (auto-removed after first boot)");
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
    c.dim(
      `    Email:        ${enableEmail ? `enabled (${fromEmail})` : "disabled"}`
    )
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
