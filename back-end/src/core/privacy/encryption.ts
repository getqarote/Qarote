import crypto from "crypto";

/**
 * Encryption utilities for sensitive data
 */
export class EncryptionService {
  private static readonly ENCRYPTION_ALGORITHM = "aes-256-gcm";
  private static readonly ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY || "default-key-change-in-production";

  /**
   * Encrypt sensitive data
   */
  static encryptSensitiveData(
    data: Record<string, unknown> | string | number
  ): {
    encrypted: string;
    iv: string;
    tag: string;
  } {
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(this.ENCRYPTION_KEY, "salt", 32);
      const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, key, iv);

      let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
      encrypted += cipher.final("hex");

      return {
        encrypted,
        iv: iv.toString("hex"),
        tag: cipher.getAuthTag().toString("hex"),
      };
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt data");
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decryptSensitiveData(encryptedData: {
    encrypted: string;
    iv: string;
    tag: string;
  }): Record<string, unknown> | string | number {
    try {
      const key = crypto.scryptSync(this.ENCRYPTION_KEY, "salt", 32);
      const iv = Buffer.from(encryptedData.iv, "hex");
      const decipher = crypto.createDecipheriv(
        this.ENCRYPTION_ALGORITHM,
        key,
        iv
      );

      decipher.setAuthTag(Buffer.from(encryptedData.tag, "hex"));

      let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return JSON.parse(decrypted);
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt data");
    }
  }
}
