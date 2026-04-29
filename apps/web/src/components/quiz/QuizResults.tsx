import { useState } from "react";

import { trackQuizCtaClicked, trackQuizShareClicked } from "@/lib/quiz-gtm";
import type { TierResult } from "@/lib/quiz-logic";

import { QuizEmailCapture } from "@/components/quiz/QuizEmailCapture";
import { Button } from "@/components/ui/button";

interface QuizResultsProps {
  tier: TierResult;
  score: number;
  correctCount: number;
  total: number;
}

export function QuizResults({
  tier,
  score,
  correctCount,
  total,
}: QuizResultsProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const tweetText = encodeURIComponent(
    `I scored ${score}% on the RabbitMQ Skills Assessment (${tier.label} tier). How do you compare? @Qarote`
  );
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`;

  function handleCopy() {
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        trackQuizShareClicked({ tier: tier.slug, scorePct: score });
        window.posthog?.capture("quiz_share_clicked", {
          tier: tier.slug,
          score_pct: score,
        });
      })
      .catch(() => {
        // clipboard write failed — no UI change, tracking skipped
      });
  }

  function handleCta() {
    trackQuizCtaClicked({ tier: tier.slug });
    window.posthog?.capture("quiz_cta_clicked", { tier: tier.slug });
    window.location.href = tier.ctaUrl;
  }

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-12">
      {/* Tier badge */}
      <div className="flex justify-center mb-6">
        <span
          className={`text-sm font-semibold px-4 py-1.5 rounded-full ${tier.badgeBg} ${tier.badgeText}`}
        >
          {tier.label}
        </span>
      </div>

      {/* Score */}
      <div className="text-center mb-8">
        <p
          className="font-mono text-6xl font-bold text-foreground tabular-nums"
          aria-label={`${score} percent`}
        >
          {score}
          <span className="text-3xl text-muted-foreground">%</span>
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {correctCount} / {total} correct
        </p>
      </div>

      {/* Verdict */}
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-semibold text-foreground mb-3">
          {tier.headline}
        </h1>
        <p className="text-muted-foreground">{tier.description}</p>
      </div>

      {/* Primary CTA */}
      <div className="flex justify-center mb-10">
        <Button variant="cta" size="pill" onClick={handleCta}>
          {tier.ctaText}
          <img
            src="/images/arrow-right.svg"
            alt=""
            aria-hidden="true"
            width={13}
            height={13}
            className="h-[0.8em] w-auto align-middle image-crisp"
          />
        </Button>
      </div>

      {/* Share card */}
      <div className="rounded-xl border border-border bg-muted/30 p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <img
            src="/images/new_icon.svg"
            alt=""
            aria-hidden="true"
            className="w-5 h-5"
          />
          <span className="text-sm font-display text-foreground">Qarote</span>
          <span className="text-xs text-muted-foreground ml-auto">
            qarote.io/quiz
          </span>
        </div>
        <p className="font-display text-xl font-semibold text-foreground mb-1">
          RabbitMQ Skills Assessment
        </p>
        <p className="text-muted-foreground text-sm mb-4">
          {tier.label} tier &middot;{" "}
          <span className="font-mono font-semibold">{score}%</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <span aria-hidden="true">
              {copied ? "✓ Link copied" : "Copy link"}
            </span>
            <span role="status" aria-live="polite" className="sr-only">
              {copied ? "Link copied to clipboard" : ""}
            </span>
          </Button>
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 h-9 text-sm font-medium rounded-md border border-border hover:bg-muted transition-colors text-foreground"
          >
            Share on X
          </a>
          <a
            href="/quiz/"
            className="inline-flex items-center gap-1.5 px-3 h-9 text-sm font-medium rounded-md border border-border hover:bg-muted transition-colors text-muted-foreground"
          >
            Retake quiz
          </a>
        </div>
      </div>

      <QuizEmailCapture tier={tier.slug} score={score} />
    </main>
  );
}
