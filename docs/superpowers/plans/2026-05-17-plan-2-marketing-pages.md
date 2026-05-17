# Marketing Pages Implementation Plan (Plan 2 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the three remaining content pages — `/` (Home), `/studio`, `/work` (shell) — plus a custom 404 and sitemap integration, on the foundation built in Plan 1. After this plan, `dev.theagentsees.com` is a complete 5-page studio site minus the live demo (Plan 4) and the working contact form (Plan 3).

**Architecture:** Each page is a single `.astro` file in `src/pages/` using the existing primitives (`Base`, `Section`, `Rule`, `Mark`, `Button`, icon components). **Layout uses scoped `<style>` blocks, NOT inline `style=` attributes mixed with Tailwind responsive classes** — Plan 1 hit two bugs where inline `style="grid-template-columns: 1fr"` overrode the Tailwind `md:grid-cols-*` class at every breakpoint. Lesson locked in: structural layout goes in `<style>` with `@media` queries. Inline `style=` is fine for one-off declarations that don't have responsive variants. No new components are introduced unless absolutely necessary; we lean on the design system.

**Tech Stack:** Same as Plan 1 — Astro 5, Tailwind 4, `@astrojs/cloudflare`, self-hosted fonts. New devDep: `@astrojs/sitemap` for sitemap generation.

---

## File Structure

**Created in this plan:**

```
src/
├─ pages/
│  ├─ index.astro              # Home
│  ├─ studio.astro             # Studio
│  ├─ work.astro               # Work shell
│  └─ 404.astro                # Custom 404
└─ content/
   ├─ config.ts                # (deferred — only added if we need MDX content collections later)
public/
└─ (no new files)
```

**Modified in this plan:**
- `astro.config.mjs` — add `@astrojs/sitemap` integration
- `package.json` — add `@astrojs/sitemap` devDep
- (legacy `sitemap.xml` at repo root gets deleted in Task 6 — the new one is generated under `dist/sitemap-index.xml` at build time)

---

## Convention reminder for every page in this plan

**Do NOT mix inline `style="display: grid; grid-template-columns: ..."` with Tailwind responsive classes.** Use a scoped `<style>` block at the end of the `.astro` file with `@media (min-width: ...)` queries for any layout that changes at breakpoints. Inline `style=` is OK for single-property values (margins, font-size from tokens, colors) but NOT for grid/flex/columns that have responsive variants.

Tailwind utility classes that DON'T conflict with inline styles (typography, padding, simple flex) are still fine to use directly in the markup. The rule is: **don't try to override an inline style with a class.**

---

## Task 1: Home page (`/`)

**Files:**
- Create: `src/pages/index.astro`

This is the most consequential page in the plan. It carries the brand. Each section maps to the home blueprint in the spec at `docs/superpowers/specs/2026-05-17-revamp-design.md` §4.

- [ ] **Step 1: Write `src/pages/index.astro`**

Create `src/pages/index.astro`:

