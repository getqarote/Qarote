const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");
const simpleImportSort = require("eslint-plugin-simple-import-sort");

module.exports = tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "scripts",
      "vitest.config.ts",
      "prisma.config.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "error",
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // 1. Node.js built-in modules (node:*)
            ["^node:"],
            // 2. External npm packages (anything not starting with node:, @/, or .)
            ["^(?!node:|@/|\\.)"],
            // 3. Core modules
            ["^@/core"],
            // 4. Services modules
            ["^@/services"],
            // 5. Middlewares
            ["^@/middlewares"],
            // 6. Schemas
            ["^@/schemas"],
            // 7. Config
            ["^@/config"],
            // 8. Types modules
            ["^@/types"],
            // 9. Mappers
            ["^@/mappers"],
            // 10. TRPC modules
            ["^@/trpc"],
            // 11. Relative imports (same directory, parent directories)
            ["^\\."],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
    },
  },
  // RBAC guard rails — see docs/plans/rbac.md §1 + §10 acceptance.
  //
  // 1. `ctx.user.role` is the platform-scoped User.role. Reading it inside
  //    a workspace-context router is the privilege-escalation pattern the
  //    redesign closed (the deleted line-299 bypass). Workspace authz must
  //    flow through `workspaceProcedure` / `workspaceAdminProcedure` /
  //    `workspaceOwnerProcedure`, which expose `ctx.workspaceRole`.
  //
  // 2. `authorize(...)` from `@/trpc/trpc` gates on the same global role
  //    and is kept only for legitimate platform-staff features (feedback
  //    triage, self-hosted setup) until `staffSupportProcedure` ships.
  //    New router code MUST NOT import it.
  {
    files: [
      "src/trpc/routers/**/*.{ts,tsx}",
      "src/ee/trpc/routers/**/*.{ts,tsx}",
      "src/ee/routers/**/*.{ts,tsx}",
    ],
    ignores: [
      // Platform-staff features — explicitly cross-tenant by design.
      // Tracked in plan §10 acceptance carve-out.
      "src/trpc/routers/feedback.ts",
      "src/trpc/routers/selfhosted-license.ts",
      "src/trpc/routers/selfhosted-smtp.ts",
      // sso.ts uses ssoAdminProcedure rooted in rateLimitedOrgAdminProcedure
      // — org-scoped, not workspace-scoped. Aligned with the structural
      // test's SKIPPED_FILES at permission-coverage.test.ts.
      "src/trpc/routers/sso.ts",
      "**/__tests__/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        // Direct: ctx.user.role
        {
          selector:
            "MemberExpression[object.type='MemberExpression'][object.object.name='ctx'][object.property.name='user'][property.name='role']",
          message:
            "Do not read ctx.user.role in workspace-context routers — it's the platform-scoped User.role and bypasses workspace authz (see docs/plans/rbac.md §1). Use ctx.workspaceRole from workspaceAdminProcedure / workspaceOwnerProcedure instead.",
        },
        // Optional chaining variants: ctx.user?.role and (ctx.user)?.role.
        // The first selector above also catches `ctx.user?.role` (the AST
        // is the same regardless of parens), but this redundant check
        // documents intent and ensures coverage if the parser changes.
        {
          selector:
            "MemberExpression[optional=true][object.type='MemberExpression'][object.object.name='ctx'][object.property.name='user'][property.name='role']",
          message:
            "Do not read ctx.user?.role in workspace-context routers — it's the platform-scoped User.role and bypasses workspace authz (see docs/plans/rbac.md §1). Use ctx.workspaceRole from workspaceAdminProcedure / workspaceOwnerProcedure instead.",
        },
        // Destructuring: const { role } = ctx.user
        {
          selector:
            "VariableDeclarator[init.type='MemberExpression'][init.object.name='ctx'][init.property.name='user']:has(ObjectPattern > Property[key.name='role'])",
          message:
            "Do not destructure role from ctx.user in workspace-context routers — it's the platform-scoped User.role and bypasses workspace authz (see docs/plans/rbac.md §1). Use ctx.workspaceRole from workspaceAdminProcedure / workspaceOwnerProcedure instead.",
        },
        // RBAC Phase 2 acceptance gate (rbac.md §10): zero literal
        // role-based decisions inside routers — every authorization decision
        // MUST go through workspacePermissionProcedure(<key>) and the catalog
        // at apps/api/src/auth/permissions.ts.
        //
        // WorkspaceRole.OWNER is NOT banned: invariants like last-OWNER
        // guards and assertCanGrantRole(grantor, target, current) compare
        // role values legitimately. Only ADMIN/MEMBER/READONLY are
        // permission-decision smells in router code.
        {
          selector:
            "MemberExpression[object.name='WorkspaceRole'][property.name='ADMIN']",
          message:
            "Do not compare against WorkspaceRole.ADMIN in router business logic. Use workspacePermissionProcedure(<key>) — see docs/plans/rbac.md §10 + apps/api/src/auth/permissions.ts.",
        },
        {
          selector:
            "MemberExpression[object.name='WorkspaceRole'][property.name='MEMBER']",
          message:
            "Do not compare against WorkspaceRole.MEMBER in router business logic. Use workspacePermissionProcedure(<key>) — see docs/plans/rbac.md §10 + apps/api/src/auth/permissions.ts.",
        },
        {
          selector:
            "MemberExpression[object.name='WorkspaceRole'][property.name='READONLY']",
          message:
            "Do not compare against WorkspaceRole.READONLY in router business logic. Use workspacePermissionProcedure(<key>) — see docs/plans/rbac.md §10 + apps/api/src/auth/permissions.ts.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/trpc/trpc",
              importNames: ["authorize", "rateLimitedAdminProcedure"],
              message:
                "Use workspaceAdminProcedure / workspaceOwnerProcedure / workspaceAdminPlanValidationProcedure. authorize() and rateLimitedAdminProcedure are kept only for platform-staff features (feedback, selfhosted-*) until staffSupportProcedure ships — see docs/plans/rbac.md §10.",
            },
          ],
        },
      ],
    },
  },
  // Allow any types in test files
  {
    files: [
      "**/__tests__/**/*.{ts,tsx}",
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // LLM inflight modules use prisma.$executeRaw with a constant channel name
  // and a bound JSON payload — never $executeRawUnsafe. Channel-name injection
  // is a real PG attack class; lock the surface here so a future refactor
  // can't silently widen it. Listener also uses pg.Client.query("LISTEN ...")
  // — constant channel, safe today; the rule below covers the Prisma side.
  {
    files: [
      "src/ee/services/llm/inflight.ts",
      "src/ee/services/llm/inflight-listener.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[property.name='$executeRawUnsafe']",
          message:
            "Do not use $executeRawUnsafe in inflight.ts / inflight-listener.ts — use $executeRaw with template literals so the channel name + payload stay bound parameters (no channel-name injection).",
        },
        {
          selector: "MemberExpression[property.name='$queryRawUnsafe']",
          message:
            "Do not use $queryRawUnsafe in inflight.ts / inflight-listener.ts — same reasoning as $executeRawUnsafe.",
        },
      ],
    },
  },
  // context-builders are pure TypeScript imported by the browser frontend via
  // the @api alias — they must never pull in server-only code (@/ or node:*).
  {
    files: ["src/ee/services/llm/context-builders/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // No parent-relative imports at all — context-builders inline
              // any types they need (see LlmMessage in each builder) so they
              // are fully self-contained pure TS.
              group: ["@/*", "node:*", "../**"],
              message:
                "context-builders must be pure TypeScript with no server or Node.js dependencies — they are imported by the browser frontend via the @api alias.",
            },
          ],
        },
      ],
    },
  }
);
