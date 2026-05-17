# Foundation Implementation Plan (Plan 1 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold an Astro 5 + Tailwind 4 site on the Cloudflare Workers runtime with the Swiss/Statement design system in place, and ship Privacy + Terms pages to `dev.theagentsees.com` as proof the system works end-to-end.

**Architecture:** Static-first Astro project at the repo root. Legacy HTML moves to `archive/legacy/`. New design tokens defined as CSS custom properties in `src/styles/global.css` and surfaced to Tailwind via the `@theme` directive (Tailwind 4 syntax). Layout primitives (TopBar, MetaStrip, Nav, Footer) and UI primitives (Section, Rule, Mark, Button) live under `src/components/`. Icons are `.astro` components in `src/components/icons/` — inline SVG, no emoji, no icon font. Privacy and Terms pages migrate content from the existing HTML and validate the design system end-to-end. The new build deploys to a `dev.theagentsees.com` Worker route via `@astrojs/cloudflare`, leaving production untouched until Plan 5.

**Tech Stack:** Astro 5, Tailwind 4 (with `@theme` directive), `@astrojs/cloudflare` adapter, Cloudflare Workers, Wrangler 4, TypeScript strict, pnpm, Vitest (set up for later plans), self-hosted Inter + JetBrains Mono fonts.

---

## File Structure

**Created in this plan:**

```
the-agent-sees/
├─ archive/
│  └─ legacy/                              # old HTML moved here
├─ public/
│  ├─ fonts/
│  │  ├─ Inter-Regular.woff2
│  │  ├─ Inter-Medium.woff2
│  │  ├─ Inter-Bold.woff2
│  │  ├─ InterDisplay-ExtraBold.woff2
│  │  └─ JetBrainsMono-Regular.woff2
│  ├─ favicon.svg
│  └─ robots.txt
├─ src/
│  ├─ pages/
│  │  ├─ privacy.astro
│  │  └─ terms.astro
│  ├─ components/
│  │  ├─ layout/
│  │  │  ├─ Base.astro
│  │  │  ├─ TopBar.astro
│  │  │  ├─ MetaStrip.astro
│  │  │  ├─ Nav.astro
│  │  │  └─ Footer.astro
│  │  ├─ ui/
│  │  │  ├─ Section.astro
│  │  │  ├─ Rule.astro
│  │  │  ├─ Mark.astro
│  │  │  └─ Button.astro
│  │  └─ icons/
│  │     ├─ Arrow.astro
│  │     ├─ Plus.astro
│  │     └─ Spark.astro
│  └─ styles/
│     └─ global.css
├─ astro.config.mjs
├─ tailwind.config.ts                       # used for TS types only; Tailwind 4 reads @theme
├─ tsconfig.json
├─ wrangler.jsonc                           # updated for Astro Worker
├─ package.json                             # rewritten
└─ vitest.config.ts                         # scaffolded for later plans
```

**Modified in this plan:**
- `.gitignore` — add `dist/`, `node_modules/`, `.astro/`
- `wrangler.jsonc` — switch from static-only to Worker (Astro adapter output)

**Archived (moved, not deleted):**
- `*.html` (all 11 HTML files) → `archive/legacy/`
- `styles.css` → `archive/legacy/`

---

## Task 1: Create `rebuild` branch and archive legacy HTML

**Files:**
- Move (via git): `*.html` → `archive/legacy/`
- Move (via git): `styles.css` → `archive/legacy/`
- Create: `archive/legacy/README.md`

- [ ] **Step 1: Verify clean working tree**

Run: `git status`
Expected: `nothing to commit, working tree clean` (on branch `main`)

- [ ] **Step 2: Create and switch to `rebuild` branch**

Run: `git checkout -b rebuild`
Expected: `Switched to a new branch 'rebuild'`

- [ ] **Step 3: Create archive directory**

Run: `mkdir -p archive/legacy`

- [ ] **Step 4: Move legacy HTML and CSS into archive**

Run:
```bash
git mv index.html automation.html services.html work.html \
  case-study-drift.html case-study-elevate.html case-study-luminate.html \
  case-study-meridian.html case-study-stride.html \
  privacy.html terms.html \
  styles.css \
  archive/legacy/
```
Expected: 12 files moved, `git status` shows them as renames.

- [ ] **Step 5: Write archive README explaining the move**

Create `archive/legacy/README.md`:

```markdown
# Legacy site (pre-2026 rebuild)

These files are the previous static HTML site, archived during the Astro
rebuild. They are kept for content reference (copy, structure) until cutover
is complete. Will be deleted in Plan 5, Phase 5.

Do not edit these files — they no longer ship.
```

- [ ] **Step 6: Commit**

```bash
git add archive/
git commit -m "chore: archive legacy HTML site ahead of Astro rebuild"
```

---

## Task 2: Scaffold Astro project with Cloudflare adapter

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `astro.config.mjs`
- Modify: `.gitignore`

- [ ] **Step 1: Verify Node and pnpm available**

Run: `node --version && pnpm --version`
Expected: Node ≥ `20.0.0`, pnpm ≥ `9.0.0`. If pnpm missing: `npm install -g pnpm`.

- [ ] **Step 2: Write `package.json`**

