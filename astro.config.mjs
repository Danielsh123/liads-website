// @ts-check
import { defineConfig } from "astro/config";

// Static site deployed to GitHub Pages under the /liads-website/ subpath.
// `base` is applied automatically to Astro-managed URLs; for hand-written
// links/asset srcs we prepend it via the withBase() helper in src/lib/url.ts.
export default defineConfig({
  site: "https://danielsh123.github.io",
  base: "/liads-website/",
  trailingSlash: "always",
});
