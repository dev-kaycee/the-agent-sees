# The Agent Sees — Site Revamp Design

**Date:** 2026-05-17
**Status:** Draft for user review
**Owner:** Solo (founder)

## 1. Goals & Positioning

### Goal of the rebuild

Replace the current stylized but content-fictional 7-page agency site with a credible 5-page studio site that converts early-stage startup founders into MVP/AI-build engagements. Honesty is the differentiator: no fabricated stats, no fictional clients, no fictional testimonials. Live, working demos do the work that fictional case studies were doing.

### Positioning

> We build AI-powered MVPs, web apps, and the agents that run inside them.

Audience: technical or technically-curious founders at pre-seed → seed stage who need a real product shipped fast and well.

Tone: founder-to-founder, technically credible, opinionated without being arrogant.

### What gets dropped from the current site

- All 5 fictional case-study pages
- The 869-line `automation.html` (its marketing argument folds into Home and Work)
- Fabricated stats: "120+ projects", "50+ clients", "99% uptime", "3× faster"
- Fictional testimonial from a fictional CTO at a fictional company
- Custom mouse cursor / cursor ring
- Ticker tape and decorative `✦` characters
- Every Unsplash agency-people-on-laptops stock image
- `formsubmit.co` third-party form integration
- Microsoft Clarity (session replay)
- Google Fonts CDN (replaced by self-hosted woff2)

### What replaces them

- 1 working interactive demo (Lead Qualifier) backed by Cloudflare Workers AI
- Honest copy that says "new studio, here's how we think, here's what we've shipped so far"
- Cloudflare Web Analytics (cookieless, lightweight)
- Self-hosted fonts
- Cloudflare-native form handling (D1 + Turnstile + Resend)

## 2. Information Architecture

Five pages plus legal.

| Path | Purpose | Hero promise |
|------|---------|--------------|
| `/` | Convert. Anchor the brand. | "Agents that see. MVPs that ship." |
| `/work` | Prove. Live demo + recent builds. | "See what we build, then try it." |
| `/studio` | Trust. Philosophy, process, founder. | "How we work, why we exist." |
| `/contact` | Convert (form). | "Tell us what you're building." |
| `/privacy`, `/terms` | Legal. | — |

## 3. Design System

### Visual direction

Swiss / Statement: white canvas, hard rules, condensed type, single bold highlight accent used sparingly. Confidence through restraint. Reads as a curated studio, not a generic AI startup.

### Color tokens

| Token | Value | Use |
|-------|-------|-----|
| `--ink` | `#0A0A0A` | Headlines, body text, rules |
| `--paper` | `#FFFFFF` | Canvas |
| `--paper-2` | `#F5F4F0` | Alt sections (studio bio, FAQ) |
| `--mute` | `#5A5A5A` | Secondary copy |
| `--hairline` | `rgba(0,0,0,0.1)` | Borders/rules |
| `--highlight` | `#FFE600` | Single-use accent on one marked word per page max |

No gradients. No drop shadows. No tinted backgrounds beyond `--paper-2`. Flat.

### Type system

- **Display:** Inter Display (the display-optimized cut of Inter, rsms-shipped, intended for sizes ≥ 20px) — weight 800, tracking `-0.04em`. Used for h1 and h2 only.
- **Body & UI:** Inter — 400 / 500 / 700.
- **Mono:** JetBrains Mono — 400, sparingly for technical accents (API endpoint shown in demo, file paths in studio process).

