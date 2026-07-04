import type { EmbedType } from "../../lib/embed-types";
import PodcastEmbed from "./PodcastEmbed.astro";
import InstagramEmbed from "./InstagramEmbed.astro";
import PhotoEmbed from "./PhotoEmbed.astro";

/**
 * Maps an embed type to the component that renders it. This is the one place
 * FeedItem dispatches on type — add a new type here (plus its component and a
 * schema entry) and the whole feed picks it up automatically.
 *
 * Values are Astro component factories; typed loosely because Astro doesn't
 * export a stable public type for `.astro` module default exports.
 */
export const EMBED_COMPONENTS: Record<EmbedType, unknown> = {
  podcast: PodcastEmbed,
  instagram: InstagramEmbed,
  photo: PhotoEmbed,
};
