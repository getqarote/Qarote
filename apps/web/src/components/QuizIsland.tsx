import "./quiz/quiz.css";

import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import { track } from "@/lib/analytics";
import {
  QUIZ_AREAS,
  QUIZ_QUESTIONS,
  QUIZ_TIERS,
  type QuizQuestion,
  type QuizTier,
} from "@/lib/quiz-data";
import {
  trackQuizCompleted,
  trackQuizEmailCaptured,
  trackQuizStarted,
} from "@/lib/quiz-gtm";
import {
  type AreaBreakdown,
  breakdownByArea,
  resolveScore,
  resolveTier,
} from "@/lib/quiz-logic";

import { IslandProvider } from "@/components/IslandProvider";

const KEYS = ["A", "B", "C", "D"] as const;

type Stage = "start" | "quiz" | "email" | "results";
type ForceTier = QuizTier["id"];

/** Result pages live at /quiz/results/<slug>/. The tier id `production`
 *  maps to the slug `production-grade`; the other two are identical. */
const TIER_SLUG: Record<ForceTier, string> = {
  reactive: "reactive",
  proactive: "proactive",
  production: "production-grade",
};

function shareUrlForTier(tier: QuizTier): string {
  return `https://qarote.io/quiz/results/${TIER_SLUG[tier.id]}/`;
}

const SIGNUP_URL = `${(import.meta.env.VITE_APP_BASE_URL as string | undefined) || ""}/auth/sign-up`;

/* ---- icons ---- */

function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M21 12.8A8 8 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

/* ---- Start ---- */

