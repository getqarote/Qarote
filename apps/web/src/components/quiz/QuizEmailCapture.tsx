import { useEffect, useState } from "react";

import { trackQuizEmailCaptured } from "@/lib/quiz-gtm";
import type { TierSlug } from "@/lib/quiz-logic";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface QuizEmailCaptureProps {
  tier: TierSlug;
  score: number;
}

export function QuizEmailCapture({ tier, score }: QuizEmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState(0);

  const apiUrl = (import.meta.env.PUBLIC_API_URL as string | undefined) ?? "";

  // Count down the rate-limit cooldown
  useEffect(() => {
    if (retryCountdown <= 0) return;
    const id = setTimeout(() => setRetryCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [retryCountdown]);

  async function submitEmail() {
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMessage(null);
    setRetryCountdown(0);

    try {
      const res = await fetch(`${apiUrl}/api/quiz/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), tier, score }),
      });

      if (!res.ok) {
        let message = "Something went wrong. Try again in a moment.";
        if (res.status === 429) {
          const retryAfter = res.headers.get("Retry-After");
          const seconds = retryAfter ? parseInt(retryAfter, 10) : 0;
          if (seconds > 0) {
            setRetryCountdown(seconds);
            message = `Rate limit reached — you can retry in ${seconds}s.`;
          } else {
            message = "Rate limit reached — try again later.";
          }
        } else {
          try {
            const body = (await res.json()) as { error?: string };
            if (body.error) message = body.error;
          } catch {
            // keep default message
          }
        }
        setErrorMessage(message);
        setStatus("error");
        return;
      }

      setStatus("success");
      trackQuizEmailCaptured({ tier });
    } catch {
      setErrorMessage("Something went wrong. Try again in a moment.");
      setStatus("error");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitEmail();
  }

  function handleRetry() {
    void submitEmail();
  }

  if (status === "success") {
    return (
      <p className="text-sm text-muted-foreground text-center py-2">
        ✓ You're on the list. We'll keep it useful.
      </p>
    );
  }

  return (
    <div className="mt-8 pt-8 border-t border-border">
      <p className="text-sm font-medium text-foreground mb-1">
        Want RabbitMQ tips in your inbox?
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        No pitch. Operator content from the team building Qarote.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-label="Email address"
          className="flex-1"
          disabled={status === "loading"}
        />
        <Button
          type="submit"
          variant="cta"
          size="pillMd"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Sending…" : "Subscribe"}
        </Button>
      </form>
      {status === "error" && errorMessage && (
        <div className="mt-2 flex items-center gap-3">
          <p className="flex-1 text-xs text-destructive">{errorMessage}</p>
          {retryCountdown > 0 ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              Retry in {retryCountdown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={handleRetry}
              className="text-xs text-primary hover:underline underline-offset-2 transition-colors"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
