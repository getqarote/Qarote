/**
 * Generate RSA Key Pair for License Signing
 * Run this script to generate a new RSA-4096 key pair for license signing/verification
 *
 * Usage: tsx scripts/generate-license-keys.ts
 */

import { generateKeyPairSync } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

console.log("🔐 Generating RSA-4096 key pair for license signing...\n");

// Generate RSA key pair
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

console.log("✅ Key pair generated successfully!\n");

// Save keys to files
const keysDir = join(__dirname, "..", "..", "keys");
try {
  writeFileSync(join(keysDir, "license-private.pem"), privateKey);
  writeFileSync(join(keysDir, "license-public.pem"), publicKey);
  console.log("📁 Keys saved to:");
  console.log(`   - ${join(keysDir, "license-private.pem")}`);
  console.log(`   - ${join(keysDir, "license-public.pem")}`);
} catch (error) {
  console.log("⚠️  Could not save keys to files (directory may not exist)");
}

console.log("\n🔑 Private Key (for .env - LICENSE_PRIVATE_KEY):");
console.log(
  "================================================================================"
);
// Format private key for .env (replace newlines with \n)
console.log(privateKey.replace(/\n/g, "\\n"));

console.log("\n\n🔓 Public Key (for .env - LICENSE_PUBLIC_KEY):");
console.log(
  "================================================================================"
);
// Format public key for .env (replace newlines with \n)
console.log(publicKey.replace(/\n/g, "\\n"));

console.log("\n\n📋 Instructions:");
console.log(
  "================================================================================"
);
console.log("1. Copy the PRIVATE KEY above and add to your .env file:");
console.log('   LICENSE_PRIVATE_KEY="<paste private key here>"');
console.log("\n2. Copy the PUBLIC KEY above and add to your .env file:");
console.log('   LICENSE_PUBLIC_KEY="<paste public key here>"');
console.log("\n3. Restart your API server to load the new keys");
console.log("\n⚠️  IMPORTANT:");
console.log("   - Keep the PRIVATE KEY secret (never commit to git)");
console.log("   - The PRIVATE KEY is used to sign licenses (SaaS only)");
console.log("   - The PUBLIC KEY is used to verify licenses (self-hosted)");
console.log("   - Self-hosted deployments only need the PUBLIC KEY");
console.log(
  "================================================================================\n"
);