```astro
---
export const prerender = true;

import Base from "../components/layout/Base.astro";
import Section from "../components/ui/Section.astro";
import Rule from "../components/ui/Rule.astro";
import Mark from "../components/ui/Mark.astro";
import Button from "../components/ui/Button.astro";
import Arrow from "../components/icons/Arrow.astro";

const services = [
  {
    num: "01",
    name: "MVPs",
    line: "Web apps you'd actually ship. 4–8 week scopes.",
  },
  {
    num: "02",
    name: "Agents",
    line: "LLM-powered systems that act, not just answer.",
  },
  {
    num: "03",
    name: "Integrations",
    line: "Connecting tools so your ops stop being your bottleneck.",
  },
];

const process = [
  { num: "01", name: "Discovery", line: "Understand the business, the user, the constraint." },
  { num: "02", name: "Spec", line: "Write it down. Get sign-off before code." },
  { num: "03", name: "Build", line: "Ship to a real URL early. Iterate on real feedback." },
  { num: "04", name: "Ship", line: "Production-grade. Monitored. Handed over clean." },
];

const notes = [
  {
    label: "Exploring",
    title: "Lead Qualifier",
    subtitle: "A live demo agent — public on /work next.",
    date: "2026-05",
  },
  {
    label: "Building",
    title: "The Agent Sees — the site itself",
    subtitle: "An honest studio site. You're looking at it.",
    date: "2026-05",
  },
];

const nowBuilding = [
  "Lead qualifier · live demo",
  "Site rebuild · in progress",
  "Two MVP scopes · in discovery",
];
---
<Base title="The Agent Sees — AI MVPs, web apps, and agents that ship" metaMiddle="STUDIO · Nº01" metaRight="2026 →">
  <!-- HERO -->
  <section class="hero">
    <div class="hero__inner">
      <div class="hero__left">
        <p class="hero__eyebrow">AI · WEBAPPS · AUTOMATION</p>
        <h1 class="hero__head">
          Agents that <Mark>see</Mark>.<br />
          MVPs that ship.
        </h1>
        <p class="hero__sub">
          A small studio building AI-powered MVPs, web apps, and the agents that run inside them — for founders who need to move now.
        </p>
        <div class="hero__cta-row">
          <Button href="/work">See what we build</Button>
          <Button href="/contact" variant="ghost">Get in touch</Button>
        </div>
      </div>
      <aside class="hero__status" aria-label="Now building">
        <p class="hero__status-label">Now building</p>
        <ul>
          {nowBuilding.map((item) => <li>{item}</li>)}
        </ul>
        <p class="hero__status-foot">Live updates as work changes.</p>
      </aside>
    </div>
  </section>

  <Rule weight="ink" />

  <!-- WHAT WE BUILD -->
  <Section label="What we build" id="what-we-build">
    <div class="services">
      {services.map((s) => (
        <article class="service">
          <span class="service__num">{s.num}</span>
          <h3 class="service__name">{s.name}.</h3>
          <p class="service__line">{s.line}</p>
        </article>
      ))}
    </div>
  </Section>

  <Rule weight="ink" />

  <!-- TRY THE AGENT (demo teaser) -->
  <Section label="Try the agent" tone="alt">
    <div class="demo-teaser">
      <div class="demo-teaser__copy">
        <h2>An agent you can actually try.</h2>
        <p>
          Paste a hypothetical lead. Our Lead Qualifier classifies it, scores priority, suggests a next action, and drafts a reply — live on the page, in seconds.
        </p>
        <Button href="/work#demo">Open the demo</Button>
      </div>
      <div class="demo-teaser__preview" aria-hidden="true">
        <div class="demo-teaser__field">
          <span class="demo-teaser__field-label">classification</span>
          <span class="demo-teaser__field-val">mvp_build</span>
        </div>
        <div class="demo-teaser__field">
          <span class="demo-teaser__field-label">priority</span>
          <span class="demo-teaser__field-val">5/5</span>
        </div>
        <div class="demo-teaser__field demo-teaser__field--multi">
          <span class="demo-teaser__field-label">reasoning</span>
          <span class="demo-teaser__field-val demo-teaser__field-val--soft">Seed-stage SaaS exploring AI features. Strong fit for a 4-week MVP scope.</span>
        </div>
      </div>
    </div>
  </Section>

  <Rule weight="ink" />

  <!-- PROCESS -->
  <Section label="How we work">
    <div class="process">
      {process.map((p) => (
        <article class="process__step">
          <span class="process__num">{p.num}</span>
          <h3 class="process__name">{p.name}.</h3>
          <p class="process__line">{p.line}</p>
        </article>
      ))}
    </div>
  </Section>

  <Rule weight="ink" />

  <!-- RECENT / NOTES -->
  <Section label="Recent &amp; notes">
    <div class="notes">
      {notes.map((n) => (
        <article class="note">
          <p class="note__meta">
            <span class="note__label">{n.label}</span>
            <span class="note__date">{n.date}</span>
          </p>
          <h3 class="note__title">{n.title}</h3>
          <p class="note__sub">{n.subtitle}</p>
        </article>
      ))}
    </div>
    <p class="notes__foot">
      More as we ship. Follow along — or <a href="/contact" class="notes__inline-link">tell us what you're building</a>.
    </p>
  </Section>

  <Rule weight="ink" />

  <!-- CONTACT STRIP -->
  <Section tone="alt">
    <div class="contact-strip">
      <h2 class="contact-strip__head">Tell us what you're building.</h2>
      <div class="contact-strip__row">
        <a href="mailto:hello@theagentsees.com" class="contact-strip__email">hello@theagentsees.com</a>
        <Button href="/contact">Start a project</Button>
      </div>
    </div>
  </Section>
</Base>

<style>
  /* HERO */
  .hero {
    padding-inline: var(--spacing-gutter-sm);
    padding-top: 2.5rem;
    padding-bottom: 2.5rem;
  }
  @media (min-width: 48rem) {
    .hero { padding-inline: var(--spacing-gutter-md); padding-block: 3.5rem; }
  }
  @media (min-width: 64rem) {
    .hero { padding-inline: var(--spacing-gutter-lg); padding-block: 5rem; }
  }
  .hero__inner {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 3rem;
    max-width: 88rem;
    margin-inline: auto;
  }
  @media (min-width: 64rem) {
    .hero__inner { grid-template-columns: minmax(0, 2.4fr) minmax(0, 1fr); column-gap: 4rem; align-items: end; }
  }
  .hero__eyebrow {
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--color-mute);
    margin-bottom: 1.5rem;
  }
  .hero__head {
    font-size: var(--text-3xl);
    line-height: 0.98;
    margin-bottom: 1.5rem;
  }
  @media (min-width: 48rem) { .hero__head { font-size: var(--text-4xl); } }
  @media (min-width: 64rem) { .hero__head { font-size: var(--text-5xl); } }
  .hero__sub {
    font-size: var(--text-base);
    color: var(--color-mute);
    max-width: 34rem;
    line-height: 1.55;
    margin-bottom: 2rem;
  }
  .hero__cta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .hero__status {
    border-left: 1px solid var(--color-ink);
    padding-left: 1.25rem;
    align-self: end;
  }
  .hero__status-label {
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--color-mute);
    margin-bottom: 0.75rem;
  }
  .hero__status ul {
    list-style: none;
    margin: 0 0 0.75rem 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }
  .hero__status li::before {
    content: "→ ";
    color: var(--color-mute);
  }
  .hero__status-foot {
    font-size: var(--text-xs);
    color: var(--color-mute);
  }

  /* SERVICES */
  .services {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 2rem;
    max-width: 88rem;
    margin-inline: auto;
  }
  @media (min-width: 48rem) {
    .services { grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 3rem; }
  }
  .service {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-ink);
  }
  .service__num {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    color: var(--color-mute);
  }
  .service__name {
    font-size: var(--text-2xl);
    line-height: 1.02;
  }
  .service__line {
    font-size: var(--text-base);
    color: var(--color-mute);
    line-height: 1.55;
    max-width: 22rem;
  }

  /* DEMO TEASER */
  .demo-teaser {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 2.5rem;
    max-width: 88rem;
    margin-inline: auto;
    align-items: center;
  }
  @media (min-width: 64rem) {
    .demo-teaser { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 4rem; }
  }
  .demo-teaser__copy h2 {
    font-size: var(--text-2xl);
    line-height: 1.02;
    margin-bottom: 1rem;
    max-width: 22rem;
  }
  @media (min-width: 64rem) { .demo-teaser__copy h2 { font-size: var(--text-3xl); } }
  .demo-teaser__copy p {
    font-size: var(--text-base);
    color: var(--color-mute);
    line-height: 1.6;
    max-width: 32rem;
    margin-bottom: 1.5rem;
  }
  .demo-teaser__preview {
    background: var(--color-paper);
    border: 1px solid var(--color-ink);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    font-family: var(--font-mono);
  }
  .demo-teaser__field {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    font-size: var(--text-sm);
    border-bottom: 1px solid var(--color-hairline);
    padding-bottom: 0.75rem;
  }
  .demo-teaser__field--multi {
    flex-direction: column;
    gap: 0.4rem;
    border-bottom: 0;
    padding-bottom: 0;
  }
  .demo-teaser__field-label {
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--color-mute);
  }
  .demo-teaser__field-val { font-weight: 500; }
  .demo-teaser__field-val--soft {
    font-weight: 400;
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    line-height: 1.55;
  }

  /* PROCESS */
  .process {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 2rem;
    max-width: 88rem;
    margin-inline: auto;
    counter-reset: process;
  }
  @media (min-width: 48rem) {
    .process { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 3rem; }
  }
  @media (min-width: 64rem) {
    .process { grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: 2.5rem; }
  }
  .process__step {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-ink);
  }
  .process__num {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    color: var(--color-mute);
  }
  .process__name {
    font-size: var(--text-lg);
    line-height: 1.05;
  }
  .process__line {
    font-size: var(--text-sm);
    color: var(--color-mute);
    line-height: 1.5;
  }

  /* NOTES */
  .notes {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 2rem;
    max-width: 88rem;
    margin-inline: auto;
  }
  @media (min-width: 48rem) {
    .notes { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 3rem; }
  }
  .note {
    border-top: 1px solid var(--color-ink);
    padding-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .note__meta {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--color-mute);
  }
  .note__label { color: var(--color-ink); }
  .note__title {
    font-size: var(--text-xl);
    line-height: 1.05;
  }
  .note__sub {
    font-size: var(--text-sm);
    color: var(--color-mute);
    line-height: 1.55;
  }
  .notes__foot {
    margin-top: 2.5rem;
    font-size: var(--text-sm);
    color: var(--color-mute);
    max-width: 38rem;
    margin-inline: auto;
    text-align: center;
  }
  .notes__inline-link {
    text-decoration: underline;
    text-underline-offset: 3px;
    color: var(--color-ink);
  }

  /* CONTACT STRIP */
  .contact-strip {
    max-width: 88rem;
    margin-inline: auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  @media (min-width: 64rem) {
    .contact-strip { flex-direction: row; align-items: center; justify-content: space-between; gap: 3rem; }
  }
  .contact-strip__head {
    font-size: var(--text-2xl);
    line-height: 1.02;
    max-width: 26rem;
  }
  @media (min-width: 64rem) { .contact-strip__head { font-size: var(--text-3xl); } }
  .contact-strip__row {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: center;
  }
  .contact-strip__email {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
```

