import { useTranslation } from "react-i18next";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FaqSection = () => {
  const { t } = useTranslation("landing");
  const { t: tFaq } = useTranslation("faq");

  return (
    <section id="faq" className="pt-12 pb-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4 max-w-4xl mx-auto leading-[1.2] font-normal">
            {t("faqSection.title")}
          </h2>
          <p className="text-xl text-muted-foreground">
            {t("faqSection.subtitle")}
          </p>
        </div>

        <div className="space-y-4">
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="item-1"
              className="border border-border  px-6 bg-transparent mb-4 last:mb-0"
            >
              <AccordionTrigger className="text-left text-foreground hover:no-underline">
                {tFaq("q1.question")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {tFaq("q1.answer")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-2"
              className="border border-border  px-6 bg-transparent mb-4 last:mb-0"
            >
              <AccordionTrigger className="text-left text-foreground hover:no-underline">
                {tFaq("q2.question")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {tFaq("q2.answer")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-3"
              className="border border-border  px-6 bg-transparent mb-4 last:mb-0"
            >
              <AccordionTrigger className="text-left text-foreground hover:no-underline">
                {tFaq("q3.question")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {tFaq("q3.answer")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-4"
              className="border border-border  px-6 bg-transparent mb-4 last:mb-0"
            >
              <AccordionTrigger className="text-left text-foreground hover:no-underline">
                {tFaq("q4.question")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {tFaq("q4.answer")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-5"
              className="border border-border  px-6 bg-transparent mb-4 last:mb-0"
            >
              <AccordionTrigger className="text-left text-foreground hover:no-underline">
                {tFaq("q5.question")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {tFaq("q5.answer")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-6"
              className="border border-border  px-6 bg-transparent mb-4 last:mb-0"
            >
              <AccordionTrigger className="text-left text-foreground hover:no-underline">
                {tFaq("q6.question")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {tFaq("q6.answer")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-7"
              className="border border-border  px-6 bg-transparent mb-4 last:mb-0"
            >
              <AccordionTrigger className="text-left text-foreground hover:no-underline">
                {tFaq("q7.question")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {tFaq("q7.answer")}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="text-center mt-16">
          <h3 className="text-2xl text-foreground mb-4 font-normal">
            {t("faqSection.stillHaveQuestions")}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
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
            className="inline-flex items-center justify-center text-foreground hover:text-[#ff691b] px-4 py-3 sm:px-8 sm:py-4  transition-all duration-200 text-base sm:text-lg font-medium underline decoration-1 underline-offset-[0.625rem] hover:decoration-[#ff691b]"
          >
            {t("cta.contactUs")}
          </button>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
