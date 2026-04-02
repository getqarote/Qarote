import { useTranslation } from "react-i18next";

import { ArrowLeft } from "lucide-react";

import { IslandProvider } from "@/components/IslandProvider";
import { Button } from "@/components/ui/button";

interface TermsOfServiceIslandProps {
  locale?: string;
  resources?: Record<string, Record<string, unknown>>;
}

export default function TermsOfServiceIsland({
  locale = "en",
  resources,
}: TermsOfServiceIslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <TermsOfServiceContent />
    </IslandProvider>
  );
}

function TermsOfServiceContent() {
  const { t } = useTranslation("legal");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("back")}
          </Button>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {t("termsOfService.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("termsOfService.lastUpdated")}
          </p>
        </div>

        <div className="prose prose-gray max-w-none">
          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("termsOfService.sections.acceptance.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>{t("termsOfService.sections.acceptance.p1")}</p>
              <p>{t("termsOfService.sections.acceptance.p2")}</p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("termsOfService.sections.description.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>{t("termsOfService.sections.description.description")}</p>
              <ul className="list-disc pl-6 space-y-2">
                {(
                  t("termsOfService.sections.description.items", {
                    returnObjects: true,
                  }) as string[]
                ).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("termsOfService.sections.accounts.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-xl font-medium text-foreground">
                {t("termsOfService.sections.accounts.creation.title")}
              </h3>
              <p>
                {t("termsOfService.sections.accounts.creation.description")}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                {(
                  t("termsOfService.sections.accounts.creation.items", {
                    returnObjects: true,
                  }) as string[]
                ).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <h3 className="text-xl font-medium text-foreground">
                {t("termsOfService.sections.accounts.eligibility.title")}
              </h3>
              <p>
                {t("termsOfService.sections.accounts.eligibility.description")}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                {(
                  t("termsOfService.sections.accounts.eligibility.items", {
                    returnObjects: true,
                  }) as string[]
                ).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("termsOfService.sections.billing.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>{t("termsOfService.sections.billing.description")}</p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("termsOfService.sections.acceptableUse.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>{t("termsOfService.sections.acceptableUse.description")}</p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("termsOfService.sections.dataPrivacy.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>{t("termsOfService.sections.dataPrivacy.description")}</p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("termsOfService.sections.liability.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>{t("termsOfService.sections.liability.description")}</p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("termsOfService.sections.contactUs.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>{t("termsOfService.sections.contactUs.description")}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>{t("emailLabel")}:</strong>{" "}
                  {t("termsOfService.sections.contactUs.email")}
                </li>
                <li>
                  <strong>{t("addressLabel")}:</strong>{" "}
                  {t("termsOfService.sections.contactUs.address")}
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
