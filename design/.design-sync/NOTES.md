# Sync notes

This is a **hand-authored, static-HTML design system** — not a buildable React/Storybook
repo. There is no `package.json`, no bundler, no component source to compile. Each file
under `components/` and `foundations/` is a self-contained, dependency-free `.html`
preview card with a `<!-- @dsCard group="…" name="…" -->` marker on its first line, and
`styles/global.css` is the single shared stylesheet (same file the live Astro site
imports).

Re-syncing this repo should stay simple: diff the local `design/` files against the
project's `list_files`, upload anything changed under `components/**`, `foundations/**`,
`styles/**`, `README.md`, and delete anything remote that's gone locally. Do **not** try
to run the converter's esbuild/Storybook pipeline here — there is nothing for it to
build, and no `_ds_bundle.js`/`_vendor`/`tokens`/`fonts` output applies to this shape.

No `_ds_sync.json` anchor is produced for this shape (no meaningful source hashes to
compute for a converter that never runs) — every re-sync re-diffs from scratch, which is
fine at this size.
