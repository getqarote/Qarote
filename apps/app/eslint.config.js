import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default tseslint.config(
  { ignores: ["dist", "tailwind.config.ts", "vitest.config.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Downgrade new react-hooks v7 strict rules to warnings for gradual migration
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Prevent React namespace access for hooks (can cause production errors)
      // This catches patterns like React.useState, React.useEffect, etc.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='React'][property.name=/^use[A-Z]/]",
          message:
            "Use named imports for React hooks (e.g., 'import { useState } from \"react\"') instead of React.useState. Namespace imports can cause production build errors like 'Cannot read properties of null (reading useEffect)'.",
        },
      ],
      // Disable base rule as it conflicts with TypeScript version
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          args: "after-used",
          ignoreRestSiblings: true,
          caughtErrors: "none",
          // Check all variables including imports
          vars: "all",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "error",
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // 1. CSS and style files (must be first)
            ["\\.(css|scss|less|sass|styl)$"],
            // 2. Node.js built-in modules (node:*)
            ["^node:"],
            // 3. React modules (react, react-dom, react-router, @react-*, @tanstack/react-*)
            [
              "^react$",
              "^react-",
              "^react/",
              "^@react-",
              "^@tanstack/react-",
              "^react-router",
            ],
            // 4. External npm packages (anything not starting with node:, react, @/, or .)
            ["^(?!node:|react|@react|@tanstack/react|react-router|@/|\\.)"],
            // 5. Lib modules
            ["^@/lib"],
            // 6. Components modules
            ["^@/components"],
            // 7. Contexts modules
            ["^@/contexts"],
            // 8. Hooks modules
            ["^@/hooks"],
            // 9. Schemas modules
            ["^@/schemas"],
            // 10. Types modules
            ["^@/types"],
            // 11. Config
            ["^@/config"],
            // 12. Relative imports (same directory, parent directories, excluding CSS)
            ["^(?!.*\\.(css|scss|less|sass|styl)$)\\./"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
    },
  },
  // Block server-only @api subtrees from being imported in the frontend.
  // Only @api/ee/services/llm/context-builders/** and @api/ee/services/llm/llm.interfaces
  // are safe (pure TS, no Node deps). The API-side ESLint config enforces
  // purity on those files themselves. Every other @api/ee/services/* subdir
  // is enumerated explicitly because no-restricted-imports' minimatch group
  // does not honor `!` negations as exceptions.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@api/core/**",
                "@api/services/**",
                "@api/middlewares/**",
                "@api/mappers/**",
                "@api/schemas/**",
                "@api/ee/trpc/**",
                "@api/ee/routers/**",
                "@api/ee/workers/**",
                "@api/ee/cron/**",
                // @api/ee/services/* — block every subdir EXCEPT
                // @api/ee/services/llm/{context-builders,llm.interfaces}.
                "@api/ee/services/alerts/**",
                "@api/ee/services/digest/**",
                "@api/ee/services/email/**",
                "@api/ee/services/incident/**",
                "@api/ee/services/metrics/**",
                "@api/ee/services/slack/**",
                "@api/ee/services/tracing/**",
                "@api/ee/services/webhook/**",
                // Inside llm/, block the server-only files individually:
                "@api/ee/services/llm/backends/**",
                "@api/ee/services/llm/llm.service",
                "@api/ee/services/llm/llm-encryption.service",
              ],
              message:
                "Server-only @api code cannot be imported in the frontend. Only @api/ee/services/llm/context-builders/** and @api/ee/services/llm/llm.interfaces are safe to use.",
            },
          ],
        },
      ],
    },
  },
  // shadcn UI primitives and contexts legitimately export both
  // components and named utility constants (variant objects,
  // context references, provider+hook pairs). The react-refresh
  // rule only affects HMR and is safe to disable for these.
  {
    files: ["src/components/ui/**/*.{ts,tsx}", "src/contexts/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  }
);
