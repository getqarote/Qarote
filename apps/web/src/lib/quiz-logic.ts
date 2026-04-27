import type { QuizQuestion } from "./quiz-data";

export type TierSlug = "reactive" | "proactive" | "production-grade";

export interface TierResult {
  slug: TierSlug;
  label: string;
  range: [number, number];
  headline: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  badgeBg: string;
  badgeText: string;
}

const BASE_UTM = "utm_source=quiz&utm_medium=results";

export const TIERS: Record<TierSlug, TierResult> = {
  reactive: {
    slug: "reactive",
    label: "Reactive",
    range: [0, 40],
    headline: "You're finding out about problems after they've already hit.",
    description:
      "Most teams at this level monitor queue depth but miss rate-of-change and consumer lag — the leading indicators that give you 15 minutes of warning instead of zero.",
    ctaText: "See what you're missing — try Qarote free",
    ctaUrl: `https://demo.qarote.io/?${BASE_UTM}&utm_campaign=reactive_tier`,
    badgeBg: "bg-red-100",
    badgeText: "text-red-800",
  },
  proactive: {
    slug: "proactive",
    label: "Proactive",
    range: [41, 70],
    headline: "Solid fundamentals. The gaps are in depth, not basics.",
    description:
      "You have alerting in place but likely lack multi-broker visibility and retention beyond 24 hours. The next incident will be one you haven't seen before.",
    ctaText: "Close the gaps — explore Qarote",
    ctaUrl: `https://demo.qarote.io/?${BASE_UTM}&utm_campaign=proactive_tier`,
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
  },
  "production-grade": {
    slug: "production-grade",
    label: "Production-Grade",
    range: [71, 100],
    headline: "You know your brokers. Now make sure your team does too.",
    description:
      "Your setup is solid. If you're running multiple brokers or teams, workspaces and SSO are the next unlock — so your monitoring scales with your org.",
    ctaText: "Compare plans",
    ctaUrl: `https://demo.qarote.io/?${BASE_UTM}&utm_campaign=production_grade_tier`,
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
  },
};

export function resolveScore(
  answers: (number | null)[],
  questions: QuizQuestion[]
): number {
  if (questions.length === 0) return 0;
  const correct = answers.reduce<number>((count, answer, i) => {
    return answer === questions[i]?.correctIndex ? count + 1 : count;
  }, 0);
  return Math.round((correct / questions.length) * 100);
}

export function resolveTier(scorePct: number): TierResult {
  if (scorePct <= TIERS.reactive.range[1]) return TIERS.reactive;
  if (scorePct <= TIERS.proactive.range[1]) return TIERS.proactive;
  return TIERS["production-grade"];
}

export function tierFromSlug(slug: string): TierResult {
  if (slug in TIERS) return TIERS[slug as TierSlug];
  return TIERS.reactive;
}

export function isValidTierSlug(value: string): value is TierSlug {
  return (
    value === "reactive" ||
    value === "proactive" ||
    value === "production-grade"
  );
}
