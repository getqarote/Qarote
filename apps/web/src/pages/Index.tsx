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
                  text: "Qarote is a modern RabbitMQ monitoring and management dashboard designed for developers and DevOps teams. It replaces the default RabbitMQ Management Plugin with a faster, more intuitive interface that lets you monitor queue depths, message rates, consumer counts, memory usage, and disk space in real time. Qarote supports RabbitMQ versions 3.x and 4.x, connects via the Management HTTP API over encrypted TLS connections, and works with both cloud-hosted and self-hosted RabbitMQ instances. The free Community tier includes full queue and exchange management for one server, while paid plans add multi-server support, alerting, and team collaboration.",
                },
              },
              {
                "@type": "Question",
                name: "Who is Qarote for?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Qarote is designed for developers, DevOps engineers, SREs, and platform teams who rely on RabbitMQ for message queuing and want better visibility into their broker infrastructure. Whether you manage a single RabbitMQ instance for a small application or operate dozens of clusters across production, staging, and development environments, Qarote helps you spot queue backlogs before they cause outages, troubleshoot message routing issues faster, and keep your entire team aligned with shared dashboards and customizable alerts via email, Slack, browser notifications, and webhooks.",
                },
              },
              {
                "@type": "Question",
                name: "Is Qarote secure?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. All connections between Qarote and your RabbitMQ servers are encrypted using TLS. Qarote only reads the metrics and management data exposed by the RabbitMQ Management HTTP API \u2014 it does not store message payloads, credentials, or any sensitive application data on its servers. Your configuration and alert preferences are the only data persisted. For teams with strict compliance requirements, the Enterprise plan includes SOC 2 compliance, and Qarote can be fully self-hosted on your own infrastructure using Docker, Docker Compose, Dokku, or a standalone binary, ensuring your data never leaves your network.",
                },
              },
              {
                "@type": "Question",
                name: "What can I do with Qarote?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Qarote provides a comprehensive set of tools for RabbitMQ operations: monitor queue depths, message rates, and consumer counts with live-updating charts; set up intelligent alerts for queue backlogs, memory thresholds, and server health issues; visualize memory usage, disk space, file descriptors, and Erlang process metrics; pause, resume, purge, or delete queues with a single click; create exchanges, bind queues, and manage routing keys through an intuitive UI; publish test messages directly to queues or exchanges for debugging; connect and switch between multiple RabbitMQ clusters in one dashboard; and manage virtual hosts and RabbitMQ users with role-based permissions.",
                },
              },
              {
                "@type": "Question",
                name: "How is Qarote different from the RabbitMQ Management UI?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "The built-in RabbitMQ Management Plugin provides basic monitoring but has significant limitations: it is slow to load on large deployments, offers a cluttered and outdated interface, and only connects to a single broker at a time. Qarote addresses all of these pain points with a modern, fast interface that loads instantly even with thousands of queues, multi-server support for managing all your RabbitMQ clusters from one dashboard, smart customizable alerts with delivery via email, Slack, and webhooks, real-time charts and performance analytics with historical trend data, team collaboration with shared workspaces and role-based access, and full queue lifecycle management including publish, purge, pause, and delete.",
                },
              },
              {
                "@type": "Question",
                name: "Is Qarote a better monitoring tool than Prometheus and Grafana?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Qarote and Prometheus/Grafana serve different purposes. Prometheus and Grafana are powerful general-purpose monitoring tools, but setting them up for RabbitMQ requires installing the Prometheus exporter plugin, configuring scrape targets, building custom Grafana dashboards, and maintaining the entire stack over time. Qarote provides purpose-built RabbitMQ monitoring with zero configuration \u2014 connect your server and start monitoring immediately. You get pre-built dashboards, queue management controls, and alerting without writing a single PromQL query. For teams that already run Prometheus/Grafana for broader infrastructure monitoring, Qarote complements it by providing deeper RabbitMQ-specific insights and operational controls that Grafana dashboards cannot offer.",
                },
              },
              {
                "@type": "Question",
                name: "Can I try Qarote for free?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. The free Community tier includes monitoring for 1 RabbitMQ server, 1 workspace, and 1 team member with no time limit and no credit card required. You get full access to queue monitoring, exchange management, virtual host management, and basic statistics. When you need to scale to multiple servers, add team members, or enable alerting and advanced analytics, you can upgrade to the Developer plan at $29/month or the Enterprise plan at $99/month. Self-hosted licensing is also available starting at $348/year for teams that need to keep everything on their own infrastructure.",
                },
              },
              {
                "@type": "Question",
                name: "Can I self-host Qarote?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Qarote offers full self-hosted deployment options for teams that need to keep their monitoring infrastructure within their own network. You can deploy using Docker, Docker Compose, Dokku, or a standalone binary. The Community edition is free and open source under the MIT license on GitHub. Self-hosted Developer and Enterprise licenses are available as annual subscriptions ($348/year and $1,188/year respectively) with offline JWT license key validation \u2014 no phone-home or internet connection required after activation.",
                },
              },
              {
                "@type": "Question",
                name: "What RabbitMQ versions does Qarote support?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Qarote supports RabbitMQ versions 3.x and 4.x, including the latest releases. It connects through the RabbitMQ Management HTTP API, which is available on all modern RabbitMQ installations with the management plugin enabled. The Community (free) tier supports LTS RabbitMQ versions, while paid plans (Developer and Enterprise) support all versions including the latest minor and patch releases. Qarote is tested against both single-node and clustered RabbitMQ deployments running on Linux, macOS, and Windows, as well as managed RabbitMQ services like CloudAMQP and Amazon MQ.",
                },
              },
              {
                "@type": "Question",
                name: "Does Qarote work with RabbitMQ clusters?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Qarote fully supports RabbitMQ clusters and provides cluster-aware monitoring out of the box. When you connect a clustered RabbitMQ deployment, Qarote automatically discovers all nodes in the cluster and displays node-level metrics alongside cluster-wide aggregates. You can monitor individual node health (memory, disk, file descriptors, Erlang processes), track queue distribution across nodes, and receive alerts when specific nodes become unavailable or exceed resource thresholds. The multi-server feature on paid plans lets you monitor multiple independent clusters from a single Qarote dashboard.",
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
