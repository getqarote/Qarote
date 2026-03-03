/**
 * Returns true if the given IP address belongs to a private, loopback,
 * or link-local range (RFC 1918 / RFC 4193 / RFC 3927 / RFC 5735).
 */
export function isPrivateIP(ip: string): boolean {
  // IPv6 loopback
  if (ip === "::1") return true;
  // IPv4-mapped IPv6
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
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
  const lower = ip.toLowerCase();
  return (
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  );
}