- [ ] **Step 2: Build and verify**

Run: `pnpm build`
Expected: succeeds, `dist/index.html` exists. Output should mention `prerendering /`.

Run:
```bash
grep -c "Now building" dist/index.html && grep -c "Lead Qualifier" dist/index.html && grep -c "Agents that" dist/index.html
```
Expected: each grep returns 1 (or higher).

Run: `pnpm check`
Expected: 0 errors. 18 files now (17 from Plan 1 + index.astro).

- [ ] **Step 3: Visual check via dev server**

Run: `pnpm dev` in background, `curl -s http://localhost:4321/ | wc -l` (should print a number > 50, meaning HTML is rendered), then kill the dev server.

Alternative if dev still has issues: run a quick prerendered static serve:
```bash
pnpm build && pnpm dlx http-server dist -p 4321 -s & sleep 2
curl -s http://localhost:4321/ | head -5
curl -s http://localhost:4321/ | grep -c "Lead Qualifier"
pkill -f http-server || true
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: Home page on the new design system"
```

---

## Task 2: Studio page (`/studio`)

**Files:**
- Create: `src/pages/studio.astro`

- [ ] **Step 1: Write `src/pages/studio.astro`**

Create `src/pages/studio.astro`:

```astro
---
export const prerender = true;

import Base from "../components/layout/Base.astro";
import Section from "../components/ui/Section.astro";
import Rule from "../components/ui/Rule.astro";

const principles = [
  {
    num: "01",
    head: "Ship the thing.",
    body: "Software that exists beats software that's perfect on a whiteboard. We work in 1–2 week cycles with real URLs and real users in the loop. Plans are scaffolding, not certainty.",
  },
  {
    num: "02",
    head: "Type at the edge.",
    body: "We write typed contracts at every system boundary — request payloads, agent outputs, database schemas. Bugs caught at compile time are bugs your customers never see.",
  },
  {
    num: "03",
    head: "Software with a point of view.",
    body: "We make calls; you ratify them. You hired a studio, not a Jira board. We bring a clear opinion to every decision, document why, and stay open to being wrong.",
  },
];

const process = [
  {
    num: "01",
    head: "Discovery",
    body: "Half a day on a call. We dig into the business, the user, the constraint. We write down what we heard and send it back. No code yet.",
  },
  {
    num: "02",
    head: "Spec",
    body: "A short written spec — what we're building, what we're not, what success looks like. You sign off. If the spec is wrong, this is where we discover it — cheap.",
  },
  {
    num: "03",
    head: "Build",
    body: "Ship to a real URL within the first week. Weekly demos, async updates in between. You see every screen as it lands; we course-correct on real feedback, not assumptions.",
  },
  {
    num: "04",
    head: "Ship",
    body: "Production-grade, monitored, with a clean handover. We don't disappear — we stay on retainer or pass the keys cleanly. Either way, your team owns the code.",
  },
];
---
<Base title="Studio — The Agent Sees" metaMiddle="STUDIO · ABOUT" metaRight="2026 →">
  <!-- HEADER -->
  <section class="studio-hero">
    <div class="studio-hero__inner">
      <p class="label">Studio</p>
      <h1 class="studio-hero__head">What we believe.<br />How we work.</h1>
      <p class="studio-hero__sub">
        The Agent Sees is a new studio, started in 2026 to build AI-powered MVPs and the agents that run inside them. This page is the bit that doesn't fit on a homepage.
      </p>
    </div>
  </section>

  <Rule weight="ink" />

  <!-- PRINCIPLES -->
  <Section label="Principles">
    <div class="principles">
      {principles.map((p) => (
        <article class="principle">
          <span class="principle__num">{p.num}</span>
          <h2 class="principle__head">{p.head}</h2>
          <p class="principle__body">{p.body}</p>
        </article>
      ))}
    </div>
  </Section>

  <Rule weight="ink" />

  <!-- PROCESS DETAIL -->
  <Section label="Process" tone="alt">
    <div class="process-detail">
      {process.map((p) => (
        <article class="process-detail__step">
          <span class="process-detail__num">{p.num}</span>
          <h3 class="process-detail__head">{p.head}</h3>
          <p class="process-detail__body">{p.body}</p>
        </article>
      ))}
    </div>
  </Section>

  <Rule weight="ink" />

  <!-- FOUNDER NOTE (placeholder until founder fills it in) -->
  <!-- TODO:founder-bio — replace name/title/portrait/body before launch -->
  <Section label="Founder note">
    <div class="founder">
      <div class="founder__portrait" aria-hidden="true">
        <div class="founder__portrait-placeholder">
          <span>TAS</span>
        </div>
      </div>
      <div class="founder__copy">
        <p class="founder__name">[Founder name] — founder &amp; engineer</p>
        <p class="founder__body">
          [Placeholder — replace before launch. One paragraph, first person. Why I started The Agent Sees, what I've built before, what I care about. Honest, not hyped. End with an invitation to talk.]
        </p>
        <p class="founder__sign-off">— [Founder name], 2026</p>
      </div>
    </div>
  </Section>

  <Rule weight="ink" />

  <!-- CONTACT STRIP -->
  <Section tone="default">
    <div class="contact-strip">
      <h2 class="contact-strip__head">Tell us what you're building.</h2>
      <div class="contact-strip__row">
        <a href="mailto:hello@theagentsees.com" class="contact-strip__email">hello@theagentsees.com</a>
        <a href="/contact" class="contact-strip__btn">Start a project →</a>
      </div>
    </div>
  </Section>
</Base>

<style>
  .studio-hero {
    padding-inline: var(--spacing-gutter-sm);
    padding-block: 2.5rem;
  }
  @media (min-width: 48rem) { .studio-hero { padding-inline: var(--spacing-gutter-md); padding-block: 3.5rem; } }
  @media (min-width: 64rem) { .studio-hero { padding-inline: var(--spacing-gutter-lg); padding-block: 5rem; } }
  .studio-hero__inner { max-width: 78rem; margin-inline: auto; }
  .studio-hero__head {
    font-size: var(--text-3xl);
    line-height: 1.0;
    margin: 1rem 0 1.5rem;
  }
  @media (min-width: 48rem) { .studio-hero__head { font-size: var(--text-4xl); } }
  @media (min-width: 64rem) { .studio-hero__head { font-size: var(--text-5xl); } }
  .studio-hero__sub {
    font-size: var(--text-base);
    color: var(--color-mute);
    max-width: 36rem;
    line-height: 1.6;
  }

  /* PRINCIPLES */
  .principles {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 3rem;
    max-width: 88rem;
    margin-inline: auto;
  }
  @media (min-width: 64rem) {
    .principles { grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 3rem; }
  }
  .principle {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-ink);
  }
  .principle__num {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    color: var(--color-mute);
  }
  .principle__head {
    font-size: var(--text-2xl);
    line-height: 1.02;
  }
  .principle__body {
    font-size: var(--text-base);
    line-height: 1.6;
    color: var(--color-ink);
  }

  /* PROCESS DETAIL */
  .process-detail {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 2rem;
    max-width: 88rem;
    margin-inline: auto;
  }
  @media (min-width: 48rem) {
    .process-detail { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2.5rem; }
  }
  .process-detail__step {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-ink);
  }
  .process-detail__num {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    color: var(--color-mute);
  }
  .process-detail__head {
    font-size: var(--text-xl);
    line-height: 1.05;
  }
  .process-detail__body {
    font-size: var(--text-base);
    line-height: 1.6;
    color: var(--color-mute);
    max-width: 30rem;
  }

  /* FOUNDER */
  .founder {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 2rem;
    max-width: 72rem;
    margin-inline: auto;
  }
  @media (min-width: 48rem) {
    .founder { grid-template-columns: 14rem 1fr; column-gap: 3rem; align-items: start; }
  }
  .founder__portrait {
    aspect-ratio: 4 / 5;
    background: var(--color-paper-2);
    border: 1px solid var(--color-ink);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .founder__portrait-placeholder {
    font-family: var(--font-display);
    font-size: var(--text-3xl);
    font-weight: 800;
    color: var(--color-mute);
    letter-spacing: -0.04em;
  }
  .founder__name {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--color-mute);
    margin-bottom: 1rem;
  }
  .founder__body {
    font-size: var(--text-lg);
    line-height: 1.55;
    margin-bottom: 1.5rem;
    max-width: 40rem;
  }
  .founder__sign-off {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-mute);
  }

  /* CONTACT STRIP — same as Home */
  .contact-strip {
    max-width: 88rem;
    margin-inline: auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  @media (min-width: 64rem) {
    .contact-strip { flex-direction: row; align-items: center; justify-content: space-between; gap: 3rem; }
  }
  .contact-strip__head {
    font-size: var(--text-2xl);
    line-height: 1.02;
    max-width: 26rem;
  }
  @media (min-width: 64rem) { .contact-strip__head { font-size: var(--text-3xl); } }
  .contact-strip__row {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: center;
  }
  .contact-strip__email {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .contact-strip__btn {
    background: var(--color-ink);
    color: var(--color-paper);
    padding: 0.75rem 1.25rem;
    font-size: var(--text-sm);
    font-weight: 500;
    text-decoration: none;
  }
  .contact-strip__btn:hover { background: var(--color-mute); }
</style>
```

