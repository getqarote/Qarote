import { useTranslation } from "react-i18next";

import { ArrowLeft } from "lucide-react";

import { IslandProvider } from "@/components/IslandProvider";
import { Button } from "@/components/ui/button";

interface PrivacyPolicyIslandProps {
  locale?: string;
  resources?: Record<string, Record<string, unknown>>;
}

export default function PrivacyPolicyIsland({
  locale = "en",
  resources,
}: PrivacyPolicyIslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <PrivacyPolicyContent />
    </IslandProvider>
  );
}

function PrivacyPolicyContent() {
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
            {t("privacyPolicy.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("privacyPolicy.lastUpdated")}
          </p>
        </div>

        <div className="prose prose-gray max-w-none">
          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("privacyPolicy.sections.informationWeCollect.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-xl font-medium text-foreground">
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

              <h3 className="text-xl font-medium text-foreground">
                {t(
                  "privacyPolicy.sections.informationWeCollect.usageData.title"
                )}
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
                    { returnObjects: true }
                  ) as string[]
                ).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>

              <h3 className="text-xl font-medium text-foreground">
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
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("privacyPolicy.sections.howWeUse.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
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
            </div>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("privacyPolicy.sections.informationSharing.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                {t("privacyPolicy.sections.informationSharing.description")}
              </p>
              <h3 className="text-xl font-medium text-foreground">
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
              <h3 className="text-xl font-medium text-foreground">
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
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("privacyPolicy.sections.dataSecurity.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
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
            </div>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("privacyPolicy.sections.dataRetention.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
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
            </div>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("privacyPolicy.sections.yourRights.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
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
                      {t(
                        `privacyPolicy.sections.yourRights.items.${key}.label`
                      )}
                    </strong>{" "}
                    {t(`privacyPolicy.sections.yourRights.items.${key}.text`)}
                  </li>
                ))}
              </ul>
              <p>{t("privacyPolicy.sections.yourRights.contact")}</p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("privacyPolicy.sections.cookies.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
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
            </div>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("privacyPolicy.sections.internationalTransfers.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
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
            </div>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("privacyPolicy.sections.childrensPrivacy.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>{t("privacyPolicy.sections.childrensPrivacy.description")}</p>
            </div>
          </section>

          {/* Section 10 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("privacyPolicy.sections.changes.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
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
            </div>
          </section>

          {/* Section 11 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t("privacyPolicy.sections.contactUs.title")}
            </h2>
            <div className="space-y-4 text-muted-foreground">
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
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
