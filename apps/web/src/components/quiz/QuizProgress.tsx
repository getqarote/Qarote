import type { QuizDifficulty } from "@/lib/quiz-data";

interface QuizProgressProps {
  current: number;
  total: number;
  difficulty: QuizDifficulty;
}

const DIFFICULTY_STYLES: Record<QuizDifficulty, string> = {
  beginner: "bg-emerald-100 text-emerald-800",
  intermediate: "bg-amber-100 text-amber-800",
  advanced: "bg-primary/10 text-primary",
};

export function QuizProgress({
  current,
  total,
  difficulty,
}: QuizProgressProps) {
  const pct =
    total > 0
      ? Math.max(0, Math.min(100, Math.round(((current - 1) / total) * 100)))
      : 0;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-6 pb-2">
      <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
        <span>
          Question{" "}
          <span className="font-mono font-semibold text-foreground">
            {current}
          </span>{" "}
          of{" "}
          <span className="font-mono font-semibold text-foreground">
            {total}
          </span>
        </span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_STYLES[difficulty]}`}
        >
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Question ${current} of ${total}`}
        />
      </div>
    </div>
  );
}
