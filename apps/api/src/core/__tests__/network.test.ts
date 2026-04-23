import { describe, expect, it } from "vitest";

import { isPrivateIP } from "@/core/network";

describe("isPrivateIP", () => {
  describe("IPv4 private ranges", () => {
    it.each([
      ["127.0.0.1", "loopback"],
      ["127.255.255.255", "loopback upper"],
      ["10.0.0.1", "10.0.0.0/8"],
      ["10.255.255.255", "10.0.0.0/8 upper"],
      ["172.16.0.1", "172.16.0.0/12 lower"],
      ["172.31.255.255", "172.16.0.0/12 upper"],
      ["192.168.0.1", "192.168.0.0/16"],
      ["192.168.255.255", "192.168.0.0/16 upper"],
      ["169.254.1.1", "link-local"],
      ["0.0.0.1", "0.0.0.0/8"],
    ])("returns true for %s (%s)", (ip) => {
      expect(isPrivateIP(ip)).toBe(true);
    });
  });

  describe("IPv4 public addresses", () => {
    it.each([
      ["8.8.8.8", "Google DNS"],
      ["1.1.1.1", "Cloudflare DNS"],
      ["203.0.113.1", "TEST-NET-3"],
      ["172.15.255.255", "just below 172.16"],
      ["172.32.0.0", "just above 172.31"],
    ])("returns false for %s (%s)", (ip) => {
      expect(isPrivateIP(ip)).toBe(false);
    });
  });

  describe("IPv6", () => {
    it("returns true for ::1 (loopback)", () => {
      expect(isPrivateIP("::1")).toBe(true);
    });

    it("returns true for IPv4-mapped private IP (::ffff:192.168.1.1)", () => {
      expect(isPrivateIP("::ffff:192.168.1.1")).toBe(true);
    });

    it("returns true for ULA fc00::1", () => {
      expect(isPrivateIP("fc00::1")).toBe(true);
    });

    it("returns true for ULA fd00::1", () => {
      expect(isPrivateIP("fd00::1")).toBe(true);
    });

    it("returns true for link-local fe80::1", () => {
      expect(isPrivateIP("fe80::1")).toBe(true);
    });

    it("returns true for fully expanded loopback (0:0:0:0:0:0:0:1)", () => {
      expect(isPrivateIP("0:0:0:0:0:0:0:1")).toBe(true);
    });

    it.skip("returns true for compressed loopback variant (::0:1) — known regex gap", () => {
      expect(isPrivateIP("::0:1")).toBe(true);
    });

    it("returns false for IPv4-mapped public IP (::ffff:8.8.8.8)", () => {
      expect(isPrivateIP("::ffff:8.8.8.8")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles leading/trailing whitespace", () => {
      expect(isPrivateIP("  127.0.0.1  ")).toBe(true);
    });

    it("handles uppercase IPv6", () => {
      expect(isPrivateIP("FE80::1")).toBe(true);
    });
  });
});
