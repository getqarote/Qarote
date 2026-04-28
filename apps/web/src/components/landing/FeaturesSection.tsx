import { useTranslation } from "react-i18next";

import {
  Activity,
  BarChart3,
  Database,
  Eye,
  GitBranch,
  Mail,
  MessageSquare,
  Rocket,
  Settings,
  Shield,
  Zap,
} from "lucide-react";

import { trackSignUpClick } from "@/lib/gtm";

import { Button } from "@/components/ui/button";

const iconImageMap: Record<string, { src: string; alt: string }> = {
  Activity: { src: "/images/real-time.svg", alt: "Real-time" },
  Database: { src: "/images/chart.svg", alt: "Queue history" },
  Zap: { src: "/images/flag.svg", alt: "Incident diagnosis" },
  Eye: { src: "/images/message.svg", alt: "Message spy" },
  GitBranch: { src: "/images/real-time.svg", alt: "Message tracing" },
  Mail: { src: "/images/email.svg", alt: "Daily digest" },
  Shield: { src: "/images/flag.svg", alt: "Flag" },
  MessageSquare: { src: "/images/message.svg", alt: "Message" },
  BarChart3: { src: "/images/chart.svg", alt: "Chart" },
  Settings: { src: "/images/server.svg", alt: "Server" },
  Rocket: { src: "/images/send.svg", alt: "Send" },
};

const ProBadge = () => (
  <span className="text-xs font-medium text-primary border border-primary px-2 py-0.5 leading-none">
    Developer+
  </span>
);

const FeaturesSection = () => {
  const { t } = useTranslation("landing");

  const features = [
    // Hero — killer feature: Queue History
    {
      iconKey: "Database",
      icon: Database,
      title: t("features.metricsPersistence.title"),
      description: t("features.metricsPersistence.description"),
      isPro: true,
    },
    // Secondary (large cards) — Incident Diagnosis + Message Spy
    {
      iconKey: "Zap",
      icon: Zap,
      title: t("features.incidentDiagnosis.title"),
      description: t("features.incidentDiagnosis.description"),
      isPro: true,
    },
    {
      iconKey: "Eye",
      icon: Eye,
      title: t("features.messageSpy.title"),
      description: t("features.messageSpy.description"),
      isPro: true,
    },
    // Compact grid — remaining killer features first, then core
    {
      iconKey: "GitBranch",
      icon: GitBranch,
      title: t("features.messageTracing.title"),
      description: t("features.messageTracing.description"),
      isPro: true,
    },
    {
      iconKey: "Shield",
      icon: Shield,
      title: t("features.smartAlertingSystem.title"),
      description: t("features.smartAlertingSystem.description"),
      isPro: true,
    },
    {
      iconKey: "Mail",
      icon: Mail,
      title: t("features.dailyDigest.title"),
      description: t("features.dailyDigest.description"),
      isPro: true,
    },
    {
      iconKey: "Activity",
      icon: Activity,
      title: t("features.liveQueueMonitoring.title"),
      description: t("features.liveQueueMonitoring.description"),
      isPro: false,
    },
    {
      iconKey: "MessageSquare",
      icon: MessageSquare,
      title: t("features.queueManagement.title"),
      description: t("features.queueManagement.description"),
      isPro: false,
    },
    {
      iconKey: "BarChart3",
      icon: BarChart3,
      title: t("features.performanceAnalytics.title"),
      description: t("features.performanceAnalytics.description"),
      isPro: false,
    },
    {
      iconKey: "Settings",
      icon: Settings,
      title: t("features.multiServerSupport.title"),
      description: t("features.multiServerSupport.description"),
      isPro: false,
    },
    {
      iconKey: "Rocket",
      icon: Rocket,
      title: t("features.messagePublishing.title"),
      description: t("features.messagePublishing.description"),
      isPro: false,
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
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
            {t("features.freeTierNote")}
          </p>
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
              <h3 className="text-2xl lg:text-3xl text-foreground mb-3 font-normal flex items-center gap-3 flex-wrap">
                {hero.title}
                {hero.isPro && <ProBadge />}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                {hero.description}
              </p>
            </div>
            {/* Mock historical queue depth chart — mirrors Queue History view */}
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
                    payment.queue — 7 day history
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  5-min snapshots
                </span>
              </div>
              <div className="p-4 space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-border p-2.5">
                    <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mb-1">
                      Peak depth
                    </div>
                    <div className="text-base font-mono text-foreground">
                      14,802
                    </div>
                  </div>
                  <div className="border border-border p-2.5">
                    <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mb-1">
                      Avg consumers
                    </div>
                    <div className="text-base font-mono text-foreground">8</div>
                  </div>
                  <div className="border border-border p-2.5">
                    <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mb-1">
                      Retained
                    </div>
                    <div className="text-base font-mono text-foreground">
                      7 days
                    </div>
                  </div>
                </div>
                {/* Historical area chart — depth spike in the middle */}
                <div className="h-24 bg-muted/30 relative overflow-hidden p-3 flex items-end gap-px">
                  {[
                    8, 10, 9, 12, 11, 14, 18, 26, 48, 72, 85, 95, 100, 88, 62,
                    38, 22, 14, 10, 9, 11, 10, 8, 9, 10, 9, 11, 12,
                  ].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-primary/75"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                  {/* Spike marker */}
                  <div className="absolute top-2 left-[42%] flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-1.5 py-0.5 whitespace-nowrap">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-[0.6rem] text-red-700 font-medium">
                        Spike — Tue 11pm
                      </span>
                    </div>
                    <div className="w-px h-3 bg-red-400/60" />
                  </div>
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
                <h3 className="text-2xl text-foreground mb-2 font-normal flex items-center gap-2 flex-wrap">
                  {feature.title}
                  {feature.isPro && <ProBadge />}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Compact features — 2 columns on sm, 4 on lg */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <h3 className="text-lg text-foreground mb-1 font-normal flex items-center gap-1.5 flex-wrap">
                    {feature.title}
                    {feature.isPro && <ProBadge />}
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
