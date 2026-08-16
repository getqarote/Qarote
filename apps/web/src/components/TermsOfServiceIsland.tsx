import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";
import { LegalSection } from "@/components/LegalSection";
import { LegalToc } from "@/components/LegalToc";
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
        <TermsOfServiceContent locale={locale} />
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}

function TermsOfServiceContent({ locale }: { locale: SupportedLocale }) {
  const { t } = useTranslation("legal");
  const prefix = locale === "en" ? "" : `/${locale}`;

  const sections = [
    { id: "acceptance", key: "acceptance" },
    { id: "description", key: "description" },
    { id: "accounts", key: "accounts" },
    { id: "billing", key: "billing" },
    { id: "licensing", key: "licensing" },
    { id: "agent-access", key: "agentAccess" },
    { id: "acceptable-use", key: "acceptableUse" },
    { id: "data-privacy", key: "dataPrivacy" },
    { id: "liability", key: "liability" },
    { id: "contact-us", key: "contactUs" },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Head */}
      <div className="mb-12 max-w-3xl">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
          — {t("termsOfService.title")}
        </span>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {t("termsOfService.title")}
        </h1>
        <div className="mt-4 font-mono text-sm text-muted-foreground">
          {t("termsOfService.lastUpdated")}
        </div>
        <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
          {t("termsOfService.summary")}
        </p>
      </div>

      {/* Sticky TOC sidebar + body */}
      <div className="grid gap-10 lg:grid-cols-[200px_1fr] lg:gap-14">
        <LegalToc
          contentsLabel={t("contents")}
          items={sections.map((s) => ({
            id: s.id,
            label: t(`termsOfService.sections.${s.key}.title`),
          }))}
        />

        <div className="space-y-12">
          {/* Section 1 */}
          <LegalSection
            id="acceptance"
            index={1}
            title={t("termsOfService.sections.acceptance.title")}
          >
            <p>{t("termsOfService.sections.acceptance.p1")}</p>
            <p>{t("termsOfService.sections.acceptance.p2")}</p>
          </LegalSection>

          {/* Section 2 */}
          <LegalSection
            id="description"
            index={2}
            title={t("termsOfService.sections.description.title")}
          >
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
          <LegalSection
            id="accounts"
            index={3}
            title={t("termsOfService.sections.accounts.title")}
          >
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
          </LegalSection>

          {/* Section 4 */}
          <LegalSection
            id="billing"
            index={4}
            title={t("termsOfService.sections.billing.title")}
          >
            <p>{t("termsOfService.sections.billing.description")}</p>
          </LegalSection>

          {/* Section 5 */}
          <LegalSection
            id="licensing"
            index={5}
            title={t("termsOfService.sections.licensing.title")}
          >
            <p>{t("termsOfService.sections.licensing.description")}</p>
          </LegalSection>

          {/* Section 6 */}
          <LegalSection
            id="agent-access"
            index={6}
            title={t("termsOfService.sections.agentAccess.title")}
          >
            <p>{t("termsOfService.sections.agentAccess.description")}</p>
          </LegalSection>

          {/* Section 7 */}
          <LegalSection
            id="acceptable-use"
            index={7}
            title={t("termsOfService.sections.acceptableUse.title")}
          >
            <p>{t("termsOfService.sections.acceptableUse.description")}</p>
          </LegalSection>

          {/* Section 8 */}
          <LegalSection
            id="data-privacy"
            index={8}
            title={t("termsOfService.sections.dataPrivacy.title")}
          >
            <p>{t("termsOfService.sections.dataPrivacy.description")}</p>
          </LegalSection>

          {/* Section 9 */}
          <LegalSection
            id="liability"
            index={9}
            title={t("termsOfService.sections.liability.title")}
          >
            <p>{t("termsOfService.sections.liability.description")}</p>
          </LegalSection>

          {/* Section 10 */}
          <LegalSection
            id="contact-us"
            index={10}
            title={t("termsOfService.sections.contactUs.title")}
          >
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
          {/* Foot */}
          <div className="space-y-2 border-t border-border pt-8 text-sm text-muted-foreground">
            <p>
              {t("footer.questions")}{" "}
              <a
                href={`mailto:${t("footer.email")}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {t("footer.email")}
              </a>{" "}
              · {t("footer.address")}
            </p>
            <p>
              {t("footer.seeAlsoPrefix")}{" "}
              <a
                href={`${prefix}/privacy-policy/`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {t("footer.privacy")}
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
