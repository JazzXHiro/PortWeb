/* The page's single scroll loop.

   Everything driven by scroll position — the sticky topbar, the nav active link,
   the scroll-up button, the progress bar, the image parallax and the scroll
   reveal — runs inside one requestAnimationFrame callback registered here.

   The split that matters is reads vs writes, not one handler vs several. Layout
   reads (getBoundingClientRect, offsetTop, scrollHeight) are only cheap while the
   layout is clean; interleaving them with style writes forces a synchronous
   reflow per read. So geometry is gathered in a separate measure pass — on
   resize, on load, and whenever the body's size changes — and cached in document
   coordinates. A scroll frame then does no layout reads at all: every position it
   needs is `cachedTop - scrollY`. */

const frameTasks = [];
const measureTasks = [];
const state = { y: 0, vh: 0, docH: 0 };
let running = false;

/* Called once per animation frame while scrolling, with the shared state.
   Writes only — anything that needs geometry caches it in onMeasure. */
export function onScrollFrame(fn) {
    frameTasks.push(fn);
    if (running) fn(state);
}

/* Called when the page geometry may have changed. Reads only. */
export function onMeasure(fn) {
    measureTasks.push(fn);
    if (running) fn(state);
}

const runFrame = () => {
    state.y = window.scrollY;
    frameTasks.forEach(fn => fn(state));
};

function runMeasure() {
    state.y = window.scrollY;
    state.vh = window.innerHeight;
    state.docH = document.documentElement.scrollHeight;
    measureTasks.forEach(fn => fn(state)); // reads
    frameTasks.forEach(fn => fn(state));   // then writes
}

let frameQueued = false;
const schedule = () => {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(() => { frameQueued = false; runFrame(); });
};

let measureQueued = false;
const scheduleMeasure = () => {
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(() => { measureQueued = false; runMeasure(); });
};

/* The hero height and scroll-padding-top both subtract var(--topbar-h); if the
   nav wraps at a narrow width that variable has to follow, or the hero overruns
   the viewport and anchor targets land under the bar. */
export function initTopbarHeight() {
    const topbar = document.getElementById('topbar');
    if (!topbar) return;

    const sync = () => document.documentElement.style
        .setProperty('--topbar-h', Math.round(topbar.getBoundingClientRect().height) + 'px');

    sync();
    window.addEventListener('resize', sync);
}

export function initScroll() {
    const links = [...document.querySelectorAll('.nav a')];
    const sections = links.map(a => document.querySelector(a.getAttribute('href')));
    const scrollup = document.getElementById('scrollup');
    const topbar = document.getElementById('topbar');
    const progress = document.getElementById('progress');
    const portrait = document.querySelector('.hero__portrait');
    const aboutImg = document.querySelector('.about__img');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Section geometry in document coordinates, so a frame never has to ask the
    // layout where anything is.
    const bounds = sections.map(() => ({ top: 0, height: 0 }));
    let aboutTop = 0;
    let active = -1;

    onMeasure(({ y }) => {
        sections.forEach((sec, i) => {
            if (!sec) return;
            const r = sec.getBoundingClientRect();
            bounds[i].top = r.top + y;
            bounds[i].height = r.height;
        });
        if (aboutImg) aboutTop = aboutImg.getBoundingClientRect().top + y;
    });

    onScrollFrame(({ y, vh, docH }) => {
        // Last section whose top has passed the probe line, rather than the one
        // containing it: the footer sits below the final section, so once it
        // scrolls in a containment test matches nothing and the highlight sticks
        // on the previous link. Bottoming out always means the last section.
        const atBottom = y >= docH - vh - 2;
        let current = -1;
        for (let i = 0; i < sections.length; i++) {
            if (sections[i] && y + 120 >= bounds[i].top) current = i;
        }
        if (atBottom) {
            for (let i = sections.length - 1; i >= 0; i--) {
                if (sections[i]) { current = i; break; }
            }
        }
        if (current !== -1 && current !== active) {
            active = current;
            links.forEach((l, j) => l.classList.toggle('active', active === j));
        }

        scrollup.classList.toggle('show', y > 350);
        topbar.classList.toggle('scrolled', y > 20);

        const max = docH - vh;
        progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;

        if (!reduced) {
            // Images drift against the scroll so panels feel like they have depth
            if (portrait) portrait.style.transform = `translateX(-50%) translateY(${y * -0.05}px)`;
            // (aboutTop - y) is the rect top the old code read back out of layout
            if (aboutImg) aboutImg.style.transform = `translateY(${(aboutTop - y - vh / 2) * -0.05}px)`;
        }
    });

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', scheduleMeasure);
    // Late-loading images shift everything below them
    window.addEventListener('load', scheduleMeasure);
    if (window.ResizeObserver) new ResizeObserver(scheduleMeasure).observe(document.body);

    running = true;
    runMeasure();
}
