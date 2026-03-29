import { useState } from "react";
import { Helmet } from "react-helmet-async";

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
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "What is Qarote?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Qarote is a modern, user-friendly dashboard that helps you monitor and manage your RabbitMQ servers effortlessly. Instead of using clunky command-line tools or the default RabbitMQ management plugin, Qarote gives you a clean, visual interface to see your queues, messages, and system health in real time.",
                },
              },
              {
                "@type": "Question",
                name: "Who is Qarote for?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Qarote is designed for developers, DevOps engineers, and teams who use RabbitMQ and want better visibility, easier troubleshooting, and smarter alerts. Whether you manage one broker or dozens, Qarote helps you save time and prevent message bottlenecks.",
                },
              },
              {
                "@type": "Question",
                name: "Is Qarote secure?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Absolutely. All connections to your RabbitMQ servers are encrypted (TLS), and no sensitive data is stored on our servers\u2014only your configuration and alert preferences. Qarote only reads the metrics and management data needed for your dashboard.",
                },
              },
              {
                "@type": "Question",
                name: "What can I do with Qarote?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "With Qarote, you can: Monitor queue depths, message rates, and consumer counts. Set up alerts for queue backlogs or server health issues. Visualize memory usage, file descriptors, and more. Pause, resume, or delete queues with one click. Publish messages directly to queues or exchanges. Connect multiple RabbitMQ instances in one place.",
                },
              },
              {
                "@type": "Question",
                name: "How is Qarote different from the RabbitMQ Management UI?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "The built-in RabbitMQ Management Plugin works, but it's slow, cluttered, and hard to scale across multiple brokers. Qarote offers: A faster, more intuitive interface. Multi-server support in one dashboard. Smart, customizable alerts. Beautiful, real-time charts and metrics. A clean experience designed for teams.",
                },
              },
              {
                "@type": "Question",
                name: "Is Qarote a better monitoring tool than Prometheus and Grafana?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Qarote offers purpose-built monitoring specifically for RabbitMQ with zero configuration. While Prometheus and Grafana are powerful, they require significant setup and maintenance. Qarote provides comparable insights with much less overhead.",
                },
              },
              {
                "@type": "Question",
                name: "Can I try Qarote for free?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes! We offer a free tier that includes 1 server, 1 workspace, and 1 team member. You can start monitoring your RabbitMQ queues right away without a credit card. When you're ready to scale, you can upgrade to a paid plan.",
                },
              },
            ],
          })}
        </script>
      </Helmet>
      <SEO
        title="Qarote - Modern RabbitMQ Monitoring & Management Dashboard"
        description="Modern RabbitMQ monitoring and management dashboard for developers. Monitor queues, track performance, and manage your message broker with a clean UI. Cleaner than Management Plugin, simpler than Prometheus."
        url="https://qarote.io"
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
