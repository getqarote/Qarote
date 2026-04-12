import { useTranslation } from "react-i18next";

import type { SupportedLocale } from "@qarote/i18n";

import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";
import StickyNav from "@/components/StickyNav";
import { TawkTo } from "@/components/TawkTo";

import changelogRaw from "../../../../CHANGELOG.md?raw";

interface ChangelogEntry {
  version: string;
  date: string;
  categories: { name: string; items: string[] }[];
}

const categoryColors: Record<string, string> = {
  Added: "bg-emerald-100 text-emerald-800",
  Changed: "bg-blue-100 text-blue-800",
  Fixed: "bg-amber-100 text-amber-800",
  Removed: "bg-red-100 text-red-800",
  Security: "bg-purple-100 text-purple-800",
  Deprecated: "bg-gray-100 text-gray-600",
};

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

  return (
    <div className="min-h-screen bg-background font-sans">
      <StickyNav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header */}
        <div className="border border-border overflow-hidden mb-12">
          <div className="px-6 py-3 bg-muted/30 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Changelog
            </span>
          </div>
          <div className="p-8">
            <h1 className="text-4xl font-normal text-foreground mb-2">
              {t("changelog.title")}
            </h1>
            <p className="text-muted-foreground text-lg">
              {t("changelog.subtitle")}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {entries.map((entry) => (
            <article
              key={entry.version}
              className="border border-border overflow-hidden"
            >
              <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {entry.version === "Unreleased"
                    ? "Upcoming"
                    : `v${entry.version}`}
                </h2>
                <span className="text-xs text-muted-foreground font-mono">
                  {entry.date}
                </span>
              </div>
              <div className="p-6 space-y-6">
                {entry.categories.map((category) => (
                  <div key={category.name}>
                    <span
                      className={`inline-block px-2.5 py-0.5 text-xs font-medium mb-3 ${
                        categoryColors[category.name] ??
                        "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {category.name}
                    </span>
                    <ul className="space-y-2">
                      {category.items.map((item, i) => (
                        <li
                          key={i}
                          className="text-muted-foreground flex items-start gap-2"
                        >
                          <span className="mt-2 shrink-0 block w-1.5 h-1.5 bg-primary/60" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
      <FooterSection currentLocale={locale} />
    </div>
  );
}
