import { onMeasure, onScrollFrame } from './scroll.js';

/* Scroll reveal.

   Elements are tagged here rather than in the markup so the animation choices
   live in one place. CSS owns the states: [data-reveal] is the hidden state,
   .is-visible releases it, .from-above flips the direction, and the per-element
   --reveal-delay drives the stagger within a group. */

const tag = (el, dir, delay) => {
    if (!el || el.hasAttribute('data-reveal')) return;
    el.setAttribute('data-reveal', dir);
    el.style.setProperty('--reveal-delay', delay + 'ms');
};

// Children of one container come in one after another, not all at once
const stagger = (sel, dir, step = 80, start = 0, root = document) =>
    [...root.querySelectorAll(sel)].forEach((el, i) => tag(el, dir, start + i * step));

function tagTargets() {
    /* Hero — the only block that animates on load rather than on scroll */
    stagger('.hero__kicker, .hero__title, .hero__desc, .hero__actions, .hero__foot', 'up', 110, 150);
    stagger('.hero__stats .stat', 'up', 90, 620);
    // The portrait is left untagged — it is driven by the parallax handler,
    // which writes its own inline transform and would fight a reveal offset.
    tag(document.querySelector('.hero__right'), 'right', 250);
    tag(document.querySelector('.hero__badge'), 'down', 800);
    tag(document.querySelector('.hero__panelfoot'), 'fade', 900);

    /* Section headers everywhere */
    document.querySelectorAll('.section__head').forEach(head => {
        stagger(':scope > *', 'up', 90, 0, head);
    });

    /* About */
    tag(document.querySelector('.about__desc'), 'up', 180);
    tag(document.querySelector('.about__skills-label'), 'up', 240);
    stagger('.chips .chip', 'pop', 45, 300);
    tag(document.querySelector('.about__img-wrap'), 'right', 200);
    tag(document.querySelector('.about__fig'), 'fade', 600);

    /* Projects */
    stagger('.projects__grid .card', 'pop', 90, 120);

    /* Resume + education timelines */
    document.querySelectorAll('.resume__col').forEach(col => {
        stagger(':scope > .tl', 'left', 120, 150, col);
    });

    /* Contact */
    stagger('#contact .form > *', 'up', 80, 120);
    stagger('.contact__row', 'left', 80, 150);
    tag(document.querySelector('.footer'), 'fade', 200);
}

/* One pass over every target, from geometry alone.

   This deliberately does not use IntersectionObserver. An observer only speaks
   when a boundary is crossed, so any rule richer than "is it inside the box" —
   such as exempting the section being read — ends up consuming the one crossing
   it was going to get, and the element sticks in whatever state it was left in.
   That is what produced both the holes mid-section and the rows still showing at
   the top of the page. Recomputing the state outright cannot drift.

   The decision is made once per <section>, never per element. Element-level
   thresholds are what produced the split header row — inside one `.section__head`
   the children's tops differ by ~23px and their heights by 45x (a 1px rule
   against a 45px title), so any per-element test eventually puts the title on
   one side of a line and the number on the other. A section has one state, so a
   row cannot disagree with itself, and adding markup anywhere on the page
   inherits that guarantee for free.

   No layout is read here. Each group's position is measured in the shared
   measure pass (see js/scroll.js) and cached in document coordinates, so a
   scroll frame only subtracts scrollY from it. Measuring inline would force a
   reflow per section per frame, on top of the writes below. */
function makeUpdater(targets) {
    // section -> its tagged elements. Anything outside a section is its own group.
    const groups = new Map();
    targets.forEach(el => {
        const key = el.closest('section') || el;
        if (!groups.has(key)) groups.set(key, { elements: [], visible: false, top: 0, height: 1 });
        groups.get(key).elements.push(el);
    });

    const measure = ({ y }) => groups.forEach((group, section) => {
        const r = section.getBoundingClientRect();
        group.top = r.top + y;
        group.height = r.height || 1;
    });

    const update = ({ y, vh }) => {
        const pending = [];

        groups.forEach(group => {
            const top = group.top - y;           // where the section is right now
            const height = group.height;
            const shown = Math.max(0, Math.min(top + height, vh) - Math.max(top, 0));

            // Two measures, because neither alone covers both shapes: `cover` is
            // the share of the screen the section takes (right for a section
            // taller than the viewport), `seen` is the share of the section on
            // screen (right for one shorter than it).
            const cover = shown / vh;
            const seen = shown / height;

            // Wide dead band between the two — roughly a fifth of a screen of
            // scrolling — so a section resting near a threshold cannot oscillate.
            let visible = group.visible;
            if (cover >= 0.35 || seen >= 0.6) visible = true;
            else if (cover <= 0.15 && seen <= 0.35) visible = false;

            if (visible !== group.visible) {
                group.visible = visible;
                pending.push([group, visible, top < 0]);
            }
        });

        // --- write: only sections that actually changed ---
        pending.forEach(([group, visible, leftOverTop]) => {
            group.elements.forEach(el => {
                if (visible) {
                    el.classList.add('is-visible');
                } else {
                    el.classList.toggle('from-above', leftOverTop); // come back the way it left
                    el.classList.remove('is-visible');
                }
            });
        });
    };

    return { measure, update };
}

export function initReveal() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    tagTargets();
    const targets = [...document.querySelectorAll('[data-reveal]')];

    if (reduced) {
        targets.forEach(el => el.classList.add('is-visible'));
        document.documentElement.classList.add('reveal-ready');
        return;
    }

    const { measure, update } = makeUpdater(targets);

    // Start once the hidden state has painted and transitions are re-enabled, so
    // the first (hero) reveal animates instead of snapping. The timer is a
    // safety net: rAF is throttled in background tabs, and nothing may stay
    // stuck at opacity 0.
    let started = false;
    const start = () => {
        if (started) return;
        started = true;
        document.documentElement.classList.add('reveal-ready');
        // Registering here rather than at init hands both halves to the page's
        // one scroll loop; each runs immediately on registration, in this order.
        onMeasure(measure);
        onScrollFrame(update);
    };
    requestAnimationFrame(() => requestAnimationFrame(start));
    setTimeout(start, 400);
}
