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

// jsdom polyfills for Radix UI primitives.
//
// Radix consumers (Select, Popover, Dialog, AlertDialog, Tabs, Accordion)
// call DOM APIs that jsdom does not implement during keyboard / pointer
// interactions. The shims below are pure no-ops — we don't simulate
// the underlying behaviour, we just prevent throws so RTL tests can
// drive Radix components.
//
//   hasPointerCapture / setPointerCapture / releasePointerCapture
//     - Used by Select / Popover / Dialog when handling pointer-down.
//       Without these, userEvent.click on a SelectTrigger throws
//       `target.hasPointerCapture is not a function`.
//   scrollIntoView
//     - Used by Select / Tabs to scroll the active item into view on
//       open. Without this, opening a popover throws.
//
// When jsdom ships native support for these, the shims become removable.
if (typeof window !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}
