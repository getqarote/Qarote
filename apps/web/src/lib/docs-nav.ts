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
    section: "Self-Hosted",
    pages: [{ title: "Deploying Qarote", slug: "self-hosted/deployment" }],
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
  const firstPage = docsNav[0]?.pages[0];
  if (!firstPage) {
    throw new Error(
      "docs-nav: docsNav must contain at least one section with one page"
    );
  }
  return firstPage.slug;
}

export function getSectionForSlug(slug: string): string | undefined {
  for (const section of docsNav) {
    if (section.pages.some((p) => p.slug === slug)) {
      return section.section;
    }
  }
  return undefined;
}
