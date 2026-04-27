import { describe, expect, it } from "vitest";

import { QUIZ_QUESTIONS } from "./quiz-data";
import {
  isValidTierSlug,
  resolveScore,
  resolveTier,
  tierFromSlug,
  TIERS,
} from "./quiz-logic";

// --- resolveScore ---

describe("resolveScore", () => {
  it("returns 0 when all answers are wrong", () => {
    const answers = QUIZ_QUESTIONS.map(() => -1);
    expect(resolveScore(answers, QUIZ_QUESTIONS)).toBe(0);
  });

  it("returns 100 when all answers are correct", () => {
    const answers = QUIZ_QUESTIONS.map((q) => q.correctIndex);
    expect(resolveScore(answers, QUIZ_QUESTIONS)).toBe(100);
  });

  it("returns 50 when half are correct (rounds correctly)", () => {
    const answers = QUIZ_QUESTIONS.map((q, i) =>
      i < 10 ? q.correctIndex : -1
    );
    expect(resolveScore(answers, QUIZ_QUESTIONS)).toBe(50);
  });

  it("treats null answers as incorrect", () => {
    const answers: (number | null)[] = QUIZ_QUESTIONS.map(() => null);
    expect(resolveScore(answers, QUIZ_QUESTIONS)).toBe(0);
  });

  it("returns 0 for empty questions array", () => {
    expect(resolveScore([], [])).toBe(0);
  });

  it("rounds fractional percentages", () => {
    // 1 correct out of 3 = 33.33... → 33
    const questions = QUIZ_QUESTIONS.slice(0, 3);
    const answers = [questions[0].correctIndex, -1, -1];
    expect(resolveScore(answers, questions)).toBe(33);
  });

  it("treats missing answers as incorrect when answers.length < questions.length", () => {
    // 1 correct answer provided for a 3-question slice → 1/3 = 33
    const questions = QUIZ_QUESTIONS.slice(0, 3);
    const answers = [questions[0].correctIndex]; // only 1 answer for 3 questions
    expect(resolveScore(answers, questions)).toBe(33);
  });

  it("ignores extra answers when answers.length > questions.length", () => {
    // 1 correct answer for a 1-question slice, plus 2 extra answers → 1/1 = 100
    const questions = QUIZ_QUESTIONS.slice(0, 1);
    const answers = [questions[0].correctIndex, 0, 0];
    expect(resolveScore(answers, questions)).toBe(100);
  });
});

// --- resolveTier ---

describe("resolveTier", () => {
  it("returns reactive for score 0", () => {
    expect(resolveTier(0).slug).toBe("reactive");
  });

  it("returns reactive for score 40", () => {
    expect(resolveTier(40).slug).toBe("reactive");
  });

  it("returns proactive for score 41", () => {
    expect(resolveTier(41).slug).toBe("proactive");
  });

  it("returns proactive for score 70", () => {
    expect(resolveTier(70).slug).toBe("proactive");
  });

  it("returns production-grade for score 71", () => {
    expect(resolveTier(71).slug).toBe("production-grade");
  });

  it("returns production-grade for score 100", () => {
    expect(resolveTier(100).slug).toBe("production-grade");
  });

  it("every tier has a CTA URL containing UTM params", () => {
    for (const tier of Object.values(TIERS)) {
      expect(tier.ctaUrl).toContain("utm_source=quiz");
      expect(tier.ctaUrl).toContain("utm_campaign=");
    }
  });
});

// --- tierFromSlug ---

describe("tierFromSlug", () => {
  it("resolves known slugs", () => {
    expect(tierFromSlug("reactive").slug).toBe("reactive");
    expect(tierFromSlug("proactive").slug).toBe("proactive");
    expect(tierFromSlug("production-grade").slug).toBe("production-grade");
  });

  it("falls back to reactive for unknown slugs", () => {
    expect(tierFromSlug("nonsense").slug).toBe("reactive");
    expect(tierFromSlug("").slug).toBe("reactive");
  });
});

// --- isValidTierSlug ---

describe("isValidTierSlug", () => {
  it("accepts valid slugs", () => {
    expect(isValidTierSlug("reactive")).toBe(true);
    expect(isValidTierSlug("proactive")).toBe(true);
    expect(isValidTierSlug("production-grade")).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(isValidTierSlug("expert")).toBe(false);
    expect(isValidTierSlug("")).toBe(false);
    expect(isValidTierSlug("REACTIVE")).toBe(false);
  });
});

// --- quiz-data integrity ---

describe("QUIZ_QUESTIONS integrity", () => {
  it("has exactly 20 questions", () => {
    expect(QUIZ_QUESTIONS).toHaveLength(20);
  });

  it("has 7 beginner, 7 intermediate, 6 advanced questions", () => {
    const counts = QUIZ_QUESTIONS.reduce<Record<string, number>>(
      (acc, q) => ({ ...acc, [q.difficulty]: (acc[q.difficulty] ?? 0) + 1 }),
      {}
    );
    expect(counts.beginner).toBe(7);
    expect(counts.intermediate).toBe(7);
    expect(counts.advanced).toBe(6);
  });

  it("every question has exactly 4 options", () => {
    for (const q of QUIZ_QUESTIONS) {
      expect(q.options).toHaveLength(4);
    }
  });

  it("every correctIndex is within 0–3", () => {
    for (const q of QUIZ_QUESTIONS) {
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
    }
  });

  it("IDs are unique and sequential from 1", () => {
    const ids = QUIZ_QUESTIONS.map((q) => q.id);
    expect(ids).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("every question has a non-empty explanation", () => {
    for (const q of QUIZ_QUESTIONS) {
      expect(q.explanation.trim().length).toBeGreaterThan(0);
    }
  });
});
