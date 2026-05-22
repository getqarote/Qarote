import dns from "node:dns/promises";

import { describe, expect, it, vi } from "vitest";

import { isSafeEndpoint } from "@/core/network";

vi.mock("node:dns/promises");

const mockResolve4 = vi.mocked(dns.resolve4);
const mockResolve6 = vi.mocked(dns.resolve6);

// Helper: set up resolve4 to return given IPs, resolve6 to reject (ENOTFOUND)
function mockV4Only(ips: string[]) {
  mockResolve4.mockResolvedValueOnce(ips as never);
  mockResolve6.mockRejectedValueOnce(new Error("ENOTFOUND"));
}

// Helper: set up resolve6 to return given IPs, resolve4 to reject (ENOTFOUND)
function mockV6Only(ips: string[]) {
  mockResolve4.mockRejectedValueOnce(new Error("ENOTFOUND"));
  mockResolve6.mockResolvedValueOnce(ips as never);
}

describe("isSafeEndpoint", () => {
  describe("URL validation", () => {
    it("rejects a non-URL string", async () => {
      expect(await isSafeEndpoint("not a url")).toBe(false);
    });

    it("rejects non-http/https protocols", async () => {
      expect(await isSafeEndpoint("ftp://example.com")).toBe(false);
      expect(await isSafeEndpoint("file:///etc/passwd")).toBe(false);
    });
  });

  describe("public endpoints", () => {
    it("approves a public IPv4 address", async () => {
      mockV4Only(["8.8.8.8"]);
      expect(await isSafeEndpoint("http://example.com")).toBe(true);
    });

    it("approves when all resolved IPs are public", async () => {
      mockV4Only(["1.1.1.1", "8.8.4.4"]);
      expect(await isSafeEndpoint("https://example.com")).toBe(true);
    });
  });

  describe("private / loopback endpoint rejection (IPv4)", () => {
    it.each([
      ["http://localhost", ["127.0.0.1"], "loopback via localhost"],
      ["http://192.168.1.1", ["192.168.1.1"], "RFC 1918 class C"],
      ["http://10.0.0.1", ["10.0.0.1"], "RFC 1918 class A"],
      ["http://172.16.5.5", ["172.16.5.5"], "RFC 1918 class B"],
      ["http://169.254.169.254", ["169.254.169.254"], "AWS metadata service"],
    ])("rejects %s (%s)", async (url, ips) => {
      mockV4Only(ips);
      expect(await isSafeEndpoint(url)).toBe(false);
    });
  });

  describe("IPv6 private addresses", () => {
    it("rejects ULA address (fc00::/7)", async () => {
      mockV6Only(["fd00::1"]);
      expect(await isSafeEndpoint("http://ipv6-private.example.com")).toBe(
        false
      );
    });

    it("rejects link-local address (fe80::/10)", async () => {
      mockV6Only(["fe80::1"]);
      expect(await isSafeEndpoint("http://link-local.example.com")).toBe(false);
    });

    it("rejects loopback (::1)", async () => {
      mockV6Only(["::1"]);
      expect(await isSafeEndpoint("http://ipv6-loopback.example.com")).toBe(
        false
      );
    });
  });

  describe("DNS rebinding", () => {
    it("rejects when at least one resolved IP is private", async () => {
      // Simulates a multi-A DNS rebinding response mixing public + private
      mockV4Only(["8.8.8.8", "192.168.1.1"]);
      expect(await isSafeEndpoint("http://rebind.example.com")).toBe(false);
    });
  });

  describe("DNS resolution failure", () => {
    it("treats DNS failure on both v4 and v6 as unsafe", async () => {
      mockResolve4.mockRejectedValueOnce(new Error("ENOTFOUND"));
      mockResolve6.mockRejectedValueOnce(new Error("ENOTFOUND"));
      expect(await isSafeEndpoint("http://no-such-host.example.com")).toBe(
        false
      );
    });

    it("treats empty DNS result (both v4 and v6 empty) as unsafe", async () => {
      mockResolve4.mockResolvedValueOnce([] as never);
      mockResolve6.mockResolvedValueOnce([] as never);
      expect(await isSafeEndpoint("http://no-records.example.com")).toBe(false);
    });

    it("allows v4-only hosts where v6 lookup fails", async () => {
      mockResolve4.mockResolvedValueOnce(["8.8.8.8"] as never);
      mockResolve6.mockRejectedValueOnce(new Error("ENOTFOUND"));
      expect(await isSafeEndpoint("http://v4-only.example.com")).toBe(true);
    });
  });
});
