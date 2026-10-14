# Conspectus

Live in-note table of contents for Obsidian. Insert a `conspectus` code block; the TOC updates when headings change and appears in Pagina PDF exports.

## Install

Copy `main.js`, `manifest.json`, and `styles.css` into:

`<vault>/.obsidian/plugins/conspectus/`

Enable **Conspectus** in Community plugins.

## Use

Command palette → **Conspectus: Insert table of contents**, or add:

````markdown
```conspectus
title: Table of Contents
```
````

### Fence options

| Key | Example | Meaning |
| --- | --- | --- |
| `title` | `title: Contents` | H1 above the TOC (empty = no title) |
| `level` | `level: 3` | Max heading level for this block |
| `export` | `export: false` | Hide this TOC in Pagina PDF (still visible in-note) |
| `break-before` | `break-before: true` | New page before TOC in Pagina PDF |
| `break-after` | `break-after: true` | New page after TOC in Pagina PDF |

Defaults for title, max level, export visibility, and page breaks are in **Settings → Conspectus**.

The TOC is an unnumbered nested list with links to headings. The TOC title is not numbered by Ordinal Headings.



## Develop

```bash
npm install
npm run build
npm test
```

CI runs build + Jest on push/PR. Tag a version matching `manifest.json` (for example `1.0.0`) to create a draft GitHub release with `main.js`, `manifest.json`, and `styles.css` when present.
