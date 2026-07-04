/**
 * Prefix an internal path with the configured base (`/liads-website/` in
 * production, `/` in most dev setups) so hand-written links and asset srcs
 * resolve correctly under the GitHub Pages subpath.
 *
 * Astro applies `base` automatically to bundled assets and `Astro.url`, but
 * NOT to string literals we write in markup — this helper covers those.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/${path.replace(/^\//, "")}`;
}
