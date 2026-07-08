# Liad's Website

A personal site built with [Astro](https://astro.build/).

## Running locally

```
npm install
npm run dev
```

Then open the local URL Astro prints (usually `http://localhost:4321/liads-website/`).

## Building

```
npm run build
```

Outputs static files to `dist/`. Run `npm run check` to type-check `.astro` files and content.

## Adding a new Instagram post or podcast episode

The easiest way is **Admin Studio** — see below. To edit by hand instead:

- Instagram posts live in `src/data/instagram-posts.json` — `id`, `title` (`{he,en}`), `date` (`{he,en}`), `link`, optional `img` (a `public/` path or an absolute URL), `caption` (`{he,en}`).
- Podcast episodes live in `src/data/podcast-episodes.json` — `id`, `title`, `ep`, `date`, `length` (all `{he,en}`), `caption` (`{he,en}`), optional `embedUrl` (a Spotify episode/show link — renders a real player; omit it for the decorative fallback player).

Both files are imported by `src/data/content.ts`, which is what `src/pages/{instagram,podcasts}.astro` render.

## Admin Studio

`/admin/studio/` (`src/pages/admin/studio.astro`) is a private, on-brand content tool for Liad
and her team to add Instagram posts and podcast episodes without touching code — no git/GitHub
jargon in the UI. It has:

- a decorative passcode gate (not real auth — the page is `noindex` but still publicly
  reachable by URL; don't link it from the public nav);
- a segmented Instagram / Podcast switch with bilingual (Hebrew + English) fields, a
  paste-and-detect Spotify link field, and drag-drop or URL-based thumbnails;
- a live preview of the real feed-card markup;
- a "My content" list of local drafts that can be edited, published, or removed.

**Publishing is real**: clicking Publish calls the GitHub REST API directly from the browser
(`src/lib/github.ts`) and commits straight to `main` — updating
`src/data/instagram-posts.json` / `podcast-episodes.json` (and uploading any new thumbnail to
`public/assets/feed/`). GitHub Pages then rebuilds via `.github/workflows/deploy.yml`, so a
publish goes live in a minute or two.

This needs a **GitHub personal access token** with write access to this repo (fine-grained,
scoped to `Danielsh123/liads-website`, Contents: Read & write is enough). Whoever publishes
pastes their own token once, via the "🔑 Publishing key" panel in the studio's top bar — it's
stored only in that browser's `localStorage` and is never sent anywhere but `api.github.com`.
Treat it like a password: anyone with both the token and the studio URL can push to `main`.

## Structure

- `src/pages/` — routes: `index`, `instagram`, `podcasts`, `admin/studio`
- `src/layouts/LandingLayout.astro` — shared page shell for the three public landing pages (nav, footer, lang toggle, reveal/count-up scripts)
- `src/components/` — the site's markup, authored once (see "Single source of truth" in `CLAUDE.md`)
- `src/data/content.ts` — page copy; imports `instagram-posts.json` / `podcast-episodes.json`
- `src/lib/` — small helpers: `url` (base-path prefixing), `nav`, `spotify` (embed URL parsing), `github` (Admin Studio's publish client)
- `src/scripts/adminStudio.ts` — Admin Studio's client-side logic
- `design/styles/global.css` — site styling, owned by Claude Design / `/design-sync` (see `CLAUDE.md`)
- `design/components/*.html` — generated preview cards, do not hand-edit (`npm run build:design-cards`)
- `public/assets/` — images and other static files served as-is (`public/assets/feed/` holds Admin-Studio-uploaded thumbnails)

## Deployment

Pushes to `main` are built and published to GitHub Pages by `.github/workflows/deploy.yml`.
The site lives at <https://danielsh123.github.io/liads-website/>. The `/liads-website/`
base path is configured in `astro.config.mjs`.
