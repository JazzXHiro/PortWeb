/* Count-up for the hero stat strip.

   The trigger is borrowed from the reveal system rather than reimplemented: the
   same .is-visible class that slides a stat in also starts its count, so the
   number rises exactly as the block arrives, and a stat that is re-armed on the
   way back up counts again instead of sitting on its final value. */

const DURATION = 1800;
/* easeOutCubic — still decelerates into the final digit, but spreads the climb
   across the whole run. easeOutExpo spent 90% of the count in its first third,
   which read as a flicker to the final value rather than a count. */
const ease = t => 1 - Math.pow(1 - t, 3);

function run(el, target) {
    // Cancel a count already in flight; re-arming mid-animation would otherwise
    // leave two loops writing the same node and the number would flicker.
    if (el._raf) cancelAnimationFrame(el._raf);

    const start = performance.now();
    const step = now => {
        const t = Math.min(1, (now - start) / DURATION);
        el.textContent = Math.round(ease(t) * target);
        if (t < 1) el._raf = requestAnimationFrame(step);
        else el._raf = 0;
    };
    el.textContent = '0';
    el._raf = requestAnimationFrame(step);
}

export function initCounters() {
    const values = [...document.querySelectorAll('.stat__value[data-count]')];
    if (!values.length) return;

    /* Reserve the final width up front so a rising "6" cannot nudge its "+".
       The space is held by a hidden copy of the final number with the live one
       laid over it, rather than by a computed min-width: a `ch` reservation
       ignores letter-spacing and tabular figures, which left a visible gap
       before the unit, and it would need remeasuring every time the clamped
       font-size or a late webfont changed the metrics. */
    const live = values.map(el => {
        const target = Number(el.dataset.count);
        el.textContent = '';
        const sizer = document.createElement('span');
        sizer.className = 'stat__sizer';
        sizer.setAttribute('aria-hidden', 'true');
        sizer.textContent = target;

        const now = document.createElement('span');
        now.className = 'stat__live';
        now.textContent = target;
        now._target = target;

        el.append(sizer, now);
        return now;
    });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Watch the .stat wrapper, since that is what reveal.js tags.
    const observer = new MutationObserver(records => {
        records.forEach(({ target: stat }) => {
            const visible = stat.classList.contains('is-visible');
            if (visible === stat._counted) return;   // class churn that didn't cross the edge
            stat._counted = visible;

            const el = stat.querySelector('.stat__live');
            if (!el) return;
            if (visible) run(el, el._target);
            else el.textContent = '0';               // reset so the replay starts from zero
        });
    });

    live.forEach(el => {
        const stat = el.closest('.stat');
        if (!stat) return;
        stat._counted = stat.classList.contains('is-visible');
        if (stat._counted) run(el, el._target);
        else el.textContent = '0';
        observer.observe(stat, { attributes: true, attributeFilter: ['class'] });
    });
}
