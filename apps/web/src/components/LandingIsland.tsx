import type { SupportedLocale } from "@qarote/i18n";

import { IslandProvider } from "@/components/IslandProvider";
import AgentSection from "@/components/landing/AgentSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import FaqSection from "@/components/landing/FaqSection";
import FooterSection from "@/components/landing/FooterSection";
import FounderQuoteSection from "@/components/landing/FounderQuoteSection";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import PricingSection from "@/components/landing/PricingSection";
import QuizSection from "@/components/landing/QuizSection";
import SelfHostedSection from "@/components/landing/SelfHostedSection";
import WhatItCatchesSection from "@/components/landing/WhatItCatchesSection";
import { TawkTo } from "@/components/TawkTo";

interface LandingIslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
}

export default function LandingIsland({
  locale = "en",
  resources,
}: LandingIslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen font-sans bg-background">
        <HeroSection />
        <FounderQuoteSection />
        <AgentSection />
        <HowItWorksSection />
        <WhatItCatchesSection />
        <ComparisonSection />
        <SelfHostedSection />
        <QuizSection />
        <PricingSection />
        <FaqSection />
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}
