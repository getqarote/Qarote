import { useEffect, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import { QUIZ_QUESTIONS } from "@/lib/quiz-data";
import { trackQuizCompleted, trackQuizStarted } from "@/lib/quiz-gtm";
import { resolveScore, resolveTier } from "@/lib/quiz-logic";

import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";
import { QuizHero } from "@/components/quiz/QuizHero";
import { QuizProgress } from "@/components/quiz/QuizProgress";
import { QuizQuestion } from "@/components/quiz/QuizQuestion";
import StickyNav from "@/components/StickyNav";
import { TawkTo } from "@/components/TawkTo";

const STORAGE_KEY = "qarote-quiz-v1";

interface SavedQuizState {
  currentIndex: number;
  answers: (number | null)[];
}

function loadSavedState(): SavedQuizState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "currentIndex" in parsed &&
      "answers" in parsed &&
      Array.isArray((parsed as SavedQuizState).answers) &&
      (parsed as SavedQuizState).answers.length === QUIZ_QUESTIONS.length
    ) {
      return parsed as SavedQuizState;
    }
  } catch {
    // storage unavailable or malformed
  }
  return null;
}

function saveState(currentIndex: number, answers: (number | null)[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ currentIndex, answers })
    );
  } catch {
    // storage may be full or unavailable
  }
}

function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

interface QuizState {
  phase: "intro" | "active" | "done";
  currentIndex: number;
  answers: (number | null)[];
}

type QuizAction =
  | { type: "START" }
  | { type: "ANSWER"; questionIndex: number; answerIndex: number }
  | { type: "NEXT" }
  | { type: "FINISH" }
  | { type: "RESUME"; currentIndex: number; answers: (number | null)[] };

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "START":
      return { ...state, phase: "active", currentIndex: 0 };

    case "ANSWER": {
      const newAnswers = [...state.answers];
      newAnswers[action.questionIndex] = action.answerIndex;
      return { ...state, answers: newAnswers };
    }

    case "NEXT":
      if (state.currentIndex >= QUIZ_QUESTIONS.length - 1) return state;
      return { ...state, currentIndex: state.currentIndex + 1 };

    case "FINISH":
      return { ...state, phase: "done" };

    case "RESUME":
      return {
        ...state,
        phase: "active",
        currentIndex: action.currentIndex,
        answers: action.answers,
      };

    default:
      return state;
  }
}

interface QuizIslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
}

export default function QuizIsland({
  locale = "en",
  resources,
}: QuizIslandProps) {
  const { t } = useTranslation("quiz");
  const [state, dispatch] = useReducer(quizReducer, {
    phase: "intro",
    currentIndex: 0,
    answers: Array(QUIZ_QUESTIONS.length).fill(null),
  });

  const [savedState, setSavedState] = useState<SavedQuizState | null>(null);

  // Check localStorage on mount for a previous session
  useEffect(() => {
    const found = loadSavedState();
    if (found && found.currentIndex > 0) {
      setSavedState(found);
    }
  }, []);

  // Persist answers to localStorage during active phase
  useEffect(() => {
    if (state.phase !== "active") return;
    saveState(state.currentIndex, state.answers);
  }, [state.phase, state.currentIndex, state.answers]);

  useEffect(() => {
    if (state.phase !== "done") return;

    clearState();

    const scorePct = resolveScore(state.answers, QUIZ_QUESTIONS);
    const tier = resolveTier(scorePct);
    const correctCount = state.answers.filter(
      (a, i) => a === QUIZ_QUESTIONS[i]?.correctIndex
    ).length;

    trackQuizCompleted({ scorePct, correctCount, tier: tier.slug });

    window.location.href = `/quiz/results/${tier.slug}/?score=${scorePct}`;
  }, [state.phase, state.answers]);

  // Warn before leaving mid-quiz
  useEffect(() => {
    if (state.phase !== "active" || state.currentIndex === 0) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.phase, state.currentIndex]);

  const currentQuestion = QUIZ_QUESTIONS[state.currentIndex];

  function handleStart() {
    clearState();
    setSavedState(null);
    dispatch({ type: "START" });
    trackQuizStarted();
  }

  function handleResume() {
    if (!savedState) return;
    dispatch({
      type: "RESUME",
      currentIndex: savedState.currentIndex,
      answers: savedState.answers,
    });
    setSavedState(null);
  }

  function handleDismissResume() {
    clearState();
    setSavedState(null);
  }

  function handleAnswer(answerIndex: number) {
    dispatch({
      type: "ANSWER",
      questionIndex: state.currentIndex,
      answerIndex,
    });
  }

  function handleNext() {
    const isLast = state.currentIndex === QUIZ_QUESTIONS.length - 1;
    if (isLast) {
      dispatch({ type: "FINISH" });
    } else {
      dispatch({ type: "NEXT" });
    }
  }

  function handleQuit() {
    window.location.href = "/quiz/";
  }

  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen font-sans bg-background flex flex-col">
        <StickyNav />

        <div className="flex-1">
          {state.phase === "intro" && (
            <>
              {savedState && (
                <div className="w-full max-w-2xl mx-auto px-4 pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                    <p className="text-foreground">
                      You left off at question{" "}
                      <span className="font-semibold">
                        {savedState.currentIndex + 1}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold">
                        {QUIZ_QUESTIONS.length}
                      </span>
                      .
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleDismissResume}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Start over
                      </button>
                      <button
                        type="button"
                        onClick={handleResume}
                        className="font-medium text-primary hover:underline underline-offset-2 transition-colors"
                      >
                        Resume →
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <QuizHero onStart={handleStart} />
            </>
          )}

          {state.phase === "active" && currentQuestion && (
            <>
              <div className="sticky top-16 z-10 bg-background shadow-sm w-full">
                <QuizProgress
                  current={state.currentIndex + 1}
                  total={QUIZ_QUESTIONS.length}
                  difficulty={currentQuestion.difficulty}
                />
              </div>
              <div className="flex flex-col items-center">
                <QuizQuestion
                  key={currentQuestion.id}
                  question={currentQuestion}
                  selectedAnswer={state.answers[state.currentIndex]}
                  onAnswer={handleAnswer}
                  onNext={handleNext}
                  isLast={state.currentIndex === QUIZ_QUESTIONS.length - 1}
                />
                <div className="w-full max-w-2xl mx-auto px-4 pb-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleQuit}
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                  >
                    Quit quiz
                  </button>
                </div>
              </div>
            </>
          )}

          {state.phase === "done" && (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              {t("calculatingResults")}
            </div>
          )}
        </div>

        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}