Create `package.json`:

```json
{
  "name": "the-agent-sees",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "wrangler dev",
    "deploy": "astro build && wrangler deploy",
    "check": "astro check && tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@astrojs/cloudflare": "^12.0.0",
    "@astrojs/preact": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "astro": "^5.0.0",
    "preact": "^10.24.0",
    "tailwindcss": "^4.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250101.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.0.0",
    "wrangler": "^4.0.0"
  },
  "packageManager": "pnpm@9.12.0"
}
```

Versions intentionally use caret ranges so `pnpm install` picks the latest patch within each major. If the major bumps and breaks (e.g., Astro 6), pin to the last working version and surface the upgrade as its own follow-up plan.

- [ ] **Step 3: Install dependencies**

Run: `pnpm install`
Expected: dependencies resolved, `pnpm-lock.yaml` created, no errors. Warnings about peer deps are acceptable.

- [ ] **Step 4: Write `tsconfig.json`**

Create `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "jsx": "preserve",
    "jsxImportSource": "preact",
    "types": ["@cloudflare/workers-types/2023-07-01", "astro/client"]
  },
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "archive"]
}
```

- [ ] **Step 5: (Skipped — Cloudflare types already declared in `package.json` Step 2)**

- [ ] **Step 6: Write `astro.config.mjs`**

Create `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: "compile",
  }),
  integrations: [preact({ compat: false })],
  vite: {
    plugins: [tailwindcss()],
  },
  site: "https://theagentsees.com",
});
```

We use `output: "server"` so the Cloudflare adapter always emits a Worker entry (`dist/_worker.js/index.js`) — this gives `wrangler.jsonc` a stable `main` path even before any API routes exist. Static pages opt in to build-time prerendering with `export const prerender = true` at the top of each `.astro` file. API routes (Plans 3 + 4) leave it unset, so they stay SSR.

- [ ] **Step 7: Update `.gitignore`**

Open `.gitignore` and append:

```
# build artifacts
dist/
.astro/
node_modules/

# editor
.DS_Store
.vscode/
.idea/
```

- [ ] **Step 8: Run a no-op build to confirm Astro initializes**

Create a placeholder `src/pages/index.astro` (deleted later in this task):

```astro
---
---
<p>scaffold ok</p>
```

Then run: `pnpm build`
Expected: build succeeds, emits `dist/` directory. If it fails on missing pages, the placeholder is necessary.

- [ ] **Step 9: Delete placeholder page**

Run: `rm src/pages/index.astro`

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json astro.config.mjs .gitignore
git commit -m "feat: scaffold Astro 5 + Cloudflare adapter + Preact + Tailwind 4"
```

---

## Task 3: Self-host Inter + Inter Display + JetBrains Mono

**Files:**
- Create: `public/fonts/Inter-Regular.woff2`
- Create: `public/fonts/Inter-Medium.woff2`
- Create: `public/fonts/Inter-Bold.woff2`
- Create: `public/fonts/InterDisplay-ExtraBold.woff2`
- Create: `public/fonts/JetBrainsMono-Regular.woff2`
- Create: `src/styles/fonts.css`

- [ ] **Step 1: Create fonts directory**

Run: `mkdir -p public/fonts`

- [ ] **Step 2: Download Inter v4 woff2 subset (Latin)**

Run:
```bash
INTER_BASE="https://rsms.me/inter/font-files"
curl -sSL "${INTER_BASE}/Inter-Regular.woff2" -o public/fonts/Inter-Regular.woff2
curl -sSL "${INTER_BASE}/Inter-Medium.woff2" -o public/fonts/Inter-Medium.woff2
curl -sSL "${INTER_BASE}/Inter-Bold.woff2" -o public/fonts/Inter-Bold.woff2
curl -sSL "${INTER_BASE}/InterDisplay-ExtraBold.woff2" -o public/fonts/InterDisplay-ExtraBold.woff2
```
Expected: 4 woff2 files in `public/fonts/`, each ~ 40–100 KB.

If `rsms.me` URLs change, fallback: download `Inter-4.x.zip` from `https://github.com/rsms/inter/releases/latest`, extract `extras/ttf/*.ttf` for the four faces above, convert to woff2 via `https://cloudconvert.com/ttf-to-woff2` or `pnpm dlx ttf2woff2 <file>`.

- [ ] **Step 3: Download JetBrains Mono Regular woff2**

Run:
```bash
JBM_BASE="https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/fonts/webfonts"
curl -sSL "${JBM_BASE}/JetBrainsMono-Regular.woff2" -o public/fonts/JetBrainsMono-Regular.woff2
```
Expected: 1 woff2 file, ~ 30 KB.

- [ ] **Step 4: Verify font files exist and are non-empty**

Run: `ls -la public/fonts/`
Expected: 5 woff2 files, none under 10 KB (under 10 KB usually means failed download).

- [ ] **Step 5: Write `@font-face` rules**

Create `src/styles/fonts.css`:

