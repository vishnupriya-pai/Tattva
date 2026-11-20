# uiRefactor.md — Tattva UI Refactor Spec

> **For the coding agent.** This document is the single source of truth for the Tattva visual refactor.
> Follow it literally. Where this file and existing code disagree, this file wins.
> Do **not** change product behaviour, data flow, API calls, routes, or copy meaning — this is a **visual-only** refactor unless a section below explicitly says otherwise.

---

## 0. TL;DR for the agent

1. Install the token layer (§3) in `globals.css`.
2. Remove **every** hard-coded colour (`[#xxxxxx]`, `slate-*`, `amber-*`, `lime-*`, `stone-*`, etc.) and replace it with a token (§4 mapping).
3. Apply the **Gold Budget** (§2.1): delete gold wherever it is not "earned".
4. Swap typography (§5). Nothing under 12px. Monospace only for data.
5. Replace borders with spacing/surface steps (§6).
6. Wire `data-mode="research"` and `data-theme="light"` (§7).
7. Restyle the Knowledge Graph by semantic state (§8.6).
8. Run every check in §10. The task is not done until all pass.

---

## 1. Context — why this refactor exists

Tattva is an elite, high-friction learning + credentialing platform ("the Bloomberg Terminal for human capital"). The PRD asks for a look "inspired by vintage academic journals, university press book covers, and terminal interfaces" — uniformly professional, intellectual, clean.

The current UI is black & gold, which is the right direction, but it reads as a **crypto dashboard / gaming HUD**, not premium. Audit findings:

| # | Problem | Evidence in current code |
|---|---------|--------------------------|
| 1 | Tokens exist but components bypass them | `:root --color-accent: #c59a67` defined, yet `text-[#d4af37]` used 15×, `bg-[#d4af37]`, `from-/to-[#d4af37]`, `hover:bg-[#e5c158]` |
| 2 | Two competing golds | `#D4AF37` (saturated metallic) and `#C59A67` (tan) side by side |
| 3 | Gold is wallpaper | ~40 gold elements on the Source workspace: tags, pills, progress, tab underline, labels, stamina, graph edges |
| 4 | Contrast flat-out maximal | Near-white text on `#12100E` (~15:1); even "muted" text ~7:1; pure `#FFF` and `#000` in places → no hierarchy |
| 5 | Warm/cool temperature clash | Warm bg `#12100E` / `#181512` + cool `slate-*` text + cool panels `#0B0D0F` / `#13161B` / `#181B22` |
| 6 | Too many signal colours | gold, lime `#A3E635` with neon glow, emerald, red, yellow, green dot |
| 7 | Cramped, noisy type | dominant size 12px, many 9–10px labels; uppercase tracked monospace on almost every label; system font for headlines |
| 8 | Box soup | 15+ hairline borders per screen, outlined pills, boxed stats |
| 9 | PRD contradictions | Research Mode is supposed to *shift* to high contrast (impossible — already max). The "Be Careful Here!!" trap is supposed to be *the* high-visibility element (it competes with everything) |
| 10 | Polish defects | API error toast overlaps page title; Next.js dev badge visible; theme toggle does nothing; empty states are a single grey line; graph labels ~9px; tooltip covers graph; unexplained black rectangle top-right of Proof Ledger graph |

---

## 2. Design principles (hard rules)

### 2.1 Gold = EARNED (the Gold Budget)
Gold is a reward signal, not decoration. **Maximum 3 gold elements visible per screen.**

Gold is **allowed** only on:
- "Conquered" badges and Boss-Fight victory states
- Mastered / conquered graph nodes
- The Cognitive Stamina score value (the number itself)
- The Research Mode toggle **when ON**
- The single primary CTA on a screen (e.g. "Start a new inquiry")
- Active nav item indicator (thin 2px underline only — not text colour)

Gold is **forbidden** on:
- Category tags/chips (e.g. `AIML`, `TRANSCRIPT`) → neutral
- Section headings / eyebrow labels (e.g. `KNOWLEDGE GRAPH`, `LEARNER PROFILE`) → `fg-muted`
- Icons (unless inside an allowed element)
- Tab underlines in content tabs → `fg` underline
- Graph edges → `line-strong`
- Progress bars that are not mastery-of-a-conquered-thing → `fg-body`
- Hover states on secondary elements
- Gradients of any kind