No italic serif (the current site's `DM Serif Display` italic is dropped — Swiss is rigid).

Self-hosted from `public/fonts/` as woff2. Inter and Inter Display ship together in the rsms Inter package; both go into `public/fonts/`. Subset to Latin + Latin Extended.

### Type scale (rem, root 16px)

`0.75 / 0.81 / 0.94 / 1.0 / 1.25 / 1.5 / 2 / 3 / 4.5 / 6`. No off-scale values.

### Spacing scale

4px base. `1 / 2 / 3 / 4 / 6 / 8 / 12 / 16 / 24` (× 4px). Page gutter: 24px mobile / 48px tablet / 96px desktop.

### Icon system

Inline SVG only. 24×24 viewBox, 1.5px stroke, `currentColor`, rounded line-cap. Small set bundled as Astro components: `<Arrow/>`, `<Spark/>`, `<Rule/>`, `<Plus/>`, plus topic icons per service.

**No emoji anywhere in the project — markup, copy, or UI. Use SVG.**

### Layout primitives

- 6px solid `--ink` bar at the top edge of every page (Swiss signature)
- Meta strip below: 3-cell row (`THE AGENT SEES` · `STUDIO · Nº01` · `2026 →`)
- 12-column grid, 24px gutter
- 1px solid `--ink` horizontal rules between sections
- Asymmetric headlines (left-anchored, generous trailing whitespace)
- Section labels: small caps, `0.14em` tracking, sits above each section's h2

### Motion

Restrained. Fade-up on scroll only for h2 + first paragraph per section (200ms, ease-out, 8px translate). `prefers-reduced-motion` honored. No custom cursor. No ticker. No counter animations.

### Imagery rules

Three approved sources only:
1. Real screenshots of demos / our own work
2. Abstract typographic mockups (large type compositions)
3. Stark documentary photography only where it serves a point (e.g., a founder photo, b&w, full-bleed)

Banned: agency-people-on-laptops Unsplash trope.

## 4. Page Content Blueprint

### `/` Home

1. Top bar + meta strip
2. **Hero** (one screen tall, max). Eyebrow: `AI · WEBAPPS · AUTOMATION`. Headline: `Agents that [see]. MVPs that ship.` — `see` is the single yellow-marked word. Sub: one sentence. Primary CTA: `See what we build →`. Secondary: `Get in touch →` (links to `/contact`). Right column: a "Now Building" status block (small heading + 2–3 plain-text lines like `Lead qualifier · live demo` and `Internal CRM agent · in build`). Content is hand-edited in the home page source — no CMS, just real strings the founder updates as work changes.
3. **What we build** — three offerings, hard-ruled grid, no decoration:
   - `01 — MVPs.` Web apps you'd actually ship. 4–8 week scopes.
   - `02 — Agents.` LLM-powered systems that act, not just answer.
   - `03 — Integrations.` Connecting tools so your ops stop being your bottleneck.
4. **Try the agent** (demo teaser). One paragraph + a button linking to `/work#demo`.
5. **Process** — 4 steps, hard-ruled, single line each: Discovery → Spec → Build → Ship.
6. **Recent / Notes** — 2–3 cards: short title + one-line subtitle + date.
7. **Contact strip** — headline `Tell us what you're building.` + email + CTA to `/contact`.
8. **Footer.**

### `/work`

1. Top bar + meta strip
2. **Header.** `Work / Demos`. Sub: "Try the agent. Read the build notes. We'll keep adding."
3. **Live demo: Lead Qualifier** (page anchor). Full spec in §5.
4. **Recent builds.** 1–3 honest cards (or a single "Exploring" card until the first real build).
5. **What's next.** Short list of things on deck + invitation to book a call.

### `/studio`

1. Top bar + meta strip
2. **Header.** `Studio`. Sub: "What we believe and how we work."
3. **Three principles**, large type, hard-ruled between:
   - `Ship the thing.`
   - `Type at the edge.`
   - `Software with a point of view.`
4. **Process detail** — 4 steps expanded to ~80 words each.
5. **Founder note** — one paragraph, first-person, real name + role + b&w portrait. Until the founder provides name + photo, the build uses a typographic placeholder and a `TODO:founder-bio` marker in the source so it's grep-able before launch.
6. **Contact strip.**

### `/contact`

1. Top bar + meta strip
2. **Header.** `Tell us what you're building.` Sub: one sentence + alt email link.
3. **Form** (single column, generous spacing):
   - Name (required)
   - Email (required)
   - Company / project name
   - What are you building? (textarea, required)
   - Timeline (select: ASAP / 1–3 months / Just exploring)
   - Budget (select: <$5k / $5–15k / $15–40k / $40k+ / Discussing)
   - Honeypot + invisible Turnstile
4. **Submit** posts to `/api/contact` (see §6).
5. **Confirmation state** inline, no redirect.
6. **Fallback.** "Or email hello@theagentsees.com directly."

### `/privacy`, `/terms`

Keep current content, restyle to the new system, remove references to dropped pages.

## 5. Live Demo Agent — Lead Qualifier

### What it does

Visitor pastes a hypothetical inbound lead. Agent returns structured assessment: classification, priority, suggested action, draft reply. The point is that a stranger experiences our shop's judgment before talking to us.

### Why this demo

Maps directly to what an early-stage founder cares about — handling inbound, sales motion, ops automation. Smallest demo that still feels real.

### Architecture

```
Browser (Astro island, Preact)
   │  POST /api/agents/lead-qualifier  { lead: string, ts_token: string }
   ▼
Cloudflare Worker (TypeScript, src/pages/api/agents/lead-qualifier.ts)
   ├─ Verify Turnstile token
   ├─ Rate limit: 5 req/min/IP via Workers KV
   ├─ Daily cap: 1000 calls/day (also KV-backed)
   ├─ Input length check (max 2000 chars)
   ├─ Call Workers AI binding: @cf/meta/llama-3.1-8b-instruct
   ├─ Structured-output prompt with JSON schema in system message
   ├─ Validate JSON against zod schema, retry once on parse failure
   └─ Stream response back to browser (SSE)
   ▼
Browser renders fields as they arrive
```

### Output schema (zod, validated server-side)

```ts
{
  classification: "tire_kicker" | "mvp_build" | "agent_or_automation"
                  | "integration" | "out_of_scope",
  priority: 1 | 3 | 5,                 // 3-point scale; small model calibrates better
  reasoning: string,                   // ≤ 200 chars
  suggested_action: string,            // imperative, ≤ 1 sentence
  draft_reply: string                  // 2 sentences, signed "— The Agent Sees"
}
```

### Prompt structure

System message: studio positioning + the schema + 2 calibration examples (one MVP-fit, one tire-kicker). User message wraps the visitor input. Bias toward honest classification — including marking visitor's own input as `tire_kicker` if it reads that way.

### Free-tier stack

- **Inference:** Cloudflare Workers AI (10,000 Neurons/day free). Model `@cf/meta/llama-3.1-8b-instruct`. No paid API.
- **Captcha:** Cloudflare Turnstile (free).
- **Rate limit + daily cap:** Workers KV (free tier sufficient).
- **Analytics:** Cloudflare Web Analytics (free).
- Cost = $0 across all components.

### Abuse / cost containment

1. Invisible Turnstile gate
2. 5 req/min/IP via KV counter (24h TTL)
3. Global daily cap: 1000 calls/day. Above cap, UI shows "demo is at today's limit — book a call."
4. Input truncated/rejected at 2000 characters

### UI states

Idle (placeholder + example) → submitting (skeleton fields) → streaming (fields populate as tokens arrive) → done (with `Try another` button) → error (graceful, with "or email us directly").

### Honesty disclaimer

Small print under the demo: "This demo runs on a free, on-device-grade model. Real engagements use models and tooling fitted to your data."

### Out of scope (v1 demo)

No conversation history, no auth, no save/share, no admin dashboard.

## 6. Contact Form

### Submit path

```
ContactForm (Preact island)
  ─ POST /api/contact { name, email, company, message, timeline, budget, ts_token, hp }
       │
       ▼
  Worker route src/pages/api/contact.ts
    1. Verify Turnstile token
    2. Honeypot check (silent reject if `hp` filled)
    3. Validate with shared zod schema
    4. Rate-limit: 3 submissions/hour/IP via KV
    5. Persist to D1 `submissions` table
    6. Send notification email via Resend (free tier, domain-verified)
       └─ to: hello@theagentsees.com
       └─ from: site@theagentsees.com
    7. Return { ok: true } or { ok: false, error }
```

### D1 schema

```sql
CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  message TEXT NOT NULL,
  timeline TEXT,
  budget TEXT,
  ip_hash TEXT,
  user_agent TEXT
);
CREATE INDEX idx_submissions_created ON submissions(created_at DESC);
```

D1 is the safety net: if Resend fails, submissions still persist and can be queried via `wrangler d1 execute`.

### Why Resend free tier (not MailChannels)

MailChannels removed free Cloudflare access in 2024. Resend free tier: 100 emails/day, 3,000/month — well above any plausible volume.

**One-time setup the founder must complete (Phase 1 of cutover):**
1. Sign up for Resend (free)
2. Add `theagentsees.com` as a domain in Resend dashboard
3. Add the 4 DNS records Resend generates (SPF, DKIM ×2, DMARC) to Cloudflare DNS
4. Wait for verification (usually < 1 hour)
5. Create an API key, store as `RESEND_API_KEY` Worker secret
6. Choose a "from" address on the verified domain (default: `site@theagentsees.com`)

### Privacy

No raw IP stored — only `sha256(ip + secret)` for abuse correlation. `/privacy` page discloses: contact form data stored 1 year then purged, email notifications via Resend, no analytics tracking on form interactions.

## 7. Stack & Project Layout

### Framework

Astro 5 with Tailwind 4. Static-first; selective islands only where interactivity is needed. No global JS framework, no client router, no SPA.

### Runtime

Cloudflare Workers via `@astrojs/cloudflare` adapter. Single deploy target — static HTML + server routes (demo, form) all run inside one Worker.

### Project structure

```
the-agent-sees/
├─ src/
│  ├─ pages/
│  │  ├─ index.astro
│  │  ├─ work.astro
│  │  ├─ studio.astro
│  │  ├─ contact.astro
│  │  ├─ privacy.astro
│  │  ├─ terms.astro
│  │  └─ api/
│  │     ├─ agents/lead-qualifier.ts
│  │     └─ contact.ts
│  ├─ components/
│  │  ├─ layout/
│  │  │  ├─ Base.astro
│  │  │  ├─ TopBar.astro
│  │  │  ├─ Nav.astro
│  │  │  └─ Footer.astro
│  │  ├─ ui/
│  │  │  ├─ Section.astro
│  │  │  ├─ Rule.astro
│  │  │  ├─ MetaStrip.astro
│  │  │  ├─ Button.astro
│  │  │  └─ Mark.astro
│  │  ├─ icons/
│  │  └─ islands/
│  │     ├─ LeadQualifier.tsx
│  │     └─ ContactForm.tsx
│  ├─ content/
│  │  ├─ builds/
│  │  └─ principles/
│  ├─ lib/
│  │  ├─ schema.ts
│  │  ├─ rate-limit.ts
│  │  └─ ai.ts
│  └─ styles/global.css
├─ public/
│  ├─ fonts/
│  ├─ favicon.svg
│  ├─ robots.txt
│  └─ sitemap.xml
├─ astro.config.mjs
├─ tailwind.config.ts
├─ wrangler.jsonc
├─ package.json
└─ tsconfig.json
```

### Interactivity strategy

- 99% of pages: `.astro` components, zero JS shipped.
- Lead Qualifier demo: one Preact island (~3kb), `client:visible`.
- Contact form: one Preact island (validation + Turnstile + inline confirmation).

### Fonts

Self-host Inter and JetBrains Mono (woff2) under `public/fonts/` with `font-display: swap`. Drop Google Fonts. Subset to Latin + Latin Extended.

### Analytics

Cloudflare Web Analytics (cookieless, no GDPR banner needed). Drop Microsoft Clarity.

### Bindings (wrangler.jsonc)

```jsonc
{
  "name": "the-agent-sees",
  "compatibility_date": "2026-05-01",
  "ai": { "binding": "AI" },
  "kv_namespaces": [{ "binding": "RATE_LIMIT", "id": "..." }],
  "d1_databases": [{ "binding": "DB", "database_name": "submissions", "database_id": "..." }],
  "vars": { "TURNSTILE_SITE_KEY": "..." },
  "secrets_store_secrets": [
    { "binding": "TURNSTILE_SECRET_KEY", "store_id": "...", "secret_name": "..." },
    { "binding": "RESEND_API_KEY", "store_id": "...", "secret_name": "..." }
  ]
}
```

### Performance budget

| Metric | Budget |
|---|---|
| Total JS on `/` | ≤ 5 KB |
| Total JS on `/work` | ≤ 20 KB (Preact + island) |
| LCP on `/` | < 1.5s on slow 4G |
| CLS | < 0.05 |
| Lighthouse Performance | ≥ 95 mobile |
| Initial HTML size | ≤ 30 KB |

## 8. Migration & Cutover

### Constraint

`theagentsees.com` is live. Cutover must not produce a broken site at any point.

### Timeline note

All phase durations below are rough estimates for a single solo developer working evenings/part-time. Adjust to your actual capacity — the *order* of phases is what matters, not the days.

### Phase 0 — Branch off, don't touch main

- Work on `rebuild` branch. Current `main` keeps deploying prod until cutover.
- `.superpowers/` added to `.gitignore`.

### Phase 1 — Scaffold Astro alongside the legacy site (5–7 days)

- Initialize Astro 5 + Tailwind 4 + `@astrojs/cloudflare` at repo root.
- Move legacy HTML to `archive/legacy/`.
- Wire up Tailwind tokens, layout primitives, icon set.
- Bind a `dev.theagentsees.com` Worker route to the new build as preview URL.

### Phase 2 — Build pages on the preview URL (10–14 days)

Order (each step shippable):
1. Base layout + nav + footer + `/privacy` + `/terms`
2. `/`
3. `/studio`
4. `/contact` (form + Worker + D1 + Resend)
5. `/work` shell
6. Lead Qualifier demo

After each: manual QA on dev URL (mobile + desktop, Lighthouse, axe-core).

### Phase 3 — Pre-cutover checklist (1 day)

- [ ] All 6 pages render with no console errors
- [ ] Lighthouse ≥ 95 mobile on every page
- [ ] axe-core: zero serious/critical issues
- [ ] Contact form on dev: submit → email arrives + D1 row persists + 3/hr limit triggers
- [ ] Lead Qualifier: 10 sample inputs → valid JSON, streaming, rate limit at 5/min
- [ ] Turnstile passes in browser, fails on cURL
- [ ] On-brand 404 page exists
- [ ] `sitemap.xml` regenerated, `robots.txt` matches new routes
- [ ] Redirect map implemented (below)
- [ ] DNS records for Resend domain verification pass
- [ ] OG image regenerated for new design
- [ ] Cloudflare Web Analytics enabled

### Redirect map

| Old URL | New URL |
|---|---|
| `/services.html` | `/#what-we-build` |
| `/work.html` | `/work` |
| `/automation.html` | `/#what-we-build` |
| `/case-study-*.html` (all 5) | `/work` |
| `/privacy.html` | `/privacy` |
| `/terms.html` | `/terms` |

301s in the Worker before Astro routing.

### Phase 4 — Cutover (15 minutes)

1. Merge `rebuild` → `main`. CI deploys.
2. Cloudflare Worker route `theagentsees.com/*` → new Worker.
3. Remove or repurpose `dev.theagentsees.com`.
4. Smoke test prod: home, demo, form, Resend dashboard, D1.
5. Submit new `sitemap.xml` to Google Search Console.

### Phase 5 — Cleanup (next day)

- Delete `archive/legacy/`.
- Remove unused dependencies.
- Squash-merge the rebuild PR.

### Rollback

`wrangler rollback` reverts to the previous Worker version in under a minute.

### Risk register

| Risk | Mitigation |
|---|---|
| Resend domain verification delayed by DNS | Verify in Phase 1, not Phase 3. 24h buffer. |
| Workers AI rate limit hit on launch day | Daily cap and graceful "at limit" UI in code. |
| Form submission lost from Worker error | D1 persist happens before Resend call; submissions never lost. |
| SEO drop from URL changes | 301s + sitemap submission cover this. |

## 9. Out of Scope (YAGNI)

Deliberately **not** building in v1. Each has a trigger to revisit.

| Not building | Why not now | Trigger to revisit |
|---|---|---|
| Blog / journal | Empty blog hurts more than no blog. | 3 posts written. |
| Newsletter signup | No content to send. | When blog exists. |
| Pricing page | Locks in numbers before calibration. | After 5 real engagements. |
| Multiple demos | One done well > three half-built. | First demo solid + second worth showing. |
| Auth / accounts / saved runs | No reason for a visitor to make an account. | If you build a real product. |
| Admin dashboard for submissions | `wrangler d1 execute` works. | When manual check becomes annoying. |
| i18n | Premature. | Real non-English pipeline. |
| Dark mode | Different design. | Strong reason emerges. |
| External CMS | MDX collections suffice for one person. | Non-technical collaborator needs to publish. |
| Custom illustrations | Typography carries the brand. | Budget + clear brief. |
| Live chat widget | Distracts from form. | Inbound exceeds form capacity. |
| Service pages (one per offering) | Folds into Home `What we build`. | Ads need dedicated landing pages. |
| Programmatic SEO pages | Empty calorie. | Real customer language to mine. |
| A/B testing | One page, no data. | Hypothesis worth testing. |
| Cookie banner | No cookies (Cloudflare Web Analytics is cookieless). | A tool that needs cookies. |

## 10. Definition of Done

- [ ] All 6 pages live at `theagentsees.com` on the new Astro build
- [ ] Lead Qualifier demo running on Workers AI, returning valid JSON, streaming, rate-limited
- [ ] Contact form posts to D1 + sends email via Resend
- [ ] Cloudflare Web Analytics enabled; Microsoft Clarity removed
- [ ] Lighthouse ≥ 95 mobile across all pages; CLS < 0.05
- [ ] No emojis anywhere in markup, copy, or UI
- [ ] Legacy HTML archived; redirect map active
- [ ] `archive/legacy/` removed in Phase 5

## 11. Open Items (Founder-Owned Content / Decisions)

Tracked here so they don't get lost. These can't be auto-generated — the founder owns each:

| Item | Needed for | Default if not provided |
|---|---|---|
| Real founder name | `/studio` founder note | `TODO:founder-bio` marker in source, blocks launch |
| Founder portrait (b&w preferred) | `/studio` founder note | Typographic placeholder; replace before launch |
| Founder bio (2–3 sentences) | `/studio` founder note | Same |
| Final demo choice if not Lead Qualifier | `/work` demo anchor | Lead Qualifier as default |
| Company registration name (if different from `The Agent Sees`) | Legal pages, footer | `The Agent Sees` |
| Physical address line (for `/privacy`, `/terms` legal compliance) | Legal pages | Generic "Remote · Worldwide" |
| Resend account + domain verification | Contact form email delivery | Form persists to D1 but no email notification |
| OG image asset (1200×630) | Social sharing previews | Auto-generated from headline + brand |
