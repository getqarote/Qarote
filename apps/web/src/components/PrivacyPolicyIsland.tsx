import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";
import StickyNav from "@/components/StickyNav";
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
        <StickyNav />
        <PrivacyPolicyContent />
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

function PrivacyPolicyContent() {
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
            {t("privacyPolicy.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("privacyPolicy.lastUpdated")}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Section 1 */}
        <LegalSection
          title={t("privacyPolicy.sections.informationWeCollect.title")}
        >
          <h3 className="text-base font-medium text-foreground">
            {t("privacyPolicy.sections.informationWeCollect.accountInfo.title")}
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
              t("privacyPolicy.sections.informationWeCollect.usageData.items", {
                returnObjects: true,
              }) as string[]
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
        <LegalSection title={t("privacyPolicy.sections.howWeUse.title")}>
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

        {/* Section 3 */}
        <LegalSection
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

        {/* Section 4 */}
        <LegalSection title={t("privacyPolicy.sections.dataSecurity.title")}>
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

        {/* Section 5 */}
        <LegalSection title={t("privacyPolicy.sections.dataRetention.title")}>
          <p>{t("privacyPolicy.sections.dataRetention.description")}</p>
          <ul className="list-disc pl-6 space-y-2">
            {(
              t("privacyPolicy.sections.dataRetention.items", {
                returnObjects: true,
              }) as string[]
            ).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </LegalSection>

        {/* Section 6 */}
        <LegalSection title={t("privacyPolicy.sections.yourRights.title")}>
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

        {/* Section 7 */}
        <LegalSection title={t("privacyPolicy.sections.cookies.title")}>
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
        </LegalSection>

        {/* Section 8 */}
        <LegalSection
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

        {/* Section 9 */}
        <LegalSection
          title={t("privacyPolicy.sections.childrensPrivacy.title")}
        >
          <p>{t("privacyPolicy.sections.childrensPrivacy.description")}</p>
        </LegalSection>

        {/* Section 10 */}
        <LegalSection title={t("privacyPolicy.sections.changes.title")}>
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

        {/* Section 11 */}
        <LegalSection title={t("privacyPolicy.sections.contactUs.title")}>
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
      </div>
    </main>
  );
}
