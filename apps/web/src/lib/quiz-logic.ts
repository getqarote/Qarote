import {
  type AreaKey,
  QUIZ_AREAS,
  QUIZ_QUESTIONS,
  QUIZ_TIERS,
  type QuizTier,
} from "./quiz-data";

export function resolveScore(answers: (number | null)[]): number {
  const correct = answers.reduce<number>(
    (n, a, i) => n + (a === QUIZ_QUESTIONS[i]?.a ? 1 : 0),
    0
  );
  return Math.round((correct / QUIZ_QUESTIONS.length) * 100);
}

export function resolveTier(score: number): QuizTier {
  let tier = QUIZ_TIERS[0];
  for (const t of QUIZ_TIERS) if (score >= t.min) tier = t;
  return tier;
}

export interface AreaBreakdown {
  key: AreaKey;
  name: string;
  color: string;
  correct: number;
  total: number;
  pct: number;
}

export function breakdownByArea(answers: (number | null)[]): AreaBreakdown[] {
  return (Object.keys(QUIZ_AREAS) as AreaKey[]).map((key) => {
    const qs = QUIZ_QUESTIONS.map((q, i) => ({ q, i })).filter(
      (x) => x.q.area === key
    );
    const correct = qs.reduce(
      (n, x) => n + (answers[x.i] === x.q.a ? 1 : 0),
      0
    );
    return {
      key,
      name: QUIZ_AREAS[key].name,
      color: QUIZ_AREAS[key].color,
      correct,
      total: qs.length,
      pct: Math.round((correct / qs.length) * 100),
    };
  });
}
