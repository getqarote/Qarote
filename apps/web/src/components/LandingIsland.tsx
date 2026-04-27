import type { SupportedLocale } from "@qarote/i18n";

import { IslandProvider } from "@/components/IslandProvider";
import AudienceSection from "@/components/landing/AudienceSection";
import BlogSection, {
  type BlogPostPreview,
} from "@/components/landing/BlogSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import ConnectionSection from "@/components/landing/ConnectionSection";
import FaqSection from "@/components/landing/FaqSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import FooterSection from "@/components/landing/FooterSection";
import FounderQuoteSection from "@/components/landing/FounderQuoteSection";
import HeroSection from "@/components/landing/HeroSection";
import PricingSection from "@/components/landing/PricingSection";
import QuizSection from "@/components/landing/QuizSection";
import StickyNav from "@/components/StickyNav";
import { TawkTo } from "@/components/TawkTo";

interface LandingIslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
  blogPosts?: BlogPostPreview[];
}

export default function LandingIsland({
  locale = "en",
  resources,
  blogPosts = [],
}: LandingIslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen font-sans bg-background">
        <StickyNav />
        <HeroSection />
        <ComparisonSection />
        <FounderQuoteSection />
        <FeaturesSection />
        <ConnectionSection />
        <AudienceSection />
        <PricingSection />
        <FaqSection />
        <BlogSection posts={blogPosts} />
        <QuizSection />
        <FinalCtaSection />
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}