```css
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/Inter-Regular.woff2") format("woff2");
}

@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/fonts/Inter-Medium.woff2") format("woff2");
}

@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("/fonts/Inter-Bold.woff2") format("woff2");
}

@font-face {
  font-family: "Inter Display";
  font-style: normal;
  font-weight: 800;
  font-display: swap;
  src: url("/fonts/InterDisplay-ExtraBold.woff2") format("woff2");
}

@font-face {
  font-family: "JetBrains Mono";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/JetBrainsMono-Regular.woff2") format("woff2");
}
```

- [ ] **Step 6: Commit**

```bash
git add public/fonts/ src/styles/fonts.css
git commit -m "feat: self-host Inter + Inter Display + JetBrains Mono woff2"
```

---

## Task 4: Define design tokens in global CSS

**Files:**
- Create: `src/styles/global.css`

- [ ] **Step 1: Write `global.css` with tokens and `@theme` directive**

Create `src/styles/global.css`:

```css
@import "tailwindcss";
@import "./fonts.css";

@theme {
  --color-ink: #0A0A0A;
  --color-paper: #FFFFFF;
  --color-paper-2: #F5F4F0;
  --color-mute: #5A5A5A;
  --color-hairline: rgba(0, 0, 0, 0.1);
  --color-highlight: #FFE600;

  --font-display: "Inter Display", "Inter", system-ui, sans-serif;
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --tracking-display: -0.04em;
  --tracking-label: 0.14em;

  --text-xs: 0.75rem;
  --text-sm: 0.81rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
  --text-3xl: 3rem;
  --text-4xl: 4.5rem;
  --text-5xl: 6rem;

  --spacing-gutter-sm: 1.5rem;
  --spacing-gutter-md: 3rem;
  --spacing-gutter-lg: 6rem;
}

@layer base {
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html {
    -webkit-text-size-adjust: 100%;
    font-family: var(--font-sans);
    color: var(--color-ink);
    background: var(--color-paper);
  }

  body {
    margin: 0;
    font-size: var(--text-base);
    line-height: 1.55;
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 800;
    letter-spacing: var(--tracking-display);
    line-height: 1.02;
  }

  p { margin: 0; }
  a { color: inherit; text-decoration: none; }
  button { font: inherit; cursor: pointer; }

  :focus-visible {
    outline: 2px solid var(--color-ink);
    outline-offset: 2px;
  }

  .label {
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    font-weight: 500;
    color: var(--color-mute);
  }

  .mono {
    font-family: var(--font-mono);
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

- [ ] **Step 2: Run typecheck and build to confirm CSS imports resolve**

Run: `pnpm build`
Expected: build fails with "no pages" — that's fine, CSS itself is not built standalone. Confirm there's no Tailwind import error in the output.

If Tailwind reports an error parsing `@theme`, verify `@tailwindcss/vite` is installed and on version `^4.0.0`.

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: design tokens via Tailwind 4 @theme directive"
```

---

## Task 5: Build icon set (Arrow, Plus, Spark)

**Files:**
- Create: `src/components/icons/Arrow.astro`
- Create: `src/components/icons/Plus.astro`
- Create: `src/components/icons/Spark.astro`

- [ ] **Step 1: Write `Arrow.astro`**

Create `src/components/icons/Arrow.astro`:

```astro
---
interface Props {
  size?: number;
  class?: string;
  /** "right" | "down" | "up-right" — defaults to right */
  direction?: "right" | "down" | "up-right";
}
const { size = 16, class: className = "", direction = "right" } = Astro.props;
const rotation = direction === "down" ? 90 : direction === "up-right" ? -45 : 0;
---
<svg
  width={size}
  height={size}
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  style={`transform: rotate(${rotation}deg);`}
  aria-hidden="true"
>
  <line x1="3" y1="8" x2="13" y2="8" />
  <polyline points="9 4 13 8 9 12" />
</svg>
```

- [ ] **Step 2: Write `Plus.astro`**

Create `src/components/icons/Plus.astro`:

```astro
---
interface Props {
  size?: number;
  class?: string;
}
const { size = 16, class: className = "" } = Astro.props;
---
<svg
  width={size}
  height={size}
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  aria-hidden="true"
>
  <line x1="8" y1="3" x2="8" y2="13" />
  <line x1="3" y1="8" x2="13" y2="8" />
</svg>
```

- [ ] **Step 3: Write `Spark.astro`**

Create `src/components/icons/Spark.astro`:

```astro
---
interface Props {
  size?: number;
  class?: string;
}
const { size = 16, class: className = "" } = Astro.props;
---
<svg
  width={size}
  height={size}
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  aria-hidden="true"
>
  <path d="M8 1.5 L9.2 6.8 L14.5 8 L9.2 9.2 L8 14.5 L6.8 9.2 L1.5 8 L6.8 6.8 Z" />
</svg>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/icons/
git commit -m "feat: SVG icon components (Arrow, Plus, Spark)"
```

---

## Task 6: Build UI primitives (Section, Rule, Mark, Button)

**Files:**
- Create: `src/components/ui/Section.astro`
- Create: `src/components/ui/Rule.astro`
- Create: `src/components/ui/Mark.astro`
- Create: `src/components/ui/Button.astro`

- [ ] **Step 1: Write `Section.astro`**

Create `src/components/ui/Section.astro`:

```astro
---
interface Props {
  label?: string;
  id?: string;
  /** "default" (white) | "alt" (paper-2) */
  tone?: "default" | "alt";
}
const { label, id, tone = "default" } = Astro.props;
const bg = tone === "alt" ? "var(--color-paper-2)" : "var(--color-paper)";
---
<section
  id={id}
  class="px-[var(--spacing-gutter-sm)] md:px-[var(--spacing-gutter-md)] lg:px-[var(--spacing-gutter-lg)] py-[3rem] md:py-[5rem] lg:py-[7rem]"
  style={`background: ${bg};`}
>
  {label && <p class="label mb-6">{label}</p>}
  <slot />
</section>
```

- [ ] **Step 2: Write `Rule.astro`**

Create `src/components/ui/Rule.astro`:

```astro
---
interface Props {
  /** "ink" (full black) | "hairline" (10% black) — defaults to "ink" */
  weight?: "ink" | "hairline";
}
const { weight = "ink" } = Astro.props;
const color = weight === "ink" ? "var(--color-ink)" : "var(--color-hairline)";
---
<hr style={`border: 0; border-top: 1px solid ${color}; margin: 0;`} />
```

- [ ] **Step 3: Write `Mark.astro`**

Create `src/components/ui/Mark.astro`:

The single-use yellow highlight accent. Used at most once per page.

```astro
---
---
<span
  style="background: var(--color-highlight); padding: 0 0.12em; box-decoration-break: clone; -webkit-box-decoration-break: clone;"
><slot /></span>
```

- [ ] **Step 4: Write `Button.astro`**

Create `src/components/ui/Button.astro`:

```astro
---
import Arrow from "../icons/Arrow.astro";

interface Props {
  href: string;
  /** "primary" (black-on-white) | "ghost" (white-on-black border) — defaults to primary */
  variant?: "primary" | "ghost";
  /** external link opens in new tab */
  external?: boolean;
  showArrow?: boolean;
}
const { href, variant = "primary", external = false, showArrow = true } = Astro.props;
const target = external ? "_blank" : undefined;
const rel = external ? "noopener noreferrer" : undefined;
const baseClass = "inline-flex items-center gap-2 text-sm font-medium px-5 py-3 transition-colors";
const variantClass = variant === "primary"
  ? "bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-mute)]"
  : "bg-transparent text-[var(--color-ink)] border border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)]";
---
<a href={href} target={target} rel={rel} class={`${baseClass} ${variantClass}`}>
  <slot />
  {showArrow && <Arrow size={14} />}
</a>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/
git commit -m "feat: UI primitives (Section, Rule, Mark, Button)"
```

---

## Task 7: Build layout components (TopBar, MetaStrip, Nav, Footer)

**Files:**
- Create: `src/components/layout/TopBar.astro`
- Create: `src/components/layout/MetaStrip.astro`
- Create: `src/components/layout/Nav.astro`
- Create: `src/components/layout/Footer.astro`

- [ ] **Step 1: Write `TopBar.astro`**

Create `src/components/layout/TopBar.astro`:

The 6px solid black bar at the top edge of every page — the Swiss signature.

```astro
---
---
<div style="height: 6px; background: var(--color-ink);" aria-hidden="true"></div>
```

- [ ] **Step 2: Write `MetaStrip.astro`**

Create `src/components/layout/MetaStrip.astro`:

Three-cell meta strip under the TopBar.

```astro
---
interface Props {
  middle?: string;
  right?: string;
}
const { middle = "STUDIO · Nº01", right = "2026 →" } = Astro.props;
---
<div
  class="px-[var(--spacing-gutter-sm)] md:px-[var(--spacing-gutter-md)] lg:px-[var(--spacing-gutter-lg)]"
  style="display: grid; grid-template-columns: 1fr 1fr 1fr; padding-top: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--color-hairline); font-family: var(--font-sans); font-size: var(--text-xs); letter-spacing: var(--tracking-label); text-transform: uppercase; font-weight: 500; color: var(--color-ink);"
>
  <span>THE AGENT SEES</span>
  <span style="text-align: center; color: var(--color-mute);">{middle}</span>
  <span style="text-align: right; color: var(--color-mute);">{right}</span>
</div>
```

- [ ] **Step 3: Write `Nav.astro`**

Create `src/components/layout/Nav.astro`:

Persistent site nav. Pure HTML/CSS — no JS framework. Mobile uses a `<details>` element so there's no client-side JS needed for the menu.

