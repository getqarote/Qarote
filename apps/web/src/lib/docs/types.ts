/**
 * Doc content is stored as a block-based data structure (not JSX) so we can:
 * - extract text for the search index
 * - render with one renderer
 * - generate the right-rail TOC from section headings
 *
 * Each doc has top-level sections (rendered as <h2>) and each section
 * contains an ordered list of blocks.
 */

export type Inline =
  | string
  | { type: "strong"; text: string }
  | { type: "em"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; href: string; text: string };

export type Block =
  | { type: "p"; children: Inline[] }
  | { type: "h3"; text: string; id?: string }
  | { type: "ul"; items: Inline[][] }
  | { type: "ol"; items: Inline[][] }
  | { type: "code"; lang?: string; code: string }
  | {
      type: "callout";
      variant: "info" | "warn" | "success";
      title?: string;
      children: Inline[];
    }
  | {
      type: "steps";
      items: { title: string; body: Inline[] }[];
    };

export interface DocSection {
  /** Anchor id used for deep links and the right-rail TOC. */
  id: string;
  /** Section heading rendered as <h2>. */
  heading: string;
  blocks: Block[];
}

export type DocCategory =
  | "overview"
  | "getting-started"
  | "queues-management"
  | "alerting"
  | "security";

export interface Doc {
  /** Stable identifier used by the Astro page (e.g. "installation"). */
  slug: string;
  /** Public URL path, must end with trailing slash. */
  path: string;
  /** Page <h1> and SEO title. */
  title: string;
  /** SEO meta description. */
  description: string;
  /** Optional one-liner shown under the title. */
  intro?: string;
  category: DocCategory;
  sections: DocSection[];
}
