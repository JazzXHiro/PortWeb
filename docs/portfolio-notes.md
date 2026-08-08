---
title: Portfolio Website — Build & Redesign Notes
tags:
  - portfolio
  - web-dev
  - html-css-js
  - project/portweb
created: 2026-07-22
updated: 2026-07-25
aliases:
  - PortWeb Notes
  - Keerti Portfolio Notes
---

# Portfolio Website — Build & Redesign Notes

> [!info] Context
> Personal portfolio for a Computer Science student (game-dev focus). Static site — plain HTML/CSS/JS, no build step. This note captures the current architecture after adopting the `portfolio-3a` redesign while keeping the custom carousel modal and 3D card tilt.

Related: [[Motion System]] · [[Project Cards & 3D Tilt]] · [[Project Card Hover Fix]] · [[Project Modal (Carousel)]] · [[Sticky Navigation]] · [[Alignment System]]

---

## Overview

- **Stack:** static HTML + CSS + ES modules. One external runtime dependency: EmailJS (CDN) for the contact form.
- **Theme:** dark, editorial, cyan accent (`--hue: 180`).
- **Entry point:** `index.html` → links `css/styles.css` + Remix Icon CDN (fonts come in via `@import` at the top of the stylesheet), loads the EmailJS CDN, and loads `js/main.js` as `type="module"`. The only inline script is a small anti-flash guard in `<head>`: it adds `.js-reveal` immediately, then `.reveal-ready` after a 1500ms fail-open timer (the reveal system flips it sooner in the normal case).
- **Serve it, don't open it.** ES modules are blocked over `file://`, so `index.html` must be opened through a local server (Live Server, `python -m http.server`, …).

```
PortWeb/
├── index.html          # markup only (+ one inline anti-flash guard in <head>)
├── js/
│   ├── main.js         # entry — imports and calls the inits below, in order
│   ├── scroll.js       # the page's ONE scroll loop + measure/frame registries
│   ├── reveal.js       # scroll-reveal: tags targets, per-section visibility
│   ├── counters.js     # hero stat count-up (rides the reveal .is-visible class)
│   ├── cards.js        # 3D pointer tilt on project cards
│   ├── modal.js        # project details modal + coverflow carousel
│   ├── contact.js      # EmailJS contact form + auto-grow textarea
│   └── ui.js           # typed role cycler, Discord copy
├── css/styles.css      # full stylesheet (redesign + ported modal styles)
├── img/                # project-1..6, home-profile, about-profile, pygame.png
│   └── jaded/          # MISSING — carousel media referenced but not present
├── pdf/KeertiVardhan_Resume.pdf
└── docs/
    ├── portfolio-notes.md       # this note — architecture / reference
    ├── changelog.md             # chronological session log (§1 → §13)
    └── project-card-hover-fix.md
```

---

## Design System

Defined in `:root` of `css/styles.css`.

| Token | Value | Use |
|---|---|---|
| `--hue` | `180` | drives every colour |
| `--cyan` | `hsl(hue,80%,48%)` | accent |
| `--bg` / `--surface` / `--card` | dark greys | backgrounds |
| `--ink` / `--muted` / `--dim` | text scale | copy |
| `--line` | `hsla(0,0%,100%,.1)` | hairline borders |
| `--body-font` | Unbounded | headings/body |
| `--mono-font` | JetBrains Mono | labels, tags |
| `--rail-width` | `96px` (→`120px` ≥2K) | left rail column |
| `--topbar-h` | `64px`, kept in sync by JS | sticky-nav height; feeds `scroll-padding-top` and hero sizing |
| `--content-max` | `77.5rem` (→`82rem` ≥2K) | shared content frame (see [[Alignment System]]) |
| `--panel-max` | `27.5rem` (→`31rem` ≥2K) | hero/about image panel |
| `--gutter` / `--section-pad` | `clamp()` | one spacing scale; sections size to content + pad, never to viewport height |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` | shared easing |

> [!note] rem, not px, on purpose
> `--content-max` and the type scale are in **rem** so they track the root font-size bump on wide monitors. In px, a true 1920px viewport stranded ~600px of dead space on the right.

> [!note] Alias variables
> The ported carousel modal was written against the old palette (`--first-color`, `--white-color`, `--gray-color`, `--body-color`, `--black-color`, `--line-color`). Rather than rewrite it, these are **aliased** to the new tokens in `:root` so the modal CSS keeps resolving.

### Page skeleton

```
.layout  (grid: [rail 96px][main 1fr])
 ├── aside.rail        (desktop only, >1080px — logo, vertical label, socials)
 └── main
      ├── header.topbar  (sticky nav — see [[Sticky Navigation]])
      ├── section.hero
      ├── section.about
      ├── section.projects
      ├── section.block  (Experience)
      ├── section.block  (Education)
      └── section.block#contact
