import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";
import { Linkedin } from "lucide-react";

import { teamMembers } from "@/lib/team-data";

import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";
import StickyNav from "@/components/StickyNav";
import { TawkTo } from "@/components/TawkTo";

interface AboutIslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
}

export default function AboutIsland({
  locale = "en",
  resources,
}: AboutIslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <div className="min-h-screen font-sans bg-background">
        <StickyNav />
        <AboutContent />
        <FooterSection currentLocale={locale} />
      </div>
      <TawkTo />
    </IslandProvider>
  );
}

function AboutContent() {
  const { t } = useTranslation("about");

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page header */}
      <div className="border border-border overflow-hidden mb-12">
        <div className="px-6 py-3 bg-muted/30 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            About
          </span>
        </div>
        <div className="p-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-normal text-foreground mb-6">
            {t("hero.title")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("hero.subtitle")}
          </p>
        </div>
      </div>

      {/* Team members */}
      <div className="space-y-8">
        {teamMembers.map((member) => (
          <article
            key={member.id}
            className="border border-border overflow-hidden"
          >
            <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t(`team.${member.id}.name`)}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-primary font-medium">
                  {t(`team.${member.id}.role`)}
                </span>
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label={t("team.linkedinAria", {
                    name: t(`team.${member.id}.name`),
                  })}
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-8 items-start">
                <div className="shrink-0">
                  <img
                    src={member.photo}
                    alt={t("team.photoAlt", {
                      name: t(`team.${member.id}.name`),
                      role: t(`team.${member.id}.role`),
                    })}
                    width={180}
                    height={180}
                    className="w-36 h-36 sm:w-44 sm:h-44 object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-4">
                    {t(`team.${member.id}.location`)}
                  </p>
                  <p className="text-muted-foreground mb-4">
                    {t(`team.${member.id}.bio`)}
                  </p>
                  <ul className="space-y-2">
                    {((): string[] => {
                      const raw = t(`team.${member.id}.highlights`, {
                        returnObjects: true,
                      });
                      return Array.isArray(raw) ? (raw as string[]) : [];
                    })().map((highlight, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-primary/60" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Mission section */}
      <div className="border border-border overflow-hidden mt-12">
        <div className="px-6 py-3 bg-muted/30 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mission
          </span>
        </div>
        <div className="p-8 text-center">
          <h2 className="text-2xl font-normal text-foreground mb-4">
            {t("mission.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("mission.description")}
          </p>
        </div>
      </div>
    </main>
  );
}
