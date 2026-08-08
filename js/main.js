/* Entry point. Loaded as <script type="module">, so it is deferred and the DOM
   is parsed before any of these run.

   Reveal is initialised first: it hides its targets, and the page is held at
   opacity 0 (see the .js-reveal rules in styles.css) until it says otherwise,
   so nothing paints in its final position and then jumps back to hidden. */
import { initReveal } from './reveal.js';
import { initTopbarHeight, initScroll } from './scroll.js';
import { initCardTilt } from './cards.js';
import { initProjectModal } from './modal.js';
import { initContactForm, initAutoGrowTextarea } from './contact.js';
import { initTypedRoles, initDiscordCopy } from './ui.js';
import { initCounters } from './counters.js';
import { initCatMeow } from './catMeow.js';

initTopbarHeight();
initReveal();
initScroll();

initCardTilt();
initProjectModal();
initContactForm();
initAutoGrowTextarea();

initTypedRoles();
initDiscordCopy();
// After initReveal, so the stats already carry their initial visibility state.
initCounters();
initCatMeow();

//