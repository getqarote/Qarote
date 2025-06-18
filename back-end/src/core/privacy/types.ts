/**
 * Privacy-related types and enums
 */

export enum DataType {
  METRICS = "metrics",
  MESSAGES = "messages",
  LOGS = "logs",
  CONNECTIONS = "connections",
  ALERTS = "alerts",
}

export enum StorageMode {
  MEMORY_ONLY = "memory_only", // Default: No persistent storage
  TEMPORARY = "temporary", // Short-term storage (1-7 days)
  HISTORICAL = "historical", // Long-term storage (Premium)
}

export interface PrivacySettings {
  userId: string;
  plan: string;
  storageMode: StorageMode;
  retentionDays: number;
  encryptData: boolean;
  autoDelete: boolean;
  consentGiven: boolean;
  consentDate?: Date;
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

export interface CacheStats {
  totalKeys: number;
  memoryUsage: string;
  oldestEntry?: Date;
}

export interface CleanupResult {
  deletedCount: number;
}
