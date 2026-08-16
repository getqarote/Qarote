interface CtaBandProps {
  title: string;
  subtitle: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

/**
 * Dark, centered closing CTA band (the prototype's "Start free, in under two
 * minutes." card). Presentational — callers resolve their own copy + hrefs.
 * Shared by the pricing and features pages.
 */
const CtaBand = ({
  title,
  subtitle,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: CtaBandProps) => (
  <section className="pt-12 pb-20 bg-background">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-[#15120E] px-6 py-16 sm:px-12 lg:py-20 text-center">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-white">
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-[#9AA3B2]">
          {subtitle}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a
            href={primaryHref}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {primaryLabel}
            <span aria-hidden="true">→</span>
          </a>
          <a
            href={secondaryHref}
            className="inline-flex items-center rounded-lg border border-white/20 px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:border-white/40"
          >
            {secondaryLabel}
          </a>
        </div>
      </div>
    </div>
  </section>
);

export default CtaBand;
