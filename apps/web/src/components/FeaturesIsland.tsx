import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import AuthButtons from "@/components/AuthButtons";
import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";
import StickyNav from "@/components/StickyNav";
import { TawkTo } from "@/components/TawkTo";

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
        <StickyNav />
        <HeroSection />
        <LiveMonitoringSection />
        <InsightsSection />
        <QueueManagementSection />
        <SupportingFeaturesSection />
        <ComparisonSection />
        <CtaSection />
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
  const { t } = useTranslation("features");

  const pills = [
    { icon: "/images/real-time.svg", key: "liveMonitoring" },
    { icon: "/images/flag.svg", key: "alerting" },
    { icon: "/images/chart.svg", key: "analytics" },
    { icon: "/images/message.svg", key: "queueManagement" },
    { icon: "/images/server.svg", key: "multiServer" },
    { icon: "/images/send.svg", key: "devExperience" },
  ];

  return (
    <section className="relative overflow-hidden bg-background">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-28 pb-16 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-foreground font-normal leading-tight">
          {t("hero.title")}
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mt-6 max-w-3xl mx-auto leading-relaxed">
          {t("hero.subtitle")}
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-10">
          {pills.map((pill) => (
            <span
              key={pill.key}
              className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border text-sm text-foreground"
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
            </span>
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
            <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium bg-orange-100 text-primary mb-6">
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
                  className="flex items-center justify-between p-3 border border-border"
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
  const { t } = useTranslation("features");

  return (
    <section className="py-20 bg-orange-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground font-normal leading-[1.2]">
            {t("insightsSection.title")}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Smart Alerting Card */}
          <div className="border border-border overflow-hidden bg-background">
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
              <div className="border border-border overflow-hidden">
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
                      className="flex items-center gap-3 p-3 border border-border"
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
            </div>
          </div>

          {/* Performance Analytics Card */}
          <div className="border border-border overflow-hidden bg-background">
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
              <div className="border border-border overflow-hidden">
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 4: Queue Management (split R→L) ─── */

function QueueManagementSection() {
  const { t } = useTranslation("features");

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
              <div className="border border-border overflow-hidden">
                <div className="px-3 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground font-mono">
                    orders.process
                  </span>
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-0.5 bg-orange-100 text-primary">
                      Purge
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600">
                      Delete
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 border border-border">
                      <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        Messages
                      </div>
                      <div className="text-sm font-mono text-foreground">
                        12,847
                      </div>
                    </div>
                    <div className="p-2 border border-border">
                      <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        Consumers
                      </div>
                      <div className="text-sm font-mono text-foreground">4</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Bindings */}
              <div className="border border-border overflow-hidden">
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
            <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium bg-orange-100 text-primary mb-6">
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
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 5: Multi-Server + Built for Devs (paired cards) ─── */

function SupportingFeaturesSection() {
  const { t } = useTranslation("features");

  return (
    <section className="pt-12 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Multi-Server Card */}
          <div className="border border-border overflow-hidden">
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
                    className="border border-border p-4 flex items-center gap-4"
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
            </div>
          </div>

          {/* Built for Developers Card */}
          <div className="border border-border overflow-hidden">
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
                <div className="border border-border overflow-hidden opacity-50">
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

/* ─── Section 6: Comparison (reuses homepage pattern) ─── */

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
                <div className="border border-border p-4 mt-auto flex flex-col h-[180px]">
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
                <div className="border border-border overflow-hidden mt-auto h-[180px] flex flex-col">
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
                      <div className="border border-border p-1.5">
                        <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                          {t("comparison.messagesPerSec")}
                        </div>
                        <div className="text-sm font-mono text-foreground">
                          4.2k
                        </div>
                      </div>
                      <div className="border border-border p-1.5">
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

/* ─── Section 7: CTA ─── */

function CtaSection() {
  const { t } = useTranslation("features");

  return (
    <section className="pt-12 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border border-border overflow-hidden">
          <div className="px-6 py-3 bg-orange-100 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Get started for free
            </span>
          </div>
          <div className="py-16 px-12 lg:px-16">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 text-center md:text-left leading-[1.2] font-normal text-foreground">
                  {t("cta.title")}
                </h2>
              </div>
              <div className="text-center md:text-left">
                <p className="text-xl mb-8 text-muted-foreground">
                  {t("cta.subtitle")}
                </p>
                <div className="flex flex-col items-center md:items-start">
                  <AuthButtons align="left" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
