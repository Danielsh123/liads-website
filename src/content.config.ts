import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { EMBED_TYPES } from "./lib/embed-types";

/**
 * The "work" collection — each markdown file in src/content/work is a typed,
 * schema-validated feed item (podcast episode, Instagram post, photo moment…).
 * Adding an item is just dropping a new .md file with valid frontmatter.
 */
const work = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/work" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    embedType: z.enum(EMBED_TYPES),
    caption: z.string().optional(),
    // Embed-specific fields — each embed component reads the ones it needs.
    embedUrl: z.string().optional(), // podcast iframe src
    sourceUrl: z.string().url().optional(), // instagram post link
    thumbnail: z.string().optional(), // instagram thumbnail path
    photo: z.string().optional(), // photo moment image path
  }),
});

export const collections = { work };
