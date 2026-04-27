import { QUIZ_QUESTIONS } from "@/lib/quiz-data";

import { Button } from "@/components/ui/button";

interface QuizHeroProps {
  onStart: () => void;
}

const difficultyCounts = QUIZ_QUESTIONS.reduce<Record<string, number>>(
  (acc, q) => ({ ...acc, [q.difficulty]: (acc[q.difficulty] ?? 0) + 1 }),
  {}
);

export function QuizHero({ onStart }: QuizHeroProps) {
  return (
    <section className="flex flex-col items-center text-center px-4 py-20 max-w-2xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
        Free · 20 questions · ~5 minutes
      </div>

      <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-4">
        RabbitMQ Skills Assessment
      </h1>

      <p className="text-lg text-muted-foreground mb-4 max-w-xl">
        Test your knowledge of queues, exchanges, consumers, and production
        patterns. Get a score, a tier verdict, and see where your gaps are.
      </p>

      <p className="text-sm text-muted-foreground mb-10">
        The closest thing to a free RabbitMQ certification quiz online.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 items-center mb-12">
        <Button variant="cta" size="pill" onClick={onStart}>
          Start the assessment
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

      <div className="grid grid-cols-3 gap-6 w-full max-w-lg text-center">
        {[
          {
            label: "Beginner",
            key: "beginner",
            color: "bg-emerald-100 text-emerald-800",
          },
          {
            label: "Intermediate",
            key: "intermediate",
            color: "bg-amber-100 text-amber-800",
          },
          {
            label: "Advanced",
            key: "advanced",
            color: "bg-primary/10 text-primary",
          },
        ].map(({ label, key, color }) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}
            >
              {label}
            </span>
            <span className="text-2xl font-mono font-semibold text-foreground">
              {difficultyCounts[key] ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">questions</span>
          </div>
        ))}
      </div>
    </section>
  );
}
