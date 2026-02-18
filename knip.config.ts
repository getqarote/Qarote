import type { KnipConfig } from "knip";

const config: KnipConfig = {
  workspaces: {
    "apps/app": {
      project: ["src/**/*.{ts,tsx}"],
    },
    "apps/web": {
      project: ["src/**/*.{ts,tsx}"],
    },
    "apps/portal": {
      project: ["src/**/*.{ts,tsx}"],
    },
    "apps/api": {
      project: ["src/**/*.ts"],
    },
  },
  ignore: [
    // Ignore infrastructure folder
    // Ignore UI component directories (as requested)
    "apps/app/src/components/ui/**",
    "apps/web/src/components/ui/**",
    "apps/portal/src/components/ui/**",
    // Ignore API scripts (utility scripts run manually)
    "apps/api/scripts/**",
    // Ignore API core utilities used internally
    "apps/api/src/core/rabbitmq/ResponseValidator.ts",
    // Ignore API type exports used by frontend apps
    "apps/api/src/trpc/types.ts",
    "apps/api/src/trpc/router.ts",
    // Ignore API services used in tRPC type inference
    "apps/api/src/services/plan/features.service.ts",
    // Ignore hooks used in UI components
    "apps/web/src/hooks/use-mobile.tsx",
    // Ignore email style exports (used in email templates but knip doesn't detect)
    "apps/api/src/services/email/shared/styles.ts",
    // Ignore test files
    "**/*.test.{ts,tsx}",
    "**/*.spec.{ts,tsx}",
    // Ignore config files
    "**/*.config.{ts,js}",
    "**/vite-env.d.ts",
    // Ignore type definitions
    "**/*.d.ts",
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
  ],
  ignoreBinaries: ["stripe", "act"],
};

export default config;
