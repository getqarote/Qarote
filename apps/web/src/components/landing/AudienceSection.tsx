import { useTranslation } from "react-i18next";

import { trackSignUpClick } from "@/lib/gtm";

import { Button } from "@/components/ui/button";

const AudienceSection = () => {
  const { t, i18n } = useTranslation("landing");
  const locale = i18n.language || "en";
  const localePrefix = locale === "en" ? "" : `/${locale}`;

  const handleSignUp = (source: string) => {
    trackSignUpClick({ source, location: "landing_page" });
    window.location.href = `${import.meta.env.VITE_APP_BASE_URL}/auth/sign-up`;
  };

  return (
    <section className="pt-12 pb-20 bg-muted/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground max-w-4xl mx-auto leading-[1.2] font-normal">
            {t("audience.title")}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1 — No monitoring yet */}
          <div className="border border-border p-8 lg:p-10 flex flex-col">
            <img
              src="/images/server.svg"
              alt=""
              aria-hidden="true"
              className="h-8 w-auto image-crisp mb-5 self-start"
              width={32}
              height={32}
            />
            <h3 className="text-2xl text-foreground mb-3 font-normal">
              {t("audience.card1Title")}
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-2">
              {t("audience.card1Description")}
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              {t("audience.card1Detail")}
            </p>
            <div className="mt-auto">
              <Button
                type="button"
                variant="cta"
                size="pill"
                onClick={() => handleSignUp("audience_card1")}
              >
                <span>{t("audience.card1Cta")}</span>
                <img
                  src="/images/arrow-right.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-[0.8em] w-auto image-crisp align-middle"
                  width={14}
                  height={14}
                />
              </Button>
            </div>
          </div>

          {/* Card 2 — Already running Grafana */}
          <div className="border border-border p-8 lg:p-10 flex flex-col">
            <img
              src="/images/chart.svg"
              alt=""
              aria-hidden="true"
              className="h-8 w-auto image-crisp mb-5 self-start"
              width={32}
              height={32}
            />
            <h3 className="text-2xl text-foreground mb-3 font-normal">
              {t("audience.card2Title")}
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-2">
              {t("audience.card2Description")}
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              {t("audience.card2Detail")}
            </p>
            <div className="mt-auto">
              <Button type="button" variant="pillGhost" size="pillMd" asChild>
                <a href={`${localePrefix}/pricing/`}>
                  <span>{t("audience.card2Cta")}</span>
                  <img
                    src="/images/arrow-right.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-[0.8em] w-auto image-crisp align-middle"
                    width={14}
                    height={14}
                  />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AudienceSection;
