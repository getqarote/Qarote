import { describe, expect, it } from "vitest";

import { QUIZ_QUESTIONS, QUIZ_TIERS } from "./quiz-data";
import { breakdownByArea, resolveScore, resolveTier } from "./quiz-logic";

// --- resolveScore ---

describe("resolveScore", () => {
  it("returns 0 when every answer is null", () => {
    const answers = QUIZ_QUESTIONS.map(() => null);
    expect(resolveScore(answers)).toBe(0);
  });

  it("returns 0 when every answer is wrong", () => {
    const answers = QUIZ_QUESTIONS.map((q) => (q.a === 0 ? 1 : 0));
    expect(resolveScore(answers)).toBe(0);
  });

  it("returns 100 when every answer is correct", () => {
    const answers = QUIZ_QUESTIONS.map((q) => q.a);
    expect(resolveScore(answers)).toBe(100);
  });

  it("rounds the percentage (10/20 correct → 50)", () => {
    const answers = QUIZ_QUESTIONS.map((q, i) => (i < 10 ? q.a : null));
    expect(resolveScore(answers)).toBe(50);
  });
});

// --- resolveTier (thresholds: reactive 0, proactive 60, production 85) ---

describe("resolveTier", () => {
  it("returns reactive below the proactive floor", () => {
    expect(resolveTier(0).id).toBe("reactive");
    expect(resolveTier(59).id).toBe("reactive");
  });

  it("returns proactive in the middle band", () => {
    expect(resolveTier(60).id).toBe("proactive");
    expect(resolveTier(84).id).toBe("proactive");
  });

  it("returns production-grade at and above 85", () => {
    expect(resolveTier(85).id).toBe("production");
    expect(resolveTier(100).id).toBe("production");
  });

  it("every tier exposes a hero gradient class and a dot color", () => {
    for (const tier of QUIZ_TIERS) {
      expect(tier.cls).toMatch(/^t-/);
      expect(tier.dot).toMatch(/^#/);
    }
  });
});

// --- breakdownByArea ---

describe("breakdownByArea", () => {
  it("covers all four areas and accounts for every question", () => {
    const answers = QUIZ_QUESTIONS.map(() => null);
    const breakdown = breakdownByArea(answers);
    expect(breakdown).toHaveLength(4);
    const counted = breakdown.reduce((sum, a) => sum + a.total, 0);
    expect(counted).toBe(QUIZ_QUESTIONS.length);
  });

  it("reports 100% per area when all answers are correct", () => {
    const answers = QUIZ_QUESTIONS.map((q) => q.a);
    for (const area of breakdownByArea(answers)) {
      expect(area.correct).toBe(area.total);
      expect(area.pct).toBe(100);
    }
  });

  it("reports 0% per area when all answers are null", () => {
    const answers = QUIZ_QUESTIONS.map(() => null);
    for (const area of breakdownByArea(answers)) {
      expect(area.correct).toBe(0);
      expect(area.pct).toBe(0);
    }
  });
});

// --- quiz-data integrity ---

describe("QUIZ_QUESTIONS integrity", () => {
  it("has 20 questions, each with 4 options and a valid answer index", () => {
    expect(QUIZ_QUESTIONS).toHaveLength(20);
    for (const q of QUIZ_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(q.a).toBeGreaterThanOrEqual(0);
      expect(q.a).toBeLessThanOrEqual(3);
    }
  });
});
