import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Plus } from "lucide-react";

/**
 * "Pricing questions" — FAQ accordion for the /pricing page only.
 * Ported from Pricing.html (#faq). Mirrors landing FaqSection's accordion
 * pattern (border-t list, rotating Plus → ×, runtime max-height, reduced-motion).
 */

const QUESTION_KEYS = [
  "billing",
  "selfHostedCloud",
  "quota",
  "switching",
] as const;

const PricingFaqSection = () => {
  const { t } = useTranslation("pricing");
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section className="py-[clamp(48px,6vw,88px)]">
      <div className="mx-auto max-w-[820px] px-[clamp(20px,5vw,64px)]">
        <h2 className="text-center font-display text-[clamp(30px,4.4vw,46px)] font-semibold tracking-[-0.025em] text-foreground">
          {t("questions.title")}
        </h2>

        <div className="mt-10 border-t border-border">
          {QUESTION_KEYS.map((key) => (
            <PricingFaqItem
              key={key}
              question={t(`questions.items.${key}.q`)}
              answer={t(`questions.items.${key}.a`)}
              open={openKey === key}
              onToggle={() => setOpenKey((prev) => (prev === key ? null : key))}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

type PricingFaqItemProps = {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
};

const PricingFaqItem = ({
  question,
  answer,
  open,
  onToggle,
}: PricingFaqItemProps) => {
  const answerRef = useRef<HTMLDivElement>(null);
  const panelId = `pricing-faq-panel-${question.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="border-b border-border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-5 py-[22px] text-left font-display text-[18px] font-medium tracking-[-0.01em] text-foreground"
      >
        {question}
        <Plus
          aria-hidden="true"
          className="size-[22px] shrink-0 text-primary transition-transform duration-300 motion-reduce:transition-none data-[open=true]:rotate-45"
          data-open={open}
        />
      </button>
      <div
        id={panelId}
        role="region"
        ref={answerRef}
        className="overflow-hidden transition-[max-height] duration-300 motion-reduce:transition-none"
        style={{ maxHeight: open ? answerRef.current?.scrollHeight : 0 }}
      >
        <p className="max-w-[64ch] pb-6 text-[15.5px] leading-[1.6] text-muted-foreground">
          {answer}
        </p>
      </div>
    </div>
  );
};

export default PricingFaqSection;
