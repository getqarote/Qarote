import { describe, expect, it } from "vitest";

import { detectTunnel, normalizeTunnelCredentials } from "./tunnel";

describe("tunnel utilities", () => {
  describe("detectTunnel", () => {
    describe("ngrok detection", () => {
      it("should detect ngrok-free.app domain", () => {
        const result = detectTunnel("abc123.ngrok-free.app");
        expect(result.isTunnel).toBe(true);
        expect(result.tunnelType).toBe("ngrok");
        expect(result.shouldUseHttps).toBe(true);
        expect(result.recommendedPort).toBe(443);
      });

      it("should detect ngrok.io domain", () => {
        const result = detectTunnel("abc123.ngrok.io");
        expect(result.isTunnel).toBe(true);
        expect(result.tunnelType).toBe("ngrok");
        expect(result.shouldUseHttps).toBe(true);
      });

      it("should detect ngrok.app domain", () => {
        const result = detectTunnel("abc123.ngrok.app");
        expect(result.isTunnel).toBe(true);
        expect(result.tunnelType).toBe("ngrok");
      });

      it("should detect ngrok in hostname with protocol", () => {
        const result = detectTunnel("https://abc123.ngrok-free.app");
        expect(result.isTunnel).toBe(true);
        expect(result.tunnelType).toBe("ngrok");
        expect(result.normalizedHost).toBe("abc123.ngrok-free.app");
      });

      it("should preserve original host", () => {
        const original = "https://abc123.ngrok-free.app/";
        const result = detectTunnel(original);
        expect(result.originalHost).toBe(original);
      });
    });

    describe("localtunnel detection", () => {
      it("should detect loca.lt domain", () => {
        const result = detectTunnel("abc123.loca.lt");
        expect(result.isTunnel).toBe(true);
        expect(result.tunnelType).toBe("localtunnel");
        expect(result.shouldUseHttps).toBe(true);
        expect(result.recommendedPort).toBe(443);
      });

      it("should detect localtunnel.me domain", () => {
        const result = detectTunnel("abc123.localtunnel.me");
        expect(result.isTunnel).toBe(true);
        expect(result.tunnelType).toBe("localtunnel");
      });

      it("should detect localtunnel in hostname", () => {
        const result = detectTunnel("abc123.localtunnel");
        expect(result.isTunnel).toBe(true);
        expect(result.tunnelType).toBe("localtunnel");
      });
    });

    describe("localhost detection", () => {
      it("should detect localhost", () => {
        const result = detectTunnel("localhost");
        expect(result.isTunnel).toBe(false);
        expect(result.shouldUseHttps).toBe(false);
        expect(result.recommendedPort).toBe(15672);
      });

      it("should detect 127.0.0.1", () => {
        const result = detectTunnel("127.0.0.1");
        expect(result.isTunnel).toBe(false);
        expect(result.shouldUseHttps).toBe(false);
      });

      it("should detect localhost with port", () => {
        const result = detectTunnel("localhost:15672");
        expect(result.isTunnel).toBe(false);
        expect(result.normalizedHost).toBe("localhost:15672");
      });

      it("should detect 127.0.0.1 with port", () => {
        const result = detectTunnel("127.0.0.1:15672");
        expect(result.isTunnel).toBe(false);
      });
    });

    describe("non-tunnel hosts", () => {
      it("should detect regular domain as non-tunnel", () => {
        const result = detectTunnel("rabbitmq.example.com");
        expect(result.isTunnel).toBe(false);
        expect(result.tunnelType).toBeUndefined();
      });

      it("should use HTTPS for port 443", () => {
        const result = detectTunnel("rabbitmq.example.com", 443);
        expect(result.shouldUseHttps).toBe(true);
        expect(result.recommendedPort).toBe(443);
      });

      it("should use HTTPS for port 15671", () => {
        const result = detectTunnel("rabbitmq.example.com", 15671);
        expect(result.shouldUseHttps).toBe(true);
      });

      it("should use HTTPS for port 8443", () => {
        const result = detectTunnel("rabbitmq.example.com", 8443);
        expect(result.shouldUseHttps).toBe(true);
      });

      it("should use default port 15672 for non-tunnel", () => {
        const result = detectTunnel("rabbitmq.example.com");
        expect(result.recommendedPort).toBe(15672);
      });

      it("should use provided port for non-tunnel", () => {
        const result = detectTunnel("rabbitmq.example.com", 8080);
        expect(result.recommendedPort).toBe(8080);
      });
    });

    describe("host normalization", () => {
      it("should remove trailing slash", () => {
        const result = detectTunnel("https://example.com/");
        expect(result.normalizedHost).toBe("example.com");
      });

      it("should remove http:// protocol", () => {
        const result = detectTunnel("http://example.com");
        expect(result.normalizedHost).toBe("example.com");
      });

      it("should remove https:// protocol", () => {
        const result = detectTunnel("https://example.com");
        expect(result.normalizedHost).toBe("example.com");
      });

      it("should handle case insensitivity", () => {
        const result1 = detectTunnel("ABC123.NGROK-FREE.APP");
        const result2 = detectTunnel("abc123.ngrok-free.app");
        expect(result1.isTunnel).toBe(true);
        expect(result2.isTunnel).toBe(true);
        expect(result1.normalizedHost.toLowerCase()).toBe(
          result2.normalizedHost.toLowerCase()
        );
      });
    });
  });

  describe("normalizeTunnelCredentials", () => {
    it("should normalize ngrok tunnel credentials", () => {
      const result = normalizeTunnelCredentials("abc123.ngrok-free.app");
      expect(result.host).toBe("abc123.ngrok-free.app");
      expect(result.port).toBe(443);
      expect(result.useHttps).toBe(true);
    });

    it("should normalize localtunnel credentials", () => {
      const result = normalizeTunnelCredentials("abc123.loca.lt");
      expect(result.host).toBe("abc123.loca.lt");
      expect(result.port).toBe(443);
      expect(result.useHttps).toBe(true);
    });

    it("should normalize localhost credentials", () => {
      const result = normalizeTunnelCredentials("localhost");
      expect(result.host).toBe("localhost");
      expect(result.port).toBe(15672);
      expect(result.useHttps).toBe(false);
    });

    it("should use provided port for non-tunnel", () => {
      const result = normalizeTunnelCredentials("rabbitmq.example.com", 8080);
      expect(result.port).toBe(8080);
    });

    it("should use provided useHttps for non-tunnel", () => {
      const result = normalizeTunnelCredentials(
        "rabbitmq.example.com",
        8080,
        true
      );
      expect(result.useHttps).toBe(true);
    });

    it("should override port for tunnel if provided", () => {
      // Even if port is provided, tunnels should use HTTPS port
      const result = normalizeTunnelCredentials("abc123.ngrok-free.app", 8080);
      expect(result.port).toBe(443); // Tunnel always uses 443
      expect(result.useHttps).toBe(true);
    });

    it("should handle localhost with custom port", () => {
      const result = normalizeTunnelCredentials("localhost", 15672);
      expect(result.port).toBe(15672);
      expect(result.useHttps).toBe(false);
    });

    it("should preserve host normalization", () => {
      const result = normalizeTunnelCredentials("https://example.com/");
      expect(result.host).toBe("example.com");
    });
  });
});
