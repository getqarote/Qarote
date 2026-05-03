/**
 * Vitest setup — runs before every test file.
 *
 * Extends `expect` with jest-dom matchers (toBeInTheDocument,
 * toHaveAccessibleName, etc.). Registration is harmless in the node
 * environment, but the matchers themselves need a real DOM — calling
 * `toBeInTheDocument()` from a node-env test throws. Component tests
 * opt into jsdom via the per-file vitest-environment pragma (see
 * vitest.config.ts for the established pattern).
 *
 * Cleanup is automatic in @testing-library/react when Vitest's
 * globals option is true — no afterEach(cleanup) needed.
 */

import "@testing-library/jest-dom/vitest";
