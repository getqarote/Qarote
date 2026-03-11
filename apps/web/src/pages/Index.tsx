import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Activity,
  BarChart3,
  MessageSquare,
  Rocket,
  Settings,
  Shield,
} from "lucide-react";

import { trackSignUpClick } from "@/lib/gtm";

import AuthButtons from "@/components/AuthButtons";
import FeatureCard from "@/components/FeatureCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import SEO from "@/components/SEO";
import StickyNav from "@/components/StickyNav";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  const { t } = useTranslation("landing");
  const { t: tPricing } = useTranslation("pricing");
  const { t: tFaq } = useTranslation("faq");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly"
  );
  const [hostingMode, setHostingMode] = useState<"cloud" | "selfhost">("cloud");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const cloudTabRef = useRef<HTMLButtonElement>(null);
  const selfhostTabRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const activeRef = hostingMode === "cloud" ? cloudTabRef : selfhostTabRef;
    if (activeRef.current) {
      setIndicatorStyle({
        left: activeRef.current.offsetLeft,
        width: activeRef.current.offsetWidth,
      });
    }
  }, [hostingMode]);

  // Init indicator on mount
  useEffect(() => {
    if (cloudTabRef.current) {
      setIndicatorStyle({
        left: cloudTabRef.current.offsetLeft,
        width: cloudTabRef.current.offsetWidth,
      });
    }
  }, []);

  const features = [
    {
      icon: Activity,
      title: t("features.liveQueueMonitoring.title"),
      description: t("features.liveQueueMonitoring.description"),
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      icon: Shield,
      title: t("features.smartAlertingSystem.title"),
      description: t("features.smartAlertingSystem.description"),
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: MessageSquare,
      title: t("features.queueManagement.title"),
      description: t("features.queueManagement.description"),
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: BarChart3,
      title: t("features.performanceAnalytics.title"),
      description: t("features.performanceAnalytics.description"),
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Settings,
      title: t("features.multiServerSupport.title"),
      description: t("features.multiServerSupport.description"),
      gradient: "from-red-500 to-rose-500",
    },
    {
      icon: Rocket,
      title: t("features.messagePublishing.title"),
      description: t("features.messagePublishing.description"),
      gradient: "from-indigo-500 to-blue-500",
    },
  ];

  const selfHostPricing: Record<
    string,
    { price: string; period?: string; ctaKey: string; url: string }
  > = {
    FREE: {
      price: "$0",
      ctaKey: "instructions",
      url: "https://github.com/getqarote/Qarote",
    },
    DEVELOPER: {
      price: "$348",
      period: "/ year",
      ctaKey: "chooseDeveloper",
      url: import.meta.env.VITE_PORTAL_URL,
    },
    ENTERPRISE: {
      price: "$1,188",
      period: "/ year",
      ctaKey: "chooseEnterprise",
      url: import.meta.env.VITE_PORTAL_URL,
    },
  };

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
      name: tPricing("plans.starter.name"),
      description: tPricing("plans.starter.description"),
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-orange-200",
      features: {
        servers: tPricing("limits.upTo1"),
        rabbitMQVersionSupport: tPricing("featureNames.onlyLTS"),
        workspaces: tPricing("limits.upTo1"),
        teamMembers: tPricing("limits.upTo1"),
        queueManagement: true,
        exchangeManagement: true,
        virtualHostManagement: true,
        rabbitMQUserManagement: true,
        alertsNotification: false,
        communitySupport: true,
        prioritySupport: false,
        emailAlerts: false,
        topologyVisualization: false as false | "soon",
        roleBasedAccess: false as false | "soon",
      },
    },
    {
      id: "DEVELOPER",
      name: tPricing("plans.pro.name"),
      description: tPricing("plans.pro.description"),
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      isPopular: true,
      features: {
        servers: tPricing("limits.upTo3"),
        rabbitMQVersionSupport: tPricing("featureNames.allVersions"),
        workspaces: tPricing("limits.upTo3"),
        teamMembers: tPricing("limits.upTo3"),
        queueManagement: true,
        exchangeManagement: true,
        virtualHostManagement: true,
        rabbitMQUserManagement: true,
        alertsNotification: true,
        communitySupport: true,
        prioritySupport: true,
        emailAlerts: true,
        topologyVisualization: "soon" as false | "soon",
        roleBasedAccess: "soon" as false | "soon",
      },
    },
    {
      id: "ENTERPRISE",
      name: tPricing("plans.business.name"),
      description: tPricing("plans.business.description"),
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      features: {
        servers: tPricing("limits.unlimited"),
        rabbitMQVersionSupport: tPricing("featureNames.allVersions"),
        workspaces: tPricing("limits.unlimited"),
        teamMembers: tPricing("limits.unlimited"),
        queueManagement: true,
        exchangeManagement: true,
        virtualHostManagement: true,
        rabbitMQUserManagement: true,
        alertsNotification: true,
        communitySupport: true,
        prioritySupport: true,
        emailAlerts: true,
        topologyVisualization: "soon" as false | "soon",
        roleBasedAccess: "soon" as false | "soon",
      },
    },
  ];

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
        faq={[
          {
            question: tFaq("q1.question"),
            answer: tFaq("q1.answer"),
          },
          {
            question: tFaq("q2.question"),
            answer: tFaq("q2.answer"),
          },
          {
            question: tFaq("q3.question"),
            answer: tFaq("q3.answer"),
          },
          {
            question: tFaq("q4.question"),
            answer: tFaq("q4.answer"),
          },
          {
            question: tFaq("q5.question"),
            answer: tFaq("q5.answer"),
          },
          {
            question: tFaq("q6.question"),
            answer: tFaq("q6.answer"),
          },
          {
            question: tFaq("q7.question"),
            answer: tFaq("q7.answer"),
          },
        ]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Qarote",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            availability: "https://schema.org/ComingSoon",
          },
          description:
            "The modern RabbitMQ management interface you deserve. Cleaner than Management Plugin. Simpler than Prometheus. Cheaper than Cloud Solutions.",
          screenshot: "https://qarote.io/images/social_card.png",
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
        className="relative overflow-visible text-foreground pb-16"
        style={{ backgroundColor: "#ffffff" }}
      >
        {/* Decorative elements - subtle colored accents */}
        <div className="absolute inset-0 opacity-5 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-orange-400/20 to-transparent"></div>
          <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-orange-300  filter blur-3xl opacity-20"></div>
          <div className="absolute top-1/2 -left-20 sm:-left-40 w-32 h-32 sm:w-60 sm:h-60 bg-red-300  filter blur-3xl opacity-20"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-28 pb-3.5">
          <div className="w-full text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 leading-tight max-w-4xl mx-auto px-2 font-normal">
              {t("hero.title")}
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto px-2">
              {t("hero.subtitle")}
            </p>

            <div className="mb-12">
              <AuthButtons />
              <p className="text-xs sm:text-sm text-muted-foreground mt-3 px-4">
                {t("hero.noCreditCard")}
              </p>
            </div>
          </div>
        </div>

        {/* YouTube Video */}
        <div id="video" className="relative pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="relative w-full aspect-video  overflow-hidden group cursor-pointer"
              onClick={() => setIsVideoPlaying(true)}
            >
              {!isVideoPlaying ? (
                <>
                  <img
                    src={"/images/dashboard.png"}
                    alt={"Qarote Dashboard Interface"}
                    className="w-full h-full object-contain bg-card"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/15 group-hover:bg-black/20 transition-colors">
                    <button
                      type="button"
                      className="w-20 h-20 md:w-24 md:h-24 bg-white hover:bg-white flex items-center justify-center transition-all hover:scale-110 pointer-events-none shadow-soft rounded-full"
                    >
                      <img
                        src="/images/play.svg"
                        alt="Play"
                        className="w-10 h-10 md:w-12 md:h-12"
                        style={{
                          imageRendering: "crisp-edges",
                          objectFit: "contain",
                          display: "block",
                          marginLeft: "0.5rem",
                        }}
                      />
                    </button>
                  </div>
                </>
              ) : (
                <iframe
                  src="https://www.youtube.com/embed/g9Coi3niYIY?autoplay=1"
                  title="Qarote Video"
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
      <section
        className="pb-20"
        style={{ backgroundColor: "#ffffff", paddingTop: "2.4rem" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4 max-w-4xl mx-auto leading-[1.2] font-normal">
              {t("comparison.title")}
              <span className="hidden md:inline">
                <br />
              </span>{" "}
              {t("comparison.titleLine2")}
            </h2>
          </div>

          {/* Main Comparison Container */}
          <div className="bg-transparent  border border-border overflow-hidden">
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Left Column - Traditional */}
              <div className="pt-8 lg:pt-12 px-8 lg:px-12 pb-0 flex flex-col relative overflow-visible">
                <h3 className="text-2xl text-foreground mb-8 font-normal">
                  {t("comparison.traditional.title")}
                </h3>
                <div className="space-y-5 mb-16">
                  <div className="flex gap-4 items-center">
                    <img
                      src="/images/cross.svg"
                      alt="Cross"
                      className="h-3 flex-shrink-0"
                      style={{ imageRendering: "crisp-edges", width: "auto" }}
                    />
                    <p className="text-foreground">
                      {t("comparison.traditional.point1")}
                    </p>
                  </div>

                  <div className="flex gap-4 items-center">
                    <img
                      src="/images/cross.svg"
                      alt="Cross"
                      className="h-3 flex-shrink-0"
                      style={{ imageRendering: "crisp-edges", width: "auto" }}
                    />
                    <p className="text-foreground">
                      {t("comparison.traditional.point2")}
                    </p>
                  </div>

                  <div className="flex gap-4 items-center">
                    <img
                      src="/images/cross.svg"
                      alt="Cross"
                      className="h-3 flex-shrink-0"
                      style={{ imageRendering: "crisp-edges", width: "auto" }}
                    />
                    <p className="text-foreground">
                      {t("comparison.traditional.point3")}
                    </p>
                  </div>

                  <div className="flex gap-4 items-center">
                    <img
                      src="/images/cross.svg"
                      alt="Cross"
                      className="h-3 flex-shrink-0"
                      style={{ imageRendering: "crisp-edges", width: "auto" }}
                    />
                    <p className="text-foreground">
                      {t("comparison.traditional.point4")}
                    </p>
                  </div>
                </div>

                {/* Visual Representation - Simple/Outdated */}
                <div className="bg-card  border-t border-l border-r border-border p-4 mt-auto flex flex-col h-[200px] shadow-soft">
                  <div className="flex gap-2 mb-3">
                    <div className="w-3 h-3 bg-red-400 "></div>
                    <div className="w-3 h-3 bg-yellow-400 "></div>
                    <div className="w-3 h-3 bg-green-400 "></div>
                  </div>
                  <div className="bg-background rounded flex-1 flex items-center justify-center">
                    <img
                      src="/images/error.svg"
                      alt="Error"
                      className="w-12 h-12"
                      style={{ imageRendering: "crisp-edges" }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Qarote */}
              <div className="pt-8 lg:pt-12 px-8 lg:px-12 pb-0 flex flex-col relative overflow-visible">
                <h3 className="text-2xl text-foreground mb-8 font-normal">
                  {t("comparison.qarote.title")}
                </h3>
                <div className="space-y-5 mb-16">
                  <div className="flex gap-4 items-center">
                    <img
                      src="/images/check.svg"
                      alt="Check"
                      className="h-3 flex-shrink-0"
                      style={{ imageRendering: "crisp-edges", width: "auto" }}
                    />
                    <p className="text-foreground">
                      {t("comparison.qarote.point1")}
                    </p>
                  </div>

                  <div className="flex gap-4 items-center">
                    <img
                      src="/images/check.svg"
                      alt="Check"
                      className="h-3 flex-shrink-0"
                      style={{ imageRendering: "crisp-edges", width: "auto" }}
                    />
                    <p className="text-foreground">
                      {t("comparison.qarote.point2")}
                    </p>
                  </div>

                  <div className="flex gap-4 items-center">
                    <img
                      src="/images/check.svg"
                      alt="Check"
                      className="h-3 flex-shrink-0"
                      style={{ imageRendering: "crisp-edges", width: "auto" }}
                    />
                    <p className="text-foreground">
                      {t("comparison.qarote.point3")}
                    </p>
                  </div>

                  <div className="flex gap-4 items-center">
                    <img
                      src="/images/check.svg"
                      alt="Check"
                      className="h-3 flex-shrink-0"
                      style={{ imageRendering: "crisp-edges", width: "auto" }}
                    />
                    <p className="text-foreground">
                      {t("comparison.qarote.point4")}
                    </p>
                  </div>
                </div>

                {/* Visual Representation - Modern Dashboard */}
                <div className="bg-card  border-t border-l border-r border-border p-4 mt-auto flex flex-col overflow-hidden h-[200px] shadow-soft">
                  <div className="flex gap-2 mb-3">
                    <div className="w-3 h-3 bg-red-400 "></div>
                    <div className="w-3 h-3 bg-yellow-400 "></div>
                    <div className="w-3 h-3 bg-green-400 "></div>
                  </div>
                  <div className="bg-background p-3 space-y-2 flex-1 flex flex-col justify-between overflow-hidden min-h-0">
                    <div className="flex items-center gap-1">
                      <img
                        src="/images/new_icon.svg"
                        alt="Qarote"
                        className="w-6 h-6"
                      />
                      <span className="font-semibold text-sm">Qarote</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/30 p-1.5">
                        <div className="text-xs text-muted-foreground">
                          {t("comparison.messagesPerSec")}
                        </div>
                        <div className="text-sm">4.2k</div>
                      </div>
                      <div className="bg-muted/30 p-1.5">
                        <div className="text-xs text-muted-foreground">
                          {t("comparison.activeQueues")}
                        </div>
                        <div className="text-sm">127</div>
                      </div>
                    </div>
                    <div className="bg-green-100 border border-green-200 p-1.5 text-xs text-green-700 flex items-center gap-1.5">
                      <img
                        src="/images/check.svg"
                        alt="Check"
                        className="flex-shrink-0"
                        style={{
                          width: "auto",
                          height: "0.525rem",
                          imageRendering: "crisp-edges",
                        }}
                      />
                      {t("comparison.allSystemsOperational")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="pt-12 pb-20"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4 max-w-4xl mx-auto leading-[1.2] font-normal">
              {t("features.title")}
              <br />
              {t("features.titleLine2")}
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
              className="bg-gradient-button hover:bg-gradient-button-hover text-white px-4 py-3 sm:px-7 sm:py-3 transition-colors duration-200 inline-flex items-center justify-center gap-3 text-base sm:text-lg rounded-full"
            >
              <span>{t("cta.startMonitoringForFree")}</span>
              <img
                src="/images/arrow-right.svg"
                alt="Arrow right"
                className="h-[0.8em] w-auto"
                style={{
                  imageRendering: "crisp-edges",
                  verticalAlign: "middle",
                }}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Connect Section */}
      <section className="pt-12 pb-20" style={{ backgroundColor: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left side - Title and description */}
            <div className="lg:sticky lg:top-20">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-6 max-w-4xl leading-[1.2] font-normal">
                {t("connection.title")}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t("connection.subtitle")}
              </p>
            </div>

            {/* Right side - Steps */}
            <div className="space-y-8">
              {/* Step 1: Sign up */}
              <div className="bg-transparent border border-border  pt-6 px-6 pb-0 flex gap-6 flex-col relative overflow-visible">
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div
                      className="w-12 h-12 flex items-center justify-center"
                      style={{ backgroundColor: "#ffedd5" }}
                    >
                      <span className="text-xl" style={{ color: "#FF691B" }}>
                        1
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl text-foreground mb-2 font-normal">
                      {t("connection.step1.title")}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {t("connection.step1.description")}
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="bg-card border-t border-l border-r border-border  p-6 max-w-sm mx-auto">
                    <h4 className="text-lg text-foreground text-center mb-2">
                      {t("connection.step1.createAccount")}
                    </h4>
                    <p className="text-sm text-muted-foreground text-center mb-6">
                      {t("connection.step1.transformMonitoring")}
                    </p>
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          window.location.href =
                            "https://app.qarote.io/auth/sign-up";
                        }}
                        className="w-full bg-background border border-border  p-3 flex items-center justify-center gap-3 hover:bg-muted/50 transition-colors"
                      >
                        <img
                          src="/images/email.svg"
                          alt="Email"
                          style={{
                            imageRendering: "crisp-edges",
                            width: "auto",
                            height: "0.875rem",
                          }}
                        />
                        <span className="text-sm font-medium text-foreground">
                          {t("connection.step1.continueWithEmail")}
                        </span>
                      </button>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                            {t("connection.step1.or")}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          window.location.href =
                            "https://app.qarote.io/auth/sign-up";
                        }}
                        className="w-full bg-background border border-border  p-3 flex items-center justify-center gap-3 hover:bg-muted/50 transition-colors"
                      >
                        <img
                          src="/images/google.svg"
                          alt="Google"
                          style={{
                            imageRendering: "crisp-edges",
                            width: "auto",
                            height: "0.875rem",
                          }}
                        />
                        <span className="text-sm font-medium text-foreground">
                          {t("connection.step1.continueWithGoogle")}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Add your servers */}
              <div className="bg-transparent border border-border  pt-6 px-6 pb-0 flex gap-6 flex-col relative overflow-visible">
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div
                      className="w-12 h-12 flex items-center justify-center"
                      style={{ backgroundColor: "#ffedd5" }}
                    >
                      <span className="text-xl" style={{ color: "#FF691B" }}>
                        2
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl text-foreground mb-2 font-normal">
                      {t("connection.step2.title")}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {t("connection.step2.description")}
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="bg-card border-t border-l border-r border-border  p-6 max-w-sm mx-auto">
                    <div className="space-y-3">
                      <div className="bg-background border border-border  p-4 flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <img
                            src="/images/server.svg"
                            alt="Server"
                            className="w-6 h-6"
                            style={{ imageRendering: "crisp-edges" }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="text-foreground mb-0.5">
                            {t("connection.step2.productionServer")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("connection.step2.nodes")}
                          </div>
                        </div>
                      </div>
                      <div className="bg-background border border-border  p-4 flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <img
                            src="/images/server.svg"
                            alt="Server"
                            className="w-6 h-6"
                            style={{ imageRendering: "crisp-edges" }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="text-foreground mb-0.5">
                            {t("connection.step2.stagingServer")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("connection.step2.nodes")}
                          </div>
                        </div>
                      </div>
                      <div className="bg-background border border-border  p-4 flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <img
                            src="/images/server.svg"
                            alt="Server"
                            className="w-6 h-6"
                            style={{ imageRendering: "crisp-edges" }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="text-foreground mb-0.5">
                            {t("connection.step2.developmentServer")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("connection.step2.nodes")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Monitor and collaborate */}
              <div className="bg-transparent border border-border  pt-6 px-6 pb-0 flex gap-6 flex-col relative overflow-visible">
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div
                      className="w-12 h-12 flex items-center justify-center"
                      style={{ backgroundColor: "#ffedd5" }}
                    >
                      <span className="text-xl" style={{ color: "#FF691B" }}>
                        3
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl text-foreground mb-2 font-normal">
                      {t("connection.step3.title")}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {t("connection.step3.description")}
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="bg-card border-t border-l border-r border-border  p-6 max-w-sm mx-auto">
                    <div className="space-y-4">
                      {/* Metrics Cards */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-background border border-border  p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">
                              {t("connection.step3.messagesPerSec")}
                            </span>
                          </div>
                          <div className="text-lg text-foreground">4.2k</div>
                        </div>
                        <div className="bg-background border border-border  p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">
                              {t("connection.step3.queues")}
                            </span>
                          </div>
                          <div className="text-lg text-foreground">127</div>
                        </div>
                      </div>

                      {/* Chart Card */}
                      <div className="bg-background border border-border  p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-foreground">
                            {t("connection.step3.queueDepths")}
                          </span>
                        </div>
                        <div className="h-20 bg-muted/30 flex items-end justify-between gap-1 p-2">
                          <div
                            className="flex-1 bg-[#FF691B] "
                            style={{ height: "40%" }}
                          ></div>
                          <div
                            className="flex-1 bg-[#FF691B] "
                            style={{ height: "60%" }}
                          ></div>
                          <div
                            className="flex-1 bg-[#FF691B] "
                            style={{ height: "45%" }}
                          ></div>
                          <div
                            className="flex-1 bg-[#FF691B] "
                            style={{ height: "75%" }}
                          ></div>
                          <div
                            className="flex-1 bg-[#FF691B] "
                            style={{ height: "55%" }}
                          ></div>
                          <div
                            className="flex-1 bg-[#FF691B] "
                            style={{ height: "80%" }}
                          ></div>
                          <div
                            className="flex-1 bg-[#FF691B] "
                            style={{ height: "65%" }}
                          ></div>
                        </div>
                      </div>

                      {/* Queue Status Card */}
                      <div className="bg-background border border-border  p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src="/images/check.svg"
                              alt="Check"
                              style={{
                                imageRendering: "crisp-edges",
                                width: "auto",
                                height: "0.7rem",
                              }}
                            />
                            <span className="text-sm text-foreground">
                              {t("connection.step3.allSystemsOperational")}
                            </span>
                          </div>
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
      <section
        id="pricing"
        className="pt-12 pb-20"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4 max-w-4xl mx-auto leading-[1.2] font-normal">
              {tPricing("title")}
            </h2>
          </div>

          {/* Hosting Tabs + Billing Toggle row */}
          <div className="relative flex items-center justify-center mb-8 max-w-7xl mx-auto w-full">
            {/* Hosting Mode Tabs — centered */}
            <div className="relative flex border border-border p-1">
              {/* Sliding indicator */}
              <div
                className="absolute top-1 bottom-1 bg-foreground"
                style={{
                  left: indicatorStyle.left,
                  width: indicatorStyle.width,
                  transition: "left 200ms ease, width 200ms ease",
                }}
              />
              <button
                ref={cloudTabRef}
                onClick={() => setHostingMode("cloud")}
                className="relative z-10 flex flex-1 justify-center items-center gap-2 py-3 px-6 text-sm font-medium whitespace-nowrap"
                style={{
                  color:
                    hostingMode === "cloud"
                      ? "hsl(var(--background))"
                      : "hsl(var(--foreground))",
                  transition: "color 200ms ease",
                }}
              >
                <img src="/images/cloud.svg" alt="Cloud" className="w-4 h-4" />
                Cloud
              </button>
              <button
                ref={selfhostTabRef}
                onClick={() => setHostingMode("selfhost")}
                className="relative z-10 flex flex-1 justify-center items-center gap-2 py-3 px-6 text-sm font-medium whitespace-nowrap"
                style={{
                  color:
                    hostingMode === "selfhost"
                      ? "hsl(var(--background))"
                      : "hsl(var(--foreground))",
                  transition: "color 200ms ease",
                }}
              >
                <img
                  src="/images/server.svg"
                  alt="Server"
                  className="w-4 h-4"
                />
                Self-host
              </button>
            </div>

            {/* Billing Toggle — absolute right */}
            <div
              className={`absolute right-0 flex items-center gap-3 ${hostingMode === "selfhost" ? "opacity-30 pointer-events-none" : ""}`}
            >
              <button
                onClick={() =>
                  setBillingPeriod(
                    billingPeriod === "monthly" ? "yearly" : "monthly"
                  )
                }
                className={`relative inline-flex items-center transition-colors ${billingPeriod === "yearly" ? "bg-[#FF691B]" : "bg-muted"}`}
                style={{ width: "27px", height: "15px" }}
              >
                <span
                  className="inline-block bg-white transition-transform"
                  style={{
                    width: "9px",
                    height: "9px",
                    transform:
                      billingPeriod === "yearly"
                        ? "translateX(15px)"
                        : "translateX(3px)",
                  }}
                />
              </button>
              <span
                className={`text-sm font-medium ${billingPeriod === "yearly" ? "text-foreground" : "text-muted-foreground"}`}
              >
                {tPricing("billedYearly")}
              </span>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="flex justify-center w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-7xl">
              {plans.map((plan) => {
                const currentPricing =
                  plan.id in planPricing[billingPeriod]
                    ? planPricing[billingPeriod][
                        plan.id as keyof typeof planPricing.monthly
                      ]
                    : null;
                const monthlyPricing =
                  plan.id in planPricing.monthly
                    ? planPricing.monthly[
                        plan.id as keyof typeof planPricing.monthly
                      ]
                    : null;
                const yearlyPricing =
                  plan.id in planPricing.yearly
                    ? planPricing.yearly[
                        plan.id as keyof typeof planPricing.yearly
                      ]
                    : null;
                const selfHost = selfHostPricing[plan.id] ?? null;
                return (
                  <Card
                    key={plan.id}
                    className="relative flex h-full flex-col bg-transparent"
                  >
                    <CardContent className="p-6 flex flex-col h-full">
                      {hostingMode === "cloud" && plan.id === "DEVELOPER" && (
                        <span className="absolute top-4 right-4 text-xs font-medium px-2 py-0.5 border border-[#FF691B] text-[#FF691B]">
                          Most popular
                        </span>
                      )}
                      {hostingMode === "cloud" && plan.id === "ENTERPRISE" && (
                        <span className="absolute top-4 right-4 text-xs font-medium px-2 py-0.5 border border-[#FF691B] text-[#FF691B]">
                          Free trial
                        </span>
                      )}
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className={`text-2xl font-normal ${plan.color}`}>
                            {plan.name}
                          </h3>
                        </div>

                        <div className="mb-2 flex flex-col justify-start min-h-[90px]">
                          {hostingMode === "selfhost" && selfHost ? (
                            <div className="flex items-center justify-start gap-4">
                              <span className="text-5xl font-medium text-foreground">
                                {selfHost.price}
                              </span>
                              {selfHost.period && (
                                <span className="text-sm text-muted-foreground">
                                  {selfHost.period}
                                </span>
                              )}
                            </div>
                          ) : currentPricing ? (
                            <>
                              <div className="flex items-center justify-start gap-4">
                                <span className="text-5xl font-medium text-foreground">
                                  {currentPricing.price}
                                </span>
                                {currentPricing.price !== "$0" && (
                                  <div className="flex flex-col leading-tight">
                                    <span className="text-sm text-muted-foreground">
                                      {tPricing("perMonth")}
                                    </span>
                                    {billingPeriod === "yearly" && (
                                      <span className="text-sm text-muted-foreground">
                                        {tPricing("billedYearly")}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {billingPeriod === "yearly" &&
                                monthlyPricing &&
                                monthlyPricing.price !== "$0" && (
                                  <span className="text-sm text-muted-foreground mt-4">
                                    <span className="font-medium text-foreground">
                                      {monthlyPricing.price}
                                    </span>{" "}
                                    {tPricing("billedMonthly")}
                                  </span>
                                )}
                              {billingPeriod === "monthly" &&
                                yearlyPricing &&
                                yearlyPricing.price !== "$0" && (
                                  <span className="text-sm text-muted-foreground mt-4">
                                    <span className="font-medium text-foreground">
                                      {yearlyPricing.price}
                                    </span>{" "}
                                    {tPricing("billedYearly")}
                                  </span>
                                )}
                            </>
                          ) : (
                            <div className="flex items-center justify-start gap-2">
                              <span className="text-xl font-semibold text-foreground">
                                Contact Sales
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <hr className="border-border mt-4 mb-8" />

                      <div className="space-y-6 flex-1">
                        <div>
                          <h4 className="font-semibold text-foreground mb-3 text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap">
                            {tPricing("coreFeatures")}
                          </h4>
                          <ul className="space-y-2">
                            <li className="flex items-start gap-3">
                              <div
                                style={{
                                  marginTop: "0.4rem",
                                  width: "0.875rem",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "flex-start",
                                }}
                              >
                                <img
                                  src="/images/check.svg"
                                  alt="Check"
                                  style={{
                                    imageRendering: "crisp-edges",
                                    width: "auto",
                                    height: "0.7rem",
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  {plan.features.servers.replace(/^Up to /, "")}{" "}
                                  RabbitMQ{" "}
                                  {plan.features.servers === "Up to 1"
                                    ? "server"
                                    : "servers"}
                                </span>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div
                                style={{
                                  marginTop: "0.4rem",
                                  width: "0.875rem",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "flex-start",
                                }}
                              >
                                <img
                                  src="/images/check.svg"
                                  alt="Check"
                                  style={{
                                    imageRendering: "crisp-edges",
                                    width: "auto",
                                    height: "0.7rem",
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  {plan.features.workspaces.replace(
                                    /^Up to /,
                                    ""
                                  )}{" "}
                                  {plan.features.workspaces === "Up to 1"
                                    ? "workspace"
                                    : "workspaces"}
                                </span>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div
                                style={{
                                  marginTop: "0.4rem",
                                  width: "0.875rem",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "flex-start",
                                }}
                              >
                                <img
                                  src="/images/check.svg"
                                  alt="Check"
                                  style={{
                                    imageRendering: "crisp-edges",
                                    width: "auto",
                                    height: "0.7rem",
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  {plan.features.teamMembers.replace(
                                    /^Up to /,
                                    ""
                                  )}{" "}
                                  team{" "}
                                  {plan.features.teamMembers === "Up to 1"
                                    ? "member"
                                    : "members"}
                                </span>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div
                                style={{
                                  marginTop: "0.4rem",
                                  width: "0.875rem",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "flex-start",
                                }}
                              >
                                <img
                                  src="/images/check.svg"
                                  alt="Check"
                                  style={{
                                    imageRendering: "crisp-edges",
                                    width: "auto",
                                    height: "0.7rem",
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  Advanced analytics
                                </span>
                              </div>
                            </li>
                            {plan.features.queueManagement && (
                              <li className="flex items-start gap-3">
                                <div
                                  style={{
                                    marginTop: "0.4rem",
                                    width: "0.875rem",
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <img
                                    src="/images/check.svg"
                                    alt="Check"
                                    style={{
                                      imageRendering: "crisp-edges",
                                      width: "auto",
                                      height: "0.7rem",
                                    }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm text-foreground">
                                    Queue, Exchange, VHost & User management
                                  </span>
                                </div>
                              </li>
                            )}
                            {plan.features.alertsNotification && (
                              <li className="flex items-start gap-3">
                                <div
                                  style={{
                                    marginTop: "0.4rem",
                                    width: "0.875rem",
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <img
                                    src="/images/check.svg"
                                    alt="Check"
                                    style={{
                                      imageRendering: "crisp-edges",
                                      width: "auto",
                                      height: "0.7rem",
                                    }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm text-foreground">
                                    Alerts & webhooks
                                  </span>
                                </div>
                              </li>
                            )}
                            {plan.features.topologyVisualization && (
                              <li className="flex items-center gap-3">
                                <div
                                  style={{
                                    width: "0.875rem",
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <img
                                    src="/images/check.svg"
                                    alt="Check"
                                    style={{
                                      imageRendering: "crisp-edges",
                                      width: "auto",
                                      height: "0.7rem",
                                    }}
                                  />
                                </div>
                                <div className="flex-1 flex items-center gap-2">
                                  <span className="text-sm text-foreground">
                                    Topology visualization
                                  </span>
                                  {plan.features.topologyVisualization ===
                                    "soon" && (
                                    <span
                                      className="font-medium px-1 border border-border text-muted-foreground"
                                      style={{ fontSize: "0.65rem" }}
                                    >
                                      Soon
                                    </span>
                                  )}
                                </div>
                              </li>
                            )}
                            {plan.features.roleBasedAccess && (
                              <li className="flex items-center gap-3">
                                <div
                                  style={{
                                    width: "0.875rem",
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <img
                                    src="/images/check.svg"
                                    alt="Check"
                                    style={{
                                      imageRendering: "crisp-edges",
                                      width: "auto",
                                      height: "0.7rem",
                                    }}
                                  />
                                </div>
                                <div className="flex-1 flex items-center gap-2">
                                  <span className="text-sm text-foreground">
                                    Role-based access
                                  </span>
                                  {plan.features.roleBasedAccess === "soon" && (
                                    <span
                                      className="font-medium px-1 border border-border text-muted-foreground"
                                      style={{ fontSize: "0.65rem" }}
                                    >
                                      Soon
                                    </span>
                                  )}
                                </div>
                              </li>
                            )}
                          </ul>
                        </div>

                        <div className="mt-auto space-y-4">
                          <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
                            Security & compatibility
                          </h4>
                          <ul className="space-y-2">
                            {plan.id === "ENTERPRISE" && (
                              <li className="flex items-start gap-3">
                                <div
                                  style={{
                                    marginTop: "0.4rem",
                                    width: "0.875rem",
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <img
                                    src="/images/check.svg"
                                    alt="Check"
                                    style={{
                                      imageRendering: "crisp-edges",
                                      width: "auto",
                                      height: "0.7rem",
                                    }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm text-foreground">
                                    SSO, SAML & OIDC
                                  </span>
                                </div>
                              </li>
                            )}
                            <li className="flex items-start gap-3">
                              <div
                                style={{
                                  marginTop: "0.4rem",
                                  width: "0.875rem",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "flex-start",
                                }}
                              >
                                <img
                                  src="/images/check.svg"
                                  alt="Check"
                                  style={{
                                    imageRendering: "crisp-edges",
                                    width: "auto",
                                    height: "0.7rem",
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  SOC 2 compliance
                                </span>
                              </div>
                            </li>
                            {plan.features.servers === "Up to 1" && (
                              <li className="flex items-start gap-3">
                                <div
                                  style={{
                                    marginTop: "0.4rem",
                                    width: "0.875rem",
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <img
                                    src="/images/check.svg"
                                    alt="Check"
                                    style={{
                                      imageRendering: "crisp-edges",
                                      width: "auto",
                                      height: "0.7rem",
                                    }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm text-foreground">
                                    LTS RabbitMQ versions
                                  </span>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    All LTS versions 3.x and 4.x
                                  </p>
                                </div>
                              </li>
                            )}
                            {plan.features.servers !== "Up to 1" && (
                              <li className="flex items-start gap-3">
                                <div
                                  style={{
                                    marginTop: "0.4rem",
                                    width: "0.875rem",
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <img
                                    src="/images/check.svg"
                                    alt="Check"
                                    style={{
                                      imageRendering: "crisp-edges",
                                      width: "auto",
                                      height: "0.7rem",
                                    }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm text-foreground">
                                    All RabbitMQ versions
                                  </span>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    All versions 3.x and 4.x
                                  </p>
                                </div>
                              </li>
                            )}
                          </ul>
                        </div>

                        <div className="mt-auto space-y-4">
                          <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
                            Support
                          </h4>
                          <ul className="space-y-2">
                            <li className="flex items-start gap-3">
                              <div
                                style={{
                                  marginTop: "0.4rem",
                                  width: "0.875rem",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "flex-start",
                                }}
                              >
                                <img
                                  src="/images/check.svg"
                                  alt="Check"
                                  style={{
                                    imageRendering: "crisp-edges",
                                    width: "auto",
                                    height: "0.7rem",
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  Community support
                                </span>
                              </div>
                            </li>
                            {plan.features.prioritySupport && (
                              <li className="flex items-start gap-3">
                                <div
                                  style={{
                                    marginTop: "0.4rem",
                                    width: "0.875rem",
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <img
                                    src="/images/check.svg"
                                    alt="Check"
                                    style={{
                                      imageRendering: "crisp-edges",
                                      width: "auto",
                                      height: "0.7rem",
                                    }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm text-foreground">
                                    Priority support
                                  </span>
                                </div>
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                      <Button
                        size={undefined}
                        className={`w-full mt-6 px-4 py-3 sm:px-7 sm:py-3 transition-colors duration-200 text-base sm:text-lg h-auto rounded-full ${plan.id === "FREE" ? "bg-transparent border border-border text-foreground hover:bg-muted" : "bg-gradient-button hover:bg-gradient-button-hover text-white"}`}
                        onClick={() => {
                          if (hostingMode === "selfhost" && selfHost?.url) {
                            window.open(selfHost.url, "_blank");
                          } else if (plan.id === "ENTERPRISE_PLUS") {
                            if (window.Tawk_API && window.Tawk_API.maximize) {
                              window.Tawk_API.maximize();
                            }
                          } else {
                            const appBaseUrl = import.meta.env
                              .VITE_APP_BASE_URL;

                            const token =
                              localStorage.getItem("authToken") ||
                              document.cookie
                                .split(";")
                                .find((c) => c.trim().startsWith("authToken="));

                            if (token) {
                              window.location.href = `${appBaseUrl}/plans`;
                            } else {
                              trackSignUpClick({
                                source: "pricing_card",
                                location: "landing_page",
                              });
                              window.location.href = `${appBaseUrl}/auth/sign-up`;
                            }
                          }
                        }}
                      >
                        {hostingMode === "selfhost" && selfHost
                          ? tPricing(selfHost.ctaKey)
                          : plan.id === "FREE" || plan.id === "DEVELOPER"
                            ? tPricing("getStarted")
                            : plan.id === "ENTERPRISE"
                              ? tPricing("tryNowForFree")
                              : tPricing("startFree")}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        className="pt-12 pb-20"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4 max-w-4xl mx-auto leading-[1.2] font-normal">
              {t("faqSection.title")}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t("faqSection.subtitle")}
            </p>
          </div>

          <div className="space-y-4">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem
                value="item-1"
                className="border border-border  px-6 bg-transparent mb-4 last:mb-0"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {tFaq("q1.question")}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {tFaq("q1.answer")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-2"
                className="border border-border  px-6 bg-transparent mb-4 last:mb-0"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {tFaq("q2.question")}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {tFaq("q2.answer")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-3"
                className="border border-border  px-6 bg-transparent mb-4 last:mb-0"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {tFaq("q3.question")}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {tFaq("q3.answer")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-4"
                className="border border-border  px-6 bg-transparent mb-4 last:mb-0"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {tFaq("q4.question")}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {tFaq("q4.answer")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-5"
                className="border border-border  px-6 bg-transparent mb-4 last:mb-0"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {tFaq("q5.question")}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {tFaq("q5.answer")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-6"
                className="border border-border  px-6 bg-transparent mb-4 last:mb-0"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {tFaq("q6.question")}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {tFaq("q6.answer")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-7"
                className="border border-border  px-6 bg-transparent mb-4 last:mb-0"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {tFaq("q7.question")}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {tFaq("q7.answer")}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="text-center mt-16">
            <h3 className="text-2xl text-foreground mb-4 font-normal">
              {t("faqSection.stillHaveQuestions")}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              {t("faqSection.stillHaveQuestionsDesc")}
            </p>
            <button
              onClick={() => {
                if (window.Tawk_API) {
                  window.Tawk_API.maximize();
                } else {
                  window.location.href = "mailto:support@qarote.io";
                }
              }}
              className="inline-flex items-center justify-center text-foreground hover:text-[#ff691b] px-4 py-3 sm:px-8 sm:py-4  transition-all duration-200 text-base sm:text-lg font-medium underline decoration-1 hover:decoration-[#ff691b]"
              style={{
                textDecorationThickness: "1px",
                textUnderlineOffset: "0.625rem",
              }}
            >
              {t("cta.contactUs")}
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pt-12 pb-20" style={{ backgroundColor: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-foreground  py-20 px-12 lg:px-16 relative overflow-hidden"
            style={{ backgroundColor: "#ffedd5" }}
          >
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 text-center md:text-left leading-[1.2] font-normal text-[#1a1a1a]">
                  {t("finalCta.title")}
                </h2>
              </div>
              <div className="text-center md:text-left">
                <p className="text-xl mb-8" style={{ color: "#4a4a4a" }}>
                  {t("finalCta.subtitle")}
                </p>
                <div className="flex flex-col items-center md:items-start">
                  <AuthButtons align="left" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="text-card-foreground py-12 border-t border-border"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center gap-1 mb-2">
                <img
                  src="/images/new_icon.svg"
                  alt="Qarote"
                  className="w-6 h-6 sm:w-8 sm:h-8"
                />
                <div>
                  <h3 className="text-foreground font-normal text-[1.2rem]">
                    Qarote
                  </h3>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center">
              <LanguageSwitcher />
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
              <a
                href="/privacy-policy"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {t("footer.privacyPolicy")}
              </a>
              <a
                href="/terms-of-service"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {t("footer.termsOfService")}
              </a>
              <button
                type="button"
                onClick={() => {
                  if (window.Tawk_API) {
                    window.Tawk_API.maximize();
                  } else {
                    window.location.href = "mailto:support@qarote.io";
                  }
                }}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {t("footer.contact")}
              </button>
              <div className="flex items-center gap-2">
                <a
                  href="https://github.com/getqarote/Qarote"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="GitHub"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="https://discord.gg/GwHRbGwyUG"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Discord"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </a>
                <a
                  href="https://www.linkedin.com/company/qarote/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="LinkedIn"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.22 8.25H4.78V23H.22V8.25zM8.56 8.25h4.36v2.01h.06c.61-1.16 2.1-2.38 4.32-2.38 4.62 0 5.47 3.04 5.47 6.99V23h-4.56v-7.02c0-1.67-.03-3.82-2.33-3.82-2.33 0-2.69 1.82-2.69 3.7V23H8.56V8.25z" />
                  </svg>
                </a>
              </div>
              <div className="md:hidden">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
