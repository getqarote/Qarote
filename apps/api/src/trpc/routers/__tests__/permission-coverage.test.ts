/**
 * Structural completeness test (RBAC Phase 2 PR-B).
 *
 * Walks every router source file and asserts each procedure is gated by
 * one of:
 *   - workspacePermissionProcedure(<key>)
 *   - workspacePermissionPlanValidationProcedure(<key>)
 *   - rateLimitedProcedure / publicProcedure (auth-only or unauth surface)
 *   - workspaceProcedure (only the explicitly allowlisted entries below)
 *
 * The ESLint gate (apps/api/eslint.config.cjs) catches *role-literal
 * comparisons*, but it cannot detect a procedure that simply forgot to
 * upgrade from bare `workspaceProcedure`. This test fills that gap by
 * parsing the source and matching every leaf assignment.
 *
 * To add a procedure that legitimately uses bare `workspaceProcedure`
 * (e.g. user-self-scoped state with no domain-level permission), add it
 * to PERMISSION_EXEMPT_PROCEDURES below with a one-line justification.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const ROUTER_DIRS = [
  join(REPO_ROOT, "src", "trpc", "routers"),
  join(REPO_ROOT, "src", "ee", "trpc", "routers"),
  join(REPO_ROOT, "src", "ee", "routers"),
];

/**
 * Procedures that may legitimately use bare `workspaceProcedure` without
 * a permission key. Each entry is `<file path relative to apps/api>:<procedure name>`.
 *
 * Add an entry only with a written justification — the default is "every
 * procedure is gated by a permission key".
 */
const PERMISSION_EXEMPT_PROCEDURES: ReadonlyMap<string, string> = new Map([
  // Returns the caller's own role for the resolved workspace. The data is
  // self-scoped — any member of the workspace can read their own role.
  ["src/trpc/routers/workspace/core.ts:getMyRole", "self-scoped read"],
  // Sets the caller's active workspace pointer (per-user state). The
  // caller must be a member of the target workspace, which workspaceProcedure
  // already enforces. No domain-level permission decision.
  ["src/trpc/routers/workspace/management.ts:switch", "per-user state"],
]);

/**
 * Procedure bases that don't require a permission key:
 * - rateLimitedProcedure / publicProcedure: auth-only or unauth surfaces
 *   (login, signup, etc.)
 * - protectedProcedure: authenticated but workspace-agnostic
 * - orgScopedProcedure / orgAdminProcedure / billing*: org-level, gated
 *   separately by org role
 * - planValidationProcedure: org-level plan check
 * - rateLimitedAdminProcedure / strictRateLimitedAdminProcedure /
 *   billingRateLimitedAdminProcedure: platform-staff features (feedback,
 *   selfhosted-*) — kept until staffSupportProcedure ships
 * - rateLimitedPublicProcedure: public auth flows
 * - rateLimitedOrgProcedure / strictRateLimitedOrgProcedure /
 *   rateLimitedOrgAdminProcedure / strictRateLimitedOrgAdminProcedure /
 *   billingRateLimitedOrgAdminProcedure: org-scoped variants
 */
const NON_WORKSPACE_PROCEDURE_BASES = new Set([
  "rateLimitedProcedure",
  "rateLimitedPublicProcedure",
  "publicProcedure",
  "protectedProcedure",
  "orgScopedProcedure",
  "orgAdminProcedure",
  "rateLimitedOrgProcedure",
  "strictRateLimitedOrgProcedure",
  "rateLimitedOrgAdminProcedure",
  "strictRateLimitedOrgAdminProcedure",
  "billingRateLimitedOrgAdminProcedure",
  "rateLimitedAdminProcedure",
  "strictRateLimitedAdminProcedure",
  "billingRateLimitedAdminProcedure",
  "strictRateLimitedProcedure",
  "planValidationProcedure",
]);

const WORKSPACE_PERMISSION_BASES = new Set([
  "workspacePermissionProcedure",
  "workspacePermissionPlanValidationProcedure",
]);

