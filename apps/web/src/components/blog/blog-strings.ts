/**
 * Chrome strings for the blog index + article surfaces, keyed by locale.
 *
 * These are deliberately kept OUT of the JSON i18n namespaces so the locale
 * parity validator (which diffs the public/locales/*.json files) isn't tripped
 * by blog-only copy. The index and article read from here by `locale`.
 *
 * `fr` is authored properly (vouvoiement). `es` and `zh` mirror `en` for now —
 * translate when the localized posts ship.
 */

export type BlogCategory = "diagnosis" | "mcp" | "patterns" | "engineering";

interface BlogStrings {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Filter pill labels (the "mcp" pill reads longer than the tag). */
  filters: Record<"all" | BlogCategory, string>;
  /** Short category labels used inside the `.posttag` pills. */
  categories: Record<BlogCategory, string>;
  readPost: string;
  /** Suffix after the reading time on featured + article ("min read"). */
  minReadSuffix: string;
  /** Compact reading-time suffix used on cards ("min"). */
  minShort: string;
  ctaTitle: string;
  ctaBody: string;
  ctaPrimary: string;
  ctaSecondary: string;
  relatedHeader: string;
  breadcrumbBlog: string;
  authorName: string;
  authorRole: string;
  authorBio: string;
  articleCtaTitle: string;
  articleCtaBody: string;
  articleCtaSecondary: string;
}

const en: BlogStrings = {
  eyebrow: "Blog",
  title: "Debugging RabbitMQ, agent-first.",
  subtitle:
    "Field notes on diagnosing incidents from your editor — MCP guides, root-cause patterns, and what we're learning building agent-native ops.",
  filters: {
    all: "All",
    diagnosis: "Diagnosis",
    mcp: "MCP & agents",
    patterns: "Patterns",
    engineering: "Engineering",
  },
  categories: {
    diagnosis: "Diagnosis",
    mcp: "MCP",
    patterns: "Patterns",
    engineering: "Engineering",
  },
  readPost: "Read the post",
  minReadSuffix: "min read",
  minShort: "min",
  ctaTitle: "Debug your next incident by asking.",
  ctaBody:
    "Connect a broker in under two minutes and wire your agent over MCP.",
  ctaPrimary: "Try for free",
  ctaSecondary: "Read the docs",
  relatedHeader: "Related posts",
  breadcrumbBlog: "Blog",
  authorName: "Brice Tessier",
  authorRole: "CTO of Qarote",
  authorBio:
    "Building agent-native RabbitMQ diagnosis. Previously spent too many on-call nights staring at queue charts — which is roughly why Qarote exists.",
  articleCtaTitle: "Try it on your own broker.",
  articleCtaBody:
    "Connect in under two minutes, wire your agent, and ask it what's wrong.",
  articleCtaSecondary: "MCP setup guide",
};

const fr: BlogStrings = {
  eyebrow: "Blog",
  title: "Déboguer RabbitMQ, d'abord avec l'agent.",
  subtitle:
    "Des notes de terrain sur le diagnostic d'incidents depuis votre éditeur — guides MCP, schémas de cause racine, et ce que nous apprenons en construisant des opérations natives pour agents.",
  filters: {
    all: "Tout",
    diagnosis: "Diagnostic",
    mcp: "MCP & agents",
    patterns: "Schémas",
    engineering: "Ingénierie",
  },
  categories: {
    diagnosis: "Diagnostic",
    mcp: "MCP",
    patterns: "Schémas",
    engineering: "Ingénierie",
  },
  readPost: "Lire l'article",
  minReadSuffix: "min de lecture",
  minShort: "min",
  ctaTitle: "Diagnostiquez votre prochain incident en posant la question.",
  ctaBody:
    "Connectez un broker en moins de deux minutes et reliez votre agent via MCP.",
  ctaPrimary: "Essayer gratuitement",
  ctaSecondary: "Lire la documentation",
  relatedHeader: "Articles liés",
  breadcrumbBlog: "Blog",
  authorName: "Brice Tessier",
  authorRole: "CTO de Qarote",
  authorBio:
    "Je construis le diagnostic RabbitMQ natif pour agents. J'ai passé trop de nuits d'astreinte à fixer des graphiques de files d'attente — c'est en gros pourquoi Qarote existe.",
  articleCtaTitle: "Essayez-le sur votre propre broker.",
  articleCtaBody:
    "Connectez-vous en moins de deux minutes, reliez votre agent, et demandez-lui ce qui ne va pas.",
  articleCtaSecondary: "Guide de configuration MCP",
};

// es + zh mirror en for now (translate when localized posts ship).
const es: BlogStrings = en;
const zh: BlogStrings = en;

const STRINGS: Record<string, BlogStrings> = { en, fr, es, zh };

export function getBlogStrings(locale: string): BlogStrings {
  return STRINGS[locale] ?? en;
}
