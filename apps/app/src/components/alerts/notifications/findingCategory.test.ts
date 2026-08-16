import { describe, expect, it } from "vitest";

import {
  categoryCounts,
  FINDING_CATEGORIES,
  resourceTypeToCategory,
} from "./findingCategory";

describe("resourceTypeToCategory", () => {
  it("pluralizes the common resource types", () => {
    expect(resourceTypeToCategory("queue")).toBe("queues");
    expect(resourceTypeToCategory("exchange")).toBe("exchanges");
    expect(resourceTypeToCategory("policy")).toBe("policies");
    expect(resourceTypeToCategory("vhost")).toBe("vhosts");
    expect(resourceTypeToCategory("user")).toBe("users");
  });

  it("folds cluster findings into nodes", () => {
    expect(resourceTypeToCategory("cluster")).toBe("nodes");
    expect(resourceTypeToCategory("node")).toBe("nodes");
  });

  it("falls back to nodes for an unknown resource type", () => {
    expect(resourceTypeToCategory("mystery")).toBe("nodes");
  });
});

describe("categoryCounts", () => {
  it("counts findings per category and zero-fills the rest", () => {
    const counts = categoryCounts([
      { resourceType: "queue" },
      { resourceType: "queue" },
      { resourceType: "exchange" },
      { resourceType: "cluster" },
    ]);
    expect(counts.queues).toBe(2);
    expect(counts.exchanges).toBe(1);
    expect(counts.nodes).toBe(1);
    expect(counts.bindings).toBe(0);
    // Every category is present so the pills can render a 0.
    expect(Object.keys(counts).sort()).toEqual([...FINDING_CATEGORIES].sort());
  });
});