/**
 * Files to skip — platform-staff routers explicitly carved out in
 * apps/api/eslint.config.cjs. These cross tenants by design until
 * staffSupportProcedure ships (rbac.md §4 / §10).
 */
const SKIPPED_FILES = new Set([
  join(REPO_ROOT, "src", "trpc", "routers", "feedback.ts"),
  join(REPO_ROOT, "src", "trpc", "routers", "selfhosted-license.ts"),
  join(REPO_ROOT, "src", "trpc", "routers", "selfhosted-smtp.ts"),
  join(REPO_ROOT, "src", "trpc", "routers", "sso.ts"),
]);

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      if (name === "__tests__") continue;
      yield* walk(path);
    } else if (
      path.endsWith(".ts") &&
      !path.endsWith(".test.ts") &&
      !SKIPPED_FILES.has(path)
    ) {
      yield path;
    }
  }
}

interface ProcedureLine {
  filePathRel: string;
  procedureName: string;
  base: string;
  lineNo: number;
}

function extractProcedures(filePath: string): ProcedureLine[] {
  const filePathRel = relative(join(REPO_ROOT), filePath);
  const source = readFileSync(filePath, "utf8");
  const out: ProcedureLine[] = [];
  // Match `  someName:<whitespace incl. newlines><procedureBase>` — the
  // base identifier may sit on a separate line after prettier reflow.
  // The `s` flag lets `\s` match across newlines.
  const re = /^[ \t]+([a-zA-Z_][a-zA-Z0-9_]*):\s+([a-zA-Z_][a-zA-Z0-9_]*)/gms;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const [, name, base] = m;
    if (!base.endsWith("Procedure")) continue;
    // Compute line number from the match index.
    const lineNo = source.slice(0, m.index).split("\n").length;
    out.push({ filePathRel, procedureName: name, base, lineNo });
  }
  return out;
}

describe("RBAC Phase 2 — every router procedure has an authorization gate", () => {
  it("scans router source files for procedure definitions", () => {
    const allProcedures: ProcedureLine[] = [];
    for (const dir of ROUTER_DIRS) {
      try {
        statSync(dir);
      } catch {
        continue;
      }
      for (const file of walk(dir)) {
        allProcedures.push(...extractProcedures(file));
      }
    }
    expect(allProcedures.length).toBeGreaterThan(50);
  });

  it("every workspace-scoped procedure uses a permission key (or is allowlisted)", () => {
    const violations: Array<{ at: string; base: string }> = [];
    for (const dir of ROUTER_DIRS) {
      try {
        statSync(dir);
      } catch {
        continue;
      }
      for (const file of walk(dir)) {
        for (const p of extractProcedures(file)) {
          if (WORKSPACE_PERMISSION_BASES.has(p.base)) continue;
          if (NON_WORKSPACE_PROCEDURE_BASES.has(p.base)) continue;
          // Bare workspaceProcedure / workspaceAdminProcedure / etc. — must
          // be allowlisted explicitly.
          const key = `${p.filePathRel}:${p.procedureName}`;
          if (PERMISSION_EXEMPT_PROCEDURES.has(key)) continue;
          violations.push({
            at: `${p.filePathRel}:${p.lineNo} ${p.procedureName}`,
            base: p.base,
          });
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("forbids the legacy workspaceAdmin/Owner procedures in routers", () => {
    const legacy = new Set([
      "workspaceAdminProcedure",
      "workspaceOwnerProcedure",
      "workspaceAdminPlanValidationProcedure",
    ]);
    const violations: string[] = [];
    for (const dir of ROUTER_DIRS) {
      try {
        statSync(dir);
      } catch {
        continue;
      }
      for (const file of walk(dir)) {
        for (const p of extractProcedures(file)) {
          if (!legacy.has(p.base)) continue;
          violations.push(
            `${p.filePathRel}:${p.lineNo} ${p.procedureName} uses ${p.base}`
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
