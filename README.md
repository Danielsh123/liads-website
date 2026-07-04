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

## Adding a new "Work" entry

Each entry is one Markdown file in `src/content/work/`, named like `YYYY-MM-DD-slug.md`. Copy an existing entry and fill in the frontmatter — it's validated against the schema in `src/content.config.ts`:

- `title`, `date`, `embedType` — always required (`caption` optional)
- `embedType: podcast` — also set `embedUrl` (the embed link from Spotify/Apple Podcasts/etc.)
- `embedType: instagram` — also set `sourceUrl` (link to the post) and `thumbnail` (an image path under `public/assets/`)
- `embedType: photo` — also set `photo` (an image path under `public/assets/`)

The entry automatically appears on the Home page preview, the `/work/` page, and gets its own page at `/work/<slug>/`.

### Adding a new *kind* of entry

The embed types are defined in one place. To add e.g. a "youtube" type:

1. add `"youtube"` to `EMBED_TYPES` in `src/lib/embed-types.ts`
2. add its fields to the schema in `src/content.config.ts`
3. create `src/components/embeds/YoutubeEmbed.astro`
4. register it in `src/components/embeds/registry.ts`
5. (optional) add a `.feed-item--youtube` gradient in `src/styles/global.css`

## Structure

- `src/pages/` — routes (`index`, `about`, `contact`, `work/`, and `work/[...slug]` for entry pages)
- `src/layouts/` — `BaseLayout` (page shell) and `PageLayout` (simple content pages)
- `src/components/` — reusable components; `embeds/` holds the per-type embed components + registry
- `src/content/work/` — Work/Feed entries (a typed content collection)
- `src/content.config.ts` — content collection schema
- `src/config/site.ts` — site-wide config (title, nav, email)
- `src/lib/` — small helpers (`url`, `date`, `embed-types`)
- `src/styles/global.css` — site styling (colors are CSS variables at the top)
- `public/assets/` — images and other static files served as-is

## Deployment

Pushes to `main` are built and published to GitHub Pages by `.github/workflows/deploy.yml`.
The site lives at <https://danielsh123.github.io/liads-website/>. The `/liads-website/`
base path is configured in `astro.config.mjs`.
