import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default tseslint.config(
  { ignores: ["dist", "tailwind.config.ts"] },
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
      // ESLint 10 new rules - disabled for now, enable gradually
      "no-useless-assignment": "off",
      "preserve-caught-error": "off",
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
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
  }
);
