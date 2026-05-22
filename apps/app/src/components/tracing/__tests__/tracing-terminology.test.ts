/**
 * Terminology guard for the Messages page i18n.
 *
 * Phase A of the messages-ui-coherence plan unifies the Tracing-feature
 * vocabulary: one term per concept, "Live" never appears as a standalone
 * label (only ever "Live tail"), and user-facing copy never says
 * "Recording" or "Capture" — those mental models are noise. This test
 * is a sanity floor; actual phrasing is reviewed in the PR but a
 * regression on the banned terms should be caught automatically.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const LOCALES = ["en", "fr", "es", "zh"] as const;

/** Keys that legitimately contain otherwise-banned terms. */
const ALLOWED_EXCEPTIONS: Record<string, string[]> = {
  // The confirm dialog explicitly references the RabbitMQ plugin, so
  // "Firehose" must remain in the user copy of these specific keys.
  "empty.firehose.confirmTitle": ["Firehose"],
  "empty.firehose.description": ["Firehose"],
  "empty.firehose.confirmDescription": ["Firehose"],
};

function loadLocale(locale: string): Record<string, string> {
  const path = join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "public",
    "locales",
    locale,
    "tracing.json"
  );
  return JSON.parse(readFileSync(path, "utf-8")) as Record<string, string>;
}

describe("Messages i18n — terminology guard", () => {
  // Per-locale checks for the toggle key contract — applies everywhere
  // because Spy and Tracing are kept as English brand names across all
  // four locales (decision recorded in messages-ui-coherence.md A.2).
  for (const locale of LOCALES) {
    describe(`${locale} — toggle vocabulary`, () => {
      const data = loadLocale(locale);

      it("reserves the top-level toggle keys to Spy and Tracing", () => {
        expect(data["mode.spy"]).toBe("Spy");
        expect(data["mode.recorded"]).toBe("Tracing");
      });
    });
  }

  // English-only banned-term checks. The audit findings (Recording /
  // Capture-as-feature / standalone Live) are English-grammar specific:
  // the regex literals would either match unrelated French/Spanish
  // words ("Capture" the noun) or never match (no "Live" exists in the
  // translated copy at all), so applying them to non-en gives either
  // false positives or false confidence. Banned-term enforcement for
  // other locales would need per-locale tables — out of scope here.
  describe("en — banned terms", () => {
    const data = loadLocale("en");

    it("never uses 'Recording' as a user-facing term", () => {
      const offenders = findOffenders(data, /\brecording\b/i);
      expect(offenders).toEqual([]);
    });

    it("never uses 'Capture' as a synonym for the feature", () => {
      // "captured" and "capture is best-effort" are legitimate verb
      // forms describing the action of Tracing's pipeline. What we
      // ban is "Capture" used as a noun interchangeable with Tracing.
      // Heuristic: capital C, word boundary, NOT followed by "is"
      // (verb form) or "by" ("captured by …").
      const offenders = Object.entries(data)
        .filter(([key]) => !ALLOWED_EXCEPTIONS[key])
        .filter(([, value]) => /\bCapture\b(?! (is|by))/.test(value))
        .map(([key]) => key);
      expect(offenders).toEqual([]);
    });

    it("never uses 'Live' as a standalone label", () => {
      // The top-level toggle and sub-tab both used to read "Live",
      // creating two meanings for one word. Phase A reserves it
      // exclusively for "Live tail". A standalone "Live" anywhere
      // in the value (case-sensitive, word-boundary, NOT followed
      // by " tail") is the regression we want to catch.
      const offenders = Object.entries(data)
        .filter(([, value]) => /\bLive\b(?! tail)/.test(value))
        .map(([key]) => key);
      expect(offenders).toEqual([]);
    });
  });
});

function findOffenders(
  data: Record<string, string>,
  pattern: RegExp
): string[] {
  return Object.entries(data)
    .filter(([key]) => !ALLOWED_EXCEPTIONS[key])
    .filter(([, value]) => pattern.test(value))
    .map(([key]) => key);
}
