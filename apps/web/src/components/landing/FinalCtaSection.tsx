import { useTranslation } from "react-i18next";

import AuthButtons from "@/components/AuthButtons";

const FinalCtaSection = () => {
  const { t } = useTranslation("landing");

  return (
    <section className="pt-12 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border border-border overflow-hidden">
          <div className="px-6 py-3 bg-orange-100 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("cta.getStartedForFree")}
            </span>
          </div>
          <div className="py-16 px-8 lg:px-16">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 text-center md:text-left leading-[1.2] font-normal text-foreground">
                  {t("finalCta.title")}
                </h2>
              </div>
              <div className="text-center md:text-left">
                <p className="text-xl mb-8 text-muted-foreground">
                  {t("finalCta.subtitle")}
                </p>
                <div className="flex flex-col items-center md:items-start">
                  <AuthButtons align="left" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
