import path from "node:path";
import { defineConfig } from "vitest/config";

// https://vitest.dev/config/
//
// Two test environments coexist in the app workspace:
//   - `node` (default) for pure-logic / utility tests under `src/lib/*`,
//     `src/hooks/*`, etc. Fast — no DOM cost.
//   - `jsdom` for React component tests. Component tests opt in via
//     a `// @vitest-environment jsdom` pragma at the top of the file.
//     The matching `vitest-environment-jsdom` package name is a Vitest
//     pragma (not a real import) — listed in knip's ignoreDependencies
//     so knip doesn't misclassify it as an unlisted dep.
//
// Components that touch tRPC / TanStack Query / react-router need the
// jsdom env. Pure-function tests stay on `node` for speed.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    // Array form so more-specific subpath aliases are matched before the
    // shorter package alias. @qarote/i18n is a workspace package whose
    // `dist/` is not built during tests — point directly at the TypeScript
    // source so component tests don't need a pre-build step.
    alias: [
      {
        find: "@qarote/i18n/react",
        replacement: path.resolve(
          __dirname,
          "../../packages/i18n/src/react.ts"
        ),
      },
      {
        find: "@qarote/i18n",
        replacement: path.resolve(
          __dirname,
          "../../packages/i18n/src/index.ts"
        ),
      },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
});
