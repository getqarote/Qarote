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
                  text: "Qarote is a modern RabbitMQ monitoring and management dashboard designed for developers and DevOps teams who need better visibility into their message broker infrastructure. It replaces the default RabbitMQ Management Plugin with a faster, more intuitive interface that lets you monitor queue depths, message rates, consumer counts, memory usage, and disk space in real time. Qarote supports RabbitMQ versions 3.x and 4.x, connects securely via the Management HTTP API over encrypted TLS connections, and works seamlessly with both cloud-hosted services like CloudAMQP and Amazon MQ as well as self-hosted RabbitMQ instances. The free Community tier includes full queue and exchange management for one server with no time limit, while paid plans starting at $29/month add multi-server support, customizable alerting via email and Slack, historical analytics, and team collaboration with shared workspaces.",
                },
              },
              {
                "@type": "Question",
                name: "Who is Qarote for?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Qarote is built for developers, DevOps engineers, SREs, and platform teams who rely on RabbitMQ for message queuing and want better visibility into their broker infrastructure without the complexity of setting up Prometheus and Grafana. Whether you manage a single RabbitMQ instance for a small application or operate dozens of clusters across production, staging, and development environments, Qarote helps you spot queue backlogs before they cause outages, troubleshoot message routing issues faster, and keep your entire team aligned with shared dashboards and customizable alerts delivered via email, Slack, browser notifications, and webhooks. It is also ideal for CTOs and engineering managers who need a quick operational overview of their messaging infrastructure without diving into command-line tools or building custom monitoring dashboards from scratch.",
                },
              },
              {
                "@type": "Question",
                name: "Is Qarote secure?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Security is a core design principle. All connections between Qarote and your RabbitMQ servers are encrypted using TLS. Qarote only reads the metrics and management data exposed by the RabbitMQ Management HTTP API \u2014 it is designed not to store message payloads, credentials, or any sensitive application data on its servers. Your configuration preferences and alert rules are the only data persisted. For teams with strict compliance requirements, the Enterprise plan includes SOC 2 compliance, and Qarote can be fully self-hosted on your own infrastructure using Docker, Docker Compose, Dokku, or a standalone binary, ensuring your monitoring data never leaves your network. Self-hosted deployments use offline JWT license key validation with no phone-home or internet connection required after activation, providing complete network isolation for air-gapped environments.",
                },
              },
              {
                "@type": "Question",
                name: "What can I do with Qarote?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Qarote provides a comprehensive set of tools for day-to-day RabbitMQ operations, replacing the need to juggle between the Management Plugin, command-line tools, and custom monitoring scripts. From a single dashboard you can monitor queue depths, message rates, and consumer counts with live-updating charts; set up intelligent alerts for queue backlogs, memory thresholds, and server health issues; visualize memory usage, disk space, file descriptors, and Erlang process metrics; pause, resume, purge, or delete queues with a single click; create exchanges, bind queues, and manage routing keys through an intuitive UI; publish test messages directly to queues or exchanges for debugging; connect and switch between multiple RabbitMQ clusters in one dashboard; and manage virtual hosts and RabbitMQ users with role-based permissions.",
                },
              },
              {
                "@type": "Question",
                name: "How is Qarote different from the RabbitMQ Management UI?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "The built-in RabbitMQ Management Plugin provides basic monitoring but has significant limitations that become painful at scale: it is slow to load on large deployments with hundreds of queues, offers a cluttered and outdated interface that hasn't been redesigned in years, and only connects to a single broker at a time with no cross-cluster visibility. Qarote addresses every one of these pain points with a modern, fast interface that loads instantly even with thousands of queues, multi-server support for managing all your RabbitMQ clusters from one dashboard, smart customizable alerts with delivery via email, Slack, and webhooks, real-time charts and performance analytics with historical trend data, team collaboration with shared workspaces and role-based access, and full queue lifecycle management including publish, purge, pause, and delete.",
                },
              },
              {
                "@type": "Question",
                name: "Is Qarote a better monitoring tool than Prometheus and Grafana?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Qarote and Prometheus/Grafana serve different purposes and can complement each other well. Prometheus and Grafana are powerful general-purpose monitoring tools, but setting them up specifically for RabbitMQ requires installing the Prometheus exporter plugin, configuring scrape targets and retention policies, building custom Grafana dashboards from scratch, writing PromQL queries for each metric you want to track, and maintaining the entire stack over time as RabbitMQ versions evolve. Qarote provides purpose-built RabbitMQ monitoring with zero configuration \u2014 connect your server and start monitoring immediately. You get pre-built dashboards optimized for RabbitMQ workflows, queue management controls like pause and purge, and alerting without writing a single PromQL query. For teams that already run Prometheus and Grafana for broader infrastructure monitoring, Qarote complements the stack by providing deeper RabbitMQ-specific insights and operational controls that Grafana dashboards alone cannot offer.",
                },
              },
              {
                "@type": "Question",
                name: "Can I try Qarote for free?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. The free Community tier includes monitoring for one RabbitMQ server, one workspace, and one team member with no time limit and no credit card required. You get full access to real-time queue monitoring, exchange management, virtual host management, topology visualization, and basic performance statistics \u2014 everything you need to evaluate Qarote with your actual infrastructure. There is no trial period or feature lockout; the Community tier is free forever. When you need to scale to multiple servers, add team members, or enable features like customizable alerting via email and Slack, historical analytics, and advanced collaboration, you can upgrade to the Developer plan at $29/month ($348/year) or the Enterprise plan at $99/month ($1,188/year). Self-hosted licensing is also available for teams that need to keep everything on their own infrastructure.",
                },
              },
              {
                "@type": "Question",
                name: "Can I self-host Qarote?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Qarote offers full self-hosted deployment options for teams that need to keep their monitoring infrastructure within their own network for security, compliance, or latency reasons. You can deploy using Docker, Docker Compose, Dokku, or a standalone binary on any Linux server. The Community edition is free and open source under the MIT license on GitHub, giving you full access to the core monitoring features at no cost. Self-hosted Developer and Enterprise licenses are available as annual subscriptions ($348/year and $1,188/year respectively) and unlock multi-server support, alerting, and team collaboration features. License validation uses offline JWT keys with a baked-in public key \u2014 there is no phone-home requirement or internet connection needed after activation, making Qarote suitable for air-gapped and highly restricted network environments.",
                },
              },
              {
                "@type": "Question",
                name: "What RabbitMQ versions does Qarote support?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Qarote supports RabbitMQ versions 3.x and 4.x, including all current and LTS releases. It connects through the RabbitMQ Management HTTP API, which is available on all modern RabbitMQ installations with the management plugin enabled \u2014 no additional plugins or exporters are required. The Community (free) tier supports LTS RabbitMQ versions, while paid plans (Developer and Enterprise) extend compatibility to all versions including the latest minor and patch releases as they are published. Qarote is continuously tested against both single-node and clustered RabbitMQ deployments running on Linux, macOS, and Windows, as well as managed RabbitMQ services like CloudAMQP and Amazon MQ. If you encounter a compatibility issue with a specific RabbitMQ version or distribution, our support team is available via Discord and email to help resolve it.",
                },
              },
              {
                "@type": "Question",
                name: "Does Qarote work with RabbitMQ clusters?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Qarote fully supports RabbitMQ clusters and provides cluster-aware monitoring out of the box with no additional configuration required. When you connect a clustered RabbitMQ deployment, Qarote automatically discovers all nodes in the cluster and displays both node-level metrics and cluster-wide aggregates in a unified view. You can monitor individual node health including memory usage, disk space, file descriptors, and Erlang process counts, track queue distribution and mirroring status across nodes, and receive instant alerts when specific nodes become unavailable or exceed resource thresholds. For organizations managing multiple independent clusters across different environments, the multi-server feature on paid plans lets you monitor and switch between all your clusters from a single Qarote dashboard, giving you complete visibility across your entire RabbitMQ infrastructure.",
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
