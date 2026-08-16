import { useTranslation } from "react-i18next";

import { IconCheck } from "@/components/ui/icons";

/** The three onboarding stages, in order. Index === step number. */
const STEP_KEYS = ["stepAccount", "stepConnect", "stepScan"] as const;

interface OnboardingStepperProps {
  /** Zero-based index of the current step (0 Account · 1 Connect · 2 Scan). */
  current: number;
}

/**
 * In-card stepper header for the post-signup wizard. Each stage shows a round
 * badge + label: the current stage is carrot-outlined, completed stages are
 * solid-success with a ✓, upcoming stages are muted. A thin bar separates the
 * badges. The current step carries `aria-current="step"` and an sr-only
 * "Step N of 3" announces position for assistive tech.
 */
export function OnboardingStepper({ current }: OnboardingStepperProps) {
  const { t } = useTranslation("onboarding");

  return (
    <div className="border-b border-border px-6 py-4">
      <span className="sr-only">
        {t("stepProgress", { current: current + 1, total: STEP_KEYS.length })}
      </span>
      <ol
        className="flex items-center justify-center gap-2"
        aria-label={t("stepperLabel")}
      >
        {STEP_KEYS.map((key, index) => {
          const isDone = index < current;
          const isCurrent = index === current;

          return (
            <li
              key={key}
              className="flex items-center gap-2"
              {...(isCurrent ? { "aria-current": "step" as const } : {})}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={[
                    "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border text-[11px] font-medium",
                    isDone
                      ? "border-success bg-success text-white"
                      : isCurrent
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground",
                  ].join(" ")}
                >
                  {isDone ? (
                    <IconCheck className="h-3 w-auto shrink-0" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={[
                    "text-xs",
                    isCurrent
                      ? "font-semibold text-foreground"
                      : isDone
                        ? "text-foreground"
                        : "text-muted-foreground",
                  ].join(" ")}
                >
                  {t(key)}
                </span>
              </span>
              {index < STEP_KEYS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="h-[1.5px] w-6 shrink-0 bg-border sm:w-10"
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
