import type { KnipConfig } from "knip";

// Knip's default entry roots. Workspaces that define a custom `entry`
// array OVERRIDE these defaults rather than extending them, so any
// workspace listing extra runtime entries must re-include the defaults
// or knip will silently stop tracing the standard ones.
const DEFAULT_ENTRY = [
  "{index,cli,main}.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
  "src/{index,cli,main}.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
];

const config: KnipConfig = {
  workspaces: {
    "apps/app": {
      project: ["src/**/*.{ts,tsx}"],
      ignoreDependencies: [
        "@radix-ui/react-dropdown-menu", // Used by shadcn UI component (ignored dir)
      ],
    },
    "apps/web": {
      project: ["src/**/*.{ts,tsx}"],
      // .astro files import these but knip can't scan .astro syntax
      entry: [
        ...DEFAULT_ENTRY,
        "src/**/*.astro",
        "src/components/docs/DocsToC.tsx",
        "src/components/docs/DocsSidebar.tsx",
        "src/lib/docs-nav.ts",
        "src/hooks/use-mobile.tsx",
      ],
    },
    "apps/portal": {
      project: ["src/**/*.{ts,tsx}"],
    },
    "apps/api": {
      project: ["src/**/*.ts"],
      prisma: false, // Prisma plugin loads prisma.config.ts which requires DATABASE_URL at load time
      // Runtime entry points: registered via Procfile / package.json scripts,
      // not imported. Listing them here lets knip trace their import chains
      // (services, helpers) instead of false-flagging the whole subtree.
      //
      // Crons match the `.cron.ts` suffix; workers are top-level `*.ts`
      // files only. The narrow glob keeps any future `_helpers/`,
      // `__tests__/`, or shared module under workers/ from being
      // misclassified as an entry point.
      entry: [
        ...DEFAULT_ENTRY,
        "src/cron/**/*.cron.ts",
        "src/workers/*.ts",
        "src/ee/cron/**/*.cron.ts",
        "src/ee/workers/*.ts",
        // Migration scripts run manually via `npx tsx`
        "src/core/migrations/org-migration.ts",
        "src/core/migrations/org-verification.ts",
      ],
    },
    "packages/i18n": {
      project: ["src/**/*.ts"],
      entry: [...DEFAULT_ENTRY, "src/index.ts", "src/react.ts", "src/server.ts"],
      ignoreDependencies: ["i18next", "react-i18next", "react"],
    },
    ".": {
      entry: [...DEFAULT_ENTRY, "scripts/**/*.{mjs,ts}"],
    },
  },
  ignore: [
    // Ignore E2E test package (has its own dependency management)
    "apps/e2e/**",
    // Ignore UI component directories (as requested)
    "apps/app/src/components/ui/**",
    "apps/web/src/components/ui/**",
    "apps/portal/src/components/ui/**",
    // Ignore API core utilities used internally
    "apps/api/src/core/rabbitmq/ResponseValidator.ts",
    // Ignore API type exports used by frontend apps
    "apps/api/src/trpc/types.ts",
    // CE router files — not imported in the private build but are the entry
    // points for the public CE mirror. Ignored here to keep knip quiet.
    "apps/api/src/trpc/router.ts",
    "apps/api/src/trpc/routers/rabbitmq/index.ts",
    "apps/api/src/trpc/routers/workspace/index.ts",
    "apps/api/src/trpc/routers/workspace/data.ce.ts",
    // Ignore trpc.ts — orgScopedProcedure exported for progressive adoption
    "apps/api/src/trpc/trpc.ts",
    // Feature-gate public barrel + interior modules whose exports are
    // public API surface re-exported across packages and consumed by
    // frontend via @api/... paths that knip can't trace.
    "apps/api/src/services/feature-gate/index.ts",
    "apps/api/src/services/feature-gate/types.ts",
    "apps/api/src/services/feature-gate/error.ts",
    "apps/api/src/services/feature-gate/gate.config.ts",
    "apps/api/src/services/feature-gate/capability-snapshot.ts",
    // Ignore API services used in tRPC type inference
    "apps/api/src/services/plan/features.service.ts",
    // Ignore email style exports (used in email templates but knip doesn't detect)
    "apps/api/src/services/email/shared/styles.ts",
    // Ignore config files
    "**/vite-env.d.ts",
    // Ignore type definitions
    "**/*.d.ts",
    // Ignore .claire worktree artifacts (created by the Claude Code IDE extension)
    ".claire/**",
    // In-progress blog section component — not yet wired into the landing page
    "apps/web/src/components/landing/BlogSection.tsx",
    // Feature-gate frontend primitives — wired via CapabilityGate +
    // ServerCapabilityBadge as of PR-B. The barrel + readGateError are
    // imported by error-driven render paths that knip can't trace; the
    // index file just re-exports.
    "apps/app/src/lib/feature-gate/index.ts",
    "apps/app/src/lib/feature-gate/readGateError.ts",
  ],
  ignoreDependencies: [
    // These are often used but not directly imported
    "@types/*",
    // Vitest pragma at the top of `.test.tsx` files. Knip parses
    // `// @vitest-environment jsdom` as `vitest-environment-jsdom` —
    // it's a runtime selector, not a package.
    "vitest-environment-jsdom",
    // API dependencies that are used but not directly imported
    "pino-pretty", // Used in logger config
    "@react-email/components", // Used in email templates but knip doesn't detect it
    "@playwright/test", // Imported via absolute path in scripts/generate-compare-og.mjs
    // Tailwind v4 dependencies referenced via CSS @plugin/@import directives
    "tailwindcss",
    "tailwindcss-animate",
    // i18n transitive deps required by @qarote/i18n but needed as direct deps for pnpm strict hoisting
    "i18next-browser-languagedetector",
    "i18next-http-backend",
  ],
  ignoreBinaries: ["stripe", "act"],
};

export default config;