```

---

## Sections

- **Hero** — two-column (`minmax(0,1fr)` + `minmax(300px,440px)`); left = typed kicker + name + CTA, right = full-bleed portrait panel with badge and footer strip.
- **About** — two-column; left = description + skill chips (`.chip--hot` highlights Unity/Godot/Pygame in cyan), right = image panel with `FIG. 01` label.
- **Projects** — see [[Project Cards & 3D Tilt]] + [[Project Modal (Carousel)]].
- **Experience / Education / Contact** — `.block` sections, simple timeline (`.tl`) + contact form.

---

## Motion System

All scroll-driven motion runs through **one** `requestAnimationFrame` loop in `js/scroll.js`. Modules don't add their own scroll listeners — they register callbacks.

### One scroll loop (`scroll.js`)

- Two registries: `onMeasure(fn)` (reads — layout geometry) and `onScrollFrame(fn)` (writes — styles/classes). A scroll frame does **no** layout reads: every position it needs was measured earlier and cached in document coordinates, so a frame is just `cachedTop - scrollY`.
- Measure runs on load, resize, and any body size change (`ResizeObserver`); frames are `rAF`-throttled and coalesced.
- Consumers wired in here: sticky topbar `.scrolled`, nav active link, scroll-up button, `#progress` bar (`scaleX`), and image parallax on the hero portrait + about image.
- `initTopbarHeight()` keeps `--topbar-h` synced to the real nav height so a wrapped nav doesn't hide anchor targets or overrun the hero.

> [!tip] Why not IntersectionObserver
> An observer only fires on a boundary crossing, so any rule richer than "inside the box" — like exempting the section you're reading, or re-arming on the way back up — consumes the single crossing it was going to get and the element sticks. Recomputing state outright every frame can't drift. This is deliberate; see the comment block in `reveal.js`.

### Scroll reveal (`reveal.js`)

- Targets are tagged in JS, not markup (`tagTargets()`), so animation choices live in one place. CSS owns the states: `[data-reveal]` = hidden, `.is-visible` releases, `.from-above` flips direction, `--reveal-delay` staggers a group.
- **Decision is per `<section>`, not per element.** Element-level thresholds split a header (a 1px rule vs a 45px title cross the line at different scroll points); a section has one state so a row can't disagree with itself.
- Two overlap measures with a wide dead band (≈⅕ screen) so a section resting near the edge can't oscillate: `cover` (share of screen filled) and `seen` (share of section shown).
- Respects `prefers-reduced-motion` (reveals everything immediately). Pairs with the `<head>` anti-flash guard so the first hero reveal animates instead of snapping.

### Hero stat count-up (`counters.js`)

- Counts `.stat__value[data-count]` (currently 30+, 100%, 6+). **Trigger is borrowed from reveal**, not reimplemented: a `MutationObserver` on each `.stat` watches for `.is-visible`, so a number rises exactly as its stat slides in and re-counts if re-armed on the way back up.
- `easeOutCubic` over 1800ms; an in-flight count is cancelled before re-arming so two loops never write the same node.
- Width is reserved up front by a hidden `.stat__sizer` (the final number) with the live `.stat__live` laid over it — a `ch`/`min-width` reservation ignored letter-spacing and tabular figures and left a gap before the `+`/`%` unit.

