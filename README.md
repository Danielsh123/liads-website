# Liad's Website

A personal site built with [Eleventy](https://www.11ty.dev/).

## Running locally

```
npm install
npm run dev
```

Then open the local URL Eleventy prints (usually `http://localhost:8080`).

## Building

```
npm run build
```

Outputs static files to `_site/`.

## Adding a new "Work" entry

Each entry is one Markdown file in `src/work/`, named like `entry-YYYY-MM-DD-slug.md`. Copy an existing entry and fill in the frontmatter:

- `title`, `date`, `caption` — always required
- `embedType: podcast` — also set `embedUrl` (the embed link from Spotify/Apple Podcasts/etc.)
- `embedType: instagram` — also set `sourceUrl` (link to the post) and `thumbnail` (an image path under `src/assets/`)

The entry automatically appears on the Home page preview and the `/work/` page, and gets its own page too.

## Structure

- `src/index.njk` — Home page
- `src/about.md`, `src/contact.md` — simple content pages
- `src/work/` — Work/Feed entries and listing page
- `src/_includes/` — layouts and reusable partials
- `src/styles.css` — site styling (colors are CSS variables at the top of the file)

## Deployment

Not set up yet — this currently runs locally only. When ready to publish, the `_site/` build output can be deployed via GitHub Pages (Actions workflow) or any static host.
