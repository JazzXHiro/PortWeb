/* Pops a cute "Meow" bubble over the cat's hat on each click, then removes it
   once its animation has played out. A tiny horizontal jitter and a rotating
   set of phrases keep repeat clicks feeling lively. */
export function initCatMeow() {
    const wrap = document.getElementById('cat-wrap');
    if (!wrap) return;

    const phrases = ['Meow', 'Meow~', 'Mrrp', 'Nya!', ':3'];

    wrap.addEventListener('click', () => {
        const bubble = document.createElement('span');
        bubble.className = 'cat-meow';
        bubble.textContent = phrases[Math.floor(Math.random() * phrases.length)];
        // Small left/right wobble so stacked clicks don't overlap perfectly.
        bubble.style.marginLeft = (Math.random() * 24 - 12).toFixed(0) + 'px';
        wrap.appendChild(bubble);
        bubble.addEventListener('animationend', () => bubble.remove());
    });
}
