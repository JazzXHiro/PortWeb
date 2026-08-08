---
title: Portfolio — Session Changelog
tags:
  - portfolio
  - changelog
  - project/portweb
created: 2026-07-22
aliases:
  - PortWeb Changelog
---

# Portfolio — Session Changelog

> [!info] Scope
> A running, chronological log across sessions (§1 oldest → §13 newest). Later entries supersede earlier ones — e.g. the reveal system moved from IntersectionObserver (§7–§8) to a geometry pass (§11–§12), and the inline script moved into `js/` ES modules (§9). Files now span `index.html`, `css/styles.css`, and the `js/` module set. The old unlinked `js/main.js` was deleted. See [[portfolio-notes|Portfolio Build Notes]] for the current structure.

---

## 1. About section restyle

- Heading `About Me` → `About`.
- Removed the profile image and the `Contact Me` button.
- Skills header became a mono `SKILLS` label; skills rendered as **outlined mono chips**.
- Unity / Godot / Pygame highlighted in cyan.
- Content left-aligned.

> [!note]
> This edited the original markup. It was later superseded when the whole site moved to the `portfolio-3a` design (step 3), which carries the same About look via `.chip` / `.chip--hot`.

---

## 2. Project card pop-up (iteration)

- **First attempt (reverted):** added a fake OS-window titlebar with app name + window dots, a rest-state tech tag, and stripped the panel styling. Rejected as over-built.
- **Restored:** removed the titlebar / dots / tag; brought back the translucent, cyan-bordered **title + description panel that reveals on hover**, kept the View button, cyan glow, and 3D tilt.

> [!note]
> Also superseded by the redesign in step 3, where the pop-up became the "expand inside the card" (`.card__data` max-height) style.

---

## 3. Full-site redesign to `portfolio-3a` (kept the carousel modal)

Chosen scope: adopt the full provided visual design **except** keep the existing rich carousel modal.

### `index.html` — rewritten

- New structure: `.layout` → `.rail` + `.main` (hero, about, projects, experience, education, contact).
- Stylesheet link pointed at `css/styles.css`.
- Projects rebuilt as `article.card` (title/desc, media, rest tag, hover overlay).
- Added a `<template class="project-detail">` inside **each** card to feed the carousel modal.
- Kept the original `#project-modal` (`.pm__*`) carousel markup instead of the redesign's simple modal.
- **Contact form wired to EmailJS** (added `name` fields; real send restored instead of the fake submit).
- **Adaptive 3D tilt** (`getTiltConfig`) ported from the old build and bound to `.card`.
- Dropped the old `js/main.js` include; all behaviour now inline.

### `css/styles.css` — rewritten

- Full `portfolio-3a` stylesheet.
- Added **alias variables** (`--first-color`, `--white-color`, `--gray-color`, `--body-color`, `--black-color`, `--line-color`) mapping to the new palette so the ported modal CSS keeps working.
- Appended the carousel modal styles (`.project-modal`, `.pm__*`).

### Bug fixed during integration

> [!danger] Horizontal overflow at ≤1080px
> The responsive single-column overrides used `grid-template-columns: 1fr`. The projects grid's min-content (~1076px) blew out the `auto` track → sideways scroll. Changed to **`minmax(0, 1fr)`** on `.layout`, `.hero`, `.about`. Verified `scrollWidth === clientWidth`.

---

## 4. Alignment / placement polish

- **Unified left spine:** Experience / Education / Contact were centered in an `820px` box (started ~110px further right). Moved `.block__inner` and `.contact__inner` to the **same `max-width: 1240px` frame as Projects**. All sections now start at `x = 160px`.
- `.resume__col` capped at `760px` for readable line length.
- **About image:** `align-items: flex-end` → `center`, width `260px` → `300px`, added padding — fills its panel instead of sitting small at the bottom.
- Footer now spans the full content frame (`space-between`).

---

## 5. Sticky navigation

> [!bug]- Problem
> The nav lived inside the hero and scrolled away; the desktop rail has no nav links, so navigation vanished past the hero.

- Nav moved into `header.topbar#topbar` as the first child of `main`.
- `.topbar { position: sticky; top: 0; z-index: 60 }` — pinned across the whole page.
- Transparent at the top; gains a blurred dark background + bottom border on scroll via a `.scrolled` class.
- Scroll handler updated to toggle `.scrolled` and keep the active-link tracking.
- `html { scroll-padding-top: 72px }` so anchor jumps clear the bar.
- `.topbar` added to the ≤640px `padding-inline` rule.

---

## 6. Documentation

