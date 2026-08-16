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

const COMPARE: { name: string; display: string }[] = [
  { name: "cloudamqp", display: "CloudAMQP" },
  { name: "datadog", display: "Datadog" },
  { name: "grafana-prometheus", display: "Grafana + Prometheus" },
  { name: "new-relic", display: "New Relic" },
];

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

  const compareCards = COMPARE.map(({ name, display }) => ({
    slug: `compare-${name}`,
    spec: {
      type: "page",
      eyebrow: "Comparison",
      title: `Qarote vs ${display}`,
      accent: `vs ${display}`,
      sub: "Different category — agent-native RabbitMQ diagnosis, not general observability.",
    } satisfies CardSpec,
  }));

  const posts = await getCollection("blog");
  const blogCards = posts.map((post) => ({
    slug: `blog-${safe(post.id)}`,
    spec: {
      type: "page",
      eyebrow: "Blog",
      title: post.data.title,
    } satisfies CardSpec,
  }));

  return [...staticCards, ...compareCards, ...blogCards].map(
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
