/**
 * Build FAQPage JSON-LD schema from translation data.
 * Generates locale-aware structured data for Google rich snippets.
 */
export function buildFaqSchema(
  faqTranslations: Record<string, unknown>
): Record<string, unknown> {
  const questions: { name: string; answer: string }[] = [];

  for (const entry of Object.values(faqTranslations)) {
    const q = entry as
      | { question?: string; answer?: string; list?: string[] }
      | undefined;
    if (!q?.question || !q?.answer) continue;

    // Combine answer text with list items if present
    let answerText = q.answer;
    if (Array.isArray(q.list) && q.list.length > 0) {
      answerText += " " + q.list.join(". ") + ".";
    }

    questions.push({ name: q.question, answer: answerText });
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map(({ name, answer }) => ({
      "@type": "Question",
      name,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
}