- Added [[portfolio-notes|docs/portfolio-notes.md]] — architecture / reference notes.
- Added this changelog — `docs/changelog.md`.

---

## Verification summary

| Check | Result |
|---|---|
| Console errors | none |
| Horizontal overflow @ 1280 / 820 / 390 | none |
| Carousel modal (open, media, tech, stats, links) | working |
| 3D tilt on `.card` | intact |
| Sticky nav pinned + active-link tracking | working |
| All card images + résumé PDF | resolve |

---

## Open items (not changed this session)

- [x] `js/main.js` is dead code (unlinked) — deleted (recoverable from git history).
- [ ] `img/jaded/` media folder missing → Jaded carousel shows placeholders.
- [ ] Placeholder content in Experience and project cards 2–6.
- [ ] Hero and About reuse near-identical images.

---

## 7. One section per screen + scroll reveals

**Full-viewport sections** — only one section is on screen at a time.

- `--topbar-h` variable; a small script syncs it to the real `.topbar` height on load/resize, and `scroll-padding-top` uses it.
- `.hero` → `min-height: calc(100svh - var(--topbar-h))`; `.about`, `.projects`, `.block` → `min-height: 100svh`, content vertically centered.
- Experience + Education wrapped in `.screen--split` (two columns sharing one viewport) — two half-empty screens would have been worse than one full one. Collapses to stacked + auto height ≤1080px, where all sections drop back to natural height.
- `svh` units so mobile browser chrome doesn't push the next section into view.

**Scroll reveal system**

- `[data-reveal]` states in CSS: `up` (default), `down`, `left`, `right`, `pop`, `fade`; `.is-visible` releases them. Per-element `--reveal-delay` drives the stagger.
- `.section__rule` reveals by drawing out from the left (`scaleX`).
- Tagging + IntersectionObserver live in one inline script. Observation starts on a double-rAF (with a 400 ms timer fallback for background tabs) and `html:not(.reveal-ready)` suppresses transitions until then, so nothing fades *out* from an already-painted frame.
- Staggered groups: hero column, section headers, skill chips, project cards, timeline entries, form fields, contact rows.
- Hero portrait and About image get a light scroll parallax; the portrait is deliberately left untagged since the parallax writes its own transform.
- Added a fixed scroll-progress bar (`.progress`), driven from the existing scroll handler; that handler is now rAF-throttled and `passive`.
- `prefers-reduced-motion: reduce` disables reveals, parallax and smooth scrolling entirely.

> [!warning] Contact section
> `#contact` is ~870px tall at 720px viewport height, so it is the one section that can still exceed one screen. It is last, so the effect is minor.

---

## 8. Reveals replay on the way back

- Reveals no longer fire once. `io.unobserve()` after the first reveal is gone; a **second observer** (`resetIo`, `threshold: 0`, `rootMargin: 25%`) removes `.is-visible` once an element is well clear of the viewport, re-arming it.
- The padded reset root is what keeps this from flickering — an element is never reset while it is still on screen, only after it is 25% of a viewport past the edge.
- Direction-aware: on reset, `.from-above` is toggled from `entry.boundingClientRect.top < 0`, so an element that left over the top drops back **down** into place instead of rising. Horizontal (`left`/`right`) reveals are unchanged by it.
- Elements taller than the padded root (hero panel, About image column) simply never reset — correct, since they are never fully off screen.

---

## 9. JS extracted to ES modules

The inline `<script>` (~330 lines, six unrelated concerns) moved out of `index.html` into `js/`:

| File | Exports |
|---|---|
| `main.js` | entry — imports and calls every init below |
| `reveal.js` | `initReveal()` |
| `scroll.js` | `initTopbarHeight()`, `initScroll()` |
| `cards.js` | `initCardTilt()` |
| `modal.js` | `initProjectModal()` |
| `contact.js` | `initContactForm()`, `initAutoGrowTextarea()` |
| `ui.js` | `initTypedRoles()`, `initDiscordCopy()` |
| `counters.js` | `initCounters()` — hero stat count-up |

- Loaded as `<script type="module" src="js/main.js">`. Logic is unchanged — the IIFEs became exported `init*` functions.
- `onclick="copyDiscord(event)"` on the rail link **had to go**: module scope is not global, so the handler was no longer reachable from an inline attribute. The link is now `id="discord-copy"` and `ui.js` binds the listener.
- The EmailJS CDN tag stays a classic script above the module, so `emailjs` is a defined global by the time `contact.js` runs.