---

## Project Cards & 3D Tilt

Each project is an `article.card`:

```
.card
 ├── .card__data                 (title + desc — collapsed until hover)
 │    └── .card__data-inner       (the actual clipper — see below)
 ├── .card__media
 │    ├── img.card__img
 │    ├── .card__tag        (mono tech label, bottom-left, at rest)
 │    └── .card__overlay    (tech icons + View button, on hover)
 └── template.project-detail   (data source for the modal)
```

### Pop-up behaviour (CSS only)

- At rest: image + `.card__tag`.
- On hover: `.card__data` expands **inside** the card, `.card__tag` fades out, `.card__overlay` fades in, cyan border lights up.

> [!important] Expand animates on `grid-template-rows`, not `max-height`
> `.card__data` is a one-row grid animating `grid-template-rows: 0fr → 1fr`; the title/desc live in a `.card__data-inner` child with `overflow: hidden; min-height: 0`.
>
> The earlier version animated `max-height: 0 → 160px`. Because the panel's real height (~73px) is far below the 160px ceiling, hover-out spent roughly the first half of the transition travelling through empty range before anything moved — the card froze, then dropped, and every card below lurched with it. It also toggled `padding` only on `:hover` without transitioning it, so the text snapped the instant the pointer left. The `0fr → 1fr` row resolves to the panel's exact height, so travel is truthful in both directions; vertical spacing is carried as margins on the inner children (not padding on the animated box) so nothing holds the collapsed row off zero. See [[Project Card Hover Fix]].

### 3D tilt (JS)

> [!important] "Our" adaptive tilt is preserved
> The redesign shipped a simpler fixed tilt; it was **replaced with the original adaptive version** (`getTiltConfig`) bound to `.card`. Config scales with viewport:

| Width | maxTilt | scale | perspective |
|---|---|---|---|
| touch / no-hover | disabled | — | — |
| `< 768` | 9° | 1.05 | 900 |
| `< 1150` | 8° | 1.04 | 900 |
| `< 2048` | 10° | 1.05 | 1000 |
| `≥ 2048` | 10° | 1.05 | 1200 |

Requires `.card { transform-style: preserve-3d }`. Tilt is applied on `mousemove` via `requestAnimationFrame`; reset on `mouseleave`.

---

## Project Modal (Carousel)

Kept from the original build instead of the redesign's simple modal.

- Markup: `#project-modal` (`.pm__*` classes) placed **outside** `.layout`, `position: fixed`, toggled with `.show-modal`.
- Each card carries a `<template class="project-detail">` holding: `.pm__tagline`, `.pm__title`, one or more `.pm__media` (`data-type` = `image|gif|video`, `data-src`, `data-label`), `.pm__tech-src`, `.pm__desc`, `.pm__stats-src`, `.pm__github-src`, `.pm__cta-src`.
- Click a card → `openProjectModal(card)` reads the template, builds a **coverflow carousel** (`buildCarousel` + `layout`), populates tech/stats/links, opens.
- Controls: prev/next buttons, dots, click a side tile, `Esc` to close, click backdrop to close.

> [!warning] Missing media assets
> The Jaded card references `img/jaded/gameplay.gif`, `forest.png`, `boss.png`, `inventory.png`, `title.png` — the `img/jaded/` folder does **not** exist, so those slides fall back to the placeholder pattern. This is pre-existing (same paths as the old templates). Add the folder and the slides render automatically.

---

## Sticky Navigation

> [!bug]- Original problem
> The nav lived inside the hero, so it scrolled away — and the desktop rail has no nav links. No navigation existed once past the hero.

Fix:

- Nav moved into `header.topbar#topbar` as the first child of `main`.
- `.topbar { position: sticky; top: 0; z-index: 60 }` — pins across the whole page (works because `main` spans the full document height).
- Transparent at the top; on scroll the JS handler adds `.scrolled` → blurred dark background + bottom border.
- `html { scroll-padding-top: 72px }` so anchor jumps aren't hidden behind the bar.
- `.topbar` added to the ≤640px `padding-inline` rule for mobile.
- Active link tracks the current section in the same scroll handler.

