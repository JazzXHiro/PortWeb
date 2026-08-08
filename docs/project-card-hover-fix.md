---
title: Project Card Hover Fix
tags:
  - web-dev
  - css
  - animation
  - project/portweb
created: 2026-07-25
aliases:
  - Project Card Hover Fix
  - Card Hover Jank Fix
  - grid-template-rows expand
---

# Project Card Hover Fix

> [!info] Context
> The project cards expand a title/description panel on hover. Coming **off** the hover felt janky — the card seemed to hang, then drop, and every card below it lurched back into place. Part of [[portfolio-notes|PortWeb Notes]] · see [[Motion System]] and [[Project Cards & 3D Tilt]].

---

## Symptom

On hover-out the panel didn't start closing immediately. The card sat still for a beat, then collapsed abruptly, and the whole grid below it shifted at once. The hover-in felt fine; only the exit read as broken.

## Root cause

The panel animated `max-height: 0 → 160px` on `.card__data`.

- The panel's **real** height is ~73px, well under the 160px ceiling.
- `max-height` animates linearly across its declared range, so closing spent roughly the **first half** of the transition travelling from 160px down to 73px — through range where nothing is visible yet. That dead lead-in is the "hang", and because the grid row shrinks with it, every card below inherited the same stall.
- Padding (`1rem 1.125rem .75rem`) was applied **only** in the `:hover` rule and was **not** transitioned. The instant the pointer left, ~1.75rem of padding vanished in a single frame — a visible snap on top of the stall.

## Fix

Animate `grid-template-rows: 0fr → 1fr` instead, and move the content into a clipper child.

```css
.card__data{
  display: grid;
  grid-template-rows: 0fr;                 /* collapsed */
  opacity: 0;
  padding-inline: 1.125rem;                /* horizontal only — never animated */
  transition: grid-template-rows .35s cubic-bezier(.4,0,.2,1), opacity .25s ease;
}
.card__data-inner{ overflow: hidden; min-height: 0; }   /* the clipper */
.card__data-inner > :first-child{ margin-top: 1rem; }   /* spacing as margins, */
.card__data-inner > :last-child{ margin-bottom: .75rem; } /* not padding on the box */
.card:hover .card__data{ grid-template-rows: 1fr; opacity: 1; }
```

Markup: each `.card__data` now wraps its title + description in a `.card__data-inner`.

### Why it works

- **`1fr` resolves to the content's exact height.** There's no ceiling to overshoot, so travel is truthful in both directions — no dead range, no hang. Verified live: collapsed row `0px`, open row `72.75px`, matching content.
- **Vertical spacing is margins on the inner children, not padding on the animated box.** Nothing holds the collapsed row off zero, and there's no un-transitioned padding to snap on exit.
- `min-height: 0` + `overflow: hidden` on the inner is required — without `min-height: 0` a grid item refuses to shrink below its content and the row never reaches `0fr`.

> [!note] The cards below still move — that's correct
> The panel is in normal flow, so expanding it pushes the grid down; that shift is inherent and intended. What the fix removes is the *stall and snap*, so the movement now rides one matched curve.

> [!tip] Reusable pattern
> `grid-template-rows: 0fr → 1fr` on a one-row grid, with an `overflow: hidden; min-height: 0` child, is the clean way to animate an element open to its natural height. `max-height` guessing always trades a wrong ceiling (clipped content) against dead animation range.

---

## Related cleanup (same session)

- **`.mono` CSS rule** removed — unused (distinct from `.mono-label`, which is used).
- Verified the fix against the live page: 6 cards, no console errors, hover panel and modal intact.

See [[portfolio-notes#Gotchas & TODO|the project notes]] for the dead-code history.
