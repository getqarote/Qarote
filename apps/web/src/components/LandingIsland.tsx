import { IslandProvider } from "@/components/IslandProvider";
import ComparisonSection from "@/components/landing/ComparisonSection";
import ConnectionSection from "@/components/landing/ConnectionSection";
import FaqSection from "@/components/landing/FaqSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import FooterSection from "@/components/landing/FooterSection";
import HeroSection from "@/components/landing/HeroSection";
import PricingSection from "@/components/landing/PricingSection";
import StickyNav from "@/components/StickyNav";
import { TawkTo } from "@/components/TawkTo";

interface LandingIslandProps {
  locale?: string;
}

export default function LandingIsland({ locale = "en" }: LandingIslandProps) {
  return (
    <IslandProvider locale={locale}>
      <div className="min-h-screen font-sans bg-white">
        <StickyNav />
        <HeroSection />
        <ComparisonSection />
        <FeaturesSection />
        <ConnectionSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}
