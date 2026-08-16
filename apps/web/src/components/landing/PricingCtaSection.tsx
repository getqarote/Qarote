import { useTranslation } from "react-i18next";

import CtaBand from "@/components/landing/CtaBand";

/**
 * Pricing page's closing CTA — the dark "Start free, in under two minutes."
 * band, with pricing-specific copy + "Read the docs" secondary.
 */
const PricingCtaSection = () => {
  const { t } = useTranslation("landing");
  const signupUrl = `${import.meta.env.VITE_APP_BASE_URL || ""}/auth/sign-up`;

  return (
    <CtaBand
      title={t("pricingCta.title")}
      subtitle={t("pricingCta.subtitle")}
      primaryLabel={t("cta.tryForFree")}
      primaryHref={signupUrl}
      secondaryLabel={t("pricingCta.readDocs")}
      secondaryHref="/docs/getting-started/"
    />
  );
};

export default PricingCtaSection;
