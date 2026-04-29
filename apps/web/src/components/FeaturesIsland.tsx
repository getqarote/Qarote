import { type CSSProperties, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import { IslandProvider } from "@/components/IslandProvider";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import FooterSection from "@/components/landing/FooterSection";
import StickyNav from "@/components/StickyNav";
import { TawkTo } from "@/components/TawkTo";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScrollEntry } from "@/hooks/useScrollEntry";

interface FeaturesIslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
}

export default function FeaturesIsland({
  locale = "en",
  resources,
}: FeaturesIslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen font-sans bg-background">
        <StickyNav currentPage="features" />
        <HeroSection />
        <QueueIntelligenceSection />
        <MessageVisibilitySection />
        <MessagePipelineSection />
        <InsightsSection />
        <LiveMonitoringSection />
        <QueueManagementSection />
        <SupportingFeaturesSection />
        <ComparisonSection />
        <FinalCtaSection />
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}

/* ─── Shared sub-components ─── */

function MockPanel({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <img
              src={icon}
              alt=""
              aria-hidden="true"
              className="w-4 h-4"
              width={16}
              height={16}
            />
          )}
          <span className="text-xs font-medium text-foreground">{title}</span>
        </div>
        {badge}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function FeaturePoint({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-muted-foreground">
      <img
        src="/images/check.svg"
        alt=""
        aria-hidden="true"
        className="shrink-0 w-auto h-3 mt-1.5 image-crisp"
        width={12}
        height={12}
      />
      {text}
    </li>
  );
}

function ComparisonPoint({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex gap-4 items-center">
      <img
        src={`/images/${icon}.svg`}
        alt=""
        aria-hidden="true"
        className="h-3 shrink-0 w-auto image-crisp"
        width={12}
        height={12}
      />
      <p className="text-foreground">{text}</p>
    </div>
  );
}

/* ─── Section 1: Hero ─── */

