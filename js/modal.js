/* Project details modal. Each .card carries a <template class="project-detail">
   holding its own copy; opening a card reads that template into the single
   shared modal, so there is one modal in the DOM regardless of card count. */
export function initProjectModal() {
    const projectModal = document.getElementById('project-modal');
    const projectModalClose = document.getElementById('project-modal-close');
    const projectCards = document.querySelectorAll('.card');
    const stage = document.getElementById('pm-stage');
    const dotsEl = document.getElementById('pm-dots');
    const prevBtn = document.getElementById('pm-prev');
    const nextBtn = document.getElementById('pm-next');
    if (!projectModal || !stage) return;

    let csMedia = [], csActive = 0;

    function buildCarousel(mediaData) {
        stage.innerHTML = ''; dotsEl.innerHTML = '';
        csMedia = mediaData.length ? mediaData : [{ type: 'placeholder', label: 'no_media.png' }];

        csMedia.forEach((m, i) => {
            const tile = document.createElement('div');
            tile.className = 'pm__tile';
            if (m.type === 'image' || m.type === 'gif') {
                tile.innerHTML = `<img src="${m.src}" alt="${m.label || ''}">`;
            } else if (m.type === 'video') {
                tile.innerHTML = `<video src="${m.src}" autoplay muted loop playsinline></video>`;
            } else {
                tile.innerHTML = `<div class="pm__ph"><i class="ri-image-line"></i><span>${m.label || 'No media available'}</span></div>`;
            }
            tile.addEventListener('click', () => { if (i !== csActive) setActive(i); });
            stage.appendChild(tile);

            const dot = document.createElement('button');
            dot.addEventListener('click', () => setActive(i));
            dotsEl.appendChild(dot);
        });

        csActive = 0;
        requestAnimationFrame(layout);
    }

    /* Tiles are absolutely positioned and placed by hand rather than in a track,
       so the active one can sit centred and larger with its neighbours peeking. */
    function layout() {
        const W = stage.clientWidth;
        const tileW = Math.round(W * 0.6);
        const step = Math.round(tileW * 0.82);
        const cx = W / 2;
        const H = stage.clientHeight - 32;
        const N = csMedia.length;

        [...stage.children].forEach((tile, i) => {
            /* Pick the shortest way around the loop so the last tile can peek
               on the left of the first one and vice versa. */
            let off = i - csActive;
            if (off > N / 2) off -= N;
            else if (off < -N / 2) off += N;
            const a = Math.abs(off), isC = (off === 0);
            const h = isC ? H : Math.round(H * 0.86);
            tile.style.width = tileW + 'px';
            tile.style.height = h + 'px';
            tile.style.top = (16 + (isC ? 0 : Math.round(H * 0.07))) + 'px';
            tile.style.transform = `translateX(${cx - tileW / 2 + off * step}px) scale(${isC ? 1 : 0.82})`;
            tile.style.opacity = a <= 1 ? 1 : 0;
            tile.style.zIndex = 20 - a;
            tile.style.pointerEvents = a <= 1 ? 'auto' : 'none';
            tile.classList.toggle('is-active', isC);
        });

        [...dotsEl.children].forEach((d, i) => d.classList.toggle('is-active', i === csActive));
        prevBtn.disabled = (N <= 1);
        nextBtn.disabled = (N <= 1);
    }

    function setActive(i) {
        const N = csMedia.length;
        csActive = ((i % N) + N) % N;
        layout();
    }

    prevBtn.addEventListener('click', () => setActive(csActive - 1));
    nextBtn.addEventListener('click', () => setActive(csActive + 1));
    window.addEventListener('resize', () => { if (projectModal.classList.contains('show-modal')) layout(); });

    function openProjectModal(card) {
        const tpl = card.querySelector('.project-detail');
        if (!tpl) return;
        const c = tpl.content;
        const txt = (sel) => (c.querySelector(sel)?.textContent || '').trim();

        document.getElementById('pm-tagline').textContent = txt('.pm__tagline');
        document.getElementById('pm-title').textContent = txt('.pm__title');
        document.getElementById('pm-desc').textContent = txt('.pm__desc');

        document.getElementById('pm-tech').innerHTML =
            [...c.querySelectorAll('.pm__tech-src li')].map(li => li.outerHTML).join('');

        document.getElementById('pm-stats').innerHTML =
            [...c.querySelectorAll('.pm__stats-src li')].map(li => `<span>${li.textContent}</span>`).join('');

        const ghSrc = c.querySelector('.pm__github-src');
        const gh = document.getElementById('pm-github');
        gh.href = ghSrc ? ghSrc.getAttribute('href') : '#';
        document.getElementById('pm-github-label').textContent = ghSrc ? ghSrc.textContent : 'Source';
        const ctaSrc = c.querySelector('.pm__cta-src');
        document.getElementById('pm-details').href = ctaSrc ? ctaSrc.getAttribute('href') : '#';

        const media = [...c.querySelectorAll('.pm__media')].map(el => ({
            type: el.dataset.type, src: el.dataset.src, label: el.dataset.label,
        }));

        buildCarousel(media);
        projectModal.classList.add('show-modal');
    }

    const close = () => projectModal.classList.remove('show-modal');

    projectCards.forEach(card => card.addEventListener('click', () => openProjectModal(card)));
    if (projectModalClose) projectModalClose.addEventListener('click', close);
    projectModal.addEventListener('click', (e) => { if (e.target === projectModal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