function Start({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation("quiz");
  return (
    <div className="qstart qcard">
      <div className="qstart__badge">{t("start.badge")}</div>
      <h1>{t("start.title")}</h1>
      <p>{t("start.body")}</p>
      <div className="qstart__pills">
        {QUIZ_TIERS.map((tier) => (
          <span className="qtier-pill" key={tier.id}>
            <span className="d" style={{ background: tier.dot }} /> {tier.name}
          </span>
        ))}
      </div>
      <div className="qstart__cta">
        <button
          type="button"
          className="btn btn--primary btn--lg"
          onClick={onStart}
        >
          {t("start.cta")}{" "}
          <span className="arrow">
            <ArrowIcon size={16} />
          </span>
        </button>
      </div>
      <div className="qstart__sub">{t("start.sub")}</div>
      <div className="qstart__topics">
        {Object.values(QUIZ_AREAS).map((area) => (
          <span className="chip" key={area.name}>
            {area.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---- Question ---- */

interface QuestionProps {
  index: number;
  total: number;
  question: QuizQuestion;
  answer: number | null;
  onAnswer: (n: number) => void;
  onBack: () => void;
  onNext: () => void;
}

function Question({
  index,
  total,
  question,
  answer,
  onAnswer,
  onBack,
  onNext,
}: QuestionProps) {
  const { t } = useTranslation("quiz");
  const area = QUIZ_AREAS[question.area];
  const isLast = index + 1 === total;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const n = KEYS.indexOf(e.key.toUpperCase() as (typeof KEYS)[number]);
      if (n >= 0 && n < question.options.length) {
        onAnswer(n);
      } else if (e.key >= "1" && e.key <= "4") {
        const i = Number(e.key) - 1;
        if (i < question.options.length) onAnswer(i);
      } else if (e.key === "Enter" && answer != null) {
        onNext();
      } else if (e.key === "Backspace" && index > 0) {
        e.preventDefault();
        onBack();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, answer, index, onAnswer, onBack, onNext]);

  return (
    <div>
      <div className="qprogress">
        <div className="qprogress__top">
          <span className="qprogress__count">
            <b>{index + 1}</b> / {total}
          </span>
          <span className="qprogress__area" style={{ color: area.color }}>
            {area.name}
          </span>
        </div>
        <div
          className="qprogress__track"
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={t("question.progressLabel", { index: index + 1, total })}
        >
          <div
            className="qprogress__fill"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="qcard" key={index}>
        <h2 className="qcard__q">{question.q}</h2>
        <div
          className="qoptions"
          role="radiogroup"
          aria-label={t("question.answerLabel")}
        >
          {question.options.map((option, i) => (
            <button
              type="button"
              key={i}
              className={"qoption" + (answer === i ? " sel" : "")}
              role="radio"
              aria-checked={answer === i}
              onClick={() => onAnswer(i)}
            >
              <span className="qoption__key">{KEYS[i]}</span>
              <span className="qoption__text">{option}</span>
            </button>
          ))}
        </div>
        <div className="qnav">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onBack}
            disabled={index === 0}
          >
            {t("question.back")}
          </button>
          <span className="grow" />
          <span className="qnav__hint">{t("question.hint")}</span>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onNext}
            disabled={answer == null}
          >
            {isLast ? t("question.seeResults") : t("question.next")}{" "}
            <span className="arrow">
              <ArrowIcon size={15} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Email capture ---- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailCaptureProps {
  tier: QuizTier;
  score: number;
  onDone: () => void;
}

function EmailCapture({ tier, score, onDone }: EmailCaptureProps) {
  const { t } = useTranslation("quiz");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const valid = EMAIL_RE.test(email.trim());

  const apiUrl = (import.meta.env.PUBLIC_API_URL as string | undefined) ?? "";

  async function submit() {
    if (!valid || submitting) return;
    setSubmitting(true);

    // Lead capture is best-effort: success or failure, we still advance to
    // results. The email is optional — never trap the user on this screen.
    try {
      await fetch(`${apiUrl}/api/quiz/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), tier: tier.id, score }),
      });
      trackQuizEmailCaptured({ tier: tier.id });
      track("quiz_email_captured", { tier: tier.id });
    } catch {
      // network/rate-limit error — swallow; results are not blocked.
    }
    onDone();
  }

  return (
    <div className="qemail qcard">
      <div className="qemail__ic">
        <MailIcon />
      </div>
      <h2>{t("email.title")}</h2>
      <p>{t("email.body")}</p>
      <form
        className="qemail__form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          className="qinput"
          type="email"
          autoComplete="email"
          placeholder={t("email.placeholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label={t("email.ariaLabel")}
          disabled={submitting}
        />
        <button
          type="submit"
          className="btn btn--primary btn--lg"
          disabled={!valid || submitting}
        >
          {t("email.submit")}
        </button>
        <button type="button" className="qemail__skip" onClick={onDone}>
          {t("email.skip")}
        </button>
      </form>
      <div className="qemail__note">{t("email.note")}</div>
    </div>
  );
}

/* ---- Results ---- */

interface ResultsProps {
  score: number;
  tier: QuizTier;
  answers: (number | null)[];
  onRetake: () => void;
}

function Results({ score, tier, answers, onRetake }: ResultsProps) {
  const { t } = useTranslation("quiz");
  const [copied, setCopied] = useState(false);
  const byArea: AreaBreakdown[] = breakdownByArea(answers);
  const shareUrl = shareUrlForTier(tier);
  const shareText = t("results.shareText", { score, tier: tier.name });
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  function copy() {
    try {
      void navigator.clipboard?.writeText(`${shareText} ${shareUrl}`);
    } catch {
      // clipboard unavailable — still show the copied affordance
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="qresult">
      <div className={"qresult__hero " + tier.cls}>
        <div className="qresult__tierlabel">{t("results.tierLabel")}</div>
        <div className="qresult__score">
          {score}
          <span>%</span>
        </div>
        <div className="qresult__tier">{tier.name}</div>
        <p className="qresult__blurb">{tier.blurb}</p>
        <div className="qresult__share">
          <button
            type="button"
            className="qshare-btn qshare-btn--primary"
            onClick={copy}
          >
            <CopyIcon /> {copied ? t("results.copied") : t("results.copy")}
          </button>
          <a
            className="qshare-btn"
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("results.shareX")}
          </a>
          <a
            className="qshare-btn"
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("results.shareLinkedIn")}
          </a>
        </div>
      </div>

      <div className="qbreakdown">
        <h3>{t("results.breakdownTitle")}</h3>
        <div className="qbreakdown__sub">{t("results.breakdownSub")}</div>
        {byArea.map((a) => (
          <div className="qarea" key={a.key}>
            <div className="qarea__top">
              <span className="qarea__name">{a.name}</span>
              <span className="qarea__score">
                {t("results.areaScore", {
                  correct: a.correct,
                  total: a.total,
                  pct: a.pct,
                })}
              </span>
            </div>
            <div className="qarea__track">
              <div
                className="qarea__fill"
                style={{ width: `${a.pct}%`, background: a.color }}
              />
            </div>
            {a.pct < 80 && (
              <div className="qarea__gap">
                <Trans
                  t={t}
                  i18nKey="results.opportunity"
                  values={{ area: a.name.toLowerCase() }}
                  components={{ b: <b /> }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="qcta-band">
        <div className="eyebrowline">{t("results.ctaEyebrow")}</div>
        <h3>{t("results.ctaTitle")}</h3>
        <p>
          {tier.pageNote} {t("results.ctaBody")}
        </p>
        <div className="qcta-band__cta">
          <a className="btn btn--primary btn--lg" href={SIGNUP_URL}>
            {t("results.ctaButton")}{" "}
            <span className="arrow">
              <ArrowIcon size={15} />
            </span>
          </a>
        </div>
      </div>

      <div className="qresult__retake">
        <button type="button" onClick={onRetake}>
          {t("results.retake")}
        </button>
      </div>
    </div>
  );
}

/* ---- Root ---- */

interface QuizIslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
  /** When set, the island opens directly on that tier's result (shareable
   *  result pages render the same single-root game in this mode). */
  forceTier?: ForceTier;
}

function Quiz({ forceTier: forceTierProp }: { forceTier?: ForceTier }) {
  const { t } = useTranslation("quiz");

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [stage, setStage] = useState<Stage>(
    forceTierProp ? "results" : "start"
  );
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    Array(QUIZ_QUESTIONS.length).fill(null)
  );
  const [forceTier, setForceTier] = useState<ForceTier | null>(
    forceTierProp ?? null
  );

  // Theme: integrate with the site's `.dark` class on <html>. The marketing
  // site is light by default and has no theme script, so the quiz owns it here.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") setTheme(saved);
      else if (document.documentElement.classList.contains("dark"))
        setTheme("dark");
    } catch {
      // storage unavailable
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // storage unavailable
    }
  }, [theme]);

  // Deep-link: ?tier=reactive|proactive|production jumps straight to a result.
  useEffect(() => {
    if (forceTierProp) return;
    const p = new URLSearchParams(window.location.search).get("tier");
    if (p && QUIZ_TIERS.some((tier) => tier.id === p)) {
      setForceTier(p as ForceTier);
      setStage("results");
    }
  }, [forceTierProp]);

  const answered = answers.filter((a) => a != null).length;
  const score = resolveScore(answers);

  let tier = resolveTier(score);
  if (forceTier) {
    tier = QUIZ_TIERS.find((x) => x.id === forceTier) ?? tier;
  }
  const displayScore = forceTier ? tier.min + 7 : score;

  // Real completion (not a deep-linked/forced result) goes through the email
  // screen's onDone — the single place we fire completion analytics, so it
  // fires exactly once per run regardless of submit-vs-skip.
  function finishToResults() {
    const correctCount = answers.filter(
      (a, i) => a === QUIZ_QUESTIONS[i]?.a
    ).length;
    trackQuizCompleted({ scorePct: score, correctCount, tier: tier.id });
    track("quiz_completed", {
      tier: tier.id,
      score_pct: score,
      correct_count: correctCount,
    });
    setStage("results");
  }

  function setAnswer(n: number) {
    setAnswers((prev) => {
      const copy = [...prev];
      copy[idx] = n;
      return copy;
    });
  }

  function next() {
    if (idx + 1 < QUIZ_QUESTIONS.length) setIdx(idx + 1);
    else setStage("email");
  }

  function back() {
    setIdx(Math.max(0, idx - 1));
  }

  function start() {
    setStage("quiz");
    setIdx(0);
    trackQuizStarted();
    track("quiz_started");
  }

  function restart() {
    setAnswers(Array(QUIZ_QUESTIONS.length).fill(null));
    setIdx(0);
    setForceTier(null);
    setStage("start");
  }

  return (
    <div className="quizpage">
      <div className="quizpage__bar">
        <a className="brand" href="/">
          <img
            src="/images/new_icon.svg"
            alt=""
            aria-hidden="true"
            width={15}
            height={20}
            className="h-5 w-auto"
          />
          Qarote
        </a>
        {(stage === "quiz" || stage === "email") && (
          <span className="qexit">
            {t("bar.answered", {
              answered,
              total: QUIZ_QUESTIONS.length,
            })}
          </span>
        )}
        <a className="qexit" href="/">
          {t("bar.exit")}
        </a>
        <button
          type="button"
          className="qtheme"
          aria-label={t("bar.toggleTheme")}
          onClick={() => setTheme((cur) => (cur === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      <div className="quizstage">
        <div className="quizframe">
          {stage === "start" && <Start onStart={start} />}
          {stage === "quiz" && (
            <Question
              index={idx}
              total={QUIZ_QUESTIONS.length}
              question={QUIZ_QUESTIONS[idx]}
              answer={answers[idx]}
              onAnswer={setAnswer}
              onBack={back}
              onNext={next}
            />
          )}
          {stage === "email" && (
            <EmailCapture tier={tier} score={score} onDone={finishToResults} />
          )}
          {stage === "results" && (
            <Results
              score={displayScore}
              tier={tier}
              answers={answers}
              onRetake={restart}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuizIsland({
  locale = "en",
  resources,
  forceTier,
}: QuizIslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <Quiz forceTier={forceTier} />
    </IslandProvider>
  );
}
