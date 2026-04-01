import { useMemo } from "react";

import FooterSection from "@/components/landing/FooterSection";
import SEO from "@/components/SEO";
import StickyNav from "@/components/StickyNav";

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

function parseChangelog(raw: string): ChangelogEntry[] {
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
        date = d.toLocaleDateString("en-US", {
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

const Changelog = () => {
  const entries = useMemo(() => parseChangelog(changelogRaw), []);

  return (
    <div className="min-h-screen bg-background">
      <StickyNav />
      <SEO
        title="Changelog - Qarote"
        description="See what's new in Qarote. Browse the latest features, improvements, and bug fixes."
        url="https://qarote.io/changelog/"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            What's New
          </h1>
          <p className="text-muted-foreground text-lg">
            All notable changes to Qarote, documented release by release.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-border hidden sm:block" />

          <div className="space-y-12">
            {entries.map((entry) => (
              <article key={entry.version} className="relative sm:pl-10">
                {/* Timeline dot */}
                <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-primary -translate-x-[3.5px] hidden sm:block" />

                {/* Version header */}
                <div className="mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-semibold text-foreground">
                      {entry.version === "Unreleased"
                        ? "Upcoming"
                        : `v${entry.version}`}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      {entry.date}
                    </span>
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-6">
                  {entry.categories.map((category) => (
                    <div key={category.name}>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mb-3 ${
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
                            <span className="text-primary mt-2 shrink-0 block w-1.5 h-1.5 rounded-full bg-current" />
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
      </div>
      <FooterSection />
    </div>
  );
};

export default Changelog;
