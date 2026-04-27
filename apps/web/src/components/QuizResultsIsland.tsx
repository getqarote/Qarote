import type { SupportedLocale } from "@qarote/i18n";

import { QUIZ_QUESTIONS } from "@/lib/quiz-data";
import type { TierSlug } from "@/lib/quiz-logic";
import { resolveTier, tierFromSlug } from "@/lib/quiz-logic";

import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";
import { QuizResults } from "@/components/quiz/QuizResults";
import StickyNav from "@/components/StickyNav";
import { TawkTo } from "@/components/TawkTo";

interface QuizResultsIslandProps {
  tier: TierSlug;
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
}

export default function QuizResultsIsland({
  tier: tierProp,
  locale = "en",
  resources,
}: QuizResultsIslandProps) {
  // Read score from URL params on the client; fall back to mid-tier default per tier
  let score: number;
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const rawScore = Number(params.get("score"));
    score = Number.isFinite(rawScore)
      ? Math.max(0, Math.min(100, rawScore))
      : -1;
  } else {
    score = -1;
  }

  // Validate: if no score in URL, infer from tier midpoint
  const tierResult = tierFromSlug(tierProp);
  if (score < 0) {
    const [min, max] = tierResult.range;
    score = Math.round((min + max) / 2);
  }

  // Validate consistency: score must belong to the tier from the URL path
  const inferredTier = resolveTier(score);
  const resolvedTier =
    inferredTier.slug === tierProp ? inferredTier : tierResult;

  const correctCount = Math.round((score / 100) * QUIZ_QUESTIONS.length);

  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen font-sans bg-background">
        <StickyNav />
        <QuizResults
          tier={resolvedTier}
          score={score}
          correctCount={correctCount}
          total={QUIZ_QUESTIONS.length}
        />
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}
