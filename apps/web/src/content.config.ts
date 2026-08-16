import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    section: z.string().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.iso.date(),
    updatedAt: z.iso.date().optional(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    readingTimeMin: z.number().optional(),
    /** Editorial category — drives the index filter pills. */
    category: z.enum(["diagnosis", "mcp", "patterns", "engineering"]),
    /** Cover SVG filename under /blog-covers (falls back by category). */
    cover: z.string().optional(),
    /** Optional caption pill rendered bottom-left on the cover. */
    coverCaption: z.string().optional(),
    /** Promotes the post to the index's featured slot. */
    featured: z.boolean().optional(),
  }),
});

export const collections = { docs, blog };
