/* 3D pointer tilt on the project cards. Tilt strength adapts to viewport width
   and is skipped entirely on devices that cannot hover. */
export function initCardTilt() {
    const cards = document.querySelectorAll('.card');

    const getTiltConfig = () => {
        const w = window.innerWidth;
        const canHover = window.matchMedia('(hover: hover)').matches;
        if (!canHover) return { enabled: false };
        if (w < 768)   return { enabled: true, maxTilt: 9,  popScale: 1.05, perspective: 900  };
        if (w < 1150)  return { enabled: true, maxTilt: 8,  popScale: 1.04, perspective: 900  };
        if (w < 2048)  return { enabled: true, maxTilt: 10, popScale: 1.05, perspective: 1000 };
        return           { enabled: true, maxTilt: 10, popScale: 1.05, perspective: 1200 };
    };

    let tiltConfig = getTiltConfig();
    window.addEventListener('resize', () => { tiltConfig = getTiltConfig(); });

    cards.forEach(card => {
        let rect = null, frame = null;

        card.addEventListener('mouseenter', () => {
            if (!tiltConfig.enabled) return;
            rect = card.getBoundingClientRect();
            card.style.transition = 'transform 0s';
            card.style.zIndex = 10;
        });

        card.addEventListener('mousemove', (e) => {
            if (!tiltConfig.enabled || !rect) return;
            if (frame) cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const { maxTilt, popScale, perspective } = tiltConfig;
                const px = (e.clientX - rect.left) / rect.width;
                const py = (e.clientY - rect.top) / rect.height;
                const rotateY = (px - 0.5) * 2 * maxTilt;
                const rotateX = (0.5 - py) * 2 * maxTilt;
                card.style.transform =
                    `perspective(${perspective}px) scale(${popScale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
        });

        card.addEventListener('mouseleave', () => {
            card.style.transition = 'transform 0.4s ease';
            card.style.transform = '';
            card.style.zIndex = '';
            rect = null;
        });
    });
}