### 2.2 Red = TRAP (the one loud colour)
`--color-trap` is reserved for the "⚠️ Be Careful Here!!" adversarial trap state and destructive/error states. When a trap fires, it must be the most visually dominant thing on the screen. Nothing else may use saturated red.

### 2.3 Calm by default, intense in Research Mode
Default mode uses softened contrast tiers. Research Mode (`data-mode="research"`) darkens the background, brightens text and gold, and adds a thin gold frame. The toggle must produce a change that is obvious from across a room.

### 2.4 One temperature
Everything is warm: warm near-blacks, warm off-whites, warm greys. **No** `slate`, `zinc`, `gray`, `neutral` (cool) Tailwind palettes. **No** blue-black panels. **No** pure `#000` or `#FFF`.

### 2.5 Hierarchy through tiers, not through colour
Four text tiers (§3). Every text element must map to exactly one tier.

### 2.6 Space over lines
Prefer spacing and surface-step changes to borders. Borders only where they carry meaning (inputs, focus, dividers between unrelated regions).

### 2.7 Academic, not arcade
No neon glows, no glow shadows, no gradients on UI chrome, no pulsing decorations except the trap alert and the Boss-Fight celebration.

---

## 3. Token layer (install exactly)

Place in `app/globals.css` (or the project's global stylesheet). If Tailwind v4: inside `@theme`. If Tailwind v3: define as CSS variables in `:root` and map them in `tailwind.config` `theme.extend.colors` / `fontFamily` / `fontSize` with the **same names** so the utilities below (`bg-surface-1`, `text-fg-muted`, etc.) exist.

Remove the old `--color-accent`, `--color-accent-subdued`, `--color-bg`, `--color-surface`, `--color-fg` definitions and update their usages to the new names.

```css
@theme {
  /* Surfaces — one warm temperature, stepped by ~3% lightness */
  --color-bg:          #12110F;
  --color-surface-1:   #191714;   /* cards, panes */
  --color-surface-2:   #211F1B;   /* raised: popovers, active tab, inputs */
  --color-surface-3:   #2A2722;   /* hover on surface-2 */

  /* Lines */
  --color-line:        rgb(236 230 218 / 0.07);
  --color-line-strong: rgb(236 230 218 / 0.13);

  /* Text tiers (contrast vs --color-bg) */
  --color-fg:          #E9E3D7;   /* titles, key numbers   ~14:1 */
  --color-fg-body:     #BDB5A8;   /* paragraphs            ~9:1  */
  --color-fg-muted:    #8C857A;   /* labels, meta          ~5:1  */
  --color-fg-faint:    #5E5850;   /* disabled, placeholder ~3:1  */

  /* Gold = earned */
  --color-gold:        #C8A86B;   /* oklch ≈ 0.75 0.085 80 */
  --color-gold-hover:  #D5B87F;
  --color-gold-ink:    #1A1712;   /* text on gold fills */
  --color-gold-wash:   rgb(200 168 107 / 0.10);
  --color-gold-line:   rgb(200 168 107 / 0.35);

  /* Semantic */
  --color-explored:    #8FA58C;   /* sage: visited / in progress */
  --color-trap:        #D9604C;   /* the ONE loud colour */
  --color-trap-wash:   rgb(217 96 76 / 0.12);
  --color-live:        #8FA58C;   /* status dot */

  /* Type */
  --font-display: "Newsreader", "Source Serif 4", Georgia, serif;
  --font-sans:    "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono:    "JetBrains Mono", ui-monospace, monospace;

  --text-xs:   12px;
  --text-sm:   13px;
  --text-base: 15px;
  --text-lg:   18px;
  --text-xl:   24px;
  --text-2xl:  32px;
  --text-3xl:  48px;
}

/* Research Mode — the PRD's "high-contrast shift" */
[data-mode="research"] {
  --color-bg:        #0A0908;
  --color-surface-1: #11100E;
  --color-surface-2: #181613;
  --color-fg:        #F4EFE5;
  --color-fg-body:   #D2CABD;
  --color-gold:      #D9B977;
  --color-line:      rgb(236 230 218 / 0.10);
}
[data-mode="research"] body {
  box-shadow: inset 0 0 0 1px var(--color-gold-line);
}

/* Light theme — paper & ink */
[data-theme="light"] {
  --color-bg:          #F6F2EA;
  --color-surface-1:   #FFFDF8;
  --color-surface-2:   #EFEAE0;
  --color-surface-3:   #E6E0D4;
  --color-line:        rgb(30 26 20 / 0.08);
  --color-line-strong: rgb(30 26 20 / 0.15);
  --color-fg:          #1C1915;
  --color-fg-body:     #423C34;
  --color-fg-muted:    #756E63;
  --color-fg-faint:    #A69F93;
  --color-gold:        #9C7A3C;
  --color-gold-hover:  #87682F;
  --color-gold-ink:    #FFFDF8;
}

body {
  background: var(--color-bg);
  color: var(--color-fg-body);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
```

Shadows: at most one elevation shadow for popovers/modals: `0 8px 24px rgb(0 0 0 / 0.35)`. No coloured shadows.

Radius: pick **one** scale and use it everywhere — `6px` for chips/inputs/buttons, `10px` for cards/panels, `9999px` only for avatars and status dots.

---

## 4. Class migration map

Apply across the entire codebase (`app/`, `src/`, `components/`, any `*.tsx|*.jsx|*.ts|*.css`).

### 4.1 Backgrounds
| Old | New |
|-----|-----|
| `bg-black`, `bg-[#000]`, `bg-[#090a0d]`, `bg-[#0b0d0f]` | `bg-bg` |
| `bg-[#12100e]`, `bg-[#111317]`, `bg-[#13161b]` | `bg-surface-1` |
| `bg-[#181512]`, `bg-[#181b22]`, `bg-stone-800` | `bg-surface-2` |
| `bg-stone-900`, `from-stone-800 to-stone-900` gradients | `bg-surface-1` (remove gradient) |
| `bg-white/10`, `bg-white/5` overlays | `bg-surface-2` or `bg-surface-3` |
| `bg-[#d4af37]`, `bg-[#c59a67]` | `bg-gold` **only if allowed by §2.1**, else remove |
| `bg-[#d4af37]/10`, `/15` | `bg-gold-wash` **only if allowed**, else `bg-surface-2` |
| `hover:bg-[#e5c158]` | `hover:bg-gold-hover` |
| `bg-[#a3e635]` | `bg-live` |

### 4.2 Text
| Old | New |
|-----|-----|
| `text-white`, `text-slate-50/100`, `text-stone-100` | `text-fg` |
| `text-slate-200`, `text-stone-200` | `text-fg` (titles) or `text-fg-body` (body) |
| `text-slate-300`, `text-slate-400` | `text-fg-body` (paragraphs) or `text-fg-muted` (labels/meta) |
| `text-slate-500` | `text-fg-muted` |
| `text-slate-600/700` | `text-fg-faint` |
| `text-[#d4af37]`, `text-[#c59a67]`, `text-amber-*`, `text-yellow-*` | `text-gold` **only if allowed by §2.1**, else `text-fg` or `text-fg-muted` |
| `hover:text-[#d4af37]`, `group-hover:text-[#d4af37]` | `hover:text-fg` |
| `hover:text-slate-200` | `hover:text-fg` |

### 4.3 Borders
| Old | New |
|-----|-----|
| `border-white/10`, `border-white/5` | `border-line` (or remove — see §6) |
| `border-white/15`, `border-white/20` | `border-line-strong` |
| `border-[#d4af37]/20`, `/30` | `border-line` (or `border-gold-line` only if allowed) |
| `border-[#d4af37]` (solid) | remove, or `border-gold-line` if allowed |
| `hover:border-[#d4af37]/60`, `hover:border-[#c59a67]/60` | `hover:border-line-strong` |
| `after:bg-[#c59a67]` (underline pseudo) | `after:bg-gold` for **top nav active only**; `after:bg-fg` for content tabs |

### 4.4 Effects to delete outright
- `shadow-[0_0_*]` (all glow shadows)
- `drop-shadow-*` with colour
- `from-[#d4af37]`, `to-[#d4af37]`, any `bg-gradient-*` on chrome
- `animate-pulse` on anything other than the trap alert / live dot
- `radial-gradient(...)` dotted/glow backgrounds behind content (keep a subtle dot grid only on the graph canvas, using `--color-line`)

---

## 5. Typography

### 5.1 Fonts
Load with `next/font/google` (or equivalent) and expose as CSS variables bound to `--font-display`, `--font-sans`, `--font-mono`:
- **Newsreader** (opsz, 400/500/600) — display/headlines
- **Inter** (400/500/600) — all UI and body
- **JetBrains Mono** (400/500) — data only

### 5.2 Usage rules
| Element | Font | Size | Weight | Colour | Case/tracking |
|---|---|---|---|---|---|
| Hero headline (Overview) | display | `text-3xl` (48px), md+ `56px` | 500 | `fg` | normal, `-0.02em` |
| Page title (e.g. "Transformers & Self-Attention Architecture") | display | `text-2xl` (32px) | 500 | `fg` | normal, `-0.01em` |
| Section heading ("Knowledge Graph", "Your active knowledge graphs") | sans | `text-sm` (13px) | 600 | `fg-muted` | **sentence case**, `0.01em` |
| Body / transcript paragraphs | sans | `text-base` (15px) | 400 | `fg-body` | line-height 1.7, max-width 68ch |
| Labels / meta ("Runtime", "Mastered") | sans | `text-xs` (12px) | 500 | `fg-muted` | normal |
| Stat numbers (3, 16, 5/16, 410) | mono | `text-xl` (24px) | 500 | `fg` (Stamina value → `gold`) | tabular-nums |
| Ledger IDs, file refs (`seed/source-transformers.txt`), formulas | mono | `text-xs`/`text-sm` | 400 | `fg-muted` | normal |
| Buttons | sans | `text-sm` (13px) | 500 | per variant | **sentence case**, no tracking |
| Nav items | sans | `text-sm` (13px) | 500 | `fg-muted`, active `fg` | normal |
| Brand wordmark "TATTVA" | display | 18px | 600 | `fg` | `0.12em` uppercase (the **only** tracked-uppercase element) |

### 5.3 Hard type rules
- **Nothing below 12px. Anywhere.** Including graph node labels, badges, legend, tooltips.
- **Monospace only for**: numbers/scores, IDs, file paths, code, formulas, timestamps. Never for labels, headings, buttons, nav, or chips.
- **No uppercase + letter-spacing** except the wordmark. Convert `KNOWLEDGE GRAPH` → `Knowledge graph`, `START A NEW INQUIRY` → `Start a new inquiry`, `RESEARCH MODE: ACTIVE (3X)` → see §8.3.
- Remove `tracking-[*]`, `tracking-wider`, `tracking-widest`, `uppercase` from everything except the wordmark.
- Use `font-variant-numeric: tabular-nums` on all changing numbers.

---

## 6. Layout, spacing, borders

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px only.
- Card padding: 20–24px. Section gap: 32–48px.
- **Stat cards** (Domains / Nodes / Stamina / Streak, Mastered / In Progress / Quiz Passed): remove borders; use `bg-surface-1` with 10px radius, or a borderless row separated by 24px gaps.
- **Section headers**: no bottom border; 16px gap to content.
- **Tab bar** (Source Transcript / Active Quizzes / …): single `border-b border-line` under the whole bar; active tab = `text-fg` + 2px `bg-fg` underline. Inactive = `text-fg-muted`. Count badges (`5/16`, `(1)`) = `text-fg-faint` mono, no box.
- **Chips/tags** (`AIML`, `TRANSCRIPT`, `INTELLECTUAL EXECUTION PLATFORM`): `bg-surface-2 text-fg-muted text-xs rounded-[6px] px-2 py-0.5`, no border, sentence case. Remove the `TRANSCRIPT` chip entirely if it duplicates the active tab.
- **List rows** (Since day one: Transformers / OS / Crypto): no per-row border; `hover:bg-surface-2`, 8px vertical padding, count right-aligned in `fg-faint` mono.
- Max **one** visible border per card. Borders only on: inputs, the split-pane divider, the tab-bar baseline, popovers.

---

## 7. Modes & theme wiring

### 7.1 Research Mode
- State lives wherever it lives today — do not change the business logic or the 3× multiplier.
- When ON: set `document.documentElement.dataset.mode = "research"`. When OFF: delete the attribute.
- Persist nothing new beyond what already exists.
- Transition: `transition: background-color 400ms ease, color 400ms ease` on `body` and surfaces so the shift is felt.

### 7.2 Theme toggle (currently non-functional)
- Toggle `document.documentElement.dataset.theme = "light"` / remove for dark.
- Persist in `localStorage` (wrap in try/catch). Read on load before paint to avoid flash (inline script in `<head>` or `next-themes` if already a dependency — do not add new deps without need).
- Research Mode overrides apply in dark only; in light theme Research Mode = `--color-bg: #EFE9DD`, `--color-fg: #0F0D0A`, gold frame stays.

---

## 8. Component-level specs

### 8.1 Top navigation
- Height 56px, `bg-bg`, `border-b border-line`.
- Wordmark per §5.2. Logo mark: monochrome `fg`, no gold box.
- Nav items single line (shorten labels if they wrap: "Overview", "Graph", "Sources", "Ledger"). Active: `text-fg` + 2px `bg-gold` underline. Inactive: `text-fg-muted hover:text-fg`.
- Stamina pill: no border; `bg-surface-1`, live dot `bg-live` (6px, no glow), value in mono `text-gold`.
- Theme button & avatar: `bg-transparent hover:bg-surface-2`, icon `fg-muted`, no border.

### 8.2 Buttons
| Variant | Style |
|---|---|
| Primary (max 1 per screen) | `bg-gold text-gold-ink hover:bg-gold-hover rounded-[6px] h-10 px-4 text-sm font-medium` |
| Secondary | `bg-surface-2 text-fg hover:bg-surface-3 rounded-[6px] h-10 px-4` |
| Ghost | `bg-transparent text-fg-muted hover:text-fg hover:bg-surface-2` |
| Danger | `bg-trap-wash text-trap hover:bg-trap hover:text-fg` |
Focus ring for all: `outline-2 outline-offset-2 outline-gold-line`.
"Back to sources" → Ghost. "Share", zoom controls → Ghost.

### 8.3 Research Mode toggle (PRD: "prominent, physical-looking toggle switch")
Replace the current "● RESEARCH MODE: ACTIVE (3X)" pill with:
- A real switch: track 44×24, `bg-surface-3` off / `bg-gold` on; thumb 20px `bg-fg` with subtle `0 1px 2px rgb(0 0 0/.4)`.
- Label "Research mode" `text-sm text-fg` + sub-label "3× stamina" `text-xs text-fg-muted` (→ `text-gold` when ON).
- `role="switch"`, `aria-checked`, keyboard-togglable.

### 8.4 Mastery strip ("Topic in-and-out mastery 68% · Proficient")
- No outer border; `bg-surface-1` card.
- Label `text-xs text-fg-muted` sentence case. Value `68%` mono `text-xl text-fg`, "Proficient" `text-sm text-fg-body`.
- Progress bar: track `bg-surface-3` 4px, fill `bg-fg-body`. Fill turns `bg-gold` **only at 100% / mastered**.
- Mini stats per §5.2 stat numbers, labels below in `fg-muted`.

### 8.5 "Be Careful Here!!" trap alert (the loudest component)
- Full-width banner in the right pane, above the graph/input, `bg-trap-wash`, 3px left border `border-trap`, radius 10px, padding 20px.
- Title "⚠ Be careful here" — sans 18px 600 `text-trap`. Body `text-fg` 15px.
- Disabled chat input visibly greyed (`opacity-50`, `cursor-not-allowed`) with helper text `text-fg-muted`: "Resolve the trap to continue."
- Entrance: 200ms fade+4px slide; a single 600ms `trap` outline pulse on mount. No infinite animation.
- While a trap is active, dim other gold elements on screen to `opacity-60` so nothing competes.

### 8.6 Knowledge Graph (React Flow)
- Canvas `bg-bg`, optional dot grid using `--color-line` at 24px gap.
- **Edges**: 1.25px `--color-line-strong`, no gold, no glow. Active path edge: `--color-fg-muted`. Trap edge: dashed `--color-trap`.
- **Node states** (map existing heatmap states to these — this is the legend):
  | State | Ring/stroke | Fill | Icon |
  |---|---|---|---|
  | Initial / unvisited | `line-strong` | `surface-1` | `fg-muted` |
  | Explored / in progress | `explored` | `surface-1` | `explored` |
  | Mastered / Conquered | `gold` 2px | `gold-wash` | `gold` |
  | Trap / divergent | `trap` 2px | `trap-wash` | `trap` |
  | Root ("Your learning core") | `fg` 1.5px | `surface-2` | `fg` |
- Node labels: title `text-xs`(12px) 500 `fg`, subtitle 12px `fg-muted`, max 2 lines with ellipsis. **No 9–10px text.** State badge (`PROBE`, `ADVISED`) → small `text-xs` `fg-faint`, sentence case, no box.
- Legend: bottom-left, `bg-surface-1/90 backdrop-blur`, no border, items `text-xs text-fg-muted`; labels: "Unvisited", "Explored", "Mastered", "Trap". Remove "Yellow (Moderate)" / "Green (Deep Dive)" wording.
- Onboarding hint bubble must not cover nodes: anchor top-right, max-width 280px, dismissible, `bg-surface-2`, no border.
- Remove/fix the stray black rectangle overlay in the top-right of the Proof Ledger canvas (likely an un-styled minimap — style it `bg-surface-1` with `maskColor` = `rgb(18 17 15 / 0.7)` or hide it below 1024px).

### 8.7 Badges ("Polymath", "Trap Survivor", …)
- Unearned: `bg-surface-1`, icon & title `fg-muted`, desc `fg-faint`.
- Earned: `bg-surface-1` + `border border-gold-line`, icon `gold`, title `fg`, desc `fg-muted`.
- No green/emerald badge variants — earned is gold, period.
- "Conquered" (Boss Fight) badge may use solid `bg-gold text-gold-ink`.

### 8.8 Source transcript pane (left)
- Reading column max-width 68ch, `text-base` 15px, `line-height 1.7`, `fg-body`.
- Inline math/formulas in mono `fg`. Paragraph gap 16px.
- Meta line ("Runtime 32:50 · Reference seed/…") in `text-xs`: label sans `fg-muted`, values mono `fg-muted`.

### 8.9 Overview / landing
- Eyebrow chip per §6; replace "· SYSTEM: ACTIVE" with plain `text-xs text-fg-muted` "System active" + `live` dot.
- Hero: display font per §5.2; subcopy `text-lg fg-body` max-width 60ch.
- Primary CTA: Primary button, sentence case "Start a new inquiry →".
- Empty state ("No inquiries initiated yet."): centred, icon `fg-faint` 24px, title `fg` 15px 500, body `fg-muted`, **plus** a Secondary button "Browse the Tattva 200" or "Start a new inquiry". Card `bg-surface-1`, no dashed border.
- "Select an inquiry to enter split-screen workspace" hint: sans `text-xs fg-faint`, not mono.

### 8.10 Knowledge Graph page empty state
Replace the lone "No active inquiry selected." with the same empty-state pattern as §8.9 including a CTA.

### 8.11 Toasts / errors
- Position: bottom-right (or below header, right-aligned), never overlapping page titles.
- Style: `bg-surface-2 text-fg` 13px, left 3px border `trap` for errors, `explored` for success. Radius 10px. Auto-dismiss 6s, deduplicate identical messages (the `/api/v1/me` error currently re-fires on every page — show once per session).

### 8.12 Boss-Fight "Conquered" celebration (PRD §6)
If implemented: allowed to be the most gold moment in the product — gold particle/confetti + large display-font "Conquered" + badge. Keep it under 2.5s, respect `prefers-reduced-motion` (fallback: static gold badge reveal).

---

## 9. Explicitly out of scope / do not

- Do **not** change routes, API endpoints, Supabase queries, ledger logic, stamina math, quiz logic, or React Flow layout algorithm.
- Do **not** rename components or move files unless needed to share a primitive (e.g. extracting `<Button>`, `<Chip>`, `<StatCard>`, `<Switch>` is encouraged).
- Do **not** add UI libraries. `next/font` is fine. Prefer existing deps.
- Do **not** introduce new colours. If you think you need one, use the nearest token and leave a `// TODO(design):` comment.
- Do **not** use inline `style={{ color: '#…' }}`.
- Do **not** leave any `[#hex]` Tailwind arbitrary colour values.
- Hide the Next.js dev indicator for demo builds (`devIndicators: false` in `next.config` or equivalent) — do not delete it from dev config if the team relies on it; gate on an env var.

---

## 10. Acceptance checks (all must pass)

### 10.1 Static greps — must return **zero** results
Run from repo root (adjust dirs to the project):
```bash
rg -n '\[#[0-9a-fA-F]{3,8}' app src components
rg -n '\b(slate|zinc|gray|neutral|stone|amber|yellow|lime|emerald|green|red|orange)-[0-9]{2,3}\b' app src components
rg -n 'text-\[(8|9|10|11)px\]|text-\[0\.[5-6]' app src components
rg -n 'shadow-\[0_0_' app src components
rg -n 'bg-gradient-|from-\[|to-\[' app src components
rg -n '#d4af37|#D4AF37|#c59a67|#C59A67|#a3e635' app src components
rg -n "style=\{\{[^}]*#[0-9a-fA-F]{3,8}" app src components
rg -n 'tracking-(wide|wider|widest|\[)' app src components   # only allowed on the wordmark — expect exactly 1 hit
rg -n '\buppercase\b' app src components                     # only allowed on the wordmark — expect exactly 1 hit
```

### 10.2 Build
- `npm run build` (or project equivalent) passes with no new type/lint errors.

### 10.3 Visual checks (screenshot each route: Overview, Knowledge Graph, Sources workspace, Proof Ledger; dark, dark+research, light)
- [ ] **Gold count** ≤ 3 visible gold elements per screen (excluding graph nodes in Mastered state).
- [ ] **Grayscale test**: with `html { filter: grayscale(1) }`, the primary action and page title are still the clear focal points.
- [ ] **Blur test**: with `filter: blur(4px)`, one focal area per screen, not many.
- [ ] **Research Mode test**: toggling produces an obvious, room-visible change (darker bg, brighter text, gold frame).
- [ ] **Theme test**: light theme renders with no dark leftovers and readable gold.
- [ ] **Trap test**: forcing `is_trap = true` makes the trap banner the dominant element; chat input disabled.
- [ ] No text renders below 12px (check graph labels at 100% zoom).
- [ ] No warm/cool clash: no blue-grey text, no blue-black panels.
- [ ] Error toast never overlaps a title; shows once.
- [ ] Empty states each have a CTA.
- [ ] No stray black rectangle on the graph canvas.

### 10.4 Contrast (WCAG)
- `fg` on `bg` ≥ 12:1; `fg-body` on `bg` ≥ 7:1; `fg-muted` on `bg` ≥ 4.5:1; `fg-muted` on `surface-1` ≥ 4.5:1.
- `gold-ink` on `gold` ≥ 7:1. `trap` on `trap-wash` over `bg` ≥ 4.5:1.
- Light theme: same thresholds against `#F6F2EA`.

---

## 11. Suggested execution order & commits

1. `chore(ui): add design tokens and fonts` — §3, §5.1
2. `refactor(ui): migrate colours to tokens` — §4 (mechanical, whole repo)
3. `refactor(ui): apply gold budget` — §2.1 (judgement pass, file by file)
4. `refactor(ui): typography pass` — §5.2–5.3
5. `refactor(ui): reduce borders, spacing scale` — §6
6. `feat(ui): wire research mode and theme attributes` — §7
7. `refactor(ui): nav, buttons, switch, mastery strip` — §8.1–8.4
8. `refactor(ui): trap alert` — §8.5
9. `refactor(ui): knowledge graph node states and legend` — §8.6
10. `refactor(ui): badges, transcript, overview, empty states, toasts` — §8.7–8.11
11. `chore(ui): demo build polish` — dev indicator, §9
12. Run §10; fix until green. Report: grep outputs, screenshots of each route × mode, list of any `TODO(design)` comments left.

---

## 12. Reference: final palette at a glance

```
Surfaces   bg #12110F · s1 #191714 · s2 #211F1B · s3 #2A2722
Text       fg #E9E3D7 · body #BDB5A8 · muted #8C857A · faint #5E5850
Gold       #C8A86B  (hover #D5B87F, ink #1A1712)     → EARNED ONLY
Explored   #8FA58C  (sage)
Trap       #D9604C  (the one loud colour)
Fonts      Newsreader (display) · Inter (UI/body) · JetBrains Mono (data only)
Min size   12px
```
