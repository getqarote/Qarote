import { useTranslation } from "react-i18next";

/**
 * One section of a long-form legal document, prototype "magazine" style:
 * a mono "Section 0N" label, a display heading, then the prose — no card
 * chrome. Lives in the right-hand body column next to the sticky TOC.
 */
export function LegalSection({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation("legal");
  return (
    <section id={id} className="scroll-mt-[84px]">
      <div className="mb-2 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
        {t("section")} {String(index).padStart(2, "0")}
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
