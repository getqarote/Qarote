#!/usr/bin/env node

/**
 * Generate a secure encryption key for the RabbitHQ application
 *
 * Usage: npx tsx scripts/generate-encryption-key.ts
 */

import cryptoModule from "crypto";

function generateEncryptionKey() {
  // Generate a 32-byte (256-bit) random key
  const key = cryptoModule.randomBytes(32).toString("hex");

  console.log("\n🔐 Secure Encryption Key Generated:");
  console.log("=".repeat(50));
  console.log(key);
  console.log("=".repeat(50));
  console.log("\n📝 Add this to your .env file:");
  console.log(`ENCRYPTION_KEY=${key}`);
  console.log("\n⚠️  IMPORTANT SECURITY NOTES:");
  console.log("• Keep this key secret and secure");
  console.log("• Use different keys for different environments");
  console.log("• Store production keys in secure key management systems");
  console.log("• Never commit this key to version control");
  console.log(
    "• Backup this key - without it, encrypted data cannot be decrypted"
  );
  console.log("\n");
}

generateEncryptionKey();
