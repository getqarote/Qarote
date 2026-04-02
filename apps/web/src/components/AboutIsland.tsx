import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";
import { ArrowLeft, Linkedin } from "lucide-react";

import { teamMembers } from "@/lib/team-data";

import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";
import StickyNav from "@/components/StickyNav";
import { Button } from "@/components/ui/button";

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
      <div className="min-h-screen font-sans bg-white">
        <StickyNav />
        <AboutContent />
        <FooterSection currentLocale={locale} />
      </div>
    </IslandProvider>
  );
}

function AboutContent() {
  const { t } = useTranslation("about");

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("back")}
        </Button>
      </div>

      <section className="mb-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
          {t("hero.title")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("hero.subtitle")}
        </p>
      </section>

      <section className="space-y-16">
        {teamMembers.map((member) => (
          <article
            key={member.id}
            className="flex flex-col sm:flex-row gap-8 items-start"
          >
            <div className="shrink-0">
              <img
                src={member.photo}
                alt={t("team.photoAlt", {
                  name: t(`team.${member.id}.name`),
                  role: t(`team.${member.id}.role`),
                })}
                width={180}
                height={180}
                className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-foreground">
                  {t(`team.${member.id}.name`)}
                </h2>
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label={t("team.linkedinAria", {
                    name: t(`team.${member.id}.name`),
                  })}
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
              <p className="text-sm font-medium text-primary mb-1">
                {t(`team.${member.id}.role`)}
              </p>
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
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-20 text-center border-t border-border pt-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          {t("mission.title")}
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t("mission.description")}
        </p>
      </section>
    </main>
  );
}