```astro
---
import Arrow from "../icons/Arrow.astro";
const links = [
  { href: "/work", label: "Work" },
  { href: "/studio", label: "Studio" },
  { href: "/contact", label: "Contact" },
];
const path = Astro.url.pathname;
---
<nav
  aria-label="Main"
  class="px-[var(--spacing-gutter-sm)] md:px-[var(--spacing-gutter-md)] lg:px-[var(--spacing-gutter-lg)]"
  style="display: flex; align-items: center; justify-content: space-between; padding-top: 1.25rem; padding-bottom: 1.25rem;"
>
  <a href="/" style="font-family: var(--font-display); font-size: var(--text-base); letter-spacing: -0.01em; font-weight: 800;">
    THE AGENT SEES
  </a>

  <!-- desktop nav -->
  <ul class="hidden md:flex" style="list-style: none; margin: 0; padding: 0; gap: 2rem; align-items: center;">
    {links.map((l) => (
      <li>
        <a
          href={l.href}
          style={`font-size: var(--text-sm); font-weight: 500; ${path === l.href ? "text-decoration: underline; text-underline-offset: 4px;" : ""}`}
        >
          {l.label}
        </a>
      </li>
    ))}
    <li>
      <a
        href="/contact"
        style="display: inline-flex; align-items: center; gap: 0.5rem; background: var(--color-ink); color: var(--color-paper); padding: 0.6rem 1rem; font-size: var(--text-sm); font-weight: 500;"
      >
        Start a project
        <Arrow size={14} />
      </a>
    </li>
  </ul>

  <!-- mobile nav (no JS — uses <details>) -->
  <details class="md:hidden" style="position: relative;">
    <summary
      aria-label="Open menu"
      style="list-style: none; cursor: pointer; padding: 0.5rem;"
    >
      <span style="display: block; width: 24px; height: 2px; background: var(--color-ink); margin: 3px 0;"></span>
      <span style="display: block; width: 24px; height: 2px; background: var(--color-ink); margin: 3px 0;"></span>
      <span style="display: block; width: 24px; height: 2px; background: var(--color-ink); margin: 3px 0;"></span>
    </summary>
    <ul style="position: absolute; right: 0; top: 100%; background: var(--color-paper); border: 1px solid var(--color-ink); list-style: none; margin: 0; padding: 1rem 1.5rem; min-width: 12rem; display: flex; flex-direction: column; gap: 0.75rem; z-index: 10;">
      {links.map((l) => (
        <li><a href={l.href} style="font-size: var(--text-sm); font-weight: 500;">{l.label}</a></li>
      ))}
    </ul>
  </details>
</nav>
```

- [ ] **Step 4: Write `Footer.astro`**

Create `src/components/layout/Footer.astro`:

```astro
---
import Rule from "../ui/Rule.astro";
const year = new Date().getFullYear();
---
<footer
  class="px-[var(--spacing-gutter-sm)] md:px-[var(--spacing-gutter-md)] lg:px-[var(--spacing-gutter-lg)]"
  style="padding-top: 3rem; padding-bottom: 3rem;"
>
  <Rule weight="hairline" />
  <div style="display: grid; grid-template-columns: 1fr; gap: 2rem; margin-top: 2rem;" class="md:grid-cols-3">
    <div>
      <p style="font-family: var(--font-display); font-size: var(--text-lg); font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.5rem;">THE AGENT SEES</p>
      <p style="font-size: var(--text-sm); color: var(--color-mute); max-width: 22rem;">AI-powered MVPs, web apps, and the agents that run inside them. New studio. Built on conviction.</p>
    </div>
    <nav aria-label="Footer">
      <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; font-size: var(--text-sm);">
        <li><a href="/work">Work</a></li>
        <li><a href="/studio">Studio</a></li>
        <li><a href="/contact">Contact</a></li>
        <li><a href="/privacy">Privacy</a></li>
        <li><a href="/terms">Terms</a></li>
      </ul>
    </nav>
    <div style="font-size: var(--text-sm); color: var(--color-mute);">
      <p>Remote · Worldwide</p>
      <p><a href="mailto:hello@theagentsees.com">hello@theagentsees.com</a></p>
      <p style="margin-top: 1rem;">© {year} The Agent Sees</p>
    </div>
  </div>
</footer>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/
git commit -m "feat: layout components (TopBar, MetaStrip, Nav, Footer)"
```

---

## Task 8: Build `Base.astro` layout

**Files:**
- Create: `src/components/layout/Base.astro`

- [ ] **Step 1: Write `Base.astro`**

Create `src/components/layout/Base.astro`:

The root layout wrapping every page. Owns `<head>`, fonts, meta tags, and the TopBar / Nav / Footer chrome.

```astro
---
import "../../styles/global.css";
import TopBar from "./TopBar.astro";
import MetaStrip from "./MetaStrip.astro";
import Nav from "./Nav.astro";
import Footer from "./Footer.astro";

interface Props {
  title: string;
  description?: string;
  /** override the middle meta strip text */
  metaMiddle?: string;
  /** override the right meta strip text */
  metaRight?: string;
}

const {
  title,
  description = "We build AI-powered MVPs, web apps, and the agents that run inside them.",
  metaMiddle,
  metaRight,
} = Astro.props;

const canonical = new URL(Astro.url.pathname, Astro.site ?? "https://theagentsees.com").toString();
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonical} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />

    <title>{title}</title>

    <!-- preload critical fonts -->
    <link rel="preload" href="/fonts/InterDisplay-ExtraBold.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin />
  </head>
  <body>
    <TopBar />
    <MetaStrip middle={metaMiddle} right={metaRight} />
    <Nav />
    <main>
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Base.astro
git commit -m "feat: Base layout wraps every page with chrome"
```

---

## Task 9: Add favicon and robots.txt

**Files:**
- Create: `public/favicon.svg`
- Create: `public/robots.txt`

- [ ] **Step 1: Write `favicon.svg`**

Create `public/favicon.svg`. A solid black square with a white "TAS" wordmark — simple, no emoji, no decoration.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#0A0A0A"/>
  <text x="32" y="42" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="22" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="-1">TAS</text>