> [!important] Anti-flash guard
> Module scripts are deferred, so `reveal.js` can no longer hide its targets before the first paint — content would paint in place and then snap back to hidden. A three-line inline script in `<head>` sets `.js-reveal` on `<html>`, CSS holds `.main` at `opacity: 0`, and `reveal.js` releases it with `.reveal-ready`. The inline script also sets a 1500 ms timer that adds `.reveal-ready` regardless, so a module that fails to load can never leave a blank page.

> [!warning] `file://` no longer works
> ES modules are blocked over `file://` by CORS. Open the site through Live Server or any static server, not by double-clicking `index.html`.

---

## 10. Vertical rhythm — sections sized by content, not by the viewport

Reverses the core of §7. Locking every section to `min-height: 100svh` with its content
vertically centred meant a short section stranded a screenful of empty space on a tall
monitor: at 1440×900 the About section held ~420px of content inside an 885px box, and the
hero's `space-between` pushed `.hero__foot` to the bottom of an 874px column, leaving ~370px
of dead air under the CTAs.

**One spacing scale** replaces the ad-hoc `4rem` / `4.5rem` paddings:

| Token | Value |
|---|---|
| `--gutter` | `clamp(1.5rem, 3.5vw, 4rem)` — shared left spine, also drives the topbar |
| `--section-pad` | `clamp(3.25rem, 8vh, 6rem)` — block padding for every section |
| `--content-max` | `77.5rem` (≈1240px; → `82rem` ≥2K) |

- `min-height: 100svh` removed from `.about`, `.projects`, `.block` and `.screen--split`.
  Those sections are now content-height plus `--section-pad`. `.about` keeps a `480px`
  floor so its image panel isn't squashed.
- `.hero` is the only section that still takes the viewport, and it is **capped**:
  `min(calc(100svh - var(--topbar-h)), 760px)`. Beyond 760px the extra height stopped
  going into the gap between the CTAs and the footer strip.
- `.hero__left` switched from `space-between` to `justify-content: center` with
  `.hero__foot { margin-top: auto }` + a top rule, so the strip reads as deliberate
  (and lines up with `.hero__panelfoot` opposite) rather than as stranded text.
- `.hero__portrait` is anchored `top: 4rem / bottom: 3.25rem` with `object-fit: contain`,
  so it scales with the panel instead of leaving a dead band above it.
- `.projects__grid` is pinned to `repeat(3, minmax(0, 1fr))` ≥1100px. `auto-fill` resolved
  to four columns at that width, which left a hole at the end of the second row; three
  columns gives two full rows of three and larger cards. Cards stay `align-items: start`
  so the hover expansion still can't resize a whole row.
- Contact's form and details list share a row (`.contact__grid`, 2-col ≥1080px). Stacked,
  it was the tallest and emptiest section on the page — the §7 warning above is resolved.
- The ≤640px `padding-inline: 1.5rem` override is gone; `--gutter` already clamps there.

Net at 1440×900: document height 5000px → **~3070px**, with no section relying on the
viewport except the capped hero.

---

## 10. Next section no longer peeks after a scroll round-trip

Symptom: on load the first screen showed only the hero, but after scrolling down and back up the About header and `FIG. 01` label were left sitting in the strip below the hero.

Cause: the reset observer padded the viewport by **25% on both edges**, so an element peeking in the last sliver of the screen still counted as in view and never re-armed. It was hidden on load only because it had not been revealed yet.

Fix, both in `js/reveal.js`:

- Reset `rootMargin` is now asymmetric — `25% 0px -18% 0px`. The bottom edge is pulled *in* past the reveal line (`-8%`), so anything in the last ~18% of the viewport re-arms; the top edge stays pushed out so a reset above the fold is never visible. The gap between the two lines is the hysteresis that stops flicker near the fold.
- A bottom cut alone would hide parts of the section being *read* — the hero footer strip and `.hero__panelfoot` sit below that line on a shorter viewport. So an element is exempt from reset when it is still on screen **and** `ownsViewport()` says its `<section>` spans the viewport centre.

Checked at 1919×941 (hero bottom lands at 820, About occupies the last 121px): the eight hero elements stay revealed, all 52 others — the whole About section included — re-arm.

---

## 11. Reveal state rebuilt on geometry — IntersectionObserver dropped

Symptom: rows missing mid-section (the PHONE row, an Email input, the third `.tl` in Experience and Education) while everything around them showed, and the state changing depending on how you arrived at a scroll position.

Cause: **an observer only speaks when a boundary is crossed.** Both rules added on top of that consumed the one crossing an element was going to get:

