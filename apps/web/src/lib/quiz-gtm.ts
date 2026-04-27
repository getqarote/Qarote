import { logger } from "./logger";
import type { TierSlug } from "./quiz-logic";

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
  tier: TierSlug;
}): void {
  pushToDataLayer({
    event: "quiz_completed",
    quiz_score_pct: params.scorePct,
    quiz_correct_count: params.correctCount,
    quiz_tier: params.tier,
  });
}

export function trackQuizShareClicked(params: {
  tier: TierSlug;
  scorePct: number;
}): void {
  pushToDataLayer({
    event: "quiz_share_clicked",
    quiz_tier: params.tier,
    quiz_score_pct: params.scorePct,
  });
}

export function trackQuizEmailCaptured(params: { tier: TierSlug }): void {
  pushToDataLayer({
    event: "quiz_email_captured",
    quiz_tier: params.tier,
  });
}

export function trackQuizCtaClicked(params: { tier: TierSlug }): void {
  pushToDataLayer({
    event: "quiz_cta_clicked",
    quiz_tier: params.tier,
  });
}