- [ ] **Step 2: Build and verify**

Run: `pnpm build`
Expected: prerenders `/studio/index.html`.

```bash
grep -c "What we believe" dist/studio/index.html
grep -c "TODO:founder-bio" src/pages/studio.astro
```
Expected: both ≥ 1 (the placeholder is intentional and grep-able before launch).

Run: `pnpm check`
Expected: 19 files, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/studio.astro
git commit -m "feat: Studio page with principles + process + founder placeholder"
```

---

## Task 3: Work shell (`/work`)

**Files:**
- Create: `src/pages/work.astro`

The full demo lands in Plan 4. This task ships a credible Work page with the demo placeholder, recent build cards, and a "what's next" footer.

- [ ] **Step 1: Write `src/pages/work.astro`**

Create `src/pages/work.astro`:

```astro
---
export const prerender = true;

import Base from "../components/layout/Base.astro";
import Section from "../components/ui/Section.astro";
import Rule from "../components/ui/Rule.astro";

const builds = [
  {
    label: "In build",
    title: "Lead Qualifier (live demo)",
    sub: "An agent that classifies inbound leads, scores priority, suggests next action, drafts a reply. Live on this page once Plan 4 ships.",
    meta: "AI · Workers AI · Streaming",
  },
  {
    label: "In build",
    title: "The Agent Sees — site",
    sub: "An honest studio site. Astro on Cloudflare Workers, zero-JS prerendered pages, self-hosted fonts. You're reading the build.",
    meta: "Astro · Cloudflare · Tailwind 4",
  },
];

