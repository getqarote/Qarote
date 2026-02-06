/**
 * Obfuscate License Validation Code
 *
 * This script obfuscates license validation code paths to make reverse engineering more difficult.
 * Note: This is a deterrent, not a security measure. Legal protection is the primary enforcement.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const licenseFiles = [
  "dist/core/feature-flags.js",
  "dist/services/license/license-file.service.js",
  "dist/services/license/license-crypto.service.js",
  "dist/services/license/license-file-integrity.service.js",
];

const obfuscatorConfig = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false, // Disable in production to avoid performance issues
  debugProtectionInterval: 0,
  disableConsoleOutput: false, // Keep console for debugging
  identifierNamesGenerator: "hexadecimal",
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ["base64"],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: "function",
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
};

async function obfuscateFile(filePath: string): Promise<void> {
  const fullPath = path.resolve(process.cwd(), filePath);

  try {
    // Check if file exists
    await fs.access(fullPath);

    console.log(`Obfuscating: ${filePath}`);

    // Use javascript-obfuscator CLI
    execSync(
      `npx --yes javascript-obfuscator "${fullPath}" --output "${fullPath}" --config '${JSON.stringify(obfuscatorConfig)}'`,
      { encoding: "utf-8", stdio: "inherit" }
    );

    console.log(`✓ Obfuscated: ${filePath}`);
  } catch (error) {
    console.error(`✗ Failed to obfuscate ${filePath}:`, error);
    // Don't fail the build if obfuscation fails
  }
}

async function main() {
  console.log("Starting license validation code obfuscation...");

  // Check if javascript-obfuscator is available
  try {
    execSync("npx --yes javascript-obfuscator --version", { stdio: "ignore" });
  } catch {
    console.warn("javascript-obfuscator not available. Skipping obfuscation.");
    console.log(
      "To enable obfuscation, install: npm install --save-dev javascript-obfuscator"
    );
    console.log("Build will continue without obfuscation.");
    process.exit(0);
  }

  // Obfuscate each file
  for (const file of licenseFiles) {
    await obfuscateFile(file);
  }

  console.log("License validation code obfuscation complete.");
}

main().catch((error) => {
  console.error("Obfuscation script error:", error);
  // Don't fail the build
  process.exit(0);
});
