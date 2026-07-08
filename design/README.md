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

### What does *not* auto-propagate

Component **markup** is split by design: the live site renders three Astro pages
(`src/pages/index.astro`, `instagram.astro`, `podcasts.astro`) sharing
`src/layouts/LandingLayout.astro`, while the design project holds static `.html` cards.
Both use the same CSS classes and tokens (`.feed-item`, `.badge`, `.button`, `.site-nav`,
`.ls-reveal`, `--gradient-*`, …), so **styling** changes flow automatically — but if you
change a component's **HTML structure** in Claude Design, that markup change still has to
be ported into the matching page/layout by hand (or ask Claude to do it). The cards and
the Astro markup are kept structurally in sync manually; the stylesheet is shared
automatically.