</svg>
```

- [ ] **Step 2: Write `robots.txt`**

Create `public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://theagentsees.com/sitemap.xml
```

- [ ] **Step 3: Commit**

```bash
git add public/favicon.svg public/robots.txt
git commit -m "feat: favicon and robots.txt"
```

---

## Task 10: Create `/privacy` page

**Files:**
- Read: `archive/legacy/privacy.html` (for content reference only)
- Create: `src/pages/privacy.astro`

- [ ] **Step 1: Read legacy privacy content**

Run: `cat archive/legacy/privacy.html | head -200`
Use the existing copy as the starting point — preserve the substance, restyle and revise for the new IA (remove references to dropped pages and Microsoft Clarity / formsubmit.co, add references to Cloudflare Web Analytics and Resend).

- [ ] **Step 2: Write `privacy.astro`**

Create `src/pages/privacy.astro`:

```astro
---
export const prerender = true;

import Base from "../components/layout/Base.astro";
import Section from "../components/ui/Section.astro";
import Rule from "../components/ui/Rule.astro";

const updated = "2026-05-17";
---
<Base title="Privacy — The Agent Sees" metaMiddle="LEGAL · PRIVACY" metaRight={`UPDATED ${updated}`}>
  <Section label="Privacy Policy">
    <h1 style="font-size: var(--text-3xl); margin-bottom: 1.5rem; max-width: 28rem;">How we handle your data.</h1>
    <p style="font-size: var(--text-base); color: var(--color-mute); max-width: 38rem; margin-bottom: 2rem;">
      Plain English. Last updated {updated}.
    </p>
    <Rule weight="hairline" />
  </Section>

  <Section>
    <article style="max-width: 42rem; display: flex; flex-direction: column; gap: 1.5rem; font-size: var(--text-base); line-height: 1.65;">
      <h2 style="font-size: var(--text-xl); margin-top: 1rem;">What we collect</h2>
      <p>When you submit our contact form, we collect: your name, email, optional company, your message, and the timeline/budget bands you select. We also store a salted hash of your IP and your user agent for abuse detection — never the raw IP.</p>

      <h2 style="font-size: var(--text-xl); margin-top: 1rem;">Why we collect it</h2>
      <p>So we can reply to your enquiry. That's the only purpose.</p>

      <h2 style="font-size: var(--text-xl); margin-top: 1rem;">Where it goes</h2>
      <p>Form submissions are stored in our Cloudflare D1 database and emailed to <a href="mailto:hello@theagentsees.com" style="text-decoration: underline;">hello@theagentsees.com</a> via Resend. Both services are sub-processors. Submissions are purged after 12 months.</p>

      <h2 style="font-size: var(--text-xl); margin-top: 1rem;">The live demo on /work</h2>
      <p>The Lead Qualifier demo runs on Cloudflare Workers AI. The text you submit is processed by the model and not stored. Cloudflare may retain anonymised inference logs per their privacy policy.</p>

      <h2 style="font-size: var(--text-xl); margin-top: 1rem;">Analytics</h2>
      <p>We use Cloudflare Web Analytics, which is cookieless and does not track you across sites. No personally identifying information is collected.</p>

      <h2 style="font-size: var(--text-xl); margin-top: 1rem;">Your rights</h2>
      <p>Email <a href="mailto:hello@theagentsees.com" style="text-decoration: underline;">hello@theagentsees.com</a> to access, correct, or delete any data we hold about you. We will respond within 30 days.</p>

      <h2 style="font-size: var(--text-xl); margin-top: 1rem;">Changes</h2>
      <p>If this policy changes materially, the "updated" date at the top of the page will change and the diff will be visible in our public repo.</p>
    </article>
  </Section>
</Base>
```

- [ ] **Step 3: Run dev server and visually verify**

Run: `pnpm dev` (in a background terminal)
Open: `http://localhost:4321/privacy`
Expected: page renders with TopBar, MetaStrip showing "LEGAL · PRIVACY", Nav with TAS logo, content readable in Inter, footer at bottom. No console errors. Stop dev server (`Ctrl+C`) when done.

- [ ] **Step 4: Run typecheck**

Run: `pnpm check`
Expected: no errors. If errors mention missing types for Astro imports, run `pnpm dlx astro sync` first.

- [ ] **Step 5: Commit**

```bash
git add src/pages/privacy.astro
git commit -m "feat: /privacy page on new design system"
```

---

## Task 11: Create `/terms` page

**Files:**
- Read: `archive/legacy/terms.html`
- Create: `src/pages/terms.astro`

- [ ] **Step 1: Read legacy terms content**

Run: `cat archive/legacy/terms.html | head -200`
Same as Privacy — preserve substance, drop references to fictional content and dropped pages.

- [ ] **Step 2: Write `terms.astro`**

Create `src/pages/terms.astro`:

