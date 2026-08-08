/* Grows the message box with its content up to the max-height set in CSS, past
   which it scrolls instead. Height is reset to auto first so scrollHeight
   reports the content height rather than the current (possibly larger) box. */
export function initAutoGrowTextarea() {
    const area = document.querySelector('#contact-form textarea');
    if (!area) return;

    /* box-sizing is border-box page-wide, so the borders have to be added back:
       scrollHeight covers content + padding only, and a 2px shortfall is enough
       to leave the box permanently scrolled by a sliver. */
    const grow = () => {
        const cs = getComputedStyle(area);
        const borders = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
        area.style.height = 'auto';
        area.style.height = area.scrollHeight + borders + 'px';
    };

    area.addEventListener('input', grow);
    grow();
}

/* Contact form. EmailJS is loaded from a CDN as a classic script, so it is a
   global here; if it failed to load the form is left alone rather than broken. */
export function initContactForm() {
    const form = document.getElementById('contact-form');
    const message = document.getElementById('contact-message');
    const btn = document.getElementById('send-btn');
    if (!form || typeof emailjs === 'undefined') return;

    emailjs.init('lOoH4emmOKCNZFvxs');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const original = btn.textContent;
        btn.textContent = 'Sending…';
        emailjs.sendForm('service_ympxgfp', 'template_cs0r68j', form).then(() => {
            message.textContent = 'Message sent successfully ✅';
            form.reset();
            /* reset() does not fire 'input', so nudge the auto-grow to collapse. */
            form.querySelector('textarea')?.dispatchEvent(new Event('input'));
            btn.textContent = original;
            setTimeout(() => message.textContent = '', 5000);
        }, () => {
            message.textContent = 'Message not sent (service error) ❌';
            btn.textContent = original;
            setTimeout(() => message.textContent = '', 5000);
        });
    });
}
