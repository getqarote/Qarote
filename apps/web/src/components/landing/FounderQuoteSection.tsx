import { useTranslation } from "react-i18next";

/**
 * Founder quote — a dark full-width band that restates the whole pitch with
 * emotional weight. Ported from Qarote.html (founder quote section). Fixed ink
 * panel → hardcoded colors, not theme tokens (matches SelfHostedSection).
 */

const FounderQuoteSection = () => {
  const { t } = useTranslation("landing");

  return (
    <section className="bg-[#15120E] text-[#E7EAF0]">
      <div className="mx-auto max-w-[1000px] px-[clamp(20px,5vw,64px)] py-[clamp(64px,9vw,120px)]">
        <blockquote className="font-display text-[clamp(28px,4.4vw,50px)] font-medium leading-[1.16] tracking-[-0.025em] text-white">
          {t("founderQuote.line1")}
          <br />
          {t("founderQuote.line2")}
          <br />
          <span className="text-carrot">{t("founderQuote.highlight")}</span>
        </blockquote>
        <div className="mt-8 flex items-center gap-[14px]">
          <img
            src="/images/team/brice.jpg"
            alt={t("founderQuote.imgAlt")}
            className="size-[46px] shrink-0 rounded-full object-cover"
            width={46}
            height={46}
          />
          <div>
            <div className="font-semibold text-white">
              {t("founderQuote.name")}
            </div>
            <div className="text-[14.5px] text-[#9AA3B2]">
              {t("founderQuote.role")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FounderQuoteSection;