function HeroSection() {
  const { t, i18n } = useTranslation("features");
  const lp = (path: string) =>
    i18n.language === "en" ? path : `/${i18n.language}${path}`;
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    setMounted(true);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  const enter = (delay = 0): CSSProperties =>
    reduceMotion || !mounted
      ? {}
      : !entered
        ? { opacity: 0, transform: "translateY(14px)" }
        : {
            opacity: 1,
            transform: "translateY(0)",
            transition: `opacity 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
          };

  const pills = [
    {
      icon: "/images/chart.svg",
      key: "queueHistory",
      href: "/features/metrics/",
    },
    {
      icon: "/images/message.svg",
      key: "messageSpy",
      href: "/features/message-spy/",
    },
    {
      icon: "/images/email.svg",
      key: "dailyDigest",
      href: "/features/digest/",
    },
    {
      icon: "/images/flag.svg",
      key: "incidentDiagnosis",
      href: "/features/incident-diagnosis/",
    },
    {
      icon: "/images/real-time.svg",
      key: "messageTracing",
      href: "/features/message-tracing/",
    },
    { icon: "/images/flag.svg", key: "alerting", href: "/features/alerting/" },
    {
      icon: "/images/real-time.svg",
      key: "liveMonitoring",
      href: "/features/live-monitoring/",
    },
    {
      icon: "/images/chart.svg",
      key: "analytics",
      href: "/features/analytics/",
    },
    {
      icon: "/images/message.svg",
      key: "queueManagement",
      href: "/features/queue-management/",
    },
    {
      icon: "/images/server.svg",
      key: "multiServer",
      href: "/features/multi-server/",
    },
  ];

  const pillBase =
    "inline-flex items-center gap-2 px-4 py-2 bg-card border border-border text-sm text-foreground";

  return (
    <section className="relative overflow-hidden bg-background">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-28 pb-16 text-center">
        <h1
          className="text-3xl sm:text-4xl lg:text-5xl text-foreground font-normal leading-tight"
          style={enter(0)}
        >
          {t("hero.title")}
        </h1>
        <p
          className="text-base sm:text-lg md:text-xl text-muted-foreground mt-6 max-w-3xl mx-auto leading-relaxed"
          style={enter(80)}
        >
          {t("hero.subtitle")}
        </p>

        {/* Feature pills */}
        <div
          className="flex flex-wrap justify-center gap-3 mt-10"
          style={enter(160)}
        >
          {pills.map((pill) => (
            <a
              key={pill.key}
              href={lp(pill.href)}
              className={`${pillBase} hover:border-primary/50 hover:text-primary transition-colors duration-150`}
            >
              <img
                src={pill.icon}
                alt=""
                aria-hidden="true"
                className="h-4 w-4 image-crisp"
                width={16}
                height={16}
              />
              {t(`hero.pills.${pill.key}`)}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Section 2: Live Queue Monitoring (split L→R) ─── */

function LiveMonitoringSection() {
  const { t } = useTranslation("features");

  return (
    <section className="pt-12 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Content */}
          <div className="lg:sticky lg:top-24">
            <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium bg-feature-icon-bg text-primary mb-6">
              <img
                src="/images/real-time.svg"
                alt=""
                aria-hidden="true"
                className="h-3.5 w-3.5 image-crisp"
                width={14}
                height={14}
              />
              {t("coreFeature")}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground font-normal leading-[1.2] mb-6">
              {t("liveMonitoring.title")}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              {t("liveMonitoring.description")}
            </p>

            {/* Metric callouts */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[1, 2, 3].map((n) => (
                <div key={n} className="border border-border p-3">
                  <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mb-1">
                    {t(`liveMonitoring.metric${n}Label`)}
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono text-foreground">
                    {t(`liveMonitoring.metric${n}Value`)}
                  </div>
                </div>
              ))}
            </div>

            <ul className="space-y-3">
              <FeaturePoint text={t("liveMonitoring.point1")} />
              <FeaturePoint text={t("liveMonitoring.point2")} />
              <FeaturePoint text={t("liveMonitoring.point3")} />
            </ul>
          </div>

          {/* Right: Queue list mockup */}
          <div className="relative">
            <MockPanel
              title="Queues"
              icon="/images/new_icon.svg"
              badge={
                <span className="text-xs text-green-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Live
                </span>
              }
            >
              {[
                {
                  dot: "bg-green-500",
                  name: "orders.process",
                  rate: "1.2k msg/s",
                  consumers: "8 consumers",
                },
                {
                  dot: "bg-yellow-500",
                  name: "notifications.send",
                  rate: "342 msg/s",
                  consumers: "3 consumers",
                },
                {
                  dot: "bg-green-500",
                  name: "payments.verify",
                  rate: "856 msg/s",
                  consumers: "5 consumers",
                },
                {
                  dot: "bg-red-500",
                  name: "emails.retry",
                  rate: "0 msg/s",
                  consumers: "0 consumers",
                },
              ].map((q) => (
                <div
                  key={q.name}
                  className="flex items-center justify-between p-3 bg-muted/20"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${q.dot}`} />
                    <span className="text-sm font-mono text-foreground">
                      {q.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-muted-foreground">
                      {q.rate}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {q.consumers}
                    </span>
                  </div>
                </div>
              ))}
            </MockPanel>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 3: Alerting + Analytics (paired cards on warm bg) ─── */

