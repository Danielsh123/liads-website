/**
 * Generate the Claude Design preview cards from the live Astro components.
 *
 * Markup is authored ONCE in `src/components/*.astro`. This script renders each
 * shared component to a standalone static card in `design/components/<name>.html`
 * so the design system can never structurally drift from the site.
 *
 * DO NOT hand-edit `design/components/*.html` — they are generated. Run:
 *   npm run build:design-cards
 *
 * Rendering uses Astro's Container API (astro/container). Astro components can't
 * be imported by plain Node, so we spin up a Vite dev server configured by
 * `getViteConfig` and `ssrLoadModule` each `.astro` / data module through it —
 * the supported standalone path for this Astro version (7.x).
 *
 * `design/styles/global.css` is owned by /design-sync and is never touched here.
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getViteConfig } from "astro/config";
import { createServer } from "vite";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const projectRoot = path.resolve(fileURLToPath(import.meta.url), "../..");
const cardsDir = path.join(projectRoot, "design", "components");

/**
 * Each card names a component, the sample props to feed it, and the preview
 * chrome (wrapper) that frames it in isolation — matching the original cards.
 * `marker` is read from the existing card's first line at runtime (so the exact
 * group/name/subtitle is preserved); `fallbackMarker` covers a missing file.
 */
const cards = (content) => [
  {
    file: "nav.html",
    module: "/src/components/Nav.astro",
    props: { navLinks: content.homeNavLinks },
    fallbackMarker: '<!-- @dsCard group="Components" name="Sticky nav" subtitle="Cream blur bar — brand, links, EN/עב toggle" -->',
  },
  {
    file: "header.html",
    module: "/src/components/LandingHero.astro",
    // No `portrait` → the component renders its 🌻 placeholder (asset-free card).
    props: {
      kicker: content.hero.kicker,
      title: content.hero.title,
      bio: content.hero.bio,
      primaryCta: content.hero.primaryCta,
      secondaryCta: content.hero.secondaryCta,
    },
    fallbackMarker: '<!-- @dsCard group="Components" name="Landing hero" subtitle="Gradient hero — kicker, title, bio, CTA, blob portrait" -->',
  },
  {
    file: "impact-stats.html",
    module: "/src/components/ImpactStats.astro",
    props: { heading: content.impact.heading, sub: content.impact.sub, stats: content.impact.stats },
    freezeCounters: true,
    wrapOpen: '    <section style="max-width:var(--max-width-content);margin:0 auto;padding:2.5rem 1.5rem;">',
    wrapClose: "    </section>",
    fallbackMarker: '<!-- @dsCard group="Landing sections" name="Impact stats" subtitle="Count-up stat cards with gradient numerals" -->',
  },
  {
    file: "pillar-card.html",
    module: "/src/components/PillarCard.astro",
    props: content.pillars.items[0],
    wrapOpen: '    <div style="max-width:340px;margin:0 auto;padding:2rem 1.5rem;">',
    wrapClose: "    </div>",
    fallbackMarker: '<!-- @dsCard group="Landing sections" name="Pillar card" subtitle="Gradient-topped action card with icon + tags" -->',
  },
  {
    file: "timeline.html",
    module: "/src/components/Timeline.astro",
    props: { milestones: content.journey.milestones },
    wrapOpen: '    <section style="max-width:560px;margin:0 auto;padding:2.5rem 1.5rem;">',
    wrapClose: "    </section>",
    fallbackMarker: '<!-- @dsCard group="Landing sections" name="Journey timeline" subtitle="Vertical milestone track with gradient spine" -->',
  },
  {
    file: "contact-form.html",
    module: "/src/components/ContactForm.astro",
    props: {
      heading: content.contact.heading,
      sub: content.contact.sub,
      success: content.contact.success,
      roleOptions: content.contact.roleOptions,
    },
    wrapOpen: '    <section style="max-width:var(--max-width-content);margin:0 auto;padding:2.5rem 1.5rem;">',
    wrapClose: "    </section>",
    fallbackMarker: '<!-- @dsCard group="Landing sections" name="Contact form" subtitle="\'Spread the love\' gradient panel with form" -->',
  },
  {
    file: "feed-item-podcast.html",
    module: "/src/components/FeedItemPodcast.astro",
    props: { episode: content.podcastEpisodes[0] },
    wrapOpen: '    <div style="padding:2rem 1.5rem;max-width:560px;">\n      <ul class="feed-list">',
    wrapClose: "      </ul>\n    </div>",
    fallbackMarker: '<!-- @dsCard group="Feed cards" name="Feed card — podcast" subtitle="Sky-blue border, podcast badge, Spotify-style player" -->',
  },
  {
    file: "feed-item-instagram.html",
    module: "/src/components/FeedItemInstagram.astro",
    // First post has no image → the component renders its 📸 placeholder.
    props: { post: content.instagramPosts[0] },
    wrapOpen: '    <div style="padding:2rem 1.5rem;max-width:560px;">\n      <ul class="feed-list">',
    wrapClose: "      </ul>\n    </div>",
    fallbackMarker: '<!-- @dsCard group="Feed cards" name="Feed card — Instagram" subtitle="Pink→gold border, IG badge, thumbnail + link" -->',
  },
  {
    file: "mini-contact.html",
    module: "/src/components/MiniContact.astro",
    props: {
      text: content.podcastMiniContact.text,
      ctaLabel: content.podcastMiniContact.ctaLabel,
      ctaHref: content.podcastMiniContact.ctaHref,
    },
    wrapOpen: '    <div style="padding:2.5rem 1.5rem;">',
    wrapClose: "    </div>",
    fallbackMarker: '<!-- @dsCard group="Components" name="Mini contact" subtitle="Gradient-border \'get in touch\' segment" -->',
  },
];

