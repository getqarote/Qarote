export interface DocsPage {
  title: string;
  slug: string;
}

export interface DocsSection {
  section: string;
  pages: DocsPage[];
}

export const docsNav: DocsSection[] = [
  {
    section: "Getting started",
    pages: [{ title: "Introduction", slug: "getting-started" }],
  },
  {
    section: "Queues",
    pages: [{ title: "Spy on live queues", slug: "queues/spy-on-live-queues" }],
  },
  {
    section: "Security & Privacy",
    pages: [{ title: "Security and privacy", slug: "security-and-privacy" }],
  },
];

export function getFirstDocSlug(): string {
  return docsNav[0].pages[0].slug;
}

export function getSectionForSlug(slug: string): string | undefined {
  for (const section of docsNav) {
    if (section.pages.some((p) => p.slug === slug)) {
      return section.section;
    }
  }
  return undefined;
}