function InsightsSection() {
  const { t, i18n } = useTranslation("features");
  const lp = (path: string) =>
    i18n.language === "en" ? path : `/${i18n.language}${path}`;
  const reduceMotion = useReducedMotion();
  const [card1Ref, card1Entered] = useScrollEntry<HTMLDivElement>(0.1);
  const [card2Ref, card2Entered] = useScrollEntry<HTMLDivElement>(0.1);

  const cardStyle = (entered: boolean, delay = 0): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(16px)",
          transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        };

  return (
    <section className="py-20 bg-feature-icon-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground font-normal leading-[1.2]">
            {t("insightsSection.title")}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Smart Alerting Card */}
          <div
            ref={card1Ref}
            className="border border-border overflow-hidden bg-background"
            style={cardStyle(card1Entered, 0)}
          >
            <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/images/flag.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 image-crisp"
                  width={16}
                  height={16}
                />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("alerting.title")}
                </span>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 border border-primary text-primary">
                {t("alerting.badge")}
              </span>
            </div>
            <div className="p-8">
              <p className="text-muted-foreground leading-relaxed mb-6">
                {t("alerting.description")}
              </p>

              {/* Alert mockup */}
              <div className="bg-muted/20 overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
                  <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                    Active alerts
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {[
                    {
                      dot: "bg-red-500",
                      title: "Queue depth > 10,000",
                      sub: "orders.process — 2 min ago",
                      badge: "Critical",
                      badgeClass: "bg-red-100 text-red-700",
                    },
                    {
                      dot: "bg-yellow-500",
                      title: "Consumer count < 2",
                      sub: "payments.verify — 15 min ago",
                      badge: "Warning",
                      badgeClass: "bg-yellow-100 text-yellow-700",
                    },
                  ].map((alert) => (
                    <div
                      key={alert.title}
                      className="flex items-center gap-3 p-3 bg-muted/10"
                    >
                      <div className={`w-2 h-2 rounded-full ${alert.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {alert.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {alert.sub}
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 shrink-0 ${alert.badgeClass}`}
                      >
                        {alert.badge}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Notify via:
                    </span>
                    {["Email", "Slack", "Webhook"].map((ch) => (
                      <span
                        key={ch}
                        className="text-xs px-2 py-0.5 border border-border"
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <a
                href={lp("/features/alerting/")}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-6 transition-all duration-150 hover:gap-2.5"
              >
                Explore alerting
                <ExploreArrow />
              </a>
            </div>
          </div>

          {/* Performance Analytics Card */}
          <div
            ref={card2Ref}
            className="border border-border overflow-hidden bg-background"
            style={cardStyle(card2Entered, 90)}
          >
            <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center gap-3">
              <img
                src="/images/chart.svg"
                alt=""
                aria-hidden="true"
                className="h-4 w-4 image-crisp"
                width={16}
                height={16}
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("analytics.title")}
              </span>
            </div>
            <div className="p-8">
              <p className="text-muted-foreground leading-relaxed mb-6">
                {t("analytics.description")}
              </p>

              {/* Chart mockup */}
              <div className="bg-muted/20 overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between">
                  <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                    Message throughput
                  </span>
                  <div className="flex gap-1">
                    {["1h", "6h", "24h", "7d"].map((range) => (
                      <span
                        key={range}
                        className={`text-xs px-2 py-0.5 ${range === "24h" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                      >
                        {range}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-3">
                  <div className="h-24 bg-muted/30 flex items-end justify-between gap-1 p-2">
                    {[30, 45, 60, 50, 75, 65, 85, 70, 90, 80].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-primary/70"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border">
                    <div>
                      <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        Avg throughput
                      </div>
                      <div className="text-sm font-mono text-foreground">
                        2.4k/s
                      </div>
                    </div>
                    <div>
                      <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        Peak
                      </div>
                      <div className="text-sm font-mono text-foreground">
                        8.1k/s
                      </div>
                    </div>
                    <div>
                      <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        Trend
                      </div>
                      <div className="text-sm font-mono text-green-600">
                        +12%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <a
                href={lp("/features/analytics/")}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-6 transition-all duration-150 hover:gap-2.5"
              >
                Explore analytics
                <ExploreArrow />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 4: Queue Management (split R→L) ─── */

function QueueManagementSection() {
  const { t, i18n } = useTranslation("features");
  const lp = (path: string) =>
    i18n.language === "en" ? path : `/${i18n.language}${path}`;

  return (
    <section className="pt-12 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Mockup (order-2 mobile, order-1 desktop) */}
          <div className="relative order-2 lg:order-1">
            <MockPanel title="Queue management" icon="/images/new_icon.svg">
              {/* Action toolbar */}
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <span className="text-xs px-3 py-1.5 bg-primary text-primary-foreground">
                  Create queue
                </span>
                <span className="text-xs px-3 py-1.5 border border-border text-foreground">
                  Publish message
                </span>
                <span className="text-xs px-3 py-1.5 border border-border text-foreground hidden sm:inline-block">
                  View topology
                </span>
              </div>
              {/* Queue detail */}
              <div className="bg-muted/20 overflow-hidden">
                <div className="px-3 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground font-mono">
                    orders.process
                  </span>
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-0.5 bg-feature-icon-bg text-primary">
                      Purge
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600">
                      Delete
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-muted/10">
                      <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        Messages
                      </div>
                      <div className="text-sm font-mono text-foreground">
                        12,847
                      </div>
                    </div>
                    <div className="p-2 bg-muted/10">
                      <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        Consumers
                      </div>
                      <div className="text-sm font-mono text-foreground">4</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Bindings */}
              <div className="bg-muted/20 overflow-hidden">
                <div className="px-3 py-2 bg-muted/30 border-b border-border">
                  <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                    Bindings
                  </span>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-primary">orders.exchange</span>
                    <span className="text-muted-foreground">&rarr;</span>
                    <span className="text-foreground">orders.process</span>
                    <span className="text-muted-foreground hidden sm:inline">
                      routing: order.created
                    </span>
                  </div>
                </div>
              </div>
            </MockPanel>
          </div>

          {/* Right: Content (order-1 mobile, order-2 desktop) */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-24">
            <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium bg-feature-icon-bg text-primary mb-6">
              <img
                src="/images/message.svg"
                alt=""
                aria-hidden="true"
                className="h-3.5 w-3.5 image-crisp"
                width={14}
                height={14}
              />
              {t("coreFeature")}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground font-normal leading-[1.2] mb-6">
              {t("queueManagement.title")}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              {t("queueManagement.description")}
            </p>
            <ul className="space-y-3">
              <FeaturePoint text={t("queueManagement.point1")} />
              <FeaturePoint text={t("queueManagement.point2")} />
              <FeaturePoint text={t("queueManagement.point3")} />
            </ul>
            <a
              href={lp("/features/queue-management/")}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-8 transition-all duration-150 hover:gap-2.5"
            >
              Explore queue management
              <ExploreArrow />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 5: Multi-Server + Built for Devs (paired cards) ─── */

function SupportingFeaturesSection() {
  const { t, i18n } = useTranslation("features");
  const lp = (path: string) =>
    i18n.language === "en" ? path : `/${i18n.language}${path}`;
  const reduceMotion = useReducedMotion();
  const [card1Ref, card1Entered] = useScrollEntry<HTMLDivElement>(0.1);
  const [card2Ref, card2Entered] = useScrollEntry<HTMLDivElement>(0.1);

  const cardStyle = (entered: boolean, delay = 0): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(16px)",
          transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        };

  return (
    <section className="pt-12 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Multi-Server Card */}
          <div
            ref={card1Ref}
            className="border border-border overflow-hidden"
            style={cardStyle(card1Entered, 0)}
          >
            <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/images/server.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 image-crisp"
                  width={16}
                  height={16}
                />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("multiServer.title")}
                </span>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 border border-primary text-primary">
                {t("multiServer.badge")}
              </span>
            </div>
            <div className="p-8">
              <p className="text-muted-foreground leading-relaxed mb-6">
                {t("multiServer.description")}
              </p>

              {/* Server list mockup */}
              <div className="space-y-2">
                {[
                  {
                    name: "Production",
                    info: "3 nodes — TLS",
                    dot: "bg-green-500",
                  },
                  {
                    name: "Staging",
                    info: "1 node — TLS",
                    dot: "bg-green-500",
                  },
                  {
                    name: "Development",
                    info: "1 node",
                    dot: "bg-yellow-500",
                  },
                ].map((server) => (
                  <div
                    key={server.name}
                    className="bg-muted/20 p-4 flex items-center gap-4"
                  >
                    <img
                      src="/images/server.svg"
                      alt=""
                      aria-hidden="true"
                      className="w-5 h-5 shrink-0 image-crisp"
                      width={20}
                      height={20}
                    />
                    <div className="flex-1">
                      <div className="text-sm text-foreground">
                        {server.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {server.info}
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${server.dot}`} />
                  </div>
                ))}
              </div>
              <a
                href={lp("/features/multi-server/")}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-6 transition-all duration-150 hover:gap-2.5"
              >
                Explore multi-server
                <ExploreArrow />
              </a>
            </div>
          </div>

          {/* Built for Developers Card */}
          <div
            ref={card2Ref}
            className="border border-border overflow-hidden"
            style={cardStyle(card2Entered, 90)}
          >
            <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center gap-3">
              <img
                src="/images/send.svg"
                alt=""
                aria-hidden="true"
                className="h-4 w-4 image-crisp"
                width={16}
                height={16}
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("builtForDevs.title")}
              </span>
            </div>
            <div className="p-8">
              <p className="text-muted-foreground leading-relaxed mb-6">
                {t("builtForDevs.description")}
              </p>

              {/* Setup comparison mockup */}
              <div className="space-y-4">
                {/* Qarote setup */}
                <div className="bg-muted/20 overflow-hidden">
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
                        Qarote
                      </span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700">
                      60 seconds
                    </span>
                  </div>
                  <div className="p-3 font-mono text-xs text-muted-foreground space-y-1">
                    <div>1. Sign up</div>
                    <div>2. Paste connection string</div>
                    <div>3. Done</div>
                  </div>
                </div>
                {/* Traditional setup (faded) */}
                <div className="bg-muted/20 overflow-hidden opacity-50">
                  <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                      Prometheus + Grafana
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700">
                      2+ hours
                    </span>
                  </div>
                  <div className="p-3 font-mono text-xs text-muted-foreground line-through space-y-1">
                    <div>1. Install Prometheus</div>
                    <div>2. Configure exporters</div>
                    <div>3. Set up Grafana</div>
                    <div>4. Build dashboards</div>
                    <div>5. Configure alerts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Shared UI ─── */

const ExploreArrow = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="transition-transform duration-150 group-hover:translate-x-0.5"
  >
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

/* ─── Section 6: Queue Intelligence (paired cards on warm bg) ─── */

function QueueIntelligenceSection() {
  const { t, i18n } = useTranslation("features");
  const lp = (path: string) =>
    i18n.language === "en" ? path : `/${i18n.language}${path}`;
  const reduceMotion = useReducedMotion();
  const [card1Ref, card1Entered] = useScrollEntry<HTMLDivElement>(0.1);
  const [card2Ref, card2Entered] = useScrollEntry<HTMLDivElement>(0.1);

  const cardStyle = (entered: boolean, delay = 0): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(16px)",
          transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        };

  return (
    <section className="py-20 bg-feature-icon-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground font-normal leading-[1.2]">
            {t("queueIntelligence.title")}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Queue History Card */}
          <div
            ref={card1Ref}
            className="border border-border overflow-hidden bg-background"
            style={cardStyle(card1Entered, 0)}
          >
            <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/images/chart.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 image-crisp"
                  width={16}
                  height={16}
                />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Queue History
                </span>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 border border-primary text-primary">
                Developer+
              </span>
            </div>
            <div className="p-8">
              <p className="text-muted-foreground leading-relaxed mb-6">
                {t("queueHistory.description")}
              </p>

              {/* Queue History mockup */}
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
                <div className="p-4 space-y-3">
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
                      <div className="text-base font-mono text-foreground">
                        8
                      </div>
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
                  {/* Bar chart with spike label */}
                  <div className="h-28 bg-muted/30 relative overflow-hidden p-3 flex items-end gap-px">
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
                    <div className="absolute top-1.5 left-[42%] flex flex-col items-center gap-0.5">
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
              <a
                href={lp("/features/metrics/")}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-6 transition-all duration-150 hover:gap-2.5"
              >
                Explore queue history
                <ExploreArrow />
              </a>
            </div>
          </div>

          {/* Incident Diagnosis Engine Card */}
          <div
            ref={card2Ref}
            className="border border-border overflow-hidden bg-background"
            style={cardStyle(card2Entered, 90)}
          >
            <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/images/flag.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 image-crisp"
                  width={16}
                  height={16}
                />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Incident Diagnosis Engine
                </span>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 border border-primary text-primary">
                Developer+
              </span>
            </div>
            <div className="p-8">
              <p className="text-muted-foreground leading-relaxed mb-6">
                {t("incidentDiagnosis.description")}
              </p>

              {/* Incident timeline mockup */}
              <div className="bg-muted/20 overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
                  <span className="text-xs font-medium text-foreground">
                    Incident · Apr 22, 14:20–14:47
                  </span>
                </div>
                <div className="p-3 space-y-2.5">
                  {[
                    {
                      dot: "bg-red-500",
                      text: "14:21 — Queue depth spike: orders.process → 24,891",
                    },
                    {
                      dot: "bg-yellow-500",
                      text: "14:23 — Consumer count dropped: 8 → 2",
                    },
                    {
                      dot: "bg-orange-500",
                      text: "14:31 — Throughput collapsed: 1.2k/s → 0",
                    },
                  ].map((event) => (
                    <div key={event.text} className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-1 shrink-0 ${event.dot}`}
                      />
                      <span className="text-xs font-mono text-foreground leading-relaxed">
                        {event.text}
                      </span>
                    </div>
                  ))}
                  {/* Root cause box */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mb-1.5">
                      Root cause
                    </div>
                    <div className="bg-muted/30 px-3 py-2 text-xs text-foreground leading-relaxed">
                      Consumer deployment at 14:22 disconnected 6 of 8 consumers
                    </div>
                  </div>
                </div>
              </div>
              <a
                href={lp("/features/incident-diagnosis/")}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-6 transition-all duration-150 hover:gap-2.5"
              >
                Explore incident diagnosis
                <ExploreArrow />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 7: Message Visibility (split L←R, mockup left) ─── */

function MessageVisibilitySection() {
  const { t, i18n } = useTranslation("features");
  const lp = (path: string) =>
    i18n.language === "en" ? path : `/${i18n.language}${path}`;

  return (
    <section className="pt-12 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Mockup (order-2 mobile, order-1 desktop) */}
          <div className="relative order-2 lg:order-1">
            <MockPanel title="Message Inspector">
              {/* Toolbar */}
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <span className="text-xs px-3 py-1.5 border border-border text-foreground">
                  ← Prev
                </span>
                <span className="text-xs px-3 py-1.5 bg-muted/30 text-muted-foreground">
                  1 of 8
                </span>
                <span className="text-xs px-3 py-1.5 border border-border text-foreground">
                  Next →
                </span>
              </div>
              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Routing key", value: "orders.created" },
                  { label: "Exchange", value: "orders.exchange" },
                  { label: "Delivery mode", value: "Persistent" },
                  { label: "Redelivered", value: "No" },
                ].map((row) => (
                  <div key={row.label} className="bg-muted/20 p-2.5">
                    <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mb-0.5">
                      {row.label}
                    </div>
                    <div className="text-xs font-mono text-foreground">
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>
              {/* Payload */}
              <div className="border border-border overflow-hidden">
                <div className="px-3 py-2 bg-muted/30 border-b border-border">
                  <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                    Payload
                  </span>
                </div>
                <div className="p-3 font-mono text-xs leading-relaxed bg-muted/10">
                  <div className="text-muted-foreground">{"{"}</div>
                  {[
                    { key: "orderId", value: '"ord_8f2k19"' },
                    { key: "customerId", value: '"cust_441"' },
                    { key: "total", value: "149.99" },
                    { key: "currency", value: '"USD"' },
                    { key: "items", value: "[...]" },
                  ].map((line) => (
                    <div key={line.key} className="pl-4">
                      <span className="text-primary">"{line.key}"</span>
                      <span className="text-muted-foreground">: </span>
                      <span
                        className={
                          line.value.startsWith('"')
                            ? "text-green-600"
                            : "text-foreground"
                        }
                      >
                        {line.value}
                      </span>
                      <span className="text-muted-foreground">,</span>
                    </div>
                  ))}
                  <div className="text-muted-foreground">{"}"}</div>
                </div>
              </div>
              {/* Copy button */}
              <div className="flex justify-end">
                <span className="text-xs px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground cursor-default transition-colors">
                  Copy payload
                </span>
              </div>
            </MockPanel>
          </div>

          {/* Right: Content (order-1 mobile, order-2 desktop) */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-24">
            <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium border border-primary text-primary mb-6">
              <img
                src="/images/message.svg"
                alt=""
                aria-hidden="true"
                className="h-3.5 w-3.5 image-crisp"
                width={14}
                height={14}
              />
              Developer+
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground font-normal leading-[1.2] mb-6">
              {t("messageVisibility.title")}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              {t("messageSpy.description")}
            </p>
            <ul className="space-y-3">
              <FeaturePoint text={t("messageSpy.point1")} />
              <FeaturePoint text={t("messageSpy.point2")} />
              <FeaturePoint text={t("messageSpy.point3")} />
            </ul>
            <a
              href={lp("/features/message-spy/")}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-8 transition-all duration-150 hover:gap-2.5"
            >
              Explore message spy
              <ExploreArrow />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 8: Message Pipeline (paired cards on bg-background) ─── */

function MessagePipelineSection() {
  const { t, i18n } = useTranslation("features");
  const lp = (path: string) =>
    i18n.language === "en" ? path : `/${i18n.language}${path}`;
  const reduceMotion = useReducedMotion();
  const [card1Ref, card1Entered] = useScrollEntry<HTMLDivElement>(0.1);
  const [card2Ref, card2Entered] = useScrollEntry<HTMLDivElement>(0.1);

  const cardStyle = (entered: boolean, delay = 0): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(16px)",
          transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        };

  return (
    <section className="pt-12 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground font-normal leading-[1.2]">
            {t("messagePipeline.title")}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Daily Digest Card */}
          <div
            ref={card1Ref}
            className="border border-border overflow-hidden"
            style={cardStyle(card1Entered, 0)}
          >
            <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/images/email.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 image-crisp"
                  width={16}
                  height={16}
                />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Daily Digest
                </span>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 border border-primary text-primary">
                Developer+
              </span>
            </div>
            <div className="p-8">
              <p className="text-muted-foreground leading-relaxed mb-6">
                {t("dailyDigest.description")}
              </p>

              {/* Email digest mockup */}
              <div className="bg-muted/20 overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                  <img
                    src="/images/email.svg"
                    alt=""
                    aria-hidden="true"
                    className="w-3.5 h-3.5 image-crisp"
                    width={14}
                    height={14}
                  />
                  <span className="text-xs font-medium text-foreground">
                    Daily RabbitMQ digest — Tue Apr 22
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {[
                    {
                      dot: "bg-green-500",
                      name: "orders.process",
                      status: "Healthy",
                      detail: "avg 2.1k msgs",
                    },
                    {
                      dot: "bg-yellow-500",
                      name: "notifications.send",
                      status: "Warning",
                      detail: "DLQ +47 msgs",
                    },
                    {
                      dot: "bg-red-500",
                      name: "payments.retry",
                      status: "Alert",
                      detail: "0 consumers for 3h",
                    },
                  ].map((row) => (
                    <div
                      key={row.name}
                      className="flex items-center gap-3 p-3 bg-muted/10"
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${row.dot}`}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-mono text-foreground">
                          {row.name}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {row.detail}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border text-[0.65rem] text-muted-foreground">
                    Delivered daily at 08:00 · 3 servers monitored
                  </div>
                </div>
              </div>
              <a
                href={lp("/features/digest/")}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-6 transition-all duration-150 hover:gap-2.5"
              >
                Explore daily digest
                <ExploreArrow />
              </a>
            </div>
          </div>

          {/* Message Tracing Card */}
          <div
            ref={card2Ref}
            className="border border-border overflow-hidden"
            style={cardStyle(card2Entered, 90)}
          >
            <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/images/real-time.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 image-crisp"
                  width={16}
                  height={16}
                />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Message Tracing (Firehose)
                </span>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 border border-primary text-primary">
                Developer+
              </span>
            </div>
            <div className="p-8">
              <p className="text-muted-foreground leading-relaxed mb-6">
                {t("messageTracing.description")}
              </p>

              {/* Firehose stream mockup */}
              <div className="bg-muted/20 overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    Firehose — Live
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-green-600">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Live
                  </span>
                </div>
                <div className="p-3 space-y-1.5">
                  {[
                    {
                      arrow: "→",
                      verb: "PUBLISH",
                      target: "orders.exchange",
                      detail: "[orders.created]",
                      meta: "312B",
                    },
                    {
                      arrow: "→",
                      verb: "DELIVER",
                      target: "orders.process",
                      detail: "consumer-4",
                      meta: "ack",
                    },
                    {
                      arrow: "→",
                      verb: "PUBLISH",
                      target: "payments.exchange",
                      detail: "[payment.verify]",
                      meta: "198B",
                    },
                    {
                      arrow: "→",
                      verb: "DELIVER",
                      target: "payments.dlq",
                      detail: "consumer-0",
                      meta: "nack",
                    },
                  ].map((line, i) => (
                    <div
                      key={i}
                      className="font-mono text-xs flex items-center gap-1.5 flex-wrap"
                    >
                      <span className="text-primary">{line.arrow}</span>
                      <span className="text-primary font-medium">
                        {line.verb}
                      </span>
                      <span className="text-foreground">{line.target}</span>
                      <span className="text-muted-foreground">
                        {line.detail}
                      </span>
                      <span className="text-muted-foreground">{line.meta}</span>
                    </div>
                  ))}
                  {/* Filter bar */}
                  <div className="mt-2 pt-2 border-t border-border flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Filter:
                    </span>
                    <span className="flex-1 text-xs font-mono border border-border px-2 py-1 text-muted-foreground bg-background">
                      orders.*
                    </span>
                    <span className="text-xs px-2.5 py-1 bg-primary text-primary-foreground cursor-default">
                      Apply
                    </span>
                  </div>
                </div>
              </div>
              <a
                href={lp("/features/message-tracing/")}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-6 transition-all duration-150 hover:gap-2.5"
              >
                Explore message tracing
                <ExploreArrow />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 9: Comparison (reuses homepage pattern) ─── */

function ComparisonSection() {
  const { t } = useTranslation("features");

  return (
    <section className="pb-20 bg-background pt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4 max-w-4xl mx-auto leading-[1.2] font-normal">
            {t("comparison.title")}
          </h2>
        </div>

        <div className="border border-border overflow-hidden">
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Traditional */}
            <div className="flex flex-col">
              <div className="px-6 py-3 bg-muted/30 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("comparison.traditional.title")}
                </span>
              </div>
              <div className="p-8 lg:p-12 flex flex-col flex-1">
                <div className="space-y-5 mb-16">
                  <ComparisonPoint
                    icon="cross"
                    text={t("comparison.traditional.point1")}
                  />
                  <ComparisonPoint
                    icon="cross"
                    text={t("comparison.traditional.point2")}
                  />
                  <ComparisonPoint
                    icon="cross"
                    text={t("comparison.traditional.point3")}
                  />
                  <ComparisonPoint
                    icon="cross"
                    text={t("comparison.traditional.point4")}
                  />
                </div>
                <div className="bg-muted/20 p-4 mt-auto flex flex-col h-[180px]">
                  <div className="px-3 py-2 bg-muted/30 border-b border-border mb-3 -mx-4 -mt-4">
                    <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                      management.local:15672
                    </span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <img
                      src="/images/error.svg"
                      alt=""
                      aria-hidden="true"
                      className="w-12 h-12 image-crisp"
                      width={48}
                      height={48}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Qarote */}
            <div className="flex flex-col">
              <div className="px-6 py-3 bg-muted/30 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("comparison.qarote.title")}
                </span>
              </div>
              <div className="p-8 lg:p-12 flex flex-col flex-1">
                <div className="space-y-5 mb-16">
                  <ComparisonPoint
                    icon="check"
                    text={t("comparison.qarote.point1")}
                  />
                  <ComparisonPoint
                    icon="check"
                    text={t("comparison.qarote.point2")}
                  />
                  <ComparisonPoint
                    icon="check"
                    text={t("comparison.qarote.point3")}
                  />
                  <ComparisonPoint
                    icon="check"
                    text={t("comparison.qarote.point4")}
                  />
                </div>
                <div className="bg-muted/20 overflow-hidden mt-auto h-[180px] flex flex-col">
                  <div className="px-3 py-2 bg-muted/30 border-b border-border flex items-center gap-2">
                    <img
                      src="/images/new_icon.svg"
                      alt=""
                      aria-hidden="true"
                      className="w-4 h-4"
                      width={16}
                      height={16}
                    />
                    <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                      Dashboard
                    </span>
                  </div>
                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between overflow-hidden min-h-0">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/10 p-1.5">
                        <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                          {t("comparison.messagesPerSec")}
                        </div>
                        <div className="text-sm font-mono text-foreground">
                          4.2k
                        </div>
                      </div>
                      <div className="bg-muted/10 p-1.5">
                        <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                          {t("comparison.activeQueues")}
                        </div>
                        <div className="text-sm font-mono text-foreground">
                          127
                        </div>
                      </div>
                    </div>
                    <div className="border border-green-200 bg-green-50 p-1.5 text-xs text-green-700 flex items-center gap-1.5">
                      <img
                        src="/images/check.svg"
                        alt=""
                        aria-hidden="true"
                        className="shrink-0 w-auto h-[0.525rem] image-crisp"
                        width={10}
                        height={8}
                      />
                      {t("comparison.allSystemsOperational")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