```astro
---
export const prerender = true;

import Base from "../components/layout/Base.astro";
import Section from "../components/ui/Section.astro";
import Rule from "../components/ui/Rule.astro";

const updated = "2026-05-17";
---
<Base title="Terms — The Agent Sees" metaMiddle="LEGAL · TERMS" metaRight={`UPDATED ${updated}`}>
  <Section label="Terms of Use">
    <h1 style="font-size: var(--text-3xl); margin-bottom: 1.5rem; max-width: 28rem;">The rules of the road.</h1>
    <p style="font-size: var(--text-base); color: var(--color-mute); max-width: 38rem; margin-bottom: 2rem;">
      The terms that govern your use of this site. Last updated {updated}.
    </p>
    <Rule weight="hairline" />
  </Section>

  <Section>
    <article style="max-width: 42rem; display: flex; flex-direction: column; gap: 1.5rem; font-size: var(--text-base); line-height: 1.65;">
      <h2 style="font-size: var(--text-xl); margin-top: 1rem;">Use of this site</h2>
      <p>You may use this site to learn about our studio and contact us. You may not scrape, abuse, reverse-engineer, or attempt to interfere with the demo agent or contact form. Rate limits exist and are enforced.</p>

      <h2 style="font-size: var(--text-xl); margin-top: 1rem;">The live demo</h2>
      <p>The Lead Qualifier demo on /work is provided for illustration. Outputs are produced by a free-tier language model and are not professional advice. Don't paste confidential information into the demo — we don't store it, but the inference provider has its own policies.</p>

      <h2 style="font-size: var(--text-xl); margin-top: 1rem;">Engagement terms</h2>
      <p>This site does not constitute a contract. Any engagement with The Agent Sees is governed by a separate Statement of Work signed between you and us.</p>

      <h2 style="font-size: var(--text-xl); margin-top: 1rem;">Intellectual property</h2>
      <p>The brand, copy, design system, and code on this site are owned by The Agent Sees. The legacy archived HTML retains its prior ownership.</p>

      <h2 style="font-size: var(--text-xl); margin-top: 1rem;">Liability</h2>
      <p>This site is provided "as is" without warranty. We're not liable for any loss arising from your use of the site or the demo.</p>

      <h2 style="font-size: var(--text-xl); margin-top: 1rem;">Contact</h2>
      <p>Questions about these terms: <a href="mailto:hello@theagentsees.com" style="text-decoration: underline;">hello@theagentsees.com</a>.</p>
    </article>
  </Section>
</Base>
```

- [ ] **Step 3: Run dev server and visually verify**

Run: `pnpm dev`
Open: `http://localhost:4321/terms`
Expected: page renders cleanly with same chrome as Privacy, MetaStrip shows "LEGAL · TERMS". Stop dev server.

- [ ] **Step 4: Run typecheck**

Run: `pnpm check`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/terms.astro
git commit -m "feat: /terms page on new design system"
```

---

## Task 12: Configure `wrangler.jsonc` for Astro Worker deployment

**Files:**
- Modify: `wrangler.jsonc`

- [ ] **Step 1: Read current `wrangler.jsonc`**

Run: `cat wrangler.jsonc`

- [ ] **Step 2: Rewrite `wrangler.jsonc` for the Astro Worker**

Replace `wrangler.jsonc` contents with:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "the-agent-sees",
  "main": "./dist/_worker.js/index.js",
  "compatibility_date": "2026-05-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "binding": "ASSETS",
    "directory": "./dist"
  },
  "observability": {
    "enabled": true
  },
  "routes": [
    {
      "pattern": "dev.theagentsees.com/*",
      "zone_name": "theagentsees.com"
    }
  ]
}
```

Note: the production route `theagentsees.com/*` is intentionally not present yet. It'll be added in Plan 5 (Cutover). Until then, the legacy static site keeps serving prod via its current Worker.

- [ ] **Step 3: Build and verify Wrangler accepts the config**

Run: `pnpm build && pnpm dlx wrangler deploy --dry-run`
Expected: dry-run reports the bundle, no errors. If a warning fires about `nodejs_compat`, that's expected — it stays.

- [ ] **Step 4: Commit**

```bash
git add wrangler.jsonc
git commit -m "feat: wrangler config for Astro Worker on dev subdomain"
```

---

## Task 13: Bind `dev.theagentsees.com` subdomain and first deploy

**Files:** (none — Cloudflare dashboard work)

This task is mostly Cloudflare dashboard work. Read the steps fully before starting — once the DNS record is in place, the rest is `wrangler` commands.

- [ ] **Step 1: Add `dev` DNS record in Cloudflare dashboard**

In Cloudflare dashboard → DNS for `theagentsees.com`:
- Add an `AAAA` (or `A`) record:
  - Type: `AAAA`
  - Name: `dev`
  - Content: `100::` (placeholder — Cloudflare Workers route binding overrides)
  - Proxy: ON (orange cloud)

Or via Wrangler if you prefer CLI (requires `CLOUDFLARE_API_TOKEN` env var with DNS edit scope):
```bash
pnpm dlx wrangler dns record create --zone theagentsees.com --type AAAA --name dev --content "100::" --proxied
```

- [ ] **Step 2: Authenticate Wrangler if not already**

Run: `pnpm dlx wrangler whoami`
Expected: shows your Cloudflare account. If not, run `pnpm dlx wrangler login`.

- [ ] **Step 3: Build and deploy**

