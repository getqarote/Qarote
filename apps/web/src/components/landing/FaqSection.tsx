import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Plus } from "lucide-react";

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"] as const;

const FaqSection = () => {
  const { t } = useTranslation("landing");
  const { t: tFaq } = useTranslation("faq");
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section id="faq" className="py-[clamp(64px,9vw,128px)]">
      <div className="mx-auto max-w-[820px] px-[clamp(20px,5vw,64px)]">
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className="text-center font-display text-[clamp(30px,4.4vw,46px)] font-semibold tracking-[-0.025em] text-foreground">
            {t("faqSection.title")}
          </h2>
          <p className="mt-[18px] text-center text-muted-foreground">
            {t("faqSection.subtitle")}
          </p>
        </div>

        <div className="mt-10 border-t border-border">
          {FAQ_KEYS.map((key) => (
            <FaqItem
              key={key}
              question={tFaq(`${key}.question`)}
              answer={tFaq(`${key}.answer`)}
              open={openKey === key}
              onToggle={() => setOpenKey((prev) => (prev === key ? null : key))}
            />
          ))}
        </div>

        <div className="mt-16 text-center">
          <h3 className="mb-4 text-2xl font-normal text-foreground">
            {t("faqSection.stillHaveQuestions")}
          </h3>
          <p className="mx-auto mb-6 max-w-2xl text-muted-foreground">
            {t("faqSection.stillHaveQuestionsDesc")}
          </p>
          <button
            type="button"
            onClick={() => {
              if (window.Tawk_API) {
                window.Tawk_API.maximize();
              } else {
                window.location.href = "mailto:support@qarote.io";
              }
            }}
            className="inline-flex items-center justify-center px-4 py-3 text-base font-medium text-foreground underline decoration-1 underline-offset-[0.625rem] transition-all duration-200 hover:text-primary hover:decoration-primary sm:px-8 sm:py-4 sm:text-lg"
          >
            {t("cta.contactUs")}
          </button>
        </div>
      </div>
    </section>
  );
};

type FaqItemProps = {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
};

const FaqItem = ({ question, answer, open, onToggle }: FaqItemProps) => {
  const answerRef = useRef<HTMLDivElement>(null);
  const panelId = `faq-panel-${question.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

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

export default FaqSection;
