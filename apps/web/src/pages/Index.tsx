import * as React from "react";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";

import type { LucideProps } from "lucide-react";
import {
  Activity,
  BarChart3,
  Building2,
  Check,
  Github,
  Mail,
  MessageSquare,
  Play,
  Rocket,
  Server,
  Settings,
  Shield,
  X,
} from "lucide-react";

import { trackSignUpClick } from "@/lib/gtm";

import AuthButtons from "@/components/AuthButtons";
import FeatureCard from "@/components/FeatureCard";
import SEO from "@/components/SEO";
import StickyNav from "@/components/StickyNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FAQ = lazy(() => import("@/components/FAQ"));

const Index = () => {
  const { t } = useTranslation("landing");
  const { t: tPricing } = useTranslation("pricing");
  const { t: tFaq } = useTranslation("faq");

  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly"
  );
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Type-safe workaround for React type conflicts between lucide-react and @types/react
  const PlayIcon = Play as unknown as React.ComponentType<LucideProps>;
  const XIcon = X as unknown as React.ComponentType<LucideProps>;
  const CheckIcon = Check as unknown as React.ComponentType<LucideProps>;
  const MailIcon = Mail as unknown as React.ComponentType<LucideProps>;
  const ServerIcon = Server as unknown as React.ComponentType<LucideProps>;
  const ActivityIcon = Activity as unknown as React.ComponentType<LucideProps>;
  const BarChart3Icon =
    BarChart3 as unknown as React.ComponentType<LucideProps>;
  const Building2Icon =
    Building2 as unknown as React.ComponentType<LucideProps>;

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
      },
    },
  ];

  // SEO FAQ items using the faq namespace
  const seoFaqItems = [
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
  ];

  return (
    <div className="min-h-screen bg-background">
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
        faq={seoFaqItems}
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
            "The modern RabbitMQ management interface your team deserves. Cleaner than Management Plugin. Simpler than Prometheus. Cheaper than Cloud Solutions.",
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
        className="relative overflow-visible bg-background text-foreground pb-16"
      >
        {/* Decorative elements - subtle colored accents */}
        <div className="absolute inset-0 opacity-5 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-linear-to-b from-orange-400/20 to-transparent"></div>
          <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-orange-300 rounded-full filter blur-3xl opacity-20"></div>
          <div className="absolute top-1/2 -left-20 sm:-left-40 w-32 h-32 sm:w-60 sm:h-60 bg-red-300 rounded-full filter blur-3xl opacity-20"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-3.5 md:pt-32">
          <div className="w-full text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight max-w-4xl mx-auto px-2">
              {t("hero.title")}
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto px-2">
              {t("hero.subtitle")}
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
                {t("hero.noCreditCard")}
              </p>
            </div>
          </div>
        </div>

        {/* YouTube Video */}
        <div id="video" className="relative pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="relative w-full aspect-video rounded-2xl overflow-hidden group cursor-pointer shadow-soft"
              onClick={() => setIsVideoPlaying(true)}
            >
              {!isVideoPlaying ? (
                <>
                  <img
                    src="/images/dashboard.png"
                    alt="Qarote Dashboard Interface"
                    className="w-full h-full object-contain bg-card"
                    width={1920}
                    height={1080}
                    loading="eager"
                    decoding="async"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/15 group-hover:bg-black/20 transition-colors">
                    <button
                      type="button"
                      aria-label="Play demo video"
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 pointer-events-none shadow-soft"
                    >
                      <PlayIcon
                        className="w-10 h-10 md:w-12 md:h-12 text-orange-600 ml-1"
                        fill="currentColor"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </>
              ) : (
                <iframe
                  src="https://www.youtube.com/embed/YhsU_QFkGUE?autoplay=1"
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
      <section className="pt-12 pb-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {t("comparison.title")}
              <br />
              <span className="text-foreground">
                {t("comparison.titleLine2")}
              </span>
            </h2>
          </div>

          {/* Main Comparison Container */}
          <div className="bg-transparent rounded-xl border border-border overflow-hidden shadow-soft">
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Left Column - Traditional */}
              <div className="pt-8 lg:pt-12 px-8 lg:px-12 pb-0 flex flex-col relative overflow-visible">
                <h3 className="text-2xl font-bold text-foreground mb-8">
                  {t("comparison.traditional.title")}
                </h3>
                <div className="space-y-5 mb-16">
                  <div className="flex gap-4 items-start">
                    <XIcon className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      {t("comparison.traditional.point1")}
                    </p>
                  </div>

                  <div className="flex gap-4 items-start">
                    <XIcon className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      {t("comparison.traditional.point2")}
                    </p>
                  </div>

                  <div className="flex gap-4 items-start">
                    <XIcon className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      {t("comparison.traditional.point3")}
                    </p>
                  </div>

                  <div className="flex gap-4 items-start">
                    <XIcon className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      {t("comparison.traditional.point4")}
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
                    <div className="text-red-500 text-4xl">&#9888;&#65039;</div>
                  </div>
                </div>
              </div>

              {/* Right Column - Qarote */}
              <div className="pt-8 lg:pt-12 px-8 lg:px-12 pb-0 flex flex-col relative overflow-visible">
                <h3 className="text-2xl font-bold text-foreground mb-8">
                  {t("comparison.qarote.title")}
                </h3>
                <div className="space-y-5 mb-16">
                  <div className="flex gap-4 items-start">
                    <CheckIcon className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      {t("comparison.qarote.point1")}
                    </p>
                  </div>

                  <div className="flex gap-4 items-start">
                    <CheckIcon className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      {t("comparison.qarote.point2")}
                    </p>
                  </div>

                  <div className="flex gap-4 items-start">
                    <CheckIcon className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      {t("comparison.qarote.point3")}
                    </p>
                  </div>

                  <div className="flex gap-4 items-start">
                    <CheckIcon className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      {t("comparison.qarote.point4")}
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
                        src="/images/new_icon.svg"
                        alt="Qarote"
                        className="w-6 h-6"
                      />
                      <span className="font-semibold text-sm">Qarote</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/30 rounded p-1.5">
                        <div className="text-xs text-muted-foreground">
                          {t("comparison.messagesPerSec")}
                        </div>
                        <div className="text-sm font-bold">4.2k</div>
                      </div>
                      <div className="bg-muted/30 rounded p-1.5">
                        <div className="text-xs text-muted-foreground">
                          {t("comparison.activeQueues")}
                        </div>
                        <div className="text-sm font-bold">127</div>
                      </div>
                    </div>
                    <div className="bg-green-100 border border-green-200 rounded p-1.5 text-xs text-green-700">
                      &#10003; {t("comparison.allSystemsOperational")}
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
              className="bg-linear-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 px-4 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-colors duration-200 text-base sm:text-lg"
            >
              {t("cta.startMonitoringForFree")}
            </button>
          </div>
        </div>
      </section>

      {/* Enterprise Licenses Section */}
      <section className="py-20 bg-linear-to-b from-background to-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center p-2 bg-linear-to-r from-orange-500/10 to-red-500/10 rounded-full mb-6">
              <Building2Icon className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              {t("enterprise.title")}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t("enterprise.description")}
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div className="p-6 bg-card border border-border rounded-lg">
                <ServerIcon className="w-8 h-8 text-orange-600 mb-3 mx-auto" />
                <h3 className="font-semibold text-foreground mb-2">
                  {t("enterprise.unlimitedServers")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("enterprise.unlimitedServersDesc")}
                </p>
              </div>
              <div className="p-6 bg-card border border-border rounded-lg">
                <Shield className="w-8 h-8 text-orange-600 mb-3 mx-auto" />
                <h3 className="font-semibold text-foreground mb-2">
                  {t("enterprise.advancedSecurity")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("enterprise.advancedSecurityDesc")}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                trackSignUpClick({
                  source: "enterprise_section_cta",
                  location: "landing_page",
                });
                const portalUrl = import.meta.env.VITE_PORTAL_URL;
                window.location.href = portalUrl;
              }}
              className="bg-linear-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 px-4 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-colors duration-200 text-base sm:text-lg"
            >
              {t("cta.selfHostedSolution")}
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
                {t("connection.title")}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t("connection.subtitle")}
              </p>
            </div>

            {/* Right side - Steps */}
            <div className="space-y-8">
              {/* Step 1: Sign up */}
              <div className="bg-transparent border border-border rounded-xl pt-6 px-6 pb-0 flex gap-6 flex-col relative overflow-visible shadow-soft">
                <div className="flex gap-6">
                  <div className="shrink-0">
                    <div className="w-12 h-12 rounded-full bg-linear-to-r from-orange-500 to-red-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">1</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {t("connection.step1.title")}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {t("connection.step1.description")}
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="bg-card border-t border-l border-r border-border rounded-t-xl p-6 max-w-sm mx-auto">
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <img
                        src="/images/new_icon.svg"
                        alt="Qarote"
                        className="w-8 h-8"
                      />
                      <span className="font-bold text-xl text-foreground">
                        Qarote
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-foreground text-center mb-2">
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
                        className="w-full bg-background border border-border rounded-lg p-3 flex items-center justify-center gap-3 hover:bg-muted/50 transition-colors"
                      >
                        <MailIcon className="w-5 h-5 text-orange-600" />
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
                          {t("connection.step1.continueWithGoogle")}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Add your servers */}
              <div className="bg-transparent border border-border rounded-xl pt-6 px-6 pb-0 flex gap-6 flex-col relative overflow-visible shadow-soft">
                <div className="flex gap-6">
                  <div className="shrink-0">
                    <div className="w-12 h-12 rounded-full bg-linear-to-r from-orange-500 to-red-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">2</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {t("connection.step2.title")}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {t("connection.step2.description")}
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="bg-card border-t border-l border-r border-border rounded-t-xl p-6 max-w-sm mx-auto">
                    <div className="space-y-3">
                      <div className="bg-background border border-border rounded-lg p-4 flex items-center gap-4">
                        <div className="shrink-0">
                          <ServerIcon className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground mb-1">
                            {t("connection.step2.productionServer")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("connection.step2.nodes")}
                          </div>
                        </div>
                      </div>
                      <div className="bg-background border border-border rounded-lg p-4 flex items-center gap-4">
                        <div className="shrink-0">
                          <ServerIcon className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground mb-1">
                            {t("connection.step2.stagingServer")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("connection.step2.nodes")}
                          </div>
                        </div>
                      </div>
                      <div className="bg-background border border-border rounded-lg p-4 flex items-center gap-4">
                        <div className="shrink-0">
                          <ServerIcon className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground mb-1">
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
              <div className="bg-transparent border border-border rounded-xl pt-6 px-6 pb-0 flex gap-6 flex-col relative overflow-visible shadow-soft">
                <div className="flex gap-6">
                  <div className="shrink-0">
                    <div className="w-12 h-12 rounded-full bg-linear-to-r from-orange-500 to-red-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">3</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {t("connection.step3.title")}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {t("connection.step3.description")}
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
                            <ActivityIcon className="w-4 h-4 text-orange-600" />
                            <span className="text-xs text-muted-foreground">
                              {t("connection.step3.messagesPerSec")}
                            </span>
                          </div>
                          <div className="text-lg font-bold text-foreground">
                            4.2k
                          </div>
                        </div>
                        <div className="bg-background border border-border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <BarChart3Icon className="w-4 h-4 text-orange-600" />
                            <span className="text-xs text-muted-foreground">
                              {t("connection.step3.queues")}
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
                            {t("connection.step3.queueDepths")}
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
                              {t("connection.step3.allSystemsOperational")}
                            </span>
                          </div>
                          <CheckIcon className="w-4 h-4 text-green-600" />
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
              {tPricing("title")}
            </h2>
          </div>

          {/* Billing Toggle */}
          <div className="flex flex-col items-center justify-center gap-3 mb-16 text-center">
            <div className="flex items-center gap-4">
              <span
                className={`text-sm font-medium ${billingPeriod === "monthly" ? "text-foreground" : "text-muted-foreground"}`}
              >
                {tPricing("billedMonthly")}
              </span>
              <button
                onClick={() =>
                  setBillingPeriod(
                    billingPeriod === "monthly" ? "yearly" : "monthly"
                  )
                }
                role="switch"
                aria-checked={billingPeriod === "yearly"}
                aria-label="Toggle between monthly and yearly billing"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  billingPeriod === "yearly"
                    ? "bg-linear-to-r from-orange-500 to-red-500"
                    : "bg-muted"
                }`}
              >
                <span
                  aria-hidden="true"
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
                {tPricing("billedYearly")}
              </span>
            </div>
            <Badge className="bg-green-50 text-green-700 border border-green-200 mt-2 hover:bg-green-100">
              {billingPeriod === "yearly"
                ? tPricing("saveUpTo20Yearly")
                : tPricing("switchToYearly")}
            </Badge>
          </div>

          {/* Plans Grid */}
          <div className="flex justify-center w-full">
            <div
              className="flex gap-6 w-full max-w-7xl overflow-x-auto overflow-y-visible px-4 py-4 snap-x snap-mandatory md:px-6 md:py-6 lg:grid lg:grid-cols-4 lg:px-0 lg:py-0 lg:overflow-visible lg:snap-none"
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
                                {tPricing("perMonth")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 flex-1">
                        <div>
                          <h4 className="font-semibold text-foreground mb-3 text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap">
                            {tPricing("coreFeatures")}
                          </h4>
                          <ul className="space-y-2">
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <CheckIcon className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  {plan.features.servers}{" "}
                                  {plan.features.servers ===
                                  tPricing("limits.upTo1")
                                    ? tPricing("featureNames.servers", {
                                        count: 1,
                                      })
                                    : tPricing("featureNames.servers_plural", {
                                        count: 1,
                                      })}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {tPricing("featureNames.serversDesc")}
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <CheckIcon className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  {tPricing(
                                    "featureNames.rabbitMQVersionSupport"
                                  )}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {plan.features.rabbitMQVersionSupport}
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <CheckIcon className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  {plan.features.workspaces}{" "}
                                  {plan.features.workspaces ===
                                  tPricing("limits.upTo1")
                                    ? tPricing("featureNames.workspaces", {
                                        count: 1,
                                      })
                                    : tPricing(
                                        "featureNames.workspaces_plural",
                                        { count: 1 }
                                      )}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {tPricing("featureNames.workspacesDesc")}
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <CheckIcon className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  {plan.features.teamMembers}{" "}
                                  {plan.features.teamMembers ===
                                  tPricing("limits.upTo1")
                                    ? tPricing("featureNames.teamMembers", {
                                        count: 1,
                                      })
                                    : tPricing(
                                        "featureNames.teamMembers_plural",
                                        { count: 1 }
                                      )}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {tPricing("featureNames.teamMembersDesc")}
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <CheckIcon className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  {tPricing("featureNames.advancedAnalytics")}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {tPricing(
                                    "featureNames.advancedAnalyticsDesc"
                                  )}
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                {plan.features.queueManagement ? (
                                  <CheckIcon className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XIcon className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span
                                  className={`text-sm ${plan.features.queueManagement ? "text-foreground" : "text-muted-foreground"}`}
                                >
                                  {tPricing("featureNames.queueManagement")}
                                </span>
                                <div
                                  className={`text-xs ${plan.features.queueManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                                >
                                  {tPricing("featureNames.queueManagementDesc")}
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                {plan.features.exchangeManagement ? (
                                  <CheckIcon className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XIcon className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span
                                  className={`text-sm ${plan.features.exchangeManagement ? "text-foreground" : "text-muted-foreground"}`}
                                >
                                  {tPricing("featureNames.exchangeManagement")}
                                </span>
                                <div
                                  className={`text-xs ${plan.features.exchangeManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                                >
                                  {tPricing(
                                    "featureNames.exchangeManagementDesc"
                                  )}
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                {plan.features.virtualHostManagement ? (
                                  <CheckIcon className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XIcon className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span
                                  className={`text-sm ${plan.features.virtualHostManagement ? "text-foreground" : "text-muted-foreground"}`}
                                >
                                  {tPricing(
                                    "featureNames.virtualHostManagement"
                                  )}
                                </span>
                                <div
                                  className={`text-xs ${plan.features.virtualHostManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                                >
                                  {tPricing(
                                    "featureNames.virtualHostManagementDesc"
                                  )}
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                {plan.features.rabbitMQUserManagement ? (
                                  <CheckIcon className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XIcon className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span
                                  className={`text-sm ${plan.features.rabbitMQUserManagement ? "text-foreground" : "text-muted-foreground"}`}
                                >
                                  {tPricing(
                                    "featureNames.rabbitMQUserManagement"
                                  )}
                                </span>
                                <div
                                  className={`text-xs ${plan.features.rabbitMQUserManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                                >
                                  {tPricing(
                                    "featureNames.rabbitMQUserManagementDesc"
                                  )}
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <CheckIcon className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  {tPricing("featureNames.soc2Compliance")}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {tPricing("featureNames.soc2ComplianceDesc")}
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                {plan.features.alertsNotification ? (
                                  <CheckIcon className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XIcon className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span
                                  className={`text-sm ${plan.features.alertsNotification ? "text-foreground" : "text-muted-foreground"}`}
                                >
                                  {tPricing("featureNames.alertsNotification")}
                                </span>
                                <div
                                  className={`text-xs ${plan.features.alertsNotification ? "text-muted-foreground" : "text-muted-foreground"}`}
                                >
                                  {tPricing(
                                    "featureNames.alertsNotificationDesc"
                                  )}
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>

                        <div className="mt-auto space-y-4">
                          <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
                            {tPricing("support")}
                          </h4>
                          <ul className="space-y-2">
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <CheckIcon className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  {tPricing("featureNames.communitySupport")}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {tPricing(
                                    "featureNames.communitySupportDesc"
                                  )}
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                {plan.features.prioritySupport ? (
                                  <CheckIcon className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XIcon className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span
                                  className={`text-sm ${plan.features.prioritySupport ? "text-foreground" : "text-muted-foreground"}`}
                                >
                                  {tPricing("featureNames.prioritySupport")}
                                </span>
                                <div
                                  className={`text-xs ${plan.features.prioritySupport ? "text-muted-foreground" : "text-muted-foreground"}`}
                                >
                                  {tPricing("featureNames.prioritySupportDesc")}
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>
                        <Button
                          size={undefined}
                          className="w-full bg-linear-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 px-4 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-colors duration-200 text-base sm:text-lg h-auto"
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
                          {tPricing("startFree")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Enterprise Edition Card */}
              <Card className="relative flex h-full flex-col min-w-[78%] md:min-w-[60%] lg:min-w-0 snap-center last:mr-2 md:last:mr-4 lg:last:mr-0 bg-transparent rounded-xl shadow-soft ring-2 ring-gradient-to-r from-orange-500 to-red-500">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="text-left mb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2Icon className="w-6 h-6 text-orange-600" />
                      <h3 className="text-2xl font-bold bg-linear-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                        {tPricing("plans.enterprise.name")}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {tPricing("plans.enterprise.selfHosted")}
                    </p>

                    <div className="mb-4 min-h-[60px] flex flex-col justify-start">
                      <div className="flex items-center justify-start gap-2">
                        <span className="text-3xl font-bold text-foreground">
                          {tPricing("plans.enterprise.customPricing")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {tPricing("plans.enterprise.contactSales")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6 flex-1">
                    <div>
                      <h4 className="font-semibold text-foreground mb-3 text-xs sm:text-sm uppercase tracking-wide">
                        {tPricing("enterpriseFeatures")}
                      </h4>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-3">
                          <div className="mt-1">
                            <CheckIcon className="w-4 h-4 text-green-500" />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm text-foreground">
                              {tPricing("featureNames.onPremiseDeployment")}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {tPricing("featureNames.onPremiseDeploymentDesc")}
                            </div>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="mt-1">
                            <CheckIcon className="w-4 h-4 text-green-500" />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm text-foreground">
                              {tPricing("featureNames.unlimitedServers")}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {tPricing("featureNames.unlimitedServersDesc")}
                            </div>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="mt-1">
                            <CheckIcon className="w-4 h-4 text-green-500" />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm text-foreground">
                              {tPricing("featureNames.customLicenseTiers")}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {tPricing("featureNames.customLicenseTiersDesc")}
                            </div>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="mt-1">
                            <CheckIcon className="w-4 h-4 text-green-500" />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm text-foreground">
                              {tPricing("featureNames.completeDataControl")}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {tPricing("featureNames.completeDataControlDesc")}
                            </div>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="pt-12 pb-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {t("faqSection.title")}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t("faqSection.subtitle")}
            </p>
          </div>

          <div className="space-y-4">
            <Suspense
              fallback={
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-14 border border-border rounded-xl bg-muted/30 animate-pulse"
                    />
                  ))}
                </div>
              }
            >
              <FAQ />
            </Suspense>
          </div>

          <div className="text-center mt-16">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              {t("faqSection.stillHaveQuestions")}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              {t("faqSection.stillHaveQuestionsDesc")}
            </p>
            <button
              onClick={() => {
                // Tawk.to API is available via the React component
                if (window.Tawk_API) {
                  window.Tawk_API.maximize();
                }
              }}
              className="inline-flex items-center justify-center bg-linear-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 px-4 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-colors duration-200 text-base sm:text-lg"
            >
              {t("cta.contactUs")}
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pt-12 pb-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-white rounded-xl py-20 px-12 lg:px-16 relative overflow-hidden bg-gradient-auth bg-size-[200%_200%] animate-gradient-shift"
            style={{
              animationDuration: "8s",
            }}
          >
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                  {t("finalCta.title")}
                </h2>
              </div>
              <div className="text-center md:text-left">
                <p className="text-xl text-white mb-8">
                  {t("finalCta.subtitle")}
                </p>
                <div className="flex flex-col items-center md:items-start">
                  <AuthButtons
                    variant="light"
                    onHowItWorksClick={() => setIsVideoPlaying(true)}
                    hideHowItWorks={true}
                    align="left"
                  />
                  <p className="text-xs sm:text-sm text-white mt-3">
                    {t("finalCta.noCreditCard")}
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
              <h3 className="text-xl font-bold">Qarote</h3>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="https://github.com/getqarote/Qarote"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on GitHub"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
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
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
