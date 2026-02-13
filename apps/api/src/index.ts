// Subcommand routing — must run before any config/dotenv imports
if (process.argv[2] === "setup") {
  const { runSetup } = await import("./cli/setup.js");
  await runSetup();
  process.exit(0);
}

import { parseArgs } from "node:util";

// CLI argument parsing — overrides env vars for binary mode.
// read process.env at module evaluation time (import-time side effects).
const { values: cliArgs } = parseArgs({
  options: {
    port: { type: "string", short: "p" },
    host: { type: "string", short: "h" },
    "database-url": { type: "string" },
  },
  strict: false,
});
if (typeof cliArgs["database-url"] === "string")
  process.env.DATABASE_URL = cliArgs["database-url"];
if (typeof cliArgs.port === "string") process.env.PORT = cliArgs.port;
if (typeof cliArgs.host === "string") process.env.HOST = cliArgs.host;

// Dynamic import — ensures env vars are set before config/prisma modules load
await import("./server.js");
