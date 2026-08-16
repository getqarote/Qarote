import type { SupportedLocale } from "@qarote/i18n";

import { IslandProvider } from "@/components/IslandProvider";
import ComparePlansSection from "@/components/landing/ComparePlansSection";
import FooterSection from "@/components/landing/FooterSection";
import PricingCtaSection from "@/components/landing/PricingCtaSection";
import PricingFaqSection from "@/components/landing/PricingFaqSection";
import PricingSection from "@/components/landing/PricingSection";
import { TawkTo } from "@/components/TawkTo";

interface PricingIslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
}

export default function PricingIsland({
  locale = "en",
  resources,
}: PricingIslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen font-sans bg-background">
        <PricingSection />
        <ComparePlansSection />
        <PricingFaqSection />
        <PricingCtaSection />
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}
