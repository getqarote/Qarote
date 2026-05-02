/**
 * Vitest setup — runs before every test file.
 *
 * Extends `expect` with jest-dom matchers (toBeInTheDocument,
 * toHaveAccessibleName, etc.). The matchers are no-ops in the node
 * environment but harmless to register globally; component tests opt
 * into jsdom via the per-file pragma (see vitest.config.ts).
 *
 * Cleanup is automatic in @testing-library/react when Vitest's
 * globals option is true — no afterEach(cleanup) needed.
 */

import "@testing-library/jest-dom/vitest";
