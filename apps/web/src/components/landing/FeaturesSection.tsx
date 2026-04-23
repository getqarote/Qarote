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

import { Button } from "@/components/ui/button";

const iconImageMap: Record<string, { src: string; alt: string }> = {
  Activity: { src: "/images/real-time.svg", alt: "Real-time" },
  Shield: { src: "/images/flag.svg", alt: "Flag" },
  MessageSquare: { src: "/images/message.svg", alt: "Message" },
  BarChart3: { src: "/images/chart.svg", alt: "Chart" },
  Settings: { src: "/images/server.svg", alt: "Server" },
  Rocket: { src: "/images/send.svg", alt: "Send" },
};

const FeaturesSection = () => {
  const { t } = useTranslation("landing");

  const features = [
    {
      iconKey: "Activity",
      icon: Activity,
      title: t("features.liveQueueMonitoring.title"),
      description: t("features.liveQueueMonitoring.description"),
    },
    {
      iconKey: "Shield",
      icon: Shield,
      title: t("features.smartAlertingSystem.title"),
      description: t("features.smartAlertingSystem.description"),
    },
    {
      iconKey: "MessageSquare",
      icon: MessageSquare,
      title: t("features.queueManagement.title"),
      description: t("features.queueManagement.description"),
    },
    {
      iconKey: "BarChart3",
      icon: BarChart3,
      title: t("features.performanceAnalytics.title"),
      description: t("features.performanceAnalytics.description"),
    },
    {
      iconKey: "Settings",
      icon: Settings,
      title: t("features.multiServerSupport.title"),
      description: t("features.multiServerSupport.description"),
    },
    {
      iconKey: "Rocket",
      icon: Rocket,
      title: t("features.messagePublishing.title"),
      description: t("features.messagePublishing.description"),
    },
  ];

  const hero = features[0];
  const secondary = features.slice(1, 3);
  const compact = features.slice(3);

  return (
    <section id="features" className="pt-12 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4 max-w-4xl mx-auto leading-[1.2] font-normal">
            {t("features.title")}
            <br />
            {t("features.titleLine2")}
          </h2>
        </div>

        {/* Hero feature — full width */}
        <div className="border border-border p-8 lg:p-12 mb-6">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 lg:gap-16 items-center">
            <div>
              <div className="inline-flex p-3 bg-feature-icon-bg mb-6">
                <img
                  src={iconImageMap[hero.iconKey].src}
                  alt=""
                  aria-hidden="true"
                  width={28}
                  height={28}
                  className="h-7 w-7 image-crisp"
                />
              </div>
              <h3 className="text-2xl lg:text-3xl text-foreground mb-3 font-normal">
                {hero.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                {hero.description}
              </p>
            </div>
            {/* Mock live metrics display — mirrors app dashboard */}
            <div className="border border-border overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/new_icon.svg"
                    alt=""
                    aria-hidden="true"
                    className="w-4 h-4"
                    width={16}
                    height={16}
                  />
                  <span className="text-xs font-medium text-foreground">
                    Queued messages
                  </span>
                </div>
                <span className="text-xs text-green-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Live
                </span>
              </div>
              <div className="p-4 space-y-4">
                {/* Metric cards row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-border p-2.5">
                    <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mb-1">
                      Publish
                    </div>
                    <div className="text-base font-mono text-foreground">
                      3.4k/s
                    </div>
                  </div>
                  <div className="border border-border p-2.5">
                    <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mb-1">
                      Deliver
                    </div>
                    <div className="text-base font-mono text-foreground">
                      3.2k/s
                    </div>
                  </div>
                  <div className="border border-border p-2.5">
                    <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mb-1">
                      Ready
                    </div>
                    <div className="text-base font-mono text-foreground">
                      241
                    </div>
                  </div>
                </div>
                {/* Chart area */}
                <div className="h-24 bg-muted/30 flex items-end justify-between gap-1 p-3">
                  <div className="flex-1 bg-primary/70 h-[35%]" />
                  <div className="flex-1 bg-primary/80 h-[55%]" />
                  <div className="flex-1 bg-primary/70 h-[42%]" />
                  <div className="flex-1 bg-primary h-[72%]" />
                  <div className="flex-1 bg-primary/80 h-[58%]" />
                  <div className="flex-1 bg-primary h-[85%]" />
                  <div className="flex-1 bg-primary/90 h-[68%]" />
                  <div className="flex-1 bg-primary/70 h-[48%]" />
                  <div className="flex-1 bg-primary/80 h-[62%]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary features — 2 columns, taller */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {secondary.map((feature) => {
            const imageSrc = iconImageMap[feature.iconKey];
            return (
              <div
                key={feature.iconKey}
                className="border border-border p-8 flex flex-col"
              >
                <div className="inline-flex p-3 bg-feature-icon-bg mb-5 self-start">
                  {imageSrc ? (
                    <img
                      src={imageSrc.src}
                      alt=""
                      aria-hidden="true"
                      width={24}
                      height={24}
                      className="h-6 w-6 image-crisp"
                    />
                  ) : (
                    <feature.icon className="h-6 w-6 text-primary" />
                  )}
                </div>
                <h3 className="text-2xl text-foreground mb-2 font-normal">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Compact features — 3 columns, minimal */}
        <div className="grid md:grid-cols-3 gap-6">
          {compact.map((feature) => {
            const imageSrc = iconImageMap[feature.iconKey];
            return (
              <div
                key={feature.iconKey}
                className="border border-border p-6 flex gap-4 items-start"
              >
                <div className="inline-flex p-2.5 bg-feature-icon-bg shrink-0">
                  {imageSrc ? (
                    <img
                      src={imageSrc.src}
                      alt=""
                      aria-hidden="true"
                      width={20}
                      height={20}
                      className="h-5 w-5 image-crisp"
                    />
                  ) : (
                    <feature.icon className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg text-foreground mb-1 font-normal">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <Button
            type="button"
            variant="cta"
            size="pill"
            onClick={() => {
              trackSignUpClick({
                source: "features_cta",
                location: "landing_page",
              });
              const appBaseUrl = import.meta.env.VITE_APP_BASE_URL;
              window.location.href = `${appBaseUrl}/auth/sign-up`;
            }}
          >
            <span>{t("cta.startMonitoringForFree")}</span>
            <img
              src="/images/arrow-right.svg"
              alt=""
              aria-hidden="true"
              className="h-[0.8em] w-auto image-crisp align-middle"
              width={14}
              height={14}
            />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
