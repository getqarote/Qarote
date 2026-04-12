import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";
import StickyNav from "@/components/StickyNav";
import { TawkTo } from "@/components/TawkTo";

interface TermsOfServiceIslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
}

export default function TermsOfServiceIsland({
  locale = "en",
  resources,
}: TermsOfServiceIslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen font-sans bg-background">
        <StickyNav />
        <TermsOfServiceContent />
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}

function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border overflow-hidden">
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="p-6 space-y-4 text-muted-foreground">{children}</div>
    </section>
  );
}

function TermsOfServiceContent() {
  const { t } = useTranslation("legal");

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page header */}
      <div className="border border-border overflow-hidden mb-8">
        <div className="px-6 py-3 bg-muted/30 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Legal
          </span>
        </div>
        <div className="p-8">
          <h1 className="text-4xl font-normal text-foreground mb-4">
            {t("termsOfService.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("termsOfService.lastUpdated")}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Section 1 */}
        <LegalSection title={t("termsOfService.sections.acceptance.title")}>
          <p>{t("termsOfService.sections.acceptance.p1")}</p>
          <p>{t("termsOfService.sections.acceptance.p2")}</p>
        </LegalSection>

        {/* Section 2 */}
        <LegalSection title={t("termsOfService.sections.description.title")}>
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
        </LegalSection>

        {/* Section 3 */}
        <LegalSection title={t("termsOfService.sections.accounts.title")}>
          <h3 className="text-base font-medium text-foreground">
            {t("termsOfService.sections.accounts.creation.title")}
          </h3>
          <p>{t("termsOfService.sections.accounts.creation.description")}</p>
          <ul className="list-disc pl-6 space-y-2">
            {(
              t("termsOfService.sections.accounts.creation.items", {
                returnObjects: true,
              }) as string[]
            ).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <h3 className="text-base font-medium text-foreground pt-2">
            {t("termsOfService.sections.accounts.eligibility.title")}
          </h3>
          <p>{t("termsOfService.sections.accounts.eligibility.description")}</p>
          <ul className="list-disc pl-6 space-y-2">
            {(
              t("termsOfService.sections.accounts.eligibility.items", {
                returnObjects: true,
              }) as string[]
            ).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </LegalSection>

        {/* Section 4 */}
        <LegalSection title={t("termsOfService.sections.billing.title")}>
          <p>{t("termsOfService.sections.billing.description")}</p>
        </LegalSection>

        {/* Section 5 */}
        <LegalSection title={t("termsOfService.sections.acceptableUse.title")}>
          <p>{t("termsOfService.sections.acceptableUse.description")}</p>
        </LegalSection>

        {/* Section 6 */}
        <LegalSection title={t("termsOfService.sections.dataPrivacy.title")}>
          <p>{t("termsOfService.sections.dataPrivacy.description")}</p>
        </LegalSection>

        {/* Section 7 */}
        <LegalSection title={t("termsOfService.sections.liability.title")}>
          <p>{t("termsOfService.sections.liability.description")}</p>
        </LegalSection>

        {/* Section 8 */}
        <LegalSection title={t("termsOfService.sections.contactUs.title")}>
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
        </LegalSection>
      </div>
    </main>
  );
}
