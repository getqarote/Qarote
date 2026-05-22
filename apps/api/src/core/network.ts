import dns from "node:dns/promises";

/**
 * Returns true if the given IP address belongs to a private, loopback,
 * or link-local range (RFC 1918 / RFC 4193 / RFC 3927 / RFC 5735).
 */
export function isPrivateIP(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();

  // IPv6 loopback – compressed (::1) or fully expanded (0:0:0:0:0:0:0:1)
  if (normalized === "::1" || /^0+(:0+){6}:0*1$/.test(normalized)) return true;

  // IPv4-mapped IPv6
  const v4 = normalized.startsWith("::ffff:")
    ? normalized.slice(7)
    : normalized;
  const parts = v4.split(".").map(Number);
  if (parts.length === 4) {
    const [a, b] = parts;
    return (
      a === 127 || // 127.0.0.0/8
      a === 10 || // 10.0.0.0/8
      a === 0 || // 0.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) || // 192.168.0.0/16
      (a === 169 && b === 254) // 169.254.0.0/16 link-local
    );
  }
  // IPv6 ULA (fc00::/7) and link-local (fe80::/10)
  return (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

/**
 * Returns true if the URL is safe to use as an external HTTP endpoint.
 *
 * Resolves DNS and validates every returned IP against isPrivateIP —
 * this protects against DNS rebinding (public IP at validation time,
 * private IP at call time). Must be called both at save time AND at
 * every fetch() call in adapters that use user-supplied endpoints.
 */
export async function isSafeEndpoint(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return false;

  try {
    const [v4, v6] = await Promise.allSettled([
      dns.resolve4(parsed.hostname),
      dns.resolve6(parsed.hostname),
    ]);
    const addresses = [
      ...(v4.status === "fulfilled" ? v4.value : []),
      ...(v6.status === "fulfilled" ? v6.value : []),
    ];
    // Fail closed: no DNS records means unresolvable → unsafe
    if (addresses.length === 0) return false;
    return addresses.every((ip) => !isPrivateIP(ip));
  } catch {
    return false;
  }
}
