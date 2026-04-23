#!/usr/bin/env node

/**
 * Validates that all t() / i18n.t() keys used in the frontend source
 * exist in the corresponding locale JSON files.
 *
 * Automatically discovers all frontend packages under apps/ that have
 * both a src/ directory and public/locales/ directory.
 *
 * Usage: node scripts/validate-i18n-keys.mjs
 * Exit 0 = all keys valid, Exit 1 = missing keys found.
 */

import fs from "node:fs";
import path from "node:path";

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
  if (!fs.existsSync(dir)) return results;
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

/** Discover frontend packages that have both src/ and public/locales/. */
function discoverPackages() {
  const appsDir = "apps";
  const packages = [];
  if (!fs.existsSync(appsDir)) return packages;
  for (const entry of fs.readdirSync(appsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgPath = path.join(appsDir, entry.name);
    const srcDir = path.join(pkgPath, "src");
    const localesDir = path.join(pkgPath, "public", "locales");
    if (fs.existsSync(srcDir) && fs.existsSync(localesDir)) {
      packages.push({ name: entry.name, srcDir, localesDir });
    }
  }
  return packages;
}

/** Load locale maps for a package: Map<locale, Map<namespace, Set<flatKey>>> */
function loadLocaleMaps(localesDir) {
  const localeMaps = new Map();
  for (const locale of ALL_LOCALES) {
    const localeDir = path.join(localesDir, locale);
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
  return localeMaps;
}

// Regex patterns
// Matches useTranslation("ns"), useTranslation("ns", ...), and useTranslation()
const useTranslationRe = /useTranslation\(\s*(?:["']([^"']+)["']\s*(?:,[^)]*)?|)\)/g;
const tCallRe = /(?:^|[^.\w])t\(\s*["']([^"']+)["']/gm;
const i18nTCallRe = /i18n\.t\(\s*["']([^"']+)["']/g;

/** Scan source files and return key errors for a single package. */
function validatePackage(pkg, enMap) {
  const errors = [];
  const sourceFiles = collectSourceFiles(pkg.srcDir);

  for (const filePath of sourceFiles) {
    const source = fs.readFileSync(filePath, "utf-8");
    const lines = source.split("\n");

    // Determine the file's default namespace from useTranslation("ns")
    let defaultNs = null;
    const nsMatch = useTranslationRe.exec(source);
    if (nsMatch) defaultNs = nsMatch[1] || null;
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

  return errors;
}

/** Run cross-locale checks for a package. */
function crossLocaleCheck(localeMaps, enMap) {
  const errors = [];
  for (const [ns, enKeys] of enMap) {
    for (const locale of ALL_LOCALES) {
      if (locale === REFERENCE_LOCALE) continue;
      const localeNsMap = localeMaps.get(locale);
      if (!localeNsMap) {
        errors.push(`Locale "${locale}" directory missing entirely.`);
        continue;
      }
      const localeKeys = localeNsMap.get(ns);
      if (!localeKeys) {
        errors.push(`${locale}/${ns}.json is missing entirely.`);
        continue;
      }
      for (const key of enKeys) {
        if (!localeKeys.has(key)) {
          errors.push(`${locale}/${ns}.json missing key: "${key}"`);
        }
      }
    }
  }
  return errors;
}

// ── Main ──────────────────────────────────────────────────────────────

const packages = discoverPackages();

if (packages.length === 0) {
  console.error("ERROR: No frontend packages with src/ and public/locales/ found under apps/.");
  process.exit(1);
}

console.log(`Found ${packages.length} package(s): ${packages.map((p) => p.name).join(", ")}\n`);

let allErrors = [];
let allCrossLocaleErrors = [];

for (const pkg of packages) {
  const localeMaps = loadLocaleMaps(pkg.localesDir);
  const enMap = localeMaps.get(REFERENCE_LOCALE);

  if (!enMap) {
    console.error(`WARNING: Could not load reference locale "${REFERENCE_LOCALE}" for ${pkg.name}, skipping.`);
    continue;
  }

  const errors = validatePackage(pkg, enMap);
  const crossErrors = crossLocaleCheck(localeMaps, enMap);

  // Tag errors with package name for reporting
  for (const err of errors) allErrors.push({ ...err, pkg: pkg.name });
  for (const err of crossErrors) allCrossLocaleErrors.push(`[${pkg.name}] ${err}`);
}

// ── Report ───────────────────────────────────────────────────────────

let failed = false;

if (allErrors.length > 0) {
  failed = true;
  console.error("❌ Missing i18n keys in source code:\n");
  for (const err of allErrors) {
    console.error(`  [${err.pkg}] ${err.file}:${err.line} — t("${err.key}") → ${err.reason}`);
  }
}

if (allCrossLocaleErrors.length > 0) {
  failed = true;
  console.error("\n❌ Cross-locale missing keys (compared to en/):\n");
  for (const err of allCrossLocaleErrors) {
    console.error(`  ${err}`);
  }
}

if (failed) {
  console.error(`\n${allErrors.length} source key error(s), ${allCrossLocaleErrors.length} cross-locale error(s).`);
  process.exit(1);
} else {
  console.log("✅ All i18n keys are valid across all locales.");
  process.exit(0);
}
