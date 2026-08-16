import { type CSSProperties, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";
import { TawkTo } from "@/components/TawkTo";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScrollEntry } from "@/hooks/useScrollEntry";

import changelogRaw from "../../../../CHANGELOG.md?raw";

interface ChangelogEntry {
  version: string;
  date: string;
  categories: { name: string; items: string[] }[];
}

// Prototype treatment: an emoji + a colored label per category, drawn with
// theme tokens (carrot for additions, success-green for changes, muted ink for
// the rest). No solid pills — the timeline rail carries the structure instead.
const categoryStyles: Record<string, { icon: string; className: string }> = {
  Added: { icon: "✨", className: "text-primary" },
  Changed: { icon: "⚡", className: "text-status-success-text" },
  Fixed: { icon: "🐛", className: "text-muted-foreground" },
  Removed: { icon: "🗑", className: "text-destructive" },
  Security: { icon: "🔒", className: "text-status-success-text" },
  Deprecated: { icon: "⚠", className: "text-muted-foreground" },
};

const fallbackCategoryStyle = { icon: "•", className: "text-muted-foreground" };

function parseChangelog(raw: string, locale = "en"): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;
  let currentCategory: { name: string; items: string[] } | null = null;

  for (const line of raw.split("\n")) {
    const versionMatch = line.match(
      /^## \[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/
    );
    if (versionMatch) {
      if (current) entries.push(current);
      const [, version, dateStr] = versionMatch;
      let date = "Upcoming";
      if (dateStr) {
        const d = new Date(dateStr + "T00:00:00");
        date = d.toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
      current = { version, date, categories: [] };
      currentCategory = null;
      continue;
    }

    const categoryMatch = line.match(/^### (.+)/);
    if (categoryMatch && current) {
      currentCategory = { name: categoryMatch[1], items: [] };
      current.categories.push(currentCategory);
      continue;
    }

    const itemMatch = line.match(/^- (.+)/);
    if (itemMatch && currentCategory) {
      currentCategory.items.push(itemMatch[1]);
    }
  }

  if (current) entries.push(current);
  return entries;
}

interface ChangelogIslandProps {
  locale?: SupportedLocale;
  resources?: Record<string, Record<string, unknown>>;
}

export default function ChangelogIsland({
  locale = "en",
  resources,
}: ChangelogIslandProps) {
  const entries = parseChangelog(changelogRaw, locale);

  return (
    <IslandProvider locale={locale} resources={resources}>
      <ChangelogContent entries={entries} locale={locale} />
      <TawkTo />
    </IslandProvider>
  );
}

function ChangelogContent({
  entries,
  locale = "en",
}: {
  entries: ChangelogEntry[];
  locale?: SupportedLocale;
}) {
  const { t } = useTranslation("common");
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [listRef, listEntered] = useScrollEntry<HTMLDivElement>(0.04);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const mountEnter = (delay: number): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(10px)",
          transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        };

  const entryStyle = (i: number): CSSProperties =>
    reduceMotion
      ? {}
      : {
          opacity: listEntered ? 1 : 0,
          transform: listEntered ? "none" : "translateY(10px)",
          transition: `opacity 0.45s cubic-bezier(0.16,1,0.3,1) ${Math.min(i * 50, 300)}ms, transform 0.45s cubic-bezier(0.16,1,0.3,1) ${Math.min(i * 50, 300)}ms`,
        };

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header — light eyebrow + heading, matching the prototype feed */}
        <header className="mb-12" style={mountEnter(0)}>
          <span className="font-mono text-xs uppercase tracking-wide text-primary">
            {t("changelog.eyebrow", "Changelog")}
          </span>
          <h1 className="font-display text-4xl font-semibold text-foreground mt-2 mb-3">
            {t("changelog.title")}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("changelog.subtitle")}
          </p>
        </header>

        {/* Reverse-chronological timeline: date rail + bodied entries */}
        <div ref={listRef} className="flex flex-col">
          {entries.map((entry, i) => {
            const isUpcoming = entry.version === "Unreleased";
            return (
              <article
                key={entry.version}
                className="grid grid-cols-1 gap-3 pb-10 sm:grid-cols-[150px_1fr] sm:gap-7"
                style={entryStyle(i)}
              >
                <div className="sm:relative">
                  <div className="font-mono text-xs text-muted-foreground sm:sticky sm:top-[84px]">
                    {entry.date}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-2 font-display text-base font-semibold text-foreground">
                    {isUpcoming
                      ? t("changelog.upcoming", "Upcoming")
                      : `v${entry.version}`}
                    {i === 0 && !isUpcoming && (
                      <span className="rounded-full border border-primary/30 bg-accent px-[7px] py-[2px] font-mono text-[10px] text-primary">
                        {t("changelog.latest", "latest")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative border-border pb-1 sm:border-l-2 sm:pl-7">
                  {/* Timeline node — a carrot-ringed dot on the rail (desktop only) */}
                  <span
                    aria-hidden
                    className="absolute left-[-7px] top-1 hidden h-3 w-3 rounded-full border-2 border-primary bg-background sm:block"
                  />
                  {entry.categories.map((category) => {
                    const style =
                      categoryStyles[category.name] ?? fallbackCategoryStyle;
                    return (
                      <div key={category.name} className="mb-4 last:mb-0">
                        <div
                          className={`mb-2 inline-flex items-center gap-2 text-xs font-semibold ${style.className}`}
                        >
                          <span aria-hidden>{style.icon}</span>
                          {category.name}
                        </div>
                        <ul className="flex flex-col gap-[7px]">
                          {category.items.map((item, j) => (
                            <li
                              key={j}
                              className="relative pl-4 text-sm leading-relaxed text-muted-foreground before:absolute before:left-0 before:text-muted-foreground/70 before:content-['–']"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <FooterSection currentLocale={locale} />
    </div>
  );
}
