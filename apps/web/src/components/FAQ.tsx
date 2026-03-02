import { useTranslation } from "react-i18next";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const { t } = useTranslation("faq");

  return (
    <Accordion type="single" collapsible>
      <AccordionItem
        value="item-1"
        className="border border-border rounded-xl px-6 bg-transparent"
      >
        <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
          {t("q1.question")}
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          {t("q1.answer")}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="item-2"
        className="border border-border rounded-xl px-6 bg-transparent"
      >
        <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
          {t("q2.question")}
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          {t("q2.answer")}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="item-3"
        className="border border-border rounded-xl px-6 bg-transparent"
      >
        <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
          {t("q3.question")}
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          {t("q3.answer")}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="item-4"
        className="border border-border rounded-xl px-6 bg-transparent"
      >
        <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
          {t("q4.question")}
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          {t("q4.answer")}
          <ul className="list-disc list-inside mt-2 space-y-1">
            {(t("q4.list", { returnObjects: true }) as string[]).map(
              (item, index) => (
                <li key={index}>{item}</li>
              )
            )}
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="item-5"
        className="border border-border rounded-xl px-6 bg-transparent"
      >
        <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
          {t("q5.question")}
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          {t("q5.answer")}
          <ul className="list-disc list-inside mt-2 space-y-1">
            {(t("q5.list", { returnObjects: true }) as string[]).map(
              (item, index) => (
                <li key={index}>{item}</li>
              )
            )}
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="item-6"
        className="border border-border rounded-xl px-6 bg-transparent"
      >
        <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
          {t("q6.question")}
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          {t("q6.answer")}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="item-7"
        className="border border-border rounded-xl px-6 bg-transparent"
      >
        <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
          {t("q7.question")}
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          {t("q7.answer")}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default FAQ;
