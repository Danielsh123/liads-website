# CLAUDE.md

Guidance for working in this repo.

## What this is

Liad Shapira's personal site — a small Astro static site (Hebrew-first, RTL, with a
client-side he⇄en language toggle) deployed to GitHub Pages. Three landing pages:
`src/pages/{index,instagram,podcasts}.astro`, sharing `src/layouts/LandingLayout.astro`.

## Single source of truth for component markup

Component **markup is authored ONCE**, in `src/components/*.astro`. The live pages
import those components, and the Claude Design preview cards in
`design/components/*.html` are **generated** from the very same components — they are
build artifacts, never hand-edited.

- Author/refactor markup in `src/components/*.astro` (and copy in `src/data/content.ts`).
- Regenerate the design cards with:

  ```
  npm run build:design-cards
  ```

  This also runs automatically on `prebuild` (i.e. before `npm run build`) and in CI.
- `scripts/build-design-cards.mjs` renders each component to a standalone card via
  Astro's Container API, re-emitting each card's exact
  `<!-- @dsCard group="…" name="…" -->` marker and freezing interactive states
  (scroll-reveal, count-up) into a static preview.

> Do **not** hand-edit `design/components/*.html`. Any change there is overwritten on
> the next generation. Change the `.astro` component instead and regenerate.

Components ↔ cards:

| Component | Card |
| --- | --- |
| `Nav.astro` | `nav.html` |
| `LandingHero.astro` | `header.html` |
| `ImpactStats.astro` | `impact-stats.html` |
| `PillarCard.astro` | `pillar-card.html` |
| `Timeline.astro` | `timeline.html` |
| `ContactForm.astro` | `contact-form.html` |
| `FeedItemPodcast.astro` | `feed-item-podcast.html` |
| `FeedItemInstagram.astro` | `feed-item-instagram.html` |
| `MiniContact.astro` | `mini-contact.html` |

## Styling is owned by /design-sync

`design/styles/global.css` is the single, canonical stylesheet — imported by the live
site (via `LandingLayout.astro`) and linked by every design card. It is owned by
**Claude Design / `/design-sync`**: styling (tokens, gradients, spacing, `.feed-item`,
`.badge`, `.button`, `ls-*` animations, …) is edited there and pulled back into that one
file. **Never** regenerate or hand-edit `global.css` as part of the markup flow.

So the two flows are cleanly split:

- **Markup** → author in `src/components/*.astro` → `npm run build:design-cards` → cards.
- **Styling** → edit in Claude Design → `/design-sync` pull → `design/styles/global.css`.

## Commands

- `npm run dev` — dev server.
- `npm run build` — build the site (runs `build:design-cards` first via `prebuild`).
- `npm run build:design-cards` — regenerate `design/components/*.html` from components.
- `npm run check` — `astro check` (type/diagnostics).

## Conventions

- Bilingual text: Hebrew is the rendered default; the English string rides along in a
  `data-en` attribute (and `data-en-ph` for input placeholders). The toggle in
  `LandingLayout.astro` swaps them. Keep both when adding copy.
- Internal links/asset srcs written as string literals must be wrapped in
  `withBase()` (`src/lib/url.ts`) so they resolve under the GitHub Pages subpath.