- Reset with a tighter root than the reveal root → an element could be hidden while still sitting *inside* the reveal zone. No further crossing, so nothing ever brought it back — a permanent hole.
- `return` on the exemption path → the reset crossing was spent, so an element exempted once stayed revealed forever, including back at the top of the page.

Both observers are gone. `makeUpdater()` recomputes every target's state from geometry in one rAF-throttled pass on scroll and resize, reads batched ahead of writes so the loop doesn't thrash layout. Recomputed state cannot drift, and the rules are now plain:

| | condition |
|---|---|
| reveal | 12% into the top 80% of the viewport, **or** its section covers ≥30% of the viewport |
| re-arm | fully 25% above the top edge, **or** below 82% while its section covers <30% |

`SECTION_IN_VIEW = 0.3` replaces the earlier "section spans the viewport centre" test — a section that only peeks (About under the hero, 13%) keeps its content hidden; one substantially on screen (Contact at 41%) shows every row, including those low in the viewport.

> [!note] Verification
> Earlier sweeps in this session were worthless: `html { scroll-behavior: smooth }` made the scripted `scrollTo` animate, and the pane never advances animation frames, so every "step" measured the same frame. With `scrollBehavior = 'auto'` forced, a 20px sweep down and back up (236 positions) reports zero holes, nothing hidden on screen at the Contact position from the report, and exactly the eight hero elements visible back at the top.

---

## 12. Reveal decided per section, not per element

Symptom: from the bottom of the page, clicking **About** left the Projects header half-revealed and flickering — the word "Projects" showing while `02` and the rule stayed hidden.

Cause: **every threshold was per element.** Inside one `.section__head` the children are baseline-aligned, so their tops differ by ~23px, and their heights differ by 45x (a 1px `.section__rule` against a 45px `.section__title`). Any line drawn across the viewport eventually falls *between* them — the title on the revealed side, the number on the hidden side. The `12% of the element` reveal test made it worse, since 12% of a 1px rule is 0.12px and 12% of the title is 5.4px. Measured at the About landing position: tops of 667 / 668 / 690 / 692 for the four children of one row.

Fix: `makeUpdater()` now groups targets by their `<section>` and decides **one state per section**, applied to the whole group. A row cannot disagree with itself because no element has an opinion of its own — and any markup added later inherits that guarantee without being enumerated anywhere.

The test per section uses two measures, since neither shape works alone:

| | meaning | reveals | re-arms |
|---|---|---|---|
| `cover` | share of the **viewport** the section takes | ≥ 0.35 | ≤ 0.15 |
| `seen` | share of the **section** on screen | ≥ 0.6 | ≤ 0.35 |

Reveal on either; re-arm only when both agree. `cover` carries sections taller than the viewport, `seen` carries ones shorter than it. The dead band between them is roughly a fifth of a screen of scrolling, so a section resting near a threshold cannot oscillate.

Side benefit: one rect per section per frame (6) instead of one per element (61).

> [!note] Verification
> 10px sweep down and back up (~660 positions): no section revealed while only peeking, none hidden while dominating the screen. The reported repro — sit at the page end, jump to `#about` — then 20 further updates at rest with zero state change. Back at the top, only the hero is revealed.

> [!warning] Behaviour change
> Project cards now arrive together (staggered) when the Projects section comes in, rather than one at a time as each card crosses the fold. Same for any long section's contents. This is inherent to gating per section.

---

## 13. Project-card hover smoothing + dead-rule cleanup

*Session: 2026-07-25.*

**Hover expand no longer stalls on the way out.** `.card__data` animated `max-height: 0 → 160px`, but the panel is only ~73px tall — so hover-out spent roughly the first half of the transition travelling through empty range (the card hung, then dropped, and every card below lurched with it), and the `:hover`-only, un-transitioned `padding` snapped the instant the pointer left.

- Now a one-row grid animating `grid-template-rows: 0fr → 1fr`, with the title/desc in a `.card__data-inner` clipper (`overflow: hidden; min-height: 0`). The `1fr` row resolves to the panel's exact height, so travel is truthful both ways; vertical spacing is margins on the inner children, not padding on the animated box. Verified live: collapsed row `0px`, open row `72.75px`.
- Full write-up: [[project-card-hover-fix|Project Card Hover Fix]].

**Dead code removed.**

- `.mono` CSS rule — unused (distinct from `.mono-label`, which is used). Removed.
- The unlinked `js/main.js` deletion is recorded in *Open items* above; the current `js/` module set is unaffected.

> [!note] Verification
> Reloaded the page after the changes: 6 cards render, project modal and hover panel intact, **no console errors**.