const nextUp = [
  "Contact form on D1 + Resend",
  "Lead Qualifier on Workers AI with streaming",
  "First real client engagement — write-up to follow",
];
---
<Base title="Work — The Agent Sees" metaMiddle="WORK · DEMOS" metaRight="2026 →">
  <!-- HEADER -->
  <section class="work-hero">
    <div class="work-hero__inner">
      <p class="label">Work / Demos</p>
      <h1 class="work-hero__head">Try the agent.<br />Read the build notes.</h1>
      <p class="work-hero__sub">
        We'll keep adding as we ship. The Lead Qualifier demo is the centrepiece — interactive, public, running on a free-tier model so you can poke at it without us looking over your shoulder.
      </p>
    </div>
  </section>

  <Rule weight="ink" />

  <!-- DEMO PLACEHOLDER -->
  <Section label="Live demo · Lead Qualifier" id="demo">
    <div class="demo-shell">
      <div class="demo-shell__copy">
        <h2 class="demo-shell__head">Coming next — wired in Plan 4.</h2>
        <p class="demo-shell__body">
          Paste a hypothetical lead (a sentence is fine). The agent will classify it, score priority, suggest a next action, and draft a 2-sentence reply — streaming, in your browser, in roughly a second.
        </p>
        <p class="demo-shell__body">
          Running on Cloudflare Workers AI (Llama 3.1 8B), rate-limited, Turnstile-gated, free for you to use. The exact same plumbing is what we'd build inside your CRM.
        </p>
      </div>
      <div class="demo-shell__preview" aria-hidden="true">
        <div class="demo-shell__field">
          <span class="demo-shell__field-label">input</span>
          <span class="demo-shell__field-val">[ paste a lead here ]</span>
        </div>
        <div class="demo-shell__field">
          <span class="demo-shell__field-label">classification</span>
          <span class="demo-shell__field-val demo-shell__field-val--dim">— pending —</span>
        </div>
        <div class="demo-shell__field">
          <span class="demo-shell__field-label">priority</span>
          <span class="demo-shell__field-val demo-shell__field-val--dim">— pending —</span>
        </div>
        <div class="demo-shell__field">
          <span class="demo-shell__field-label">suggested action</span>
          <span class="demo-shell__field-val demo-shell__field-val--dim">— pending —</span>
        </div>
        <div class="demo-shell__field demo-shell__field--multi">
          <span class="demo-shell__field-label">draft reply</span>
          <span class="demo-shell__field-val demo-shell__field-val--dim">— pending —</span>
        </div>
      </div>
    </div>
  </Section>

  <Rule weight="ink" />

  <!-- RECENT BUILDS -->
  <Section label="Recent &amp; in build">
    <div class="builds">
      {builds.map((b) => (
        <article class="build">
          <p class="build__meta">
            <span class="build__label">{b.label}</span>
            <span class="build__tech">{b.meta}</span>
          </p>
          <h3 class="build__title">{b.title}</h3>
          <p class="build__sub">{b.sub}</p>
        </article>
      ))}
    </div>
  </Section>

  <Rule weight="ink" />

  <!-- WHAT'S NEXT -->
  <Section label="What's next" tone="alt">
    <div class="next">
      <h2 class="next__head">On deck.</h2>
      <ol class="next__list">
        {nextUp.map((item, i) => (
          <li>
            <span class="next__num">{String(i + 1).padStart(2, "0")}</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
      <p class="next__foot">
        Want to be on the list? <a href="/contact" class="next__link">Tell us what you're building.</a>
      </p>
    </div>
  </Section>
</Base>

<style>
  .work-hero {
    padding-inline: var(--spacing-gutter-sm);
    padding-block: 2.5rem;
  }
  @media (min-width: 48rem) { .work-hero { padding-inline: var(--spacing-gutter-md); padding-block: 3.5rem; } }
  @media (min-width: 64rem) { .work-hero { padding-inline: var(--spacing-gutter-lg); padding-block: 5rem; } }
  .work-hero__inner { max-width: 78rem; margin-inline: auto; }
  .work-hero__head {
    font-size: var(--text-3xl);
    line-height: 1.0;
    margin: 1rem 0 1.5rem;
  }
  @media (min-width: 48rem) { .work-hero__head { font-size: var(--text-4xl); } }
  @media (min-width: 64rem) { .work-hero__head { font-size: var(--text-5xl); } }
  .work-hero__sub {
    font-size: var(--text-base);
    color: var(--color-mute);
    max-width: 38rem;
    line-height: 1.6;
  }

  /* DEMO SHELL */
  .demo-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 2.5rem;
    max-width: 88rem;
    margin-inline: auto;
    align-items: start;
  }
  @media (min-width: 64rem) {
    .demo-shell { grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); column-gap: 4rem; }
  }
  .demo-shell__head {
    font-size: var(--text-2xl);
    line-height: 1.02;
    margin-bottom: 1.5rem;
    max-width: 22rem;
  }
  @media (min-width: 64rem) { .demo-shell__head { font-size: var(--text-3xl); } }
  .demo-shell__body {
    font-size: var(--text-base);
    color: var(--color-mute);
    line-height: 1.65;
    margin-bottom: 1.25rem;
    max-width: 36rem;
  }
  .demo-shell__preview {
    background: var(--color-paper);
    border: 1px solid var(--color-ink);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    font-family: var(--font-mono);
  }
  .demo-shell__field {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    font-size: var(--text-sm);
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--color-hairline);
  }
  .demo-shell__field--multi { flex-direction: column; gap: 0.4rem; border-bottom: 0; }
  .demo-shell__field-label {
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--color-mute);
  }
  .demo-shell__field-val { font-weight: 500; }
  .demo-shell__field-val--dim { color: var(--color-mute); font-weight: 400; }

  /* BUILDS */
  .builds {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 2rem;
    max-width: 88rem;
    margin-inline: auto;
  }
  @media (min-width: 64rem) {
    .builds { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 3rem; }
  }
  .build {
    border-top: 1px solid var(--color-ink);
    padding-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .build__meta {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--color-mute);
  }
  .build__label { color: var(--color-ink); }
  .build__title {
    font-size: var(--text-xl);
    line-height: 1.05;
  }
  .build__sub {
    font-size: var(--text-base);
    color: var(--color-mute);
    line-height: 1.55;
    max-width: 38rem;
  }

  /* NEXT */
  .next { max-width: 72rem; margin-inline: auto; }
  .next__head {
    font-size: var(--text-2xl);
    margin-bottom: 1.5rem;
  }
  .next__list {
    list-style: none;
    margin: 0 0 2rem 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    border-top: 1px solid var(--color-hairline);
    padding-top: 1rem;
  }
  .next__list li {
    display: flex;
    gap: 1rem;
    font-size: var(--text-base);
    padding: 0.25rem 0;
  }
  .next__num {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    color: var(--color-mute);
    min-width: 2rem;
  }
  .next__foot {
    font-size: var(--text-sm);
    color: var(--color-mute);
  }
  .next__link {
    text-decoration: underline;
    text-underline-offset: 3px;
    color: var(--color-ink);
  }
