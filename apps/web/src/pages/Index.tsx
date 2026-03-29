import { useState } from "react";

import ComparisonSection from "@/components/landing/ComparisonSection";
import ConnectionSection from "@/components/landing/ConnectionSection";
import FaqSection from "@/components/landing/FaqSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import FooterSection from "@/components/landing/FooterSection";
import HeroSection from "@/components/landing/HeroSection";
import PricingSection from "@/components/landing/PricingSection";
import SEO from "@/components/SEO";
import StickyNav from "@/components/StickyNav";

const Index = () => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  return (
    <div className="min-h-screen font-sans bg-white">
      <StickyNav onVideoClick={() => setIsVideoPlaying(true)} />
      <SEO
        title="Qarote - Best RabbitMQ Monitoring & Management Interface"
        description="The best RabbitMQ monitoring and management interface for developers. Monitor queues, track performance, and manage your message broker with a modern dashboard. Cleaner than Management Plugin, simpler than Prometheus."
        url="https://qarote.io"
        keywords={[
          "RabbitMQ monitoring",
          "RabbitMQ management",
          "RabbitMQ web interface",
          "RabbitMQ dashboard",
          "RabbitMQ admin",
          "RabbitMQ GUI",
          "RabbitMQ UI",
          "RabbitMQ interface",
          "RabbitMQ monitoring tool",
          "RabbitMQ management tool",
          "RabbitMQ queue management",
          "RabbitMQ management UI",
          "RabbitMQ monitoring UI",
          "RabbitMQ admin GUI",
          "RabbitMQ management interface",
          "How to monitor RabbitMQ queues",
          "Best RabbitMQ monitoring tools",
          "Modern RabbitMQ management interface",
        ]}
      />
      <HeroSection
        isVideoPlaying={isVideoPlaying}
        onPlayVideo={() => setIsVideoPlaying(true)}
      />
      <ComparisonSection />
      <FeaturesSection />
      <ConnectionSection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
      <FooterSection />
    </div>
  );
};

export default Index;
