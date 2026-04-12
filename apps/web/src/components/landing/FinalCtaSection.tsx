import { useTranslation } from "react-i18next";

import AuthButtons from "@/components/AuthButtons";

const FinalCtaSection = () => {
  const { t } = useTranslation("landing");

  return (
    <section className="pt-12 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border border-border overflow-hidden">
          <div className="px-6 py-3 bg-primary/10 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("cta.getStartedForFree")}
            </span>
          </div>
          <div className="bg-primary/5 py-16 px-8 lg:px-16">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-6 text-center md:text-left leading-[1.2] font-normal text-foreground">
                  {t("finalCta.title")}
                </h2>
                <div className="flex items-center gap-6 justify-center md:justify-start text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <img
                      src="/images/check.svg"
                      alt=""
                      aria-hidden="true"
                      className="h-3 w-auto image-crisp"
                      width={12}
                      height={12}
                    />
                    {t("finalCta.openSource", "Open source")}
                  </span>
                  <span className="flex items-center gap-2">
                    <img
                      src="/images/check.svg"
                      alt=""
                      aria-hidden="true"
                      className="h-3 w-auto image-crisp"
                      width={12}
                      height={12}
                    />
                    {t("finalCta.selfHostable", "Self-hostable")}
                  </span>
                  <span className="flex items-center gap-2">
                    <img
                      src="/images/check.svg"
                      alt=""
                      aria-hidden="true"
                      className="h-3 w-auto image-crisp"
                      width={12}
                      height={12}
                    />
                    {t("finalCta.freeForever", "Free forever")}
                  </span>
                </div>
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
