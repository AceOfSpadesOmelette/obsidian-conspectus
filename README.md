# Conspectus

A live table of contents inside the note. Insert a `conspectus` block and it updates when headings change. The same block can appear in a Pagina PDF.

## Use

Open the command palette and run **Insert table of contents**, or add this block:

````markdown
```conspectus
title: Table of Contents
```
````

The table of contents is an unnumbered nested list of links to headings. Its title is not numbered by Ordinal Headings.

### Block options

| Key | Example | Meaning |
| --- | --- | --- |
| `title` | `title: Contents` | Heading above the list. Leave it empty for no title. |
| `level` | `level: 3` | Deepest heading this block includes |
| `export` | `export: false` | Hide this block in a Pagina PDF. It stays visible in the note. |
| `break-before` | `break-before: true` | Start a new PDF page before the table of contents |
| `break-after` | `break-after: true` | Start a new PDF page after the table of contents |

## Settings

Open **Settings → Conspectus**.

| Setting | What it does |
| --- | --- |
| Max heading level | Default deepest heading for new blocks |
| Default title | Title used when a block does not set one |
| Show TOC in PDF export | Include the table of contents in Pagina PDFs |
| Page break before TOC (PDF) | Default page break before the block |
| Page break after TOC (PDF) | Default page break after the block |

Under **Backup**, **Export settings** and **Import settings** save or restore that configuration as `conspectus-settings.json`.
