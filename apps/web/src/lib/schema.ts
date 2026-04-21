type FaqItem = { question: string; answer: string };
type CompareTranslations = { faq?: { items?: unknown } };

export function buildFaqSchema(compare: CompareTranslations) {
  const items = Array.isArray(compare?.faq?.items)
    ? (compare.faq!.items as FaqItem[])
    : [];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
