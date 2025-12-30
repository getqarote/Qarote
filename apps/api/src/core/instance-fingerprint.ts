/**
 * Instance Fingerprinting
 * Generates stable instance IDs from hardware/network characteristics
 * Used to prevent license sharing across different servers
 */

import crypto from "crypto";
import os from "os";

/**
 * Generate a stable instance fingerprint
 * Combines multiple hardware/network characteristics to create a unique ID
 */
function getInstanceFingerprint(): string {
  const factors: string[] = [];

  // Hostname
  factors.push(os.hostname());

  // Platform and architecture
  factors.push(os.platform());
  factors.push(os.arch());

  // Network interfaces - use first non-loopback MAC address
  const networkInterfaces = os.networkInterfaces();
  let macAddress = "unknown";

  for (const interfaces of Object.values(networkInterfaces)) {
    if (!interfaces) continue;

    for (const iface of interfaces) {
      if (!iface.internal && iface.mac && iface.mac !== "00:00:00:00:00:00") {
        macAddress = iface.mac;
        break;
      }
    }

    if (macAddress !== "unknown") break;
  }

  factors.push(macAddress);

  // Combine all factors
  const combined = factors.join("-");

  // Generate stable hash
  return crypto
    .createHash("sha256")
    .update(combined)
    .digest("hex")
    .substring(0, 16);
}

/**
 * Get instance ID from environment variable or generate one
 */
export function getInstanceId(): string {
  // Allow override via environment variable for testing
  if (process.env.INSTANCE_ID) {
    return process.env.INSTANCE_ID;
  }

  return getInstanceFingerprint();
}
