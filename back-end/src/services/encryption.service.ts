import crypto from "crypto";

import { logger } from "@/core/logger";

import { authConfig } from "@/config";

const ALGORITHM = "aes-256-cbc";

export class EncryptionService {
  private static key = crypto.scryptSync(authConfig.encryptionKey, "salt", 32);

  static encrypt(text: string): string {
    if (!text) return text;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Combine IV and encrypted data
    return iv.toString("hex") + ":" + encrypted;
  }

  static decrypt(encryptedText: string): string {
    if (!encryptedText || !encryptedText.includes(":")) return encryptedText;

    try {
      const [ivHex, encrypted] = encryptedText.split(":");
      const iv = Buffer.from(ivHex, "hex");
      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      logger.error({ error }, "Decryption failed");
      throw new Error("Failed to decrypt sensitive data");
    }
  }

  // Hash passwords (one-way)
  static hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
  }

  // Verify password hash
  static verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  // Generate a secure random key for encryption
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString("hex");
  }
}
