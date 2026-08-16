import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * ADR-004 §7 invariant: no query against a hot, `serverId`-sharded hypertable
 * may span multiple `serverId`s in one statement (`serverId: { in: [...] }`).
 * Such reads must **fan out per server** so they stay routable to a single
 * shard once the hot tables shard by `serverId`. Control-plane tables (e.g.
 * `queue`) are exempt — they stay on the primary.
 *
 * This is a source-scan guard rather than a runtime test: the offending
 * pattern (`digest.service.ts` before #250) threw no error, it just would not
 * shard. We catch it statically so it can't creep back in.
 */
const HOT_MODELS = ["queueMetricSnapshot", "messageTraceEvent"] as const;

const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set(["__tests__", "generated", "node_modules"]);

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name))
        out.push(...collectTsFiles(join(dir, entry.name)));
    } else if (
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".spec.ts")
    ) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

// Strip block + line comments so an explanatory comment mentioning the pattern
// (e.g. "never serverId: { in: [...] }") is not flagged.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("hot-table serverId invariant (ADR-004 §7)", () => {
  it("no hot-table query filters serverId with `{ in: … }` — must fan out per server", () => {
    const offenders: string[] = [];

    for (const file of collectTsFiles(SRC_ROOT)) {
      const code = stripComments(readFileSync(file, "utf8"));
      for (const model of HOT_MODELS) {
        // `prisma.<hotModel>.<method>({ … serverId: { in … })` within a bounded
        // window (a single query's argument), across newlines.
        const re = new RegExp(
          `prisma\\.${model}\\.\\w+\\s*\\(\\s*\\{[\\s\\S]{0,600}?serverId:\\s*\\{\\s*in\\b`,
          "g"
        );
        if (re.test(code)) {
          offenders.push(
            `${file.replace(SRC_ROOT, "src")} → prisma.${model} … serverId: { in`
          );
        }
      }
    }

    expect(
      offenders,
      `Hot-table queries must fan out per serverId, not use \`serverId: { in }\` (ADR-004 §7).\nOffenders:\n${offenders.join("\n")}`
    ).toEqual([]);
  });
});
