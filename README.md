# aidan79225.github.io

Aidan's personal blog and small web tools, built with [Astro](https://astro.build/).
Live at **https://aidan79225.github.io**.

> Migrated from Jekyll to Astro; the blog is content-collection driven with a
> three-layer taxonomy (category / tags / series), plus a few standalone tools.

## Tech stack

- **Astro 6** — static site generation
- **React 19** via `@astrojs/react` — for interactive islands (when needed)
- **Tailwind CSS v4** (`@tailwindcss/vite`) + `@tailwindcss/typography` — dark theme
- **KaTeX** (`remark-math` + `rehype-katex`) for math; **Shiki** (built in) for code highlighting
- **utterances** for comments (GitHub issues)
- Deployed to **GitHub Pages** via **GitHub Actions**

## Requirements

- **Node.js ≥ 22.12** (required by Astro 6)
- npm

## Local development

```bash
npm install
npm run dev       # dev server at http://localhost:4321
npm run build     # build to ./dist
npm run preview   # preview the production build
```

## Project structure

```
src/
  content/
    blog/                 # blog posts (markdown)
    guides/               # evergreen guides (markdown)
  content.config.ts       # collection schemas (blog, guides)
  pages/                  # routes (see below)
  layouts/                # BaseLayout, PostLayout
  components/             # Nav, AuthorCard, Comments
  data/author.ts          # author info for the post author card
  styles/                 # global.css (theme tokens), tools.css
public/assets/images/     # static assets (avatar, …)
.github/workflows/        # deploy.yml (GitHub Pages)
.claude/skills/           # project skills (e.g. writing-blog-post)
```

## Content model

Two collections (`src/content.config.ts`):

- **`blog`** — `title`, `date`, `category` (`tech` | `food`), `tags?`, `series?`, `seriesOrder?`, `comments` (default `true`), `commentsIssue?`
- **`guides`** — `title`, `description`

Three-layer taxonomy:

| Layer | Role |
|---|---|
| **category** (`tech`/`food`) | coarse bucket, drives the top nav |
| **tags** | cross-cutting topics, browsable at `/tags/` and `/tags/<tag>/` |
| **series** | ordered series (e.g. the *成為 Tech Leader* reading notes) — renders a series box + prev/next in each post |

## Routes

- `/` — home (recent posts)
- `/blog/<slug>/` — a post
- `/tech/`, `/food/` — category listings
- `/tags/`, `/tags/<tag>/` — tag browse
- `/guides/`, `/guides/<slug>/` — guides (e.g. `/guides/odoo-usage-guide/`)
- `/about/`
- `/tools/` — landing for the interactive tools
- `/rss.xml`, `/404`

### Tools

- `/metronome/` — adjustable metronome
- `/rummikub-timer/` — board-game turn timer (with fullscreen)
- `/lottery/` — reproducible parking-space lottery (seeded RNG + Excel export)
- `/mbti96/` — 96-question MBTI quiz (standalone editorial design)

## Writing posts

New posts live in `src/content/blog/*.md`. The format and conventions are captured
in the project skill `.claude/skills/writing-blog-post/SKILL.md`. In short:

- A **summary clearer than the source** + a **concrete personal reflection**.
- Set `series` + `seriesOrder` for series posts; use **ASCII slugs** for `tags`.
- Inline `<svg>` / raw HTML must contain **no blank lines** (a blank line breaks it
  into a code block).
- Math: `$…$` / `$$…$$`. Verify with `npm run build`.

## Deployment

Pushing to `master` triggers `.github/workflows/deploy.yml` (`withastro/action`
on Node 22) → GitHub Pages. No manual step needed.