/** A static card has no layout script, so bake in the "revealed" state. */
function revealStatic(html) {
  return html.replace(/\bls-reveal\b/g, "ls-reveal ls-in");
}

/**
 * Freeze count-up numerals (`…>0</div>`) to their final formatted target.
 * An empty `suffix` renders as a bare `data-suffix` attribute (no `=""`), so the
 * value group is optional.
 */
function freezeCounters(html) {
  return html.replace(
    /(<div data-count="(\d+)" data-suffix(?:="([^"]*)")?[^>]*>)0(<\/div>)/g,
    (_m, open, target, suffix, close) =>
      open + Number(target).toLocaleString("en-US") + (suffix ?? "") + close,
  );
}

/** Read the exact `@dsCard` marker from the current card, else use the fallback. */
async function markerFor(card) {
  const abs = path.join(cardsDir, card.file);
  if (existsSync(abs)) {
    const first = (await readFile(abs, "utf8")).split(/\r?\n/, 1)[0];
    if (first.startsWith("<!-- @dsCard")) return first;
  }
  return card.fallbackMarker;
}

function titleFromMarker(marker) {
  return marker.match(/name="([^"]*)"/)?.[1] ?? "Component";
}

function wrap({ marker, title, wrapOpen, wrapClose, body }) {
  const inner = [wrapOpen, body, wrapClose].filter(Boolean).join("\n");
  return `${marker}
<!DOCTYPE html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <link rel="stylesheet" href="../styles/global.css" />
  </head>
  <body style="background: var(--color-bg);">
${inner}
  </body>
</html>
`;
}

async function main() {
  const viteConfig = await getViteConfig({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "silent",
  })({ mode: "development", command: "serve" });
  const server = await createServer(viteConfig);
  const container = await AstroContainer.create();

  try {
    const content = await server.ssrLoadModule("/src/data/content.ts");
    const list = cards(content);

    for (const card of list) {
      const mod = await server.ssrLoadModule(card.module);
      let body = await container.renderToString(mod.default, { props: card.props });
      body = revealStatic(body);
      if (card.freezeCounters) body = freezeCounters(body);
      body = body.trim();

      const marker = await markerFor(card);
      const html = wrap({
        marker,
        title: titleFromMarker(marker),
        wrapOpen: card.wrapOpen,
        wrapClose: card.wrapClose,
        body: card.wrapOpen ? body.replace(/^/gm, "        ") : body.replace(/^/gm, "    "),
      });

      await writeFile(path.join(cardsDir, card.file), html, "utf8");
      console.log(`✓ design/components/${card.file}`);
    }
    console.log(`\nGenerated ${list.length} design cards.`);
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
