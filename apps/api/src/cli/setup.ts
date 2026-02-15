/* eslint-disable no-console */
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

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

  return { rl, ask, confirm };
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

  const { rl, ask, confirm } = createPrompt();

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

  // ─── Deployment Mode ───────────────────────────────────────────────
  section("Deployment");

  let mode = "";
  while (!mode) {
    const input = await ask(
      "Deployment mode (community/enterprise)",
      "community"
    );
    if (input === "community" || input === "enterprise") {
      mode = input;
    } else {
      console.log(c.red("    Must be 'community' or 'enterprise'"));
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

  // ─── License (Enterprise only) ────────────────────────────────────
  let licenseFilePath = "";
  let licensePublicKey = "";

  if (mode === "enterprise") {
    section("License (required for Enterprise)");

    licenseFilePath = await ask("License file path", "./qarote-license.json");

    while (!licensePublicKey) {
      licensePublicKey = await ask("License public key (single line with \\n)");
      if (!licensePublicKey) {
        console.log(
          c.red("    Required for Enterprise.") +
            c.dim(
              " Paste the single-line key from generate-license-keys (with \\n)"
            )
        );
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

  let logLevel = "";
  while (!logLevel) {
    const input = await ask("Log level (debug/info/warn/error)", "info");
    if (["debug", "info", "warn", "error"].includes(input)) {
      logLevel = input;
    } else {
      console.log(c.red("    Must be debug, info, warn, or error"));
    }
  }

  const apiUrl = await ask(
    "API URL " + c.dim("(leave empty for same-origin)"),
    ""
  );
  if (apiUrl && !/^https?:\/\/.+/.test(apiUrl)) {
    console.log(
      c.yellow("    Warning: API_URL should start with http:// or https://")
    );
  }
  const corsOrigin = await ask("CORS origin", "*");

  // ─── Email ─────────────────────────────────────────────────────────
  section("Email");

  const enableEmail = await confirm("Enable email (SMTP)?");

  let smtpHost = "";
  let smtpPort = "";
  let smtpUser = "";
  let smtpPass = "";
  let frontendUrl = "";

  if (enableEmail) {
    smtpHost = await ask("SMTP host");
    smtpPort = await ask("SMTP port", "587");
    smtpUser = await ask("SMTP user");
    smtpPass = await ask("SMTP password");
    while (!frontendUrl) {
      const input = await ask(
        "Frontend URL (for email links)",
        `http://localhost:${port}`
      );
      if (/^https?:\/\/.+/.test(input)) {
        frontendUrl = input;
      } else {
        console.log(c.red("    Must start with http:// or https://"));
      }
    }
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
    "# Environment",
    "NODE_ENV=production",
    "",
    "# Deployment",
    `DEPLOYMENT_MODE=${mode}`,
    "",
    "# Database",
    `DATABASE_URL=${dbUrl}`,
    "",
    "# Server",
    `PORT=${port}`,
    `HOST=${host}`,
    `LOG_LEVEL=${logLevel}`,
    ...(apiUrl ? [`API_URL=${apiUrl}`] : []),
    `CORS_ORIGIN=${corsOrigin}`,
    "",
    "# Security (auto-generated — do not share)",
    `JWT_SECRET=${jwtSecret}`,
    `ENCRYPTION_KEY=${encryptionKey}`,
  ];

  // License (enterprise)
  if (mode === "enterprise") {
    lines.push("", "# License (Enterprise Edition)");
    lines.push(`LICENSE_FILE_PATH=${licenseFilePath}`);
    lines.push(`LICENSE_PUBLIC_KEY="${licensePublicKey}"`);
  }

  // Email
  lines.push("", "# Email");
  lines.push(`ENABLE_EMAIL=${enableEmail}`);
  if (enableEmail) {
    lines.push(`SMTP_HOST=${smtpHost}`);
    lines.push(`SMTP_PORT=${smtpPort}`);
    lines.push(`SMTP_USER=${smtpUser}`);
    lines.push(`SMTP_PASS=${smtpPass}`);
    if (frontendUrl) {
      lines.push(`FRONTEND_URL=${frontendUrl}`);
    }
  }

  lines.push(""); // trailing newline

  writeFileSync(envPath, lines.join("\n"), { mode: 0o600 });

  // ─── Summary ───────────────────────────────────────────────────────
  console.log("");
  console.log(c.green("  ✓ .env created at ") + c.bold(envPath));
  console.log("");

  console.log(c.dim("  Configuration summary:"));
  console.log(c.dim(`    Mode:     ${mode}`));
  console.log(c.dim(`    Database: ${dbUrl.replace(/:[^@]*@/, ":***@")}`));
  console.log(c.dim(`    Port:     ${port}`));
  console.log(c.dim(`    Email:    ${enableEmail ? "enabled" : "disabled"}`));
  if (mode === "enterprise") {
    console.log(c.dim(`    License:  ${licenseFilePath}`));
  }

  console.log("");
  console.log("  Next steps:");
  console.log(`    ${c.bold("Start Qarote:")}  ./qarote`);
  console.log(`    ${c.bold("Open:")}          http://localhost:${port}`);
  console.log("");

  rl.close();
}
