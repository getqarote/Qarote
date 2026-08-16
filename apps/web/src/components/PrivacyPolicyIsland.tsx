import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";
import { LegalSection } from "@/components/LegalSection";
import { LegalToc } from "@/components/LegalToc";
import { TawkTo } from "@/components/TawkTo";

interface PrivacyPolicyIslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
}

export default function PrivacyPolicyIsland({
  locale = "en",
  resources,
}: PrivacyPolicyIslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen font-sans bg-background">
        <PrivacyPolicyContent locale={locale} />
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}

function PrivacyPolicyContent({ locale }: { locale: SupportedLocale }) {
  const { t } = useTranslation("legal");
  const prefix = locale === "en" ? "" : `/${locale}`;

  const sections = [
    { id: "information-we-collect", key: "informationWeCollect" },
    { id: "ai-features", key: "aiFeatures" },
    { id: "agent-access", key: "agentAccess" },
    { id: "how-we-use", key: "howWeUse" },
    { id: "information-sharing", key: "informationSharing" },
    { id: "data-security", key: "dataSecurity" },
    { id: "data-retention", key: "dataRetention" },
    { id: "your-rights", key: "yourRights" },
    { id: "cookies", key: "cookies" },
    { id: "international-transfers", key: "internationalTransfers" },
    { id: "childrens-privacy", key: "childrensPrivacy" },
    { id: "changes", key: "changes" },
    { id: "contact-us", key: "contactUs" },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Head */}
      <div className="mb-12 max-w-3xl">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
          — {t("privacyPolicy.title")}
        </span>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {t("privacyPolicy.title")}
        </h1>
        <div className="mt-4 font-mono text-sm text-muted-foreground">
          {t("privacyPolicy.lastUpdated")}
        </div>
        <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
          {t("privacyPolicy.summary")}
        </p>
      </div>

      {/* Sticky TOC sidebar + body */}
      <div className="grid gap-10 lg:grid-cols-[200px_1fr] lg:gap-14">
        <LegalToc
          contentsLabel={t("contents")}
          items={sections.map((s) => ({
            id: s.id,
            label: t(`privacyPolicy.sections.${s.key}.title`),
          }))}
        />

        <div className="space-y-12">
          {/* Section 1 */}
          <LegalSection
            id="information-we-collect"
            index={1}
            title={t("privacyPolicy.sections.informationWeCollect.title")}
          >
            <h3 className="text-base font-medium text-foreground">
              {t(
                "privacyPolicy.sections.informationWeCollect.accountInfo.title"
              )}
            </h3>
            <p>
              {t(
                "privacyPolicy.sections.informationWeCollect.accountInfo.description"
              )}
            </p>
            <ul className="list-disc pl-6 space-y-2">
              {(
                t(
                  "privacyPolicy.sections.informationWeCollect.accountInfo.items",
                  { returnObjects: true }
                ) as string[]
              ).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>

            <h3 className="text-base font-medium text-foreground pt-2">
              {t("privacyPolicy.sections.informationWeCollect.usageData.title")}
            </h3>
            <p>
              {t(
                "privacyPolicy.sections.informationWeCollect.usageData.description"
              )}
            </p>
            <ul className="list-disc pl-6 space-y-2">
              {(
                t(
                  "privacyPolicy.sections.informationWeCollect.usageData.items",
                  {
                    returnObjects: true,
                  }
                ) as string[]
              ).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>

            <h3 className="text-base font-medium text-foreground pt-2">
              {t(
                "privacyPolicy.sections.informationWeCollect.technicalInfo.title"
              )}
            </h3>
            <p>
              {t(
                "privacyPolicy.sections.informationWeCollect.technicalInfo.description"
              )}
            </p>
            <ul className="list-disc pl-6 space-y-2">
              {(
                t(
                  "privacyPolicy.sections.informationWeCollect.technicalInfo.items",
                  { returnObjects: true }
                ) as string[]
              ).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </LegalSection>

          {/* Section 2 */}
          <LegalSection
            id="ai-features"
            index={2}
            title={t("privacyPolicy.sections.aiFeatures.title")}
          >
            <p>{t("privacyPolicy.sections.aiFeatures.description")}</p>
            <ul className="list-disc pl-6 space-y-2">
              {(
                t("privacyPolicy.sections.aiFeatures.items", {
                  returnObjects: true,
                }) as string[]
              ).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p className="pt-1">
              {t("privacyPolicy.sections.aiFeatures.note")}
            </p>
          </LegalSection>

          {/* Section 3 */}
          <LegalSection
            id="agent-access"
            index={3}
            title={t("privacyPolicy.sections.agentAccess.title")}
          >
            <p>{t("privacyPolicy.sections.agentAccess.description")}</p>
          </LegalSection>

          {/* Section 4 */}
          <LegalSection
            id="how-we-use"
            index={4}
            title={t("privacyPolicy.sections.howWeUse.title")}
          >
            <p>{t("privacyPolicy.sections.howWeUse.description")}</p>
            <ul className="list-disc pl-6 space-y-2">
              {(
                t("privacyPolicy.sections.howWeUse.items", {
                  returnObjects: true,
                }) as string[]
              ).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </LegalSection>

          {/* Section 5 */}
          <LegalSection
            id="information-sharing"
            index={5}
            title={t("privacyPolicy.sections.informationSharing.title")}
          >
            <p>{t("privacyPolicy.sections.informationSharing.description")}</p>
            <h3 className="text-base font-medium text-foreground pt-2">
              {t(
                "privacyPolicy.sections.informationSharing.serviceProviders.title"
              )}
            </h3>
            <p>
              {t(
                "privacyPolicy.sections.informationSharing.serviceProviders.description"
              )}
            </p>
            <ul className="list-disc pl-6 space-y-2">
              {(
                t(
                  "privacyPolicy.sections.informationSharing.serviceProviders.items",
                  { returnObjects: true }
                ) as string[]
              ).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <h3 className="text-base font-medium text-foreground pt-2">
              {t(
                "privacyPolicy.sections.informationSharing.legalRequirements.title"
              )}
            </h3>
            <p>
              {t(
                "privacyPolicy.sections.informationSharing.legalRequirements.description"
              )}
            </p>
            <ul className="list-disc pl-6 space-y-2">
              {(
                t(
                  "privacyPolicy.sections.informationSharing.legalRequirements.items",
                  { returnObjects: true }
                ) as string[]
              ).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </LegalSection>

          {/* Section 6 */}
          <LegalSection
            id="data-security"
            index={6}
            title={t("privacyPolicy.sections.dataSecurity.title")}
          >
            <p>{t("privacyPolicy.sections.dataSecurity.description")}</p>
            <ul className="list-disc pl-6 space-y-2">
              {(
                t("privacyPolicy.sections.dataSecurity.items", {
                  returnObjects: true,
                }) as string[]
              ).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p>{t("privacyPolicy.sections.dataSecurity.disclaimer")}</p>
          </LegalSection>

          {/* Section 7 */}
          <LegalSection
            id="data-retention"
            index={7}
            title={t("privacyPolicy.sections.dataRetention.title")}
          >
            <p>{t("privacyPolicy.sections.dataRetention.description")}</p>
            <div className="divide-y divide-border border border-border">
              {(
                t("privacyPolicy.sections.dataRetention.items", {
                  returnObjects: true,
                }) as { label: string; detail: string; mono?: boolean }[]
              ).map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[auto_1fr] gap-4 px-4 py-3"
                >
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide leading-relaxed pt-px whitespace-nowrap">
                    {item.label}
                  </span>
                  <span
                    className={`text-sm text-muted-foreground leading-relaxed${item.mono ? " font-mono text-[0.8125rem]" : ""}`}
                  >
                    {item.detail || "—"}
                  </span>
                </div>
              ))}
            </div>
          </LegalSection>

          {/* Section 8 */}
          <LegalSection
            id="your-rights"
            index={8}
            title={t("privacyPolicy.sections.yourRights.title")}
          >
            <p>{t("privacyPolicy.sections.yourRights.description")}</p>
            <ul className="list-disc pl-6 space-y-2">
              {(
                [
                  "access",
                  "correction",
                  "deletion",
                  "portability",
                  "objection",
                  "restriction",
                ] as const
              ).map((key) => (
                <li key={key}>
                  <strong>
                    {t(`privacyPolicy.sections.yourRights.items.${key}.label`)}
                  </strong>{" "}
                  {t(`privacyPolicy.sections.yourRights.items.${key}.text`)}
                </li>
              ))}
            </ul>
            <p>{t("privacyPolicy.sections.yourRights.contact")}</p>
          </LegalSection>

          {/* Section 9 */}
          <LegalSection
            id="cookies"
            index={9}
            title={t("privacyPolicy.sections.cookies.title")}
          >
            <p>{t("privacyPolicy.sections.cookies.description")}</p>
            <ul className="list-disc pl-6 space-y-2">
              {(
                ["essential", "analytics", "preference", "marketing"] as const
              ).map((key) => (
                <li key={key}>
                  <strong>
                    {t(`privacyPolicy.sections.cookies.items.${key}.label`)}
                  </strong>{" "}
                  {t(`privacyPolicy.sections.cookies.items.${key}.text`)}
                </li>
              ))}
            </ul>
            <p>{t("privacyPolicy.sections.cookies.control")}</p>
            <h3 className="text-base font-medium text-foreground pt-2">
              {t("privacyPolicy.sections.cookies.tracking.header")}
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              {(["posthog", "gtm", "tawkto"] as const).map((key) => (
                <li key={key}>
                  <strong>
                    {t(
                      `privacyPolicy.sections.cookies.tracking.items.${key}.name`
                    )}
                  </strong>{" "}
                  {t(
                    `privacyPolicy.sections.cookies.tracking.items.${key}.text`
                  )}
                </li>
              ))}
            </ul>
            <p>{t("privacyPolicy.sections.cookies.tracking.note")}</p>
          </LegalSection>

          {/* Section 10 */}
          <LegalSection
            id="international-transfers"
            index={10}
            title={t("privacyPolicy.sections.internationalTransfers.title")}
          >
            <p>
              {t("privacyPolicy.sections.internationalTransfers.description")}
            </p>
            <ul className="list-disc pl-6 space-y-2">
              {(
                t("privacyPolicy.sections.internationalTransfers.items", {
                  returnObjects: true,
                }) as string[]
              ).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </LegalSection>

          {/* Section 11 */}
          <LegalSection
            id="childrens-privacy"
            index={11}
            title={t("privacyPolicy.sections.childrensPrivacy.title")}
          >
            <p>{t("privacyPolicy.sections.childrensPrivacy.description")}</p>
          </LegalSection>

          {/* Section 12 */}
          <LegalSection
            id="changes"
            index={12}
            title={t("privacyPolicy.sections.changes.title")}
          >
            <p>{t("privacyPolicy.sections.changes.description")}</p>
            <ul className="list-disc pl-6 space-y-2">
              {(
                t("privacyPolicy.sections.changes.items", {
                  returnObjects: true,
                }) as string[]
              ).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p>{t("privacyPolicy.sections.changes.continued")}</p>
          </LegalSection>

          {/* Section 13 */}
          <LegalSection
            id="contact-us"
            index={13}
            title={t("privacyPolicy.sections.contactUs.title")}
          >
            <p>{t("privacyPolicy.sections.contactUs.description")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>{t("emailLabel")}:</strong>{" "}
                {t("privacyPolicy.sections.contactUs.email")}
              </li>
              <li>
                <strong>{t("addressLabel")}:</strong>{" "}
                {t("privacyPolicy.sections.contactUs.address")}
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
                href={`${prefix}/terms-of-service/`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {t("footer.terms")}
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