Run: `pnpm build && pnpm dlx wrangler deploy`
Expected: deploy succeeds, prints the Worker URL (`https://the-agent-sees.<your-subdomain>.workers.dev`) AND confirms the route binding to `dev.theagentsees.com/*`.

- [ ] **Step 4: Smoke test on dev URL**

Open in browser: `https://dev.theagentsees.com/privacy`
Expected: Privacy page renders identically to local dev. TopBar visible, fonts loaded.

Open: `https://dev.theagentsees.com/terms`
Expected: Terms page renders identically.

Open: `https://dev.theagentsees.com/`
Expected: 404 page (we haven't built `/` yet — that's Plan 2). Confirm the 404 is on-brand and not a raw Cloudflare error page. If the Cloudflare 404 appears, that's acceptable for now — Plan 2 adds the styled 404.

- [ ] **Step 5: Run Lighthouse on `/privacy` (dev URL)**

In Chrome DevTools → Lighthouse → Mobile, run audit on `https://dev.theagentsees.com/privacy`.
Expected:
- Performance ≥ 95
- Accessibility ≥ 95
- Best Practices ≥ 95
- SEO ≥ 95

If Performance < 95: check that fonts are loading from `/fonts/` (not Google), check CLS doesn't spike from font swap. If Accessibility < 95: fix flagged issues (likely contrast or missing labels) before continuing.

- [ ] **Step 6: Enable Cloudflare Web Analytics on the `theagentsees.com` zone**

Cloudflare dashboard → `theagentsees.com` zone → **Analytics & Logs → Web Analytics → Add a site → automatic setup**. Pick "auto-inject" so no code change is needed in the site. Confirm the snippet is enabled.

This satisfies the spec's analytics requirement (cookieless, no GDPR banner). No code change to commit.

- [ ] **Step 7: Commit dev-deploy notes (no code change, but mark milestone)**

```bash
git commit --allow-empty -m "ops: foundation deployed to dev.theagentsees.com"
```

---

## Task 14: Scaffold Vitest for later plans

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/__tests__/.gitkeep`

We don't have logic to test in Plan 1, but Plans 3 and 4 will. Set up the scaffold now so adding tests later is one command, not a setup hurdle.

- [ ] **Step 1: Write `vitest.config.ts`**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts", "src/**/*.test.ts"],
    globals: false,
    coverage: {
      reporter: ["text", "html"],
      include: ["src/lib/**"],
    },
  },
});
```

- [ ] **Step 2: Verify Vitest runs (with zero tests)**

Run: `pnpm test`
Expected: `No test files found` — that's the success state for now.

- [ ] **Step 3: Create lib tests directory**

Run: `mkdir -p src/lib/__tests__ && touch src/lib/__tests__/.gitkeep`

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts src/lib/__tests__/.gitkeep
git commit -m "chore: scaffold Vitest config for later plans"
```

---

## Task 15: Final Foundation checks + push branch

**Files:** (none — verification only)

- [ ] **Step 1: Re-run full build**

Run: `pnpm build`
Expected: succeeds, no warnings about missing files or types.

- [ ] **Step 2: Re-run typecheck**

Run: `pnpm check`
Expected: zero errors, zero warnings.

- [ ] **Step 3: Verify both pages still deploy and look correct**

Run: `pnpm dlx wrangler deploy`
Open: `https://dev.theagentsees.com/privacy` and `https://dev.theagentsees.com/terms`.
Expected: both render correctly.

- [ ] **Step 4: Run axe-core a11y check via Chrome DevTools or `pnpm dlx @axe-core/cli`**

If using CLI:
```bash
pnpm dlx @axe-core/cli https://dev.theagentsees.com/privacy
pnpm dlx @axe-core/cli https://dev.theagentsees.com/terms
```
Expected: zero serious or critical violations. Warnings about color contrast on `--color-mute` text are acceptable if contrast ratio ≥ 4.5; otherwise tighten `--color-mute` slightly.

- [ ] **Step 5: Push `rebuild` branch to remote**

Run: `git push -u origin rebuild`
Expected: branch pushed. Do NOT merge to `main` — `main` keeps deploying prod until Plan 5.

- [ ] **Step 6: Write a one-line milestone commit**

```bash
git commit --allow-empty -m "milestone: Plan 1 foundation complete — dev URL serving Privacy + Terms"
git push
```

---

## Self-Review Summary

Run through this list before declaring Plan 1 done:

- [ ] All 12 legacy HTML files + `styles.css` archived under `archive/legacy/`
- [ ] `pnpm install`, `pnpm build`, `pnpm check`, `pnpm test` all succeed
- [ ] `dev.theagentsees.com/privacy` and `/terms` render correctly
- [ ] Lighthouse mobile ≥ 95 on both pages
- [ ] axe-core: zero serious/critical violations
- [ ] No emojis anywhere in committed files (`grep -rE '[\x{1F300}-\x{1FAFF}\x{2700}-\x{27BF}]' src/` → empty)
- [ ] Self-hosted fonts loading from `/fonts/`, not Google Fonts
- [ ] Production site at `theagentsees.com` untouched and still serving the legacy build
- [ ] `rebuild` branch pushed; `main` not merged

If all checked: Plan 1 is done. Plan 2 (Marketing pages) can be written and executed next.
