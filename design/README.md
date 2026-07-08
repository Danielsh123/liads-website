# Design library

Standalone HTML preview cards that mirror the site's real components, for use with
**Claude Design** (claude.ai/design) via the `/design-sync` skill and the `DesignSync` tool.

Each `.html` file is a self-contained preview "card". Its **first line** carries a
`<!-- @dsCard group="…" name="…" -->` marker — the Design pane reads that to build the
card index automatically (no manual registration needed).

## Layout

```
design/
  styles/global.css        # THE canonical stylesheet (imported by the live site)
  foundations/             # colors, typography, buttons
  components/              # sticky nav, landing hero, impact stats, pillar card,
                           # journey timeline, contact form, feed cards (instagram/podcast),
                           # mini-contact
```

Cards are dependency-free: images (avatar, photos, Spotify player) are rendered as
gradient/emoji placeholders so each card renders in isolation without external assets.

## Connecting to Claude Design (one-time)

The connection is an account-level authorization — it can't be set up from a file.

1. Open an **interactive** Claude Code terminal in this project.
2. Run `/design-login` and complete the browser auth (grants design-system access).
   - On claude.ai/code instead, use Claude Design's **"Send to Claude Code Web"**.
3. Then ask Claude to run `/design-sync` — it will list your design projects (or create one),
   diff this `design/` folder against it, and push the cards.

## How design edits reach the live site

`design/styles/global.css` is the **canonical, single source of truth** for the site's
styling. The live site imports it directly (`src/layouts/LandingLayout.astro`), and every
preview card in this folder uses it too. There is no separate copy — all shared tokens,
animations (`ls-*` keyframes, `.ls-reveal`), nav, buttons, feed cards, and footer live here.

So the flow is:

```
Claude Design (edit tokens/CSS)  →  /design-sync pull  →  design/styles/global.css  →  live site
```

Any change to colors, gradients, spacing, radius, buttons, cards, nav, typography, etc.
made in Claude Design lands in this one file and restyles the real site on the next pull.

### Component markup is generated — never hand-edited

The `.html` cards in `components/` are **generated** from the live Astro components in
`src/components/*.astro`, so they cannot structurally drift from the site. Markup is
authored once (in the component); the cards are build artifacts.

To regenerate after changing a component:

```
npm run build:design-cards
```

(This also runs automatically on `prebuild`/`npm run build` and in CI.) The generator
(`scripts/build-design-cards.mjs`) renders each component via Astro's Container API,
re-emits the exact `@dsCard` marker, and freezes interactive states (scroll-reveal,
count-up) into a static preview.

So the responsibilities split cleanly:

- **Markup** → author in `src/components/*.astro`, then `npm run build:design-cards`.
- **Styling** → edit in Claude Design, then `/design-sync` pull → `styles/global.css`.

Do **not** hand-edit the files in `components/` — the next generation overwrites them.
Editing `styles/global.css` (the shared stylesheet) still restyles the real site and all
cards automatically, exactly as before.
