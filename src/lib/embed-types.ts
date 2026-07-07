/**
 * The single source of truth for the kinds of work item the feed understands.
 *
 * This file is plain data (no component imports) so it can be shared by both
 * the content schema (src/content.config.ts) and the component registry
 * (src/components/embeds/registry.ts).
 *
 * To add a new kind of item (e.g. "youtube"):
 *   1. add its name here,
 *   2. add its fields to the schema in src/content.config.ts,
 *   3. create src/components/embeds/YoutubeEmbed.astro,
 *   4. register it in src/components/embeds/registry.ts,
 *   5. (optional) add a `.feed-item--youtube` gradient in design/styles/global.css.
 */
export const EMBED_TYPES = ["podcast", "instagram", "photo"] as const;

export type EmbedType = (typeof EMBED_TYPES)[number];
