/* Small standalone hero/rail widgets. */

/* Cycles the kicker line under the hero title, typing and deleting each role. */
export function initTypedRoles() {
    const el = document.getElementById('home-typed');
    if (!el) return;

    const roles = ['GAME DEVELOPER', 'SOFTWARE ENGINEER', 'CS STUDENT'];
    let ri = 0, ci = 0, deleting = false, hold = 0;

    setInterval(() => {
        const full = roles[ri];
        if (!deleting) {
            ci++;
            if (ci >= full.length) {
                ci = full.length;
                if (!hold) hold = Date.now() + 1600;
                if (Date.now() > hold) { deleting = true; hold = 0; }
            }
        } else {
            ci--;
            if (ci <= 0) { ci = 0; deleting = false; ri = (ri + 1) % roles.length; }
        }
        el.textContent = full.slice(0, ci);
    }, 80);
}

/* Copies the Discord handle; the rail icon flips to a link glyph as feedback. */
export function initDiscordCopy() {
    const link = document.getElementById('discord-copy');
    if (!link) return;

    link.addEventListener('click', (e) => {
        e.preventDefault();
        navigator.clipboard && navigator.clipboard.writeText('cyberjazz_cj');
        const icon = document.getElementById('discord-rail');
        if (!icon) return;
        icon.classList.replace('ri-discord-fill', 'ri-link');
        setTimeout(() => icon.classList.replace('ri-link', 'ri-discord-fill'), 1400);
    });
}
