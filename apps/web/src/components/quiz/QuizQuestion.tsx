import { useEffect, useId, useState } from "react";

import type { QuizQuestion as QuizQuestionType } from "@/lib/quiz-data";

import { Button } from "@/components/ui/button";

interface QuizQuestionProps {
  question: QuizQuestionType;
  selectedAnswer: number | null;
  onAnswer: (index: number) => void;
  onNext: () => void;
  isLast: boolean;
}

export function QuizQuestion({
  question,
  selectedAnswer,
  onAnswer,
  onNext,
  isLast,
}: QuizQuestionProps) {
  const groupId = useId();
  const [hintOpen, setHintOpen] = useState(false);
  const answered = selectedAnswer !== null;

  useEffect(() => {
    setHintOpen(false);
  }, [question.id]);

  function optionClass(i: number): string {
    const base =
      "flex items-start gap-3 p-4 rounded-lg border transition-all duration-150";
    if (!answered) {
      const selected = selectedAnswer === i;
      return [
        base,
        "cursor-pointer hover:border-primary/50 hover:bg-primary/5",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-background",
      ].join(" ");
    }
    if (i === question.correctIndex) {
      return `${base} border-emerald-400 bg-emerald-50 cursor-default`;
    }
    if (i === selectedAnswer) {
      return `${base} border-red-400 bg-red-50 cursor-default`;
    }
    return `${base} border-border bg-background opacity-40 cursor-default`;
  }

  function dotClass(i: number): string {
    const base =
      "flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors";
    if (!answered) {
      return `${base} ${selectedAnswer === i ? "border-primary" : "border-muted-foreground/40"}`;
    }
    if (i === question.correctIndex) return `${base} border-emerald-500`;
    if (i === selectedAnswer) return `${base} border-red-500`;
    return `${base} border-muted-foreground/20`;
  }

  function dotFill(i: number) {
    if (!answered) {
      return selectedAnswer === i ? (
        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
      ) : null;
    }
    if (i === question.correctIndex) {
      return <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />;
    }
    if (i === selectedAnswer) {
      return <span className="w-2.5 h-2.5 rounded-full bg-red-500" />;
    }
    return null;
  }

  return (
    <section
      className="w-full max-w-2xl mx-auto px-4 py-6"
      aria-label="Quiz question"
    >
      <div className="flex items-start gap-2 mb-6">
        <p className="flex-1 text-lg sm:text-xl font-medium text-foreground leading-snug">
          {question.question}
        </p>
        {question.hint && (
          <button
            type="button"
            onClick={() => setHintOpen((v) => !v)}
            className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border border-border text-muted-foreground text-xs font-semibold hover:border-primary/50 hover:text-primary transition-colors"
            aria-label={hintOpen ? "Hide hint" : "Show hint"}
            aria-expanded={hintOpen}
          >
            ?
          </button>
        )}
      </div>

      {hintOpen && question.hint && (
        <div className="mb-4 px-3 py-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm leading-snug">
          {question.hint}
        </div>
      )}

      <fieldset>
        <legend className="sr-only">Choose your answer</legend>
        <div className="flex flex-col gap-3" role="radiogroup">
          {question.options.map((option, i) => {
            const inputId = `${groupId}-option-${i}`;

            return (
              <label key={i} htmlFor={inputId} className={optionClass(i)}>
                <input
                  type="radio"
                  id={inputId}
                  name={groupId}
                  value={i}
                  checked={selectedAnswer === i}
                  onChange={() => onAnswer(i)}
                  disabled={answered}
                  className="sr-only"
                />
                <span className={dotClass(i)} aria-hidden="true">
                  {dotFill(i)}
                </span>
                <span className="text-sm sm:text-base text-foreground leading-snug">
                  {option}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {answered && (
        <div
          className="mt-4 rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <span className="font-medium text-foreground">Why: </span>
          {question.explanation}
        </div>
      )}

      {answered && (
        <div className="mt-4 flex justify-end">
          <Button variant="cta" size="pill" onClick={onNext}>
            {isLast ? "See my results" : "Next question"}
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
      )}
    </section>
  );
}
