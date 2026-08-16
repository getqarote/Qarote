import { logger } from "./logger";
import type { QuizTier } from "./quiz-data";

/** Tier identifier as used by the data model (`reactive` | `proactive` | `production`). */
type QuizTierId = QuizTier["id"];

function pushToDataLayer(data: Record<string, unknown>): void {
  try {
    if (typeof window === "undefined" || !Array.isArray(window.dataLayer))
      return;
    window.dataLayer.push(data);
    logger.debug("GTM quiz event pushed", data);
  } catch (error) {
    logger.error("Failed to push quiz event to dataLayer:", error);
  }
}

export function trackQuizStarted(): void {
  pushToDataLayer({ event: "quiz_started" });
}

export function trackQuizCompleted(params: {
  scorePct: number;
  correctCount: number;
  tier: QuizTierId;
}): void {
  pushToDataLayer({
    event: "quiz_completed",
    quiz_score_pct: params.scorePct,
    quiz_correct_count: params.correctCount,
    quiz_tier: params.tier,
  });
}

export function trackQuizEmailCaptured(params: { tier: QuizTierId }): void {
  pushToDataLayer({
    event: "quiz_email_captured",
    quiz_tier: params.tier,
  });
}
