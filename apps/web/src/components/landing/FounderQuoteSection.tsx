import { useTranslation } from "react-i18next";

const FounderQuoteSection = () => {
  const { t } = useTranslation("landing");

  return (
    <section className="py-16 bg-muted/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <blockquote className="border border-border p-8 lg:p-12">
          <p className="text-2xl lg:text-3xl text-foreground font-normal leading-snug mb-8">
            {t("founderQuote.openQuote")}
            {t("founderQuote.line1")}
            <br />
            {t("founderQuote.line2")}
            <br />
            <span className="text-primary">{t("founderQuote.highlight")}</span>
            {t("founderQuote.closeQuote")}
          </p>
          <footer className="flex items-center gap-3">
            <img
              src="/images/team/brice.jpg"
              alt={t("founderQuote.imgAlt")}
              className="w-10 h-10 rounded-full object-cover"
              width={40}
              height={40}
            />
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">
                {t("founderQuote.name")}
              </span>{" "}
              — {t("founderQuote.role")}
            </p>
          </footer>
        </blockquote>
      </div>
    </section>
  );
};

export default FounderQuoteSection;
