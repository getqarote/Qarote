const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");
const simpleImportSort = require("eslint-plugin-simple-import-sort");

module.exports = tseslint.config(
  { ignores: ["dist", "node_modules", "scripts", "vitest.config.ts"] },
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
  }
);
