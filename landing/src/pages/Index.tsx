import { useState } from "react";
import {
  Activity,
  BarChart3,
  Check,
  Mail,
  MessageSquare,
  Play,
  Rocket,
  Server,
  Settings,
  Shield,
  X,
} from "lucide-react";

import AuthButtons from "@/components/AuthButtons";
import FeatureCard from "@/components/FeatureCard";
import SEO from "@/components/SEO";
import StickyNav from "@/components/StickyNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trackSignUpClick } from "@/lib/gtm";

const Index = () => {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly"
  );
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const features = [
    {
      icon: Activity,
      title: "Live Queue Monitoring",
      description:
        "Monitor queue depths, message rates, and consumer counts with live updates. Track message accumulation and processing performance.",
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      icon: Shield,
      title: "Smart Alerting System",
      description:
        "Intelligent alerts for queue backlogs, memory usage, and performance issues. Customizable thresholds with severity-based notifications.",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: MessageSquare,
      title: "Queue Management",
      description:
        "Pause, resume, and delete queues with one click. Create exchanges, bind queues, and manage routing keys through an intuitive interface.",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: BarChart3,
      title: "Performance Analytics",
      description:
        "Detailed metrics on memory usage, disk space, file descriptors, and message throughput. Visualize trends with beautiful charts and graphs.",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Settings,
      title: "Multi-Server Support",
      description:
        "Connect to multiple RabbitMQ clusters and switch between them seamlessly. Support for different environments and configurations.",
      gradient: "from-red-500 to-rose-500",
    },
    {
      icon: Rocket,
      title: "Message Publishing",
      description:
        "Test and debug your applications by publishing messages directly to queues and exchanges. Perfect for development and troubleshooting.",
      gradient: "from-indigo-500 to-blue-500",
    },
  ];

  const planPricing = {
    monthly: {
      FREE: { price: "$0", originalPrice: undefined },
      DEVELOPER: { price: "$34", originalPrice: undefined },
      ENTERPRISE: { price: "$124", originalPrice: undefined },
    },
    yearly: {
      FREE: { price: "$0", originalPrice: undefined },
      DEVELOPER: { price: "$29", originalPrice: "$34" },
      ENTERPRISE: { price: "$99", originalPrice: "$124" },
    },
  };

  const plans = [
    {
      id: "FREE",
      name: "Starter",
      description: "Perfect for getting started",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-orange-200",
      features: {
        servers: "Up to 1",
        rabbitMQVersionSupport: "Only LTS versions",
        workspaces: "Up to 1",
        teamMembers: "Up to 1",
        queueManagement: true,
        exchangeManagement: true,
        virtualHostManagement: true,
        rabbitMQUserManagement: true,
        alertsNotification: false,
        communitySupport: true,
        prioritySupport: false,
        emailAlerts: false,
      },
    },
    {
      id: "DEVELOPER",
      name: "Pro",
      description: "For solo developers and small projects",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      isPopular: true,
      features: {
        servers: "Up to 3",
        rabbitMQVersionSupport: "All versions 3.x and 4.x",
        workspaces: "Up to 3",
        teamMembers: "Up to 3",
        queueManagement: true,
        exchangeManagement: true,
        virtualHostManagement: true,
        rabbitMQUserManagement: true,
        alertsNotification: true,
        communitySupport: true,
        prioritySupport: true,
        emailAlerts: true,
      },
    },
    {
      id: "ENTERPRISE",
      name: "Business",
      description: "For large teams and enterprises",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      features: {
        servers: "Unlimited",
        rabbitMQVersionSupport: "All versions 3.x and 4.x",
        workspaces: "Unlimited",
        teamMembers: "Unlimited",
        queueManagement: true,
        exchangeManagement: true,
        virtualHostManagement: true,
        rabbitMQUserManagement: true,
        alertsNotification: true,
        communitySupport: true,
        prioritySupport: true,
        emailAlerts: true,
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <StickyNav onVideoClick={() => setIsVideoPlaying(true)} />
      <SEO
        title="RabbitHQ - Best RabbitMQ Monitoring & Management Interface"
        description="The best RabbitMQ monitoring and management interface for developers. Monitor queues, track performance, and manage your message broker with a modern dashboard. Cleaner than Management Plugin, simpler than Prometheus."
        url="https://rabbithq.io"
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
        faq={[
          {
            question: "What is RabbitHQ?",
            answer:
              "RabbitHQ is a modern, user-friendly dashboard that helps you monitor and manage your RabbitMQ servers effortlessly. Instead of using the outdated RabbitMQ admin panel or command line, RabbitHQ gives you a clean, visual interface to see your queues, messages, and system health in real time.",
          },
          {
            question: "Who is RabbitHQ for?",
            answer:
              "RabbitHQ is designed for developers, DevOps engineers, and teams who use RabbitMQ and want better visibility, easier monitoring, and faster troubleshooting. Whether you're running one broker or dozens, RabbitHQ helps you save time and prevent message bottlenecks.",
          },
          {
            question: "Is RabbitHQ secure?",
            answer:
              "Absolutely. All connections to your RabbitMQ servers are encrypted (TLS), and no sensitive data is stored on our servers. You stay in full control of your credentials, and RabbitHQ only reads the metrics and management data needed for your dashboard.",
          },
          {
            question: "What can I do with RabbitHQ?",
            answer:
              "With RabbitHQ, you can: View all your queues, exchanges, and bindings at a glance; Monitor message rates, errors, and consumer activity in real time; Create alerts for blocked or overloaded queues; Manage users, vhosts, and permissions visually; Connect multiple RabbitMQ instances in one place.",
          },
          {
            question:
              "How is RabbitHQ different from the RabbitMQ Management UI?",
            answer:
              "The built-in RabbitMQ Management Plugin works, but it's slow, cluttered, and hard to scale across multiple brokers. RabbitHQ provides: A modern, intuitive interface; Centralized monitoring across environments; Powerful search and filters; Smart alerts and reporting; A clean experience designed for teams.",
          },
          {
            question:
              "Is RabbitHQ a better monitoring tool than Prometheus and Grafana?",
            answer:
              "RabbitHQ offers purpose-built monitoring specifically for RabbitMQ with zero configuration. While Prometheus and Grafana are powerful, they require significant setup and maintenance. RabbitHQ provides comparable insights with much less overhead.",
          },
          {
            question: "Can I try RabbitHQ for free?",
            answer:
              "Yes! We offer a free tier that includes 1 server, 1 workspace, and 1 team member. You can start monitoring your RabbitMQ queues right away without a credit card. When you're ready to scale, you can upgrade to a paid plan.",
          },
        ]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "RabbitHQ",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            availability: "https://schema.org/ComingSoon",
          },
          description:
            "The modern RabbitMQ management interface your team deserves. Cleaner than Management Plugin. Simpler than Prometheus. Cheaper than Cloud Solutions.",
          screenshot: "https://rabbithq.io/new_social_card.png",
          softwareVersion: "1.0",
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "5",
            ratingCount: "3",
            bestRating: "5",
            worstRating: "1",
          },
        }}
      />
      {/* Header */}
      <header
        id="home"
        className="relative overflow-visible bg-background text-foreground pb-16"
      >
        {/* Decorative elements - subtle colored accents */}
        <div className="absolute inset-0 opacity-5 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-orange-400/20 to-transparent"></div>
          <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-orange-300 rounded-full filter blur-3xl opacity-20"></div>
          <div className="absolute top-1/2 -left-20 sm:-left-40 w-32 h-32 sm:w-60 sm:h-60 bg-red-300 rounded-full filter blur-3xl opacity-20"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-3.5 md:pt-32">
          <div className="w-full text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight max-w-4xl mx-auto px-2">
              The modern RabbitMQ management interface your team deserves
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto px-2">
              RabbitHQ gives you a clean, unified view of your queues, exchanges
              and messages, with real monitoring, alerts and multi-workspace
              support.
            </p>

            <div className="mb-12">
              <AuthButtons
                onHowItWorksClick={() => {
                  const videoElement = document.getElementById("video");
                  if (videoElement) {
                    videoElement.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                    // Launch video after a short delay to allow scroll to complete
                    setTimeout(() => {
                      setIsVideoPlaying(true);
                    }, 500);
                  }
                }}
              />
              <p className="text-xs sm:text-sm text-muted-foreground mt-3 px-4">
                No credit card required • Start managing queues in minutes
              </p>
            </div>
          </div>
        </div>

        {/* YouTube Video */}
        <div id="video" className="relative pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="relative w-full aspect-video rounded-[1rem] overflow-hidden group cursor-pointer shadow-soft"
              onClick={() => setIsVideoPlaying(true)}
            >
              {!isVideoPlaying ? (
                <>
                  <img
                    src={"/images/rabbithq.png"}
                    alt={"RabbitHQ Dashboard Interface"}
                    className="w-full h-full object-contain bg-card"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/15 group-hover:bg-black/20 transition-colors">
                    <button
                      type="button"
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 pointer-events-none shadow-soft"
                    >
                      <Play
                        className="w-10 h-10 md:w-12 md:h-12 text-orange-600 ml-1"
                        fill="currentColor"
                      />
                    </button>
                  </div>
                </>
              ) : (
                <iframe
                  src="https://www.youtube.com/embed/YhsU_QFkGUE?autoplay=1"
                  title="RabbitHQ Video"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Comparison Section */}
      <section className="pt-12 pb-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Managing RabbitMQ servers
              <br />
              <span className="text-foreground">
                doesn't have to be painful
              </span>
            </h2>
          </div>

          {/* Main Comparison Container */}
          <div className="bg-transparent rounded-xl border border-border overflow-hidden shadow-soft">
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Left Column - Traditional */}
              <div className="pt-8 lg:pt-12 px-8 lg:px-12 pb-0 flex flex-col relative overflow-visible">
                <h3 className="text-2xl font-bold text-foreground mb-8">
                  Traditional management interfaces
                </h3>
                <div className="space-y-5 mb-16">
                  <div className="flex gap-4 items-start">
                    <X className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      An outdated UI that slows you down
                    </p>
                  </div>

                  <div className="flex gap-4 items-start">
                    <X className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      No unified view across servers or environments
                    </p>
                  </div>

                  <div className="flex gap-4 items-start">
                    <X className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      No reliable, actionable alerts
                    </p>
                  </div>

                  <div className="flex gap-4 items-start">
                    <X className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      DIY dashboards and scripts everywhere
                    </p>
                  </div>
                </div>

                {/* Visual Representation - Simple/Outdated */}
                <div className="bg-card rounded-t-xl border-t border-l border-r border-border p-4 mt-auto flex flex-col h-[200px] shadow-soft">
                  <div className="flex gap-2 mb-3">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="bg-background rounded flex-1 flex items-center justify-center">
                    <div className="text-red-500 text-4xl">⚠️</div>
                  </div>
                </div>
              </div>

              {/* Right Column - RabbitHQ */}
              <div className="pt-8 lg:pt-12 px-8 lg:px-12 pb-0 flex flex-col relative overflow-visible">
                <h3 className="text-2xl font-bold text-foreground mb-8">
                  RabbitHQ
                </h3>
                <div className="space-y-5 mb-16">
                  <div className="flex gap-4 items-start">
                    <Check className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      A clean, modern UI built for speed and clarity
                    </p>
                  </div>

                  <div className="flex gap-4 items-start">
                    <Check className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      A unified dashboard for all your servers and environments
                    </p>
                  </div>

                  <div className="flex gap-4 items-start">
                    <Check className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      Smart, actionable alerts that catch issues early
                    </p>
                  </div>

                  <div className="flex gap-4 items-start">
                    <Check className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      Zero-setup monitoring, no scripts, no maintenance
                    </p>
                  </div>
                </div>

                {/* Visual Representation - Modern Dashboard */}
                <div className="bg-card rounded-t-xl border-t border-l border-r border-border p-4 mt-auto flex flex-col overflow-hidden h-[200px] shadow-soft">
                  <div className="flex gap-2 mb-3">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="bg-background rounded p-3 space-y-2 flex-1 flex flex-col justify-between overflow-hidden min-h-0">
                    <div className="flex items-center gap-2">
                      <img
                        src="/new_icon_rabbit.svg"
                        alt="RabbitHQ"
                        className="w-6 h-6"
                      />
                      <span className="font-semibold text-sm">RabbitHQ</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/30 rounded p-1.5">
                        <div className="text-xs text-muted-foreground">
                          Messages/sec
                        </div>
                        <div className="text-sm font-bold">4.2k</div>
                      </div>
                      <div className="bg-muted/30 rounded p-1.5">
                        <div className="text-xs text-muted-foreground">
                          Active Queues
                        </div>
                        <div className="text-sm font-bold">127</div>
                      </div>
                    </div>
                    <div className="bg-green-100 border border-green-200 rounded p-1.5 text-xs text-green-700">
                      ✓ All systems operational
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="pt-12 pb-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              All you really care about.
              <br />
              Monitored in one place.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>

          <div className="text-center mt-16">
            <button
              onClick={() => {
                trackSignUpClick({
                  source: "features_cta",
                  location: "landing_page",
                });
                const appBaseUrl = import.meta.env.VITE_APP_BASE_URL;
                window.location.href = `${appBaseUrl}/auth/sign-up`;
              }}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 px-4 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-colors duration-200 text-base sm:text-lg"
            >
              Start monitoring for free
            </button>
          </div>
        </div>
      </section>

      {/* Connect Section */}
      <section className="pt-12 pb-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left side - Title and description */}
            <div className="lg:sticky lg:top-20">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Connect easily with your RabbitMQ servers
              </h2>
              <p className="text-lg text-muted-foreground">
                Don't change the way your RabbitMQ servers work, RabbitHQ is
                specially made for this message broker.
              </p>
            </div>

            {/* Right side - Steps */}
            <div className="space-y-8">
              {/* Step 1: Sign up */}
              <div className="bg-transparent border border-border rounded-xl pt-6 px-6 pb-0 flex gap-6 flex-col relative overflow-visible shadow-soft">
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">1</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Sign up
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Create your account in seconds. No credit card required.
                      Start monitoring your RabbitMQ infrastructure immediately.
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="bg-card border-t border-l border-r border-border rounded-t-xl p-6 max-w-sm mx-auto">
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <img
                        src="/new_icon_rabbit.svg"
                        alt="RabbitHQ"
                        className="w-8 h-8"
                      />
                      <span className="font-bold text-xl text-foreground">
                        RabbitHQ
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-foreground text-center mb-2">
                      Create your RabbitHQ account
                    </h4>
                    <p className="text-sm text-muted-foreground text-center mb-6">
                      Transform the way you monitor RabbitMQ.
                    </p>
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          window.location.href =
                            "https://app.rabbithq.io/auth/sign-up";
                        }}
                        className="w-full bg-background border border-border rounded-lg p-3 flex items-center justify-center gap-3 hover:bg-muted/50 transition-colors"
                      >
                        <Mail className="w-5 h-5 text-orange-600" />
                        <span className="text-sm font-medium text-foreground">
                          Continue with Email
                        </span>
                      </button>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                            or
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          window.location.href =
                            "https://app.rabbithq.io/auth/sign-up";
                        }}
                        className="w-full bg-background border border-border rounded-lg p-3 flex items-center justify-center gap-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-5 h-5 flex items-center justify-center">
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          Continue with Google
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Add your servers */}
              <div className="bg-transparent border border-border rounded-xl pt-6 px-6 pb-0 flex gap-6 flex-col relative overflow-visible shadow-soft">
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">2</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Add your servers
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Connect your RabbitMQ servers with a simple connection.
                      Support for multiple environments and clusters.
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="bg-card border-t border-l border-r border-border rounded-t-xl p-6 max-w-sm mx-auto">
                    <div className="space-y-3">
                      <div className="bg-background border border-border rounded-lg p-4 flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <Server className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground mb-1">
                            Production Server
                          </div>
                          <div className="text-sm text-muted-foreground">
                            3 nodes
                          </div>
                        </div>
                      </div>
                      <div className="bg-background border border-border rounded-lg p-4 flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <Server className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground mb-1">
                            Staging Server
                          </div>
                          <div className="text-sm text-muted-foreground">
                            3 nodes
                          </div>
                        </div>
                      </div>
                      <div className="bg-background border border-border rounded-lg p-4 flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <Server className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground mb-1">
                            Development Server
                          </div>
                          <div className="text-sm text-muted-foreground">
                            3 nodes
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Monitor and collaborate */}
              <div className="bg-transparent border border-border rounded-xl pt-6 px-6 pb-0 flex gap-6 flex-col relative overflow-visible shadow-soft">
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">3</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Monitor and collaborate
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Get real-time insights into your queues, exchanges, and
                      message flow. Monitor with your team and set up alerts.
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="bg-card border-t border-l border-r border-border rounded-t-xl p-6 max-w-sm mx-auto">
                    <div className="space-y-4">
                      {/* Metrics Cards */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-background border border-border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-orange-600" />
                            <span className="text-xs text-muted-foreground">
                              Messages/sec
                            </span>
                          </div>
                          <div className="text-lg font-bold text-foreground">
                            4.2k
                          </div>
                        </div>
                        <div className="bg-background border border-border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="w-4 h-4 text-orange-600" />
                            <span className="text-xs text-muted-foreground">
                              Queues
                            </span>
                          </div>
                          <div className="text-lg font-bold text-foreground">
                            127
                          </div>
                        </div>
                      </div>

                      {/* Chart Card */}
                      <div className="bg-background border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-foreground">
                            Queue Depths
                          </span>
                        </div>
                        <div className="h-20 bg-muted/30 rounded flex items-end justify-between gap-1 p-2">
                          <div
                            className="flex-1 bg-orange-500 rounded-t"
                            style={{ height: "40%" }}
                          ></div>
                          <div
                            className="flex-1 bg-orange-500 rounded-t"
                            style={{ height: "60%" }}
                          ></div>
                          <div
                            className="flex-1 bg-orange-500 rounded-t"
                            style={{ height: "45%" }}
                          ></div>
                          <div
                            className="flex-1 bg-orange-500 rounded-t"
                            style={{ height: "75%" }}
                          ></div>
                          <div
                            className="flex-1 bg-orange-500 rounded-t"
                            style={{ height: "55%" }}
                          ></div>
                          <div
                            className="flex-1 bg-orange-500 rounded-t"
                            style={{ height: "80%" }}
                          ></div>
                          <div
                            className="flex-1 bg-orange-500 rounded-t"
                            style={{ height: "65%" }}
                          ></div>
                        </div>
                      </div>

                      {/* Queue Status Card */}
                      <div className="bg-background border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-semibold text-foreground">
                              All systems operational
                            </span>
                          </div>
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pt-12 pb-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Simple pricing. Powerful monitoring.
            </h2>
          </div>

          {/* Billing Toggle */}
          <div className="flex flex-col items-center justify-center gap-3 mb-16 text-center">
            <div className="flex items-center gap-4">
              <span
                className={`text-sm font-medium ${billingPeriod === "monthly" ? "text-foreground" : "text-muted-foreground"}`}
              >
                Billed monthly
              </span>
              <button
                onClick={() =>
                  setBillingPeriod(
                    billingPeriod === "monthly" ? "yearly" : "monthly"
                  )
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  billingPeriod === "yearly"
                    ? "bg-gradient-to-r from-orange-500 to-red-500"
                    : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    billingPeriod === "yearly"
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-sm font-medium ${billingPeriod === "yearly" ? "text-foreground" : "text-muted-foreground"}`}
              >
                Billed yearly
              </span>
            </div>
            <Badge className="bg-transparent text-green-600 border-0 mt-2 hover:bg-transparent">
              {billingPeriod === "yearly"
                ? "Save up to 20% with annual billing"
                : "Switch to yearly billing to save up to 20%"}
            </Badge>
          </div>

          {/* Plans Grid */}
          <div className="flex justify-center w-full">
            <div
              className="flex gap-6 w-full max-w-6xl overflow-x-auto overflow-y-visible px-4 py-4 snap-x snap-mandatory md:px-6 md:py-6 lg:grid lg:grid-cols-3 lg:px-0 lg:py-0 lg:overflow-visible lg:snap-none"
              style={{
                WebkitOverflowScrolling: "touch",
                scrollPaddingLeft: "1rem",
                scrollPaddingRight: "1rem",
                scrollPaddingTop: "1rem",
                scrollPaddingBottom: "1rem",
              }}
            >
              {plans.map((plan) => {
                const currentPricing =
                  planPricing[billingPeriod][
                    plan.id as keyof typeof planPricing.monthly
                  ];
                const isPopular = plan.isPopular;

                return (
                  <Card
                    key={plan.id}
                    className={`relative flex h-full flex-col min-w-[78%] md:min-w-[60%] lg:min-w-0 snap-center first:ml-2 last:mr-2 md:first:ml-4 md:last:mr-4 lg:first:ml-0 lg:last:mr-0 bg-transparent rounded-xl shadow-soft ${
                      isPopular ? "ring-2 ring-orange-500" : ""
                    }`}
                  >
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="text-left mb-2">
                        <h3 className={`text-2xl font-bold ${plan.color} mb-2`}>
                          {plan.name}
                        </h3>

                        <div className="mb-4 min-h-[60px] flex flex-col justify-start">
                          <div className="flex items-center justify-start gap-2">
                            {currentPricing.originalPrice && (
                              <span className="text-muted-foreground line-through text-2xl">
                                {currentPricing.originalPrice}
                              </span>
                            )}
                            <span className="text-4xl font-bold text-foreground">
                              {currentPricing.price}
                            </span>
                            {currentPricing.price !== "$0" && (
                              <span className="text-muted-foreground">
                                /month
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 flex-1">
                        <div>
                          <h4 className="font-semibold text-foreground mb-3 text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap">
                            Core Features
                          </h4>
                          <ul className="space-y-2">
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <Check className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  {plan.features.servers} RabbitMQ{" "}
                                  {plan.features.servers === "Up to 1"
                                    ? "Server"
                                    : "Servers"}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  Connect and monitor your servers
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <Check className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  RabbitMQ Version Support
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {plan.features.rabbitMQVersionSupport}
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <Check className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  {plan.features.workspaces}{" "}
                                  {plan.features.workspaces === "Up to 1"
                                    ? "Workspace"
                                    : "Workspaces"}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  Organize your servers by environment
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <Check className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  {plan.features.teamMembers} Team{" "}
                                  {plan.features.teamMembers === "Up to 1"
                                    ? "Member"
                                    : "Members"}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  Collaborate with your team
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <Check className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  Advanced analytics
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  Detailed insights and reports
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                {plan.features.queueManagement ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <X className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span
                                  className={`text-sm ${plan.features.queueManagement ? "text-foreground" : "text-muted-foreground"}`}
                                >
                                  Queue Management
                                </span>
                                <div
                                  className={`text-xs ${plan.features.queueManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                                >
                                  Create and manage queues
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                {plan.features.exchangeManagement ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <X className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span
                                  className={`text-sm ${plan.features.exchangeManagement ? "text-foreground" : "text-muted-foreground"}`}
                                >
                                  Exchange Management
                                </span>
                                <div
                                  className={`text-xs ${plan.features.exchangeManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                                >
                                  Create and manage exchanges
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                {plan.features.virtualHostManagement ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <X className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span
                                  className={`text-sm ${plan.features.virtualHostManagement ? "text-foreground" : "text-muted-foreground"}`}
                                >
                                  Virtual Host Management
                                </span>
                                <div
                                  className={`text-xs ${plan.features.virtualHostManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                                >
                                  Create and manage virtual hosts
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                {plan.features.rabbitMQUserManagement ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <X className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span
                                  className={`text-sm ${plan.features.rabbitMQUserManagement ? "text-foreground" : "text-muted-foreground"}`}
                                >
                                  RabbitMQ User Management
                                </span>
                                <div
                                  className={`text-xs ${plan.features.rabbitMQUserManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                                >
                                  Create and manage RabbitMQ users
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <Check className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  SOC 2 compliance
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  Data security and policy
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                {plan.features.alertsNotification ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <X className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span
                                  className={`text-sm ${plan.features.alertsNotification ? "text-foreground" : "text-muted-foreground"}`}
                                >
                                  Alerts Notification
                                </span>
                                <div
                                  className={`text-xs ${plan.features.alertsNotification ? "text-muted-foreground" : "text-muted-foreground"}`}
                                >
                                  Real-time alerts (Email, Slack, Browser and
                                  Webhook)
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>

                        <div className="mt-auto space-y-4">
                          <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
                            Support
                          </h4>
                          <ul className="space-y-2">
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <Check className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  Community Support
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  Private Discord server
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                {plan.features.prioritySupport ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <X className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span
                                  className={`text-sm ${plan.features.prioritySupport ? "text-foreground" : "text-muted-foreground"}`}
                                >
                                  Priority Support
                                </span>
                                <div
                                  className={`text-xs ${plan.features.prioritySupport ? "text-muted-foreground" : "text-muted-foreground"}`}
                                >
                                  Priority mail support
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>
                        <Button
                          size={undefined}
                          className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 px-4 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-colors duration-200 text-base sm:text-lg h-auto"
                          onClick={() => {
                            const appBaseUrl = import.meta.env
                              .VITE_APP_BASE_URL;

                            // Check if user is authenticated by looking for auth token
                            const token =
                              localStorage.getItem("authToken") ||
                              document.cookie
                                .split(";")
                                .find((c) => c.trim().startsWith("authToken="));

                            if (token) {
                              // User is authenticated, redirect to plans page
                              window.location.href = `${appBaseUrl}/plans`;
                            } else {
                              // User not authenticated, track sign up click and redirect to sign up
                              trackSignUpClick({
                                source: "pricing_card",
                                location: "landing_page",
                              });
                              window.location.href = `${appBaseUrl}/auth/sign-up`;
                            }
                          }}
                        >
                          Start free
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="pt-12 pb-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about RabbitHQ
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="item-1"
              className="border border-border rounded-xl px-6 bg-transparent"
            >
              <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
                What is RabbitHQ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                RabbitHQ is a modern, user-friendly dashboard that helps you
                monitor and manage your RabbitMQ servers effortlessly. Instead
                of using the outdated RabbitMQ admin panel or command line,
                RabbitHQ gives you a clean, visual interface to see your queues,
                messages, and system health in real time.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-2"
              className="border border-border rounded-xl px-6 bg-transparent"
            >
              <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
                Who is RabbitHQ for?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                RabbitHQ is designed for developers, DevOps engineers, and teams
                who use RabbitMQ and want better visibility, easier monitoring,
                and faster troubleshooting. Whether you're running one broker or
                dozens, RabbitHQ helps you save time and prevent message
                bottlenecks.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-3"
              className="border border-border rounded-xl px-6 bg-transparent"
            >
              <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
                Is RabbitHQ secure?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Absolutely. All connections to your RabbitMQ servers are
                encrypted (TLS), and no sensitive data is stored on our servers.
                You stay in full control of your credentials, and RabbitHQ only
                reads the metrics and management data needed for your dashboard.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-4"
              className="border border-border rounded-xl px-6 bg-transparent"
            >
              <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
                What can I do with RabbitHQ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                With RabbitHQ, you can:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    View all your queues, exchanges, and bindings at a glance
                  </li>
                  <li>
                    Monitor message rates, errors, and consumer activity in real
                    time
                  </li>
                  <li>Create alerts for blocked or overloaded queues</li>
                  <li>Manage users, vhosts, and permissions visually</li>
                  <li>Connect multiple RabbitMQ instances in one place</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-5"
              className="border border-border rounded-xl px-6 bg-transparent"
            >
              <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
                How is RabbitHQ different from the RabbitMQ Management UI?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                The built-in RabbitMQ Management Plugin works, but it's slow,
                cluttered, and hard to scale across multiple brokers. RabbitHQ
                provides:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>A modern, intuitive interface</li>
                  <li>Centralized monitoring across environments</li>
                  <li>Powerful search and filters</li>
                  <li>Smart alerts and reporting</li>
                  <li>A clean experience designed for teams</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-6"
              className="border border-border rounded-xl px-6 bg-transparent"
            >
              <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
                Is RabbitHQ a better monitoring tool than Prometheus and
                Grafana?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                RabbitHQ offers purpose-built monitoring specifically for
                RabbitMQ with zero configuration. While Prometheus and Grafana
                are powerful, they require significant setup and maintenance.
                RabbitHQ provides comparable insights with much less overhead.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-7"
              className="border border-border rounded-xl px-6 bg-transparent"
            >
              <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
                Can I try RabbitHQ for free?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! We offer a free tier that includes 1 server, 1 workspace,
                and 1 team member. You can start monitoring your RabbitMQ queues
                right away without a credit card. When you're ready to scale,
                you can upgrade to a paid plan.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="text-center mt-16">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Still have questions?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Can't find the answer you're looking for? Please chat to our
              friendly team.
            </p>
            <button
              onClick={() => {
                // Tawk.to API is available via the React component
                if (window.Tawk_API) {
                  window.Tawk_API.maximize();
                }
              }}
              className="inline-flex items-center justify-center bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 px-4 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-colors duration-200 text-base sm:text-lg"
            >
              Contact us
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pt-12 pb-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-white rounded-xl py-20 px-12 lg:px-16 relative overflow-hidden bg-gradient-auth bg-[length:200%_200%] animate-gradient-shift"
            style={{
              animationDuration: "8s",
            }}
          >
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                  Ready to upgrade your RabbitMQ experience?
                </h2>
              </div>
              <div className="text-center md:text-left">
                <p className="text-xl text-white mb-8">
                  Start monitoring your RabbitMQ servers for free today.
                </p>
                <div className="flex flex-col items-center md:items-start">
                  <AuthButtons
                    variant="light"
                    onHowItWorksClick={() => setIsVideoPlaying(true)}
                    hideHowItWorks={true}
                    align="left"
                  />
                  <p className="text-xs sm:text-sm text-white mt-3">
                    No credit card required
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card text-card-foreground py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold">RabbitHQ</h3>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="/privacy-policy"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Privacy Policy
              </a>
              <a
                href="/terms-of-service"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
