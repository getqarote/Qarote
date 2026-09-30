import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  collectPromptVersions,
  CURRENT_PROMPT_VERSIONS,
  hasPromptVersionDrift,
} from "./promptVersions";

const contextBuildersDir = path.resolve(
  __dirname,
  "../../../api/src/ee/services/llm/context-builders"
);

describe("collectPromptVersions", () => {
  it("collects the string exports of every matched module", () => {
    const versions = collectPromptVersions(
      { "./finding.context.ts": "1.1" },
      { "./config-finding.context.ts": "1.0" }
    );
    expect([...versions].sort()).toEqual(["1.0", "1.1"]);
  });

  it("returns an empty set when no context builder is present", () => {
    expect(collectPromptVersions({}, {}).size).toBe(0);
  });

  it("ignores missing or non-string exports", () => {
    expect(
      collectPromptVersions({ "./a.ts": undefined, "./b.ts": 2 }).size
    ).toBe(0);
  });
});

describe("hasPromptVersionDrift", () => {
  const current = new Set(["1.1", "1.0"]);

  it("is false for a version the build still emits", () => {
    expect(hasPromptVersionDrift("1.1", current)).toBe(false);
  });

  it("is true for a version the build no longer emits", () => {
    expect(hasPromptVersionDrift("0.9", current)).toBe(true);
  });

  it("never reports drift when the build has no context builders", () => {
    expect(hasPromptVersionDrift("0.9", new Set())).toBe(false);
  });
});

describe("CURRENT_PROMPT_VERSIONS", () => {
  it("is populated exactly when the context builders are in this tree", () => {
    const present = ["finding.context.ts", "config-finding.context.ts"].some(
      (file) => existsSync(path.join(contextBuildersDir, file))
    );
    expect(CURRENT_PROMPT_VERSIONS.size > 0).toBe(present);
  });
});
