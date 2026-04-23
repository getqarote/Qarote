interface MockPolicy {
  name: string;
  vhost: string;
  pattern: string;
  "apply-to": "queues" | "exchanges" | "all";
  definition: Record<string, unknown>;
  priority: number;
}

const defaults: MockPolicy = {
  name: "test-policy",
  vhost: "/",
  pattern: ".*",
  "apply-to": "all",
  definition: { "max-length": 10000 },
  priority: 0,
};

export function mockPolicy(overrides?: Partial<MockPolicy>): MockPolicy {
  return { ...defaults, ...overrides };
}
