import { type CardSpec, renderCard } from "@qarote/og-cards";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

/**
 * Build-time Open Graph card generator.
 *
 * apps/web is `output: "static"`, so this endpoint's `getStaticPaths()` writes
 * one PNG per card into `dist/og/<slug>.png` at build. Each page resolves its
 * own card via the slug-mapping in BaseLayout.astro — keep the slugs here in
 * sync with that derivation.
 */

/** Sanitize a content id (e.g. "fr/some-post") into a filename-safe slug. */
const safe = (id: string) => id.replace(/\//g, "-");

/**
 * Locale variants of the cards whose routes exist under `[locale]/`. English
 * keeps the bare slug; the others are prefixed, mirroring the `blog-<locale>-`
 * convention already used below. A French reader was getting an English card
 * next to French text — the copy is the loudest part of the unfurl, so it has
 * to speak the page's language.
 *
 * Only landing/pricing/features/changelog appear here: docs and compare/* have
 * no localised route, so a locale-prefixed card for them would never be
 * requested.
 *
 * zh is deliberately absent. The renderer's font carries no CJK glyphs, so a
 * Chinese card renders every ideogram as a tofu box — strictly worse than the
 * English card it would replace. Adding it back means shipping a CJK face
 * (megabytes) into the build first; until then zh falls through to English.
 */
const LOCALISED_CARDS: Record<
  "fr" | "es",
  Record<
    string,
    { eyebrow: string; title: string; accent?: string; sub?: string }
  >
> = {
  fr: {
    landing: {
      eyebrow: "Monitoring agent-first",
      title: "Votre RabbitMQ, débogué par votre agent IA.",
      accent: "débogué par votre agent IA.",
    },
    pricing: {
      eyebrow: "Tarifs",
      title: "Le cœur est gratuit. Le diagnostic est payant.",
      accent: "Le diagnostic est payant.",
      sub: "La détection est open source. Vous ne payez que l'explication IA et les fonctions d'équipe.",
    },
    features: {
      eyebrow: "Fonctionnalités",
      title: "Diagnostiquez les incidents, ne regardez pas des courbes.",
      accent: "ne regardez pas des courbes.",
    },
    changelog: {
      eyebrow: "Journal des versions",
      title: "Les nouveautés de Qarote.",
    },
  },
  es: {
    landing: {
      eyebrow: "Monitorización agent-first",
      title: "Tu RabbitMQ, depurado por tu agente IA.",
      accent: "depurado por tu agente IA.",
    },
    pricing: {
      eyebrow: "Precios",
      title: "El núcleo es gratis. El diagnóstico se paga.",
      accent: "El diagnóstico se paga.",
      sub: "La detección es open source. Solo pagas la explicación con IA y las funciones de equipo.",
    },
    features: {
      eyebrow: "Funciones",
      title: "Diagnostica incidentes, no mires métricas.",
      accent: "no mires métricas.",
    },
    changelog: { eyebrow: "Novedades", title: "Lo nuevo en Qarote." },
  },
};

export async function getStaticPaths() {
  const staticCards: { slug: string; spec: CardSpec }[] = [
    {
      slug: "default",
      spec: {
        type: "default",
        title: "Your RabbitMQ, debugged by your AI agent.",
        accent: "debugged by your AI agent.",
      },
    },
    {
      slug: "landing",
      spec: {
        type: "page",
        eyebrow: "Agent-first monitoring",
        title: "Your RabbitMQ, debugged by your AI agent.",
        accent: "debugged by your AI agent.",
      },
    },
    {
      slug: "pricing",
      spec: {
        type: "page",
        eyebrow: "Pricing",
        title: "Free core. Pay for diagnosis.",
        accent: "Pay for diagnosis.",
        sub: "Detection is open source. Pay only for AI Explain and team features.",
      },
    },
    {
      slug: "features",
      spec: {
        type: "page",
        eyebrow: "Features",
        title: "Diagnose incidents, don't just watch metrics.",
        accent: "don't just watch metrics.",
      },
    },
    {
      slug: "docs",
      spec: {
        type: "page",
        eyebrow: "Docs",
        title: "Set up Qarote in minutes.",
      },
    },
    {
      slug: "changelog",
      spec: {
        type: "page",
        eyebrow: "Changelog",
        title: "What's new in Qarote.",
      },
    },
    {
      slug: "quiz-default",
      spec: {
        type: "page",
        eyebrow: "RabbitMQ Assessment",
        title: "How well do you know your RabbitMQ setup?",
      },
    },
    {
      slug: "quiz-reactive",
      spec: {
        type: "page",
        eyebrow: "RabbitMQ Assessment",
        title: "I'm Reactive tier.",
        accent: "Reactive tier.",
        sub: "Mostly finding out about problems when they page me.",
      },
    },
    {
      slug: "quiz-proactive",
      spec: {
        type: "page",
        eyebrow: "RabbitMQ Assessment",
        title: "I'm Proactive tier.",
        accent: "Proactive tier.",
        sub: "Solid fundamentals — catching issues before they bite.",
      },
    },
    {
      slug: "quiz-production",
      spec: {
        type: "page",
        eyebrow: "RabbitMQ Assessment",
        title: "I'm Production-Grade.",
        accent: "Production-Grade.",
        sub: "Reasoning in failure modes across durability, routing, flow.",
      },
    },
  ];

  const posts = await getCollection("blog");
  const blogCards = posts.map((post) => ({
    slug: `blog-${safe(post.id)}`,
    spec: {
      type: "page",
      eyebrow: "Blog",
      title: post.data.title,
    } satisfies CardSpec,
  }));

  const localisedCards = Object.entries(LOCALISED_CARDS).flatMap(
    ([locale, cards]) =>
      Object.entries(cards).map(([slug, copy]) => ({
        slug: `${locale}-${slug}`,
        spec: { type: "page", ...copy } satisfies CardSpec,
      }))
  );

  return [...staticCards, ...localisedCards, ...blogCards].map(
    ({ slug, spec }) => ({
      params: { card: slug },
      props: { spec },
    })
  );
}

export const GET: APIRoute = async ({ props }) => {
  const png = await renderCard((props as { spec: CardSpec }).spec);
  // Buffer → Uint8Array for a DOM-typed Response body (BodyInit).
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
