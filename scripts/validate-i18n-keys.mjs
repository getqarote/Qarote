#!/usr/bin/env node

/**
 * Validates that all t() / i18n.t() keys used in the frontend source
 * exist in the corresponding locale JSON files.
 *
 * Usage: node scripts/validate-i18n-keys.mjs
 * Exit 0 = all keys valid, Exit 1 = missing keys found.
 */

import fs from "node:fs";
import path from "node:path";

const APP_SRC = "apps/app/src";
const LOCALES_DIR = "apps/app/public/locales";
const REFERENCE_LOCALE = "en";
const ALL_LOCALES = ["en", "fr", "es", "zh"];

// ── Helpers ──────────────────────────────────────────────────────────

/** Recursively flatten a JSON object into dot-separated keys. */
function flattenKeys(obj, prefix = "") {
  const keys = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const sub of flattenKeys(v, full)) keys.add(sub);
    } else {
      keys.add(full);
    }
  }
  return keys;
}

/** Collect all *.ts / *.tsx files under a directory (excluding tests). */
function collectSourceFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)
    ) {
      results.push(full);
    }
  }
  return results;
}

// ── Load locale maps ─────────────────────────────────────────────────

/** Map<locale, Map<namespace, Set<flatKey>>> */
const localeMaps = new Map();

for (const locale of ALL_LOCALES) {
  const localeDir = path.join(LOCALES_DIR, locale);
  if (!fs.existsSync(localeDir)) continue;
  const nsMap = new Map();
  for (const file of fs.readdirSync(localeDir)) {
    if (!file.endsWith(".json")) continue;
    const ns = file.replace(".json", "");
    const json = JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf-8"));
    nsMap.set(ns, flattenKeys(json));
  }
  localeMaps.set(locale, nsMap);
}

const enMap = localeMaps.get(REFERENCE_LOCALE);
if (!enMap) {
  console.error(`ERROR: Could not load reference locale "${REFERENCE_LOCALE}".`);
  process.exit(1);
}

// ── Scan source files ────────────────────────────────────────────────

const errors = [];
const sourceFiles = collectSourceFiles(APP_SRC);

// Regex patterns
const useTranslationRe = /useTranslation\(\s*["']([^"']+)["']\s*\)/g;
const tCallRe = /(?:^|[^.\w])t\(\s*["']([^"']+)["']/gm;
const i18nTCallRe = /i18n\.t\(\s*["']([^"']+)["']/g;

for (const filePath of sourceFiles) {
  const source = fs.readFileSync(filePath, "utf-8");
  const lines = source.split("\n");

  // Determine the file's default namespace from useTranslation("ns")
  let defaultNs = null;
  const nsMatch = useTranslationRe.exec(source);
  if (nsMatch) defaultNs = nsMatch[1];
  useTranslationRe.lastIndex = 0; // reset

  // Collect all t("key") calls with line numbers
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    // Match t("key") — but not i18n.t (handled separately)
    let match;
    tCallRe.lastIndex = 0;
    while ((match = tCallRe.exec(line)) !== null) {
      // Skip if this is actually i18n.t (look behind)
      const beforeIdx = match.index + match[0].indexOf("t(");
      if (beforeIdx >= 5 && line.substring(beforeIdx - 5, beforeIdx) === "i18n.") continue;

      const rawKey = match[1];
      let ns, key;

      if (rawKey.includes(":")) {
        // Explicit namespace: t("common:error")
        [ns, key] = rawKey.split(":", 2);
      } else {
        ns = defaultNs;
        key = rawKey;
      }

      if (!ns) continue; // No namespace resolved, skip

      const nsKeys = enMap.get(ns);
      if (!nsKeys) {
        errors.push({
          file: filePath,
          line: lineNum + 1,
          key: rawKey,
          reason: `namespace "${ns}" not found`,
        });
      } else if (!nsKeys.has(key)) {
        errors.push({
          file: filePath,
          line: lineNum + 1,
          key: rawKey,
          reason: `key "${key}" not found in ${ns}.json`,
        });
      }
    }

    // Match i18n.t("namespace:key")
    i18nTCallRe.lastIndex = 0;
    while ((match = i18nTCallRe.exec(line)) !== null) {
      const rawKey = match[1];
      if (!rawKey.includes(":")) continue; // i18n.t without namespace — skip

      const [ns, key] = rawKey.split(":", 2);
      const nsKeys = enMap.get(ns);
      if (!nsKeys) {
        errors.push({
          file: filePath,
          line: lineNum + 1,
          key: rawKey,
          reason: `namespace "${ns}" not found`,
        });
      } else if (!nsKeys.has(key)) {
        errors.push({
          file: filePath,
          line: lineNum + 1,
          key: rawKey,
          reason: `key "${key}" not found in ${ns}.json`,
        });
      }
    }
  }
}

// ── Cross-locale check ───────────────────────────────────────────────

const crossLocaleErrors = [];

for (const [ns, enKeys] of enMap) {
  for (const locale of ALL_LOCALES) {
    if (locale === REFERENCE_LOCALE) continue;
    const localeNsMap = localeMaps.get(locale);
    if (!localeNsMap) {
      crossLocaleErrors.push(`Locale "${locale}" directory missing entirely.`);
      continue;
    }
    const localeKeys = localeNsMap.get(ns);
    if (!localeKeys) {
      crossLocaleErrors.push(`${locale}/${ns}.json is missing entirely.`);
      continue;
    }
    for (const key of enKeys) {
      if (!localeKeys.has(key)) {
        crossLocaleErrors.push(`${locale}/${ns}.json missing key: "${key}"`);
      }
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────

let failed = false;

if (errors.length > 0) {
  failed = true;
  console.error("\n❌ Missing i18n keys in source code:\n");
  for (const err of errors) {
    console.error(`  ${err.file}:${err.line} — t("${err.key}") → ${err.reason}`);
  }
}

if (crossLocaleErrors.length > 0) {
  failed = true;
  console.error("\n❌ Cross-locale missing keys (compared to en/):\n");
  for (const err of crossLocaleErrors) {
    console.error(`  ${err}`);
  }
}

if (failed) {
  console.error(`\n${errors.length} source key error(s), ${crossLocaleErrors.length} cross-locale error(s).`);
  process.exit(1);
} else {
  console.log("✅ All i18n keys are valid across all locales.");
  process.exit(0);
}
