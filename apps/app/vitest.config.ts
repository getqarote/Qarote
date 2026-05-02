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
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
