import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Code2,
  MessageSquare,
  Server,
  Shield,
} from "lucide-react";

import { trackSignUpClick } from "@/lib/gtm";

import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";
import StickyNav from "@/components/StickyNav";

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
      <div className="min-h-screen font-sans bg-white">
        <StickyNav />
        <FeaturesContent />
        <FooterSection currentLocale={locale} />
      </div>
    </IslandProvider>
  );
}

function FeatureSection({
  icon: Icon,
  title,
  description,
  points,
  badge,
  reverse = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  points: string[];
  badge?: string;
  reverse?: boolean;
}) {
  return (
    <section
      className={`flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} gap-8 md:gap-12 items-start`}
    >
      <div className="shrink-0 inline-flex p-4 bg-orange-100 rounded-xl">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            {title}
          </h2>
          {badge && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-primary whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>
        <p className="text-muted-foreground mb-4 text-lg leading-relaxed">
          {description}
        </p>
        <ul className="space-y-2">
          {points.map((point, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-muted-foreground"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FeaturesContent() {
  const { t } = useTranslation("features");
  const authBaseUrl = import.meta.env.VITE_APP_BASE_URL || "";

  const sections = [
    {
      icon: Activity,
      key: "liveMonitoring" as const,
    },
    {
      icon: Shield,
      key: "alerting" as const,
    },
    {
      icon: BarChart3,
      key: "analytics" as const,
    },
    {
      icon: MessageSquare,
      key: "queueManagement" as const,
    },
    {
      icon: Server,
      key: "multiServer" as const,
    },
    {
      icon: Code2,
      key: "builtForDevs" as const,
    },
  ];

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <section className="mb-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
          {t("hero.title")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("hero.subtitle")}
        </p>
      </section>

      {/* Feature sections */}
      <div className="space-y-20">
        {sections.map((section, i) => (
          <FeatureSection
            key={section.key}
            icon={section.icon}
            title={t(`${section.key}.title`)}
            description={t(`${section.key}.description`)}
            points={[
              t(`${section.key}.point1`),
              t(`${section.key}.point2`),
              t(`${section.key}.point3`),
            ]}
            badge={t(`${section.key}.badge`, { defaultValue: "" }) || undefined}
            reverse={i % 2 === 1}
          />
        ))}
      </div>

      {/* Comparison section */}
      <section className="mt-24 mb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8 text-center">
          {t("compare.title")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="border border-border rounded-xl p-6 hover:-translate-y-1 transition-transform duration-300">
            <h3 className="text-lg font-bold text-foreground mb-2">
              {t("compare.managementPlugin.title")}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("compare.managementPlugin.description")}
            </p>
          </div>
          <div className="border border-border rounded-xl p-6 hover:-translate-y-1 transition-transform duration-300">
            <h3 className="text-lg font-bold text-foreground mb-2">
              {t("compare.prometheus.title")}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("compare.prometheus.description")}
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="text-center border-t border-border pt-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
          {t("cta.title")}
        </h2>
        <p className="text-muted-foreground mb-8">{t("cta.subtitle")}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => {
              trackSignUpClick({
                source: "features_cta",
                location: "features_page",
              });
              window.location.href = `${authBaseUrl}/auth/sign-up`;
            }}
            className="bg-gradient-button hover:bg-gradient-button-hover text-white px-7 py-3 transition-colors duration-200 inline-flex items-center justify-center gap-3 text-lg rounded-full"
          >
            <span>{t("cta.tryForFree")}</span>
            <img
              src="/images/arrow-right.svg"
              alt=""
              aria-hidden="true"
              className="h-[0.8em] w-auto image-crisp align-middle"
              width={14}
              height={14}
            />
          </button>
          <a
            href="#pricing"
            onClick={(e) => {
              e.preventDefault();
              window.location.assign(
                `${window.location.pathname.replace(/\/features\/$/, "/")}#pricing`
              );
            }}
            className="text-foreground hover:text-primary px-7 py-3 text-lg inline-flex items-center gap-2 transition-colors"
          >
            {t("cta.viewPricing")}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </main>
  );
}
