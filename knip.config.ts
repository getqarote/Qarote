import type { KnipConfig } from "knip";

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
    },
    "apps/portal": {
      project: ["src/**/*.{ts,tsx}"],
    },
    "apps/api": {
      project: ["src/**/*.ts"],
      prisma: false, // Prisma plugin loads prisma.config.ts which requires DATABASE_URL at load time
    },
    "packages/i18n": {
      project: ["src/**/*.ts"],
      ignoreDependencies: ["i18next", "react-i18next", "react"],
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
    // Ignore API services used in tRPC type inference
    "apps/api/src/services/plan/features.service.ts",
    // Ignore hooks used in UI components
    "apps/web/src/hooks/use-mobile.tsx",
    // Ignore docs components/lib used by .astro layouts (Knip doesn't scan .astro files)
    "apps/web/src/components/docs/DocsToC.tsx",
    "apps/web/src/components/docs/DocsSidebar.tsx",
    "apps/web/src/lib/docs-nav.ts",
    // Workspace invites hook — function temporarily unused after removing invite from creation forms
    "apps/app/src/hooks/ui/useWorkspaceInvites.ts",
    // In-progress nodes components — not yet wired into the page tree
    "apps/app/src/components/nodes/PortsAndContexts.tsx",
    // ChurnStatistics removed from Nodes page — preserved for relocation to the main dashboard
    "apps/app/src/components/nodes/ChurnStatistics.tsx",
    // In-progress policies components — DefinitionBuilder not yet wired into PolicyForm
    "apps/app/src/components/PoliciesList/DefinitionBuilder.tsx",
    "apps/app/src/components/PoliciesList/constants.ts",
    // Threshold tone helpers — small library API of related helpers; some
    // exports (getUsageBgTone, getClusterHealthTone, getClusterHealthBgClasses)
    // are reserved for upcoming work and not yet referenced
    "apps/app/src/lib/health-tones.ts",
    // Ignore email style exports (used in email templates but knip doesn't detect)
    "apps/api/src/services/email/shared/styles.ts",
    // Ignore organization migration scripts (run manually via npx tsx, not imported)
    "apps/api/src/core/migrations/org-migration.ts",
    "apps/api/src/core/migrations/org-verification.ts",
    // Ignore cron jobs and workers (registered at runtime, not imported)
    "apps/api/src/cron/license-expiration-reminders.cron.ts",
    "apps/api/src/cron/license-file-cleanup.cron.ts",
    "apps/api/src/cron/release-notifier.cron.ts",
    "apps/api/src/workers/license-monitor.ts",
    "apps/api/src/workers/release-notifier.ts",
    "apps/api/src/ee/cron/daily-digest.cron.ts",
    "apps/api/src/ee/workers/digest-monitor.ts",
    // Ignore digest service public API types — used transitively via DigestData
    "apps/api/src/ee/services/digest/digest.service.ts",
    "apps/api/src/ee/services/digest/digest-sender.service.ts",
    // EE workers (entry points via Procfile / package.json scripts)
    "apps/api/src/ee/workers/firehose-monitor.ts",
    // Metrics persistence worker and supporting files (entry point via Procfile)
    "apps/api/src/ee/workers/metrics-monitor.ts",
    "apps/api/src/ee/cron/queue-metrics.cron.ts",
    "apps/api/src/ee/services/metrics/queue-metrics.service.ts",
    // These files export symbols called from queue-metrics.cron.ts (ignored
    // above as a Procfile entry point) — knip cannot trace those import chains
    "apps/api/src/core/cache.ts",
    "apps/api/src/ee/services/incident/incident-diagnosis.service.ts",
    // Server-wide queue history hook — reserved for future overview page
    "apps/app/src/hooks/queries/useServerQueueHistory.ts",
    // Ignore i18n package exports (used by consuming apps)
    "packages/i18n/src/react.ts",
    "packages/i18n/src/server.ts",
    // Ignore standalone scripts (run via CLI, not imported)
    "scripts/validate-i18n-keys.mjs",
    "scripts/generate-compare-og.mjs",
    "scripts/generate-quiz-og.mjs",
    // Ignore config files
    "**/vite-env.d.ts",
    // Ignore type definitions
    "**/*.d.ts",
    // Ignore .claire worktree artifacts (created by the Claude Code IDE extension)
    ".claire/**",
    // In-progress blog section component — not yet wired into the landing page
    "apps/web/src/components/landing/BlogSection.tsx",
  ],
  ignoreDependencies: [
    // These are often used but not directly imported
    "@types/*",
    // API dependencies that are used but not directly imported
    "pino-pretty", // Used in logger config
    "@react-email/components", // Used in email templates but knip doesn't detect it
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