</style>
```

- [ ] **Step 2: Build + verify**

```bash
pnpm build
grep -c "Lead Qualifier" dist/work/index.html
pnpm check
```
Expected: build succeeds, grep ≥ 1, 20 files / 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/work.astro
git commit -m "feat: Work shell with demo placeholder + recent builds + next-up"
```

---

## Task 4: Custom 404 page

**Files:**
- Create: `src/pages/404.astro`

- [ ] **Step 1: Write `src/pages/404.astro`**

Create `src/pages/404.astro`:

```astro
---
export const prerender = true;

import Base from "../components/layout/Base.astro";
import Section from "../components/ui/Section.astro";
import Button from "../components/ui/Button.astro";
---
<Base title="404 — The Agent Sees" metaMiddle="404 · NOT FOUND" metaRight="ROUTE NOT FOUND">
  <Section>
    <div class="four-oh-four">
      <p class="label">404</p>
      <h1>This page doesn't exist.</h1>
      <p class="four-oh-four__sub">
        It might have moved with the rebuild. Or it was never here. Either way, the links below are the real ones.
      </p>
      <div class="four-oh-four__links">
        <Button href="/">Home</Button>
        <Button href="/work" variant="ghost">Work</Button>
        <Button href="/studio" variant="ghost">Studio</Button>
        <Button href="/contact" variant="ghost">Contact</Button>
      </div>
    </div>
  </Section>
</Base>

<style>
  .four-oh-four {
    max-width: 56rem;
    margin-inline: auto;
    text-align: left;
  }
  .four-oh-four h1 {
    font-size: var(--text-3xl);
    line-height: 1.0;
    margin: 1rem 0 1.5rem;
  }
  @media (min-width: 48rem) { .four-oh-four h1 { font-size: var(--text-4xl); } }
  .four-oh-four__sub {
    font-size: var(--text-base);
    color: var(--color-mute);
    line-height: 1.6;
    margin-bottom: 2.5rem;
    max-width: 34rem;
  }
  .four-oh-four__links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
</style>
```

