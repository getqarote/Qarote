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

import FeatureCard from "@/components/FeatureCard";

const FeaturesSection = () => {
  const { t } = useTranslation("landing");

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

  return (
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
          {features.map((feature) => (
            <FeatureCard
              key={feature.icon.name}
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
  );
};

export default FeaturesSection;
