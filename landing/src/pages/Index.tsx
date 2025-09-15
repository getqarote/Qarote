import { useState, useEffect } from "react";
import {
  Zap,
  Shield,
  BarChart3,
  Settings,
  Rocket,
  Star,
  Twitter,
  Activity,
  MessageSquare,
  Clock,
  Check,
  X,
  TrendingUp,
  Headphones,
} from "lucide-react";
import AuthButtons from "@/components/AuthButtons";
import FeatureCard from "@/components/FeatureCard";
import ComparisonTable from "@/components/ComparisonTable";
import SEO from "@/components/SEO";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  const isMobile = useIsMobile();
  const [activeView, setActiveView] = useState(1); // 1 = chart view, 2 = queue list view
  const [imageLoaded, setImageLoaded] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );

  // Trigger initial animation after component mounts
  useEffect(() => {
    const loadTimeout = setTimeout(() => {
      setImageLoaded(true);
    }, 500);
    return () => clearTimeout(loadTimeout);
  }, []);

  // Switch between chart and queue views every 3 seconds
  useEffect(() => {
    if (!imageLoaded) return;

    const interval = setInterval(() => {
      setActiveView((current) => {
        const newView = current === 1 ? 2 : 1;
        return newView;
      });
    }, 3000); // 3 seconds between transitions

    return () => clearInterval(interval);
  }, [imageLoaded]);

  const features = [
    {
      icon: Activity,
      title: "Live Queue Monitoring",
      description:
        "Monitor queue depths, message rates, and consumer counts with live updates. Track message accumulation and processing performance in real-time.",
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
      FREE: { price: "Free", originalPrice: undefined },
      DEVELOPER: { price: "$10", originalPrice: undefined },
      ENTERPRISE: { price: "$50", originalPrice: undefined },
    },
    yearly: {
      FREE: { price: "Free", originalPrice: undefined },
      DEVELOPER: { price: "$100", originalPrice: "$120" },
      ENTERPRISE: { price: "$500", originalPrice: "$600" },
    },
  };

  const plans = [
    {
      id: "FREE",
      name: "Free",
      description: "Perfect for getting started",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      features: {
        servers: "Up to 1",
        workspaces: "Up to 1",
        teamMembers: "Up to 1",
        queueManagement: false,
        exchangeManagement: false,
        virtualHostManagement: false,
        rabbitMQUserManagement: false,
        communitySupport: true,
        prioritySupport: false,
        emailAlerts: false,
      },
    },
    {
      id: "DEVELOPER",
      name: "Developer",
      description: "For solo developers and small projects",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      isPopular: true,
      features: {
        servers: "Up to 2",
        workspaces: "Up to 2",
        teamMembers: "Up to 2",
        queueManagement: true,
        exchangeManagement: true,
        virtualHostManagement: true,
        rabbitMQUserManagement: true,
        communitySupport: true,
        prioritySupport: false,
        emailAlerts: true,
      },
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise",
      description: "For large teams and enterprises",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      features: {
        servers: "Unlimited",
        workspaces: "Unlimited",
        teamMembers: "Unlimited",
        queueManagement: true,
        exchangeManagement: true,
        virtualHostManagement: true,
        rabbitMQUserManagement: true,
        communitySupport: true,
        prioritySupport: true,
        emailAlerts: true,
      },
    },
  ];

  const stats = [
    { number: "500+", label: "Active Users" },
    { number: "Live", label: "Queue Insights" },
    { number: "Free", label: "Trial Available" },
    { number: "5min", label: "Setup Time" },
  ];

  return (
    <div className="min-h-screen bg-background">
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
              "RabbitHQ is a modern management interface for RabbitMQ message brokers. It provides a cleaner, faster, and more intuitive experience than the default Management Plugin, with advanced analytics and monitoring capabilities.",
          },
          {
            question:
              "How does RabbitHQ compare to the default Management Plugin?",
            answer:
              "RabbitHQ offers a more modern, responsive interface with real-time updates, advanced analytics, and a better user experience. It's designed to be more intuitive for developers while providing deeper insights into your message queues.",
          },
          {
            question: "How do I monitor RabbitMQ queues with RabbitHQ?",
            answer:
              "RabbitHQ provides real-time monitoring dashboards for your queues with metrics like message rates, consumer counts, and queue depth. It offers alerts, historical trends, and performance insights without complex Prometheus or Grafana setups.",
          },
          {
            question:
              "Is RabbitHQ a better monitoring tool than Prometheus and Grafana?",
            answer:
              "RabbitHQ offers purpose-built monitoring specifically for RabbitMQ with zero configuration. While Prometheus and Grafana are powerful, they require significant setup and maintenance. RabbitHQ provides comparable insights with much less overhead.",
          },
          {
            question:
              "What makes RabbitHQ the best RabbitMQ management interface?",
            answer:
              "RabbitHQ combines ease of use with powerful features. It offers superior visualization, real-time updates, advanced filtering, and user-friendly queue management that surpasses both the default plugin and generic monitoring tools.",
          },
          {
            question: "Do I need to host RabbitHQ myself?",
            answer:
              "Yes, RabbitHQ is designed to be self-hosted alongside your RabbitMQ instances. It connects securely to your RabbitMQ clusters with minimal configuration and no cloud dependencies.",
          },
          {
            question: "How much does RabbitHQ cost?",
            answer:
              "RabbitHQ offers a simple licensing model that scales with your team, not your message volume. This makes it more cost-effective than cloud-based alternatives that charge per message or node.",
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
          screenshot: "https://rabbithq.io/social-card.png",
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
      <header className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-red-600 to-orange-700 text-white">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-grid-white/5"></div>
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500 rounded-full filter blur-3xl opacity-20"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-500 rounded-full filter blur-3xl opacity-20"></div>
        </div>

        {/* Image showcase container - desktop only */}
        <div
          className={`hidden md:block absolute right-4 md:right-8 lg:right-12 top-1/2 -translate-y-1/2 w-[50%] max-w-3xl h-auto pointer-events-none transition-all duration-1000 ease-out ${
            imageLoaded
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0"
          }`}
        >
          {/* Container with adjusted height */}
          <div className="relative w-full h-[280px] md:h-[380px] lg:h-[420px] rounded-lg overflow-hidden">
            {/* Sliding dashboard views */}
            <div className="w-full h-full">
              <img
                src={"/images/dashboard-mockup.svg"}
                alt={"RabbitHQ Dashboard Interface"}
                className={`w-full h-full object-contain transition-opacity duration-1000 ease-in-out ${
                  activeView === 1 ? "opacity-100" : "opacity-0"
                }`}
              />
              <img
                src={"/images/dashboard-queues.svg"}
                alt={"RabbitHQ Queue Management"}
                className={`w-full h-full object-contain absolute top-0 left-0 transition-opacity duration-1000 ease-in-out ${
                  activeView === 2 ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8 md:py-32">
          <div className="w-full md:max-w-sm lg:max-w-md animate-slide-in-left opacity-0 text-center md:text-left mx-auto md:mx-0">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8 shadow-sm border border-white/20">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium text-white/90">
                Now Available - Start Your Free Trial
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Rabbit
              <span className="bg-gradient-to-r from-orange-300 to-red-300 bg-clip-text text-transparent">
                HQ
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-orange-100 mb-8 leading-relaxed">
              The modern RabbitMQ management interface your team deserves.
              <br className="hidden sm:block" />
              <span className="font-semibold text-white">
                Cleaner than Management Plugin. Simpler than Prometheus. Cheaper
                than Cloud Solutions.
              </span>
            </p>

            <div className="mb-12">
              <AuthButtons />
              <p className="text-sm text-orange-200 mt-3">
                No credit card required • Start managing queues in minutes
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-0 max-w-sm md:max-w-none mx-auto md:mx-0">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="text-center bg-white/5 backdrop-blur-sm p-3 rounded-lg border border-white/10"
                >
                  <div className="text-lg sm:text-xl font-bold text-white mb-1">
                    {stat.number}
                  </div>
                  <div className="text-xs text-orange-200">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Mobile Image showcase - shown only on mobile below stats */}
            <div
              className={`md:hidden mt-8 transition-all duration-1000 ease-out ${
                imageLoaded
                  ? "translate-x-0 opacity-100"
                  : "translate-x-full opacity-0"
              }`}
            >
              <div className="relative w-full max-w-md mx-auto h-[250px] rounded-lg overflow-hidden">
                <div className="w-full h-full">
                  <img
                    src={"/images/dashboard-mockup.svg"}
                    alt={"RabbitHQ Dashboard Interface"}
                    className={`w-full h-full object-contain transition-opacity duration-1000 ease-in-out ${
                      activeView === 1 ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <img
                    src={"/images/dashboard-queues.svg"}
                    alt={"RabbitHQ Queue Management"}
                    className={`w-full h-full object-contain absolute top-0 left-0 transition-opacity duration-1000 ease-in-out ${
                      activeView === 2 ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything you need, nothing you don't
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Stop fighting with outdated interfaces and complex monitoring
              setups. Get back to building amazing applications.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                gradient={feature.gradient}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Scale your RabbitMQ monitoring with plans designed for teams of
              all sizes.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="flex justify-center mb-12">
            <div className="grid md:grid-cols-4 gap-6 max-w-4xl">
              <div className="flex flex-col items-center p-4">
                <div className="bg-blue-100 p-3 rounded-full mb-3">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  Live Monitoring
                </h3>
                <p className="text-sm text-muted-foreground text-center">
                  Monitor your RabbitMQ servers with millisecond precision
                </p>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="bg-purple-100 p-3 rounded-full mb-3">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  Smart Analytics
                </h3>
                <p className="text-sm text-muted-foreground text-center">
                  AI-powered insights and memory optimization tips
                </p>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="bg-green-100 p-3 rounded-full mb-3">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  Enterprise Security
                </h3>
                <p className="text-sm text-muted-foreground text-center">
                  SOC 2 compliant with enterprise-grade encryption
                </p>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="bg-orange-100 p-3 rounded-full mb-3">
                  <Headphones className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  24/7 Support
                </h3>
                <p className="text-sm text-muted-foreground text-center">
                  Expert support when you need it most
                </p>
              </div>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span
              className={`text-sm font-medium ${billingPeriod === "monthly" ? "text-foreground" : "text-muted-foreground"}`}
            >
              Monthly
            </span>
            <button
              onClick={() =>
                setBillingPeriod(
                  billingPeriod === "monthly" ? "yearly" : "monthly"
                )
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                billingPeriod === "yearly" ? "bg-blue-600" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingPeriod === "yearly" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${billingPeriod === "yearly" ? "text-foreground" : "text-muted-foreground"}`}
            >
              Yearly
            </span>
            {billingPeriod === "yearly" && (
              <Badge className="bg-green-100 text-green-800">Save 20%</Badge>
            )}
          </div>

          {/* Plans Grid */}
          <div className="flex justify-center">
            <div className="grid lg:grid-cols-3 gap-8 max-w-5xl">
              {plans.map((plan) => {
                const currentPricing =
                  planPricing[billingPeriod][
                    plan.id as keyof typeof planPricing.monthly
                  ];
                const isPopular = plan.isPopular;

                return (
                  <Card
                    key={plan.id}
                    className={`relative ${plan.borderColor} ${isPopular ? "ring-2 ring-blue-500 shadow-lg scale-105" : ""} transition-all duration-200 hover:shadow-lg`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <Badge
                          className="text-white px-4 py-1 text-sm font-medium"
                          style={{
                            backgroundImage:
                              "linear-gradient(to right, rgb(234 88 12), rgb(220 38 38))",
                          }}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    <CardContent className="p-6">
                      <div className="text-center mb-6">
                        <h3 className={`text-2xl font-bold ${plan.color} mb-2`}>
                          {plan.name}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-4">
                          {plan.description}
                        </p>

                        <div className="mb-4">
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-bold text-foreground">
                              {currentPricing.price}
                            </span>
                            {currentPricing.price !== "Free" && (
                              <span className="text-muted-foreground">
                                /
                                {billingPeriod === "monthly" ? "month" : "year"}
                              </span>
                            )}
                          </div>
                          {currentPricing.originalPrice && (
                            <div className="flex items-center justify-center gap-2 mt-1">
                              <span className="text-muted-foreground line-through text-sm">
                                {currentPricing.originalPrice}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                Save 20%
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-6 mb-6">
                        <div>
                          <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
                            Core Features
                          </h4>
                          <ul className="space-y-2">
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <Check className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  RabbitMQ Servers
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {plan.features.servers}
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <Check className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  Workspaces
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {plan.features.workspaces}
                                </div>
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                <Check className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-foreground">
                                  Team Members
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {plan.features.teamMembers}
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
                          </ul>
                        </div>

                        <div>
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
                                  Community forums
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
                            <li className="flex items-start gap-3">
                              <div className="mt-1">
                                {plan.features.emailAlerts ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <X className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span
                                  className={`text-sm ${plan.features.emailAlerts ? "text-foreground" : "text-muted-foreground"}`}
                                >
                                  Email Alerts
                                </span>
                                <div
                                  className={`text-xs ${plan.features.emailAlerts ? "text-muted-foreground" : "text-muted-foreground"}`}
                                >
                                  Critical and warning notifications
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>

                      <Button
                        className="w-full text-white"
                        style={{
                          backgroundImage:
                            "linear-gradient(to right, rgb(234 88 12), rgb(220 38 38))",
                        }}
                        onClick={() => {
                          const authBaseUrl = import.meta.env.VITE_APP_BASE_URL;
                          const appBaseUrl = "http://localhost:8080";

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
                            // User not authenticated, redirect to sign up
                            window.location.href = `${authBaseUrl}/auth/sign-up`;
                          }
                        }}
                      >
                        {plan.id === "FREE" ? "Get Started" : "Upgrade Now"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* See it in action Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              See it in action
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Explore the intuitive interface and powerful features that make
              RabbitMQ management a breeze.
            </p>
          </div>

          {/* Application Mockup */}
          <div className="max-w-6xl mx-auto">
            <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
              {/* Browser Chrome */}
              <div className="bg-muted px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="ml-4 bg-background rounded px-3 py-1 text-sm text-muted-foreground flex-1 max-w-md truncate">
                    https://app.rabbithq.io
                  </div>
                </div>
              </div>

              {/* App Interface */}
              <div className="bg-muted/20 p-3 sm:p-6">
                {/* Top Navigation */}
                <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4 mb-4 sm:mb-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <img
                        src="/icon_rabbit.svg"
                        alt="RabbitHQ Logo"
                        className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0"
                      />
                      <span className="font-semibold text-foreground text-sm sm:text-base">
                        RabbitHQ
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-muted-foreground truncate">
                        {isMobile
                          ? "cluster-prod-01"
                          : "Connected to cluster-prod-01"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Content */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {/* Stats Cards */}
                  <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="bg-card rounded-lg p-3 sm:p-4 shadow-sm border border-border">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-lg sm:text-2xl font-bold text-foreground">
                              4.2k
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              Messages/sec
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-card rounded-lg p-3 sm:p-4 shadow-sm border border-border">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="text-lg sm:text-2xl font-bold text-foreground">
                              127
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              Active Queues
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-card rounded-lg p-3 sm:p-4 shadow-sm border border-border">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="text-lg sm:text-2xl font-bold text-foreground">
                              2.3ms
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              Avg Latency
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Chart Area */}
                    <div className="bg-card rounded-lg p-4 sm:p-6 shadow-sm border border-border">
                      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                        Message Throughput
                      </h3>
                      <div className="h-36 sm:h-48 bg-gradient-to-r from-primary/10 to-destructive/10 rounded-lg flex items-end justify-around p-2 sm:p-4">
                        {[65, 78, 45, 88, 92, 75, 85, 95, 82, 77, 89, 94].map(
                          (height, i) => (
                            <div
                              key={i}
                              className="bg-gradient-to-t from-primary to-destructive rounded-t w-2 sm:w-6"
                              style={{ height: `${height}%` }}
                            ></div>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Queue List */}
                  <div className="bg-card rounded-lg p-4 sm:p-6 shadow-sm border border-border">
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                      Active Queues
                    </h3>
                    <div className="space-y-2 sm:space-y-3">
                      {[
                        {
                          name: "user-notifications",
                          messages: "1.2k",
                          consumers: 3,
                        },
                        { name: "email-queue", messages: "845", consumers: 2 },
                        {
                          name: "analytics-events",
                          messages: "2.8k",
                          consumers: 5,
                        },
                        {
                          name: "payment-processing",
                          messages: "156",
                          consumers: 1,
                        },
                      ].map((queue, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg"
                        >
                          <div>
                            <div className="font-medium text-foreground text-xs sm:text-sm">
                              {queue.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {queue.messages} messages
                            </div>
                          </div>
                          <div className="text-xs bg-primary/10 text-primary px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                            {queue.consumers} consumers
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How we compare
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              See why RabbitHQ is the obvious choice for modern development
              teams.
            </p>
          </div>

          <ComparisonTable />
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Trusted by development teams
            </h2>
            <p className="text-xl text-muted-foreground">
              From startups to enterprises, teams choose RabbitHQ
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-primary/5 to-destructive/5 p-8 rounded-xl border border-border">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <blockquote className="text-card-foreground mb-4">
                "Finally, a RabbitMQ interface that doesn't make me want to cry.
                The setup was instant and the UI is gorgeous."
              </blockquote>
              <div className="text-sm text-muted-foreground">
                — Sarah Chen, DevOps Engineer
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-xl border border-border">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <blockquote className="text-card-foreground mb-4">
                "We saved $3000/month switching from CloudAMQP. Same features,
                better interface, fraction of the cost."
              </blockquote>
              <div className="text-sm text-muted-foreground">
                — Marcus Rodriguez, CTO
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-xl border border-border">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <blockquote className="text-card-foreground mb-4">
                "The analytics dashboard gives us insights we never had before.
                Game changer for our monitoring."
              </blockquote>
              <div className="text-sm text-muted-foreground">
                — Alex Thompson, Lead Developer
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="py-20 text-white"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(234 88 12), rgb(220 38 38))",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to upgrade your RabbitMQ experience?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join thousands of developers already using RabbitHQ
          </p>

          <div className="bg-background/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
            <AuthButtons />
          </div>

          <p className="text-white/80 text-sm">
            Free trial available • No credit card required • Start in minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card text-card-foreground py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold">RabbitHQ</h3>
              <p className="text-muted-foreground">
                The future of message queue management
              </p>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
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