- [ ] **Step 2: Build + verify**

```bash
pnpm build
ls dist/404.html
pnpm check
```
Expected: `dist/404.html` exists, 21 files / 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/404.astro
git commit -m "feat: on-brand 404 page"
```

---

## Task 5: Sitemap integration

**Files:**
- Modify: `package.json` (add `@astrojs/sitemap` devDep)
- Modify: `astro.config.mjs` (add sitemap integration)
- Delete: legacy root `sitemap.xml` (now stale and misleading)

- [ ] **Step 1: Install `@astrojs/sitemap`**

Run: `pnpm add -D @astrojs/sitemap`
Expected: package added to `devDependencies`, lockfile updated.

- [ ] **Step 2: Wire integration into `astro.config.mjs`**

Open `astro.config.mjs`. Current content:

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

Replace with:

```js
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: "compile",
  }),
  integrations: [
    preact({ compat: false }),
    sitemap({
      filter: (page) => !page.includes("/404"),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  site: "https://theagentsees.com",
});
```

- [ ] **Step 3: Delete legacy root sitemap.xml**

The legacy site's `sitemap.xml` at the repo root references `/services.html`, `/work.html`, etc. — none of those URLs exist in the new build. Delete it so it doesn't leak into a future commit:

```bash
git rm sitemap.xml
```

Expected: removes `sitemap.xml`. The newly-generated sitemap will live at `dist/sitemap-index.xml` after build (Astro emits `sitemap-index.xml` and one or more `sitemap-0.xml` files; both are picked up by `public/robots.txt` which already advertises `https://theagentsees.com/sitemap.xml`).

Note: `@astrojs/sitemap` generates `sitemap-index.xml` by default, not `sitemap.xml` — so update `public/robots.txt` to match.

- [ ] **Step 4: Update `public/robots.txt` to point at the new sitemap**

Open `public/robots.txt`. Current content:

```
User-agent: *
Allow: /

Sitemap: https://theagentsees.com/sitemap.xml
```

Replace the `Sitemap:` line:

```
User-agent: *
Allow: /

Sitemap: https://theagentsees.com/sitemap-index.xml
```

- [ ] **Step 5: Build + verify**

```bash
pnpm build
ls dist/sitemap-*.xml
cat dist/sitemap-0.xml | head -30
```
Expected: at least `dist/sitemap-index.xml` and `dist/sitemap-0.xml` exist. The `sitemap-0.xml` should contain `<loc>` entries for `/`, `/work`, `/studio`, `/contact`, `/privacy`, `/terms` — but NOT for `/404` (filtered).

If `dist/sitemap-0.xml` is missing entries you expect:
- Confirm the page has `export const prerender = true;` at the top
- Confirm `astro.config.mjs`'s `site` is set (it is: `https://theagentsees.com`)

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml astro.config.mjs public/robots.txt
git rm sitemap.xml 2>/dev/null  # already staged from Step 3
git commit -m "feat: @astrojs/sitemap integration + drop legacy root sitemap.xml"
```

---

## Task 6: Final build + deploy + smoke test

**Files:** (none — verification + deploy)

- [ ] **Step 1: Full build + typecheck**

```bash
pnpm build && pnpm check
```
Expected: build succeeds (all 4 new pages + 404 + sitemap emit), `pnpm check` reports 0 errors (should be 21 files after this plan).

- [ ] **Step 2: Verify all dist outputs**

```bash
ls dist/index.html dist/work/index.html dist/studio/index.html dist/privacy/index.html dist/terms/index.html dist/404.html dist/sitemap-index.xml
```
Expected: all files listed exist.

- [ ] **Step 3: Emoji + Google Fonts sanity check**

```bash
grep -rlP '[\x{1F300}-\x{1FAFF}\x{2700}-\x{27BF}]' src/ public/ 2>/dev/null || echo CLEAN
grep -rE "fonts\.(googleapis|gstatic)" dist/ src/ 2>/dev/null || echo NO_GOOGLE_FONTS
```
Expected: both report CLEAN / NO_GOOGLE_FONTS.

- [ ] **Step 4: Deploy to dev URL**

```bash
pnpm deploy
```
Expected: wrangler deploys; route binding to `dev.theagentsees.com/*` confirmed in the output.

- [ ] **Step 5: Smoke test the deployed pages**

In a browser, open in turn:

- `https://dev.theagentsees.com/`
- `https://dev.theagentsees.com/work`
- `https://dev.theagentsees.com/studio`
- `https://dev.theagentsees.com/privacy` (regression check from Plan 1)
- `https://dev.theagentsees.com/terms` (regression check)
- `https://dev.theagentsees.com/this-page-does-not-exist` (should hit the 404)
- `https://dev.theagentsees.com/sitemap-index.xml` (should serve XML, not 404)

Each should render correctly, no console errors, no FOUC. The Home page hero should fit roughly within one viewport on desktop.

- [ ] **Step 6: Push branch**

```bash
git push
```

- [ ] **Step 7: Milestone commit**

```bash
git commit --allow-empty -m "milestone: Plan 2 complete — Home / Studio / Work / 404 live on dev"
git push
```

---

## Self-Review Summary

Before declaring Plan 2 done:

- [ ] `src/pages/` contains: `index.astro`, `work.astro`, `studio.astro`, `privacy.astro`, `terms.astro`, `404.astro` (6 files)
- [ ] All 6 pages prerender; their `index.html` exists under `dist/`
- [ ] `dist/sitemap-index.xml` and `dist/sitemap-0.xml` exist; `/404` is excluded
- [ ] `public/robots.txt` points at `sitemap-index.xml`
- [ ] `pnpm build`, `pnpm check`, `pnpm test` all succeed
- [ ] No emojis anywhere in `src/` or `public/`
- [ ] No `fonts.googleapis.com` or `fonts.gstatic.com` references
- [ ] No inline `style="grid-template-columns: ..."` that has a Tailwind `md:grid-cols-*` partner — layout lives in scoped `<style>` blocks
- [ ] `TODO:founder-bio` marker remains in `studio.astro` (intentional — founder fills it before launch)
- [ ] Legacy root `sitemap.xml` deleted
- [ ] All pages live on `https://dev.theagentsees.com/`
- [ ] Production `theagentsees.com` still untouched (legacy site serving)
- [ ] `rebuild` branch pushed; `main` not merged

## Out of scope (Plan 3+ handles these)

- The actual live Lead Qualifier agent backend (Plan 4)
- The interactive Contact form (Plan 3)
- Founder name / portrait / bio content (founder owns; can land any time before cutover)
- Performance tuning beyond what falls out of fewer-bytes choices (revisit if Lighthouse < 95 after Home lands)
- Cutover of production route (Plan 5)