---

## Alignment System

> [!tip] One left spine
> All section content now starts at the same left edge (`x = 160px` at 1280 = rail 96 + padding 64). Verified across Hero, About, Projects, Resume, Contact.

- **Root cause of the earlier misalignment:** Experience/Education/Contact were centered in an `820px` box (`.block__inner`, `.contact__inner`) — starting ~110px further right than the full-bleed sections, causing a visible jump on scroll.
- **Fix:** every inner (`.block__inner`, `.contact__inner`, `.projects__head`, the grid) now shares **one `max-width: var(--content-max)` frame** (`77.5rem`, → `82rem` ≥2K), so heads and content line up. `.resume__col` capped for readable line length. Footer spans the full frame (`space-between`).
- About image: `align-items: center` + `width: 300px` so it fills its panel instead of being small and bottom-stuck.

### Responsive breakpoints

| Breakpoint | Behaviour |
|---|---|
| `≤ 1080px` | rail hidden; hero/about collapse to single column |
| `≤ 640px` | tighter `padding-inline: 1.5rem`; nav wraps |

> [!danger] Overflow fix (do not revert)
> The single-column overrides originally used `grid-template-columns: 1fr`. The projects grid's min-content (`~1076px`) blew out the `auto` track → horizontal scroll at ≤1080px. Changed to **`minmax(0, 1fr)`** on `.layout`, `.hero`, `.about`. Verified `scrollWidth === clientWidth` at 1280 / 820 / 390.

---

## Contact Form (EmailJS)

- Form `#contact-form` with `name="user_name|user_email|user_message"`.
- Real send preserved (the redesign shipped a fake visual submit):
  - `emailjs.init('<public-key>')` then `emailjs.sendForm('<service-id>', '<template-id>', form)`.
  - Status shown in `#contact-message`; button label swaps to `Sending…` and back.
  - Guards on `typeof emailjs === 'undefined'` — if the CDN fails the form is left alone, not broken.
- **Auto-grow textarea** (`initAutoGrowTextarea`): the message box grows with its content up to the CSS `max-height`, then scrolls. Height is reset to `auto` before reading `scrollHeight`, and border widths are added back (box-sizing is `border-box`, so `scrollHeight` misses them). `form.reset()` doesn't fire `input`, so submit dispatches one manually to collapse the box.

---

## Gotchas & TODO

- [x] **`js/main.js` was dead code** — deleted. It was never linked and targeted the old class names (`.projects__card`, `.nav__link`, …), which no longer exist in the markup. *Superseded:* `js/` was later reintroduced as a set of ES modules written against the current markup — see the file tree above.
- [ ] **Add `img/jaded/` media** so the Jaded carousel shows real screenshots instead of placeholders.
- [ ] **Placeholder content** — Experience entries (VortexTech, Pixel Studio) and project cards 2–6 are generic; swap in real details.
- [ ] **Duplicate hero/about image** — `home-profile.png` ≈ `about-profile.png`; consider a distinct graphic for About.
- [ ] Preview note: local-file preview renders as a static snapshot and is unreliable at desktop widths; serve over HTTP (or hard-refresh, Ctrl+F5) for accurate testing.

---

## Quick reference — key selectors

```text
.topbar / .topbar.scrolled       sticky nav
.card / .card__data              project tile + hover expand
.card__data-inner                hover-expand clipper (grid 0fr→1fr)
.card__overlay / .card__tag      hover controls / rest tag
template.project-detail          modal data per card
#project-modal / .pm__*          carousel modal
[data-reveal] / .is-visible      scroll-reveal hidden / shown state
.stat__value[data-count]         hero count-up target
var(--content-max)               shared content frame (77.5rem)
minmax(0, 1fr)                   overflow-safe responsive columns
```
