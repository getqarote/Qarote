import { describe, expect, it } from "vitest";

import { parseRabbitMQUrl, suggestServerName } from "./rabbitmqUrlParser";

describe("parseRabbitMQUrl — provenance", () => {
  it("HTTPS management URL, no port: mgmt port defaulted, AMQP port inferred", () => {
    const p = parseRabbitMQUrl("https://rabbit.example.com");
    expect(p).not.toBeNull();
    expect(p!.port).toBe(443);
    expect(p!.amqpPort).toBe(5671);
    expect(p!.provenance).toEqual({
      host: "detected",
      port: "defaulted",
      amqpPort: "inferred",
      useHttps: "detected",
    });
  });

  it("HTTP management URL with explicit port: mgmt port detected, AMQP port inferred", () => {
    const p = parseRabbitMQUrl("http://localhost:15672");
    expect(p!.port).toBe(15672);
    expect(p!.amqpPort).toBe(5672);
    expect(p!.provenance.port).toBe("detected");
    expect(p!.provenance.amqpPort).toBe("inferred");
  });

  it("AMQPS URL with explicit port: AMQP port detected, mgmt port inferred", () => {
    const p = parseRabbitMQUrl("amqps://user:pass@host.example.com:5671/vh");
    expect(p!.amqpPort).toBe(5671);
    expect(p!.port).toBe(443);
    expect(p!.provenance.amqpPort).toBe("detected");
    expect(p!.provenance.port).toBe("inferred");
  });

  it("AMQP URL, no port: AMQP port defaulted, mgmt port inferred", () => {
    const p = parseRabbitMQUrl("amqp://host.example.com");
    expect(p!.amqpPort).toBe(5672);
    expect(p!.port).toBe(15672);
    expect(p!.provenance.amqpPort).toBe("defaulted");
    expect(p!.provenance.port).toBe("inferred");
  });

  it("returns null for an unparseable input", () => {
    expect(parseRabbitMQUrl("")).toBeNull();
    expect(parseRabbitMQUrl("not a url")).toBeNull();
  });
});

describe("parseRabbitMQUrl — provenance of host/TLS/credentials/vhost", () => {
  it("explicit https scheme + creds + vhost: TLS/username/vhost all detected", () => {
    const p = parseRabbitMQUrl("https://user:pass@rabbit.example.com:443/myvh");
    expect(p).not.toBeNull();
    expect(p!.useHttps).toBe(true);
    expect(p!.username).toBe("user");
    expect(p!.vhost).toBe("/myvh");
    expect(p!.provenance.host).toBe("detected");
    expect(p!.provenance.useHttps).toBe("detected");
    expect(p!.provenance.username).toBe("detected");
    expect(p!.provenance.vhost).toBe("detected");
  });

  it("no scheme on a domain: TLS defaulted (https synthesised), no creds/vhost keys", () => {
    const p = parseRabbitMQUrl("rabbit.example.com");
    expect(p!.useHttps).toBe(true);
    expect(p!.provenance.useHttps).toBe("defaulted");
    expect(p!.provenance.username).toBeUndefined();
    expect(p!.provenance.vhost).toBeUndefined();
  });

  it("explicit http scheme, no creds/vhost: TLS detected, creds/vhost keys absent", () => {
    const p = parseRabbitMQUrl("http://localhost:15672");
    expect(p!.useHttps).toBe(false);
    expect(p!.provenance.useHttps).toBe("detected");
    expect(p!.username).toBeUndefined();
    expect(p!.provenance.username).toBeUndefined();
    expect(p!.vhost).toBeUndefined();
    expect(p!.provenance.vhost).toBeUndefined();
  });

  it("amqps scheme with creds + vhost: TLS/username/vhost detected", () => {
    const p = parseRabbitMQUrl("amqps://u:p@host.example.com:5671/v");
    expect(p!.useHttps).toBe(true);
    expect(p!.provenance.useHttps).toBe("detected");
    expect(p!.provenance.username).toBe("detected");
    expect(p!.provenance.vhost).toBe("detected");
  });
});

describe("suggestServerName", () => {
  it("recognises known providers", () => {
    expect(suggestServerName("kangaroo.rmq.cloudamqp.com")).toBe("CloudAMQP");
    expect(suggestServerName("rabbit.aws-prod.internal")).toBe("AWS RabbitMQ");
    expect(suggestServerName("mq.azure.example.com")).toBe("Azure RabbitMQ");
  });

  it("falls back to a capitalised first label", () => {
    expect(suggestServerName("payments.example.com")).toBe("Payments RabbitMQ");
  });

  it("returns undefined for an empty host", () => {
    expect(suggestServerName("")).toBeUndefined();
  });
});
