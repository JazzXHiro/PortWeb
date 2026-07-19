/*======================== SHOW MENU ======================*/
const navMenu = document.getElementById('nav-menu'),
      navToggle = document.getElementById('nav-toggle'),
      navClose = document.getElementById('nav-close')

/*===== MENU SHOW =====*/
if(navToggle){
    navToggle.addEventListener('click', () =>{
        navMenu.classList.add('show-menu') /* override top -120% to 0 */
        // when clicked, add the show-menu class to navMenu
    })
}

/*===== MENU HIDDEN =====*/
if(navClose){
    navClose.addEventListener('click', () =>{
        navMenu.classList.remove('show-menu')
    })
}

/*======================== REMOVE MENU MOBILE ======================*/
const navLink = document.querySelectorAll('.nav__link')

const linkAction = () =>{
    // When we click on each nav__link, we remove the show-menu class
    navMenu.classList.remove('show-menu')
}
navLink.forEach(n => n.addEventListener('click', linkAction))

/*======================== HOME TYPED JS ======================*/
const typedHome = new Typed('#home-typed', {
    strings: ['<i>Web Developer</i>', '<i>Game Developer</i>', "<i>CS Student</i>"], //Insert professions
    typeSpeed: 80,
    backSpeed: 40,
    backDelay: 2000,
    loop: true,
    cursorChar: '_',
})

/*======================== Discord ID COPY ======================*/
function copyDiscord(event) {
  event.preventDefault(); // stops page jump

  const discordUsername = "cyberjazz_cj";
  //const msg = document.getElementById("discord-msg");
  const icon = document.getElementById("discord-icon");

  navigator.clipboard.writeText(discordUsername).then(() => {
    //msg.textContent = "Discord username copied!";
    icon.classList.remove("ri-discord-fill");
    icon.classList.add("ri-link");
    
    setTimeout(() => {
      //msg.textContent = "";
      icon.classList.remove("ri-link");
      icon.classList.add("ri-discord-fill");
    }, 1500);
  });
}

const shadowHeader = () => {
    const header = document.getElementById('header');
    // Add a class if the bottom of the header is more than 50px from the top of the viewport
    this.scrollY >= 50 ? header.classList.add('shadow-header')
                       : header.classList.remove('shadow-header')
}
window.addEventListener('scroll', shadowHeader)

/*======================== CONTACT EMAIL JS ======================*/
const contactForm = document.getElementById('contact-form'),
      contactMessage = document.getElementById('contact-message')

const sendEmail = (e) => {
    e.preventDefault()

    // serviceID - templateID - #form - publicKey
    emailjs.sendForm("service_ympxgfp", "template_cs0r68j", "#contact-form", "lOoH4emmOKCNZFvxs").then(() => {
        // Show sent message
        contactMessage.textContent = "Message sent successfully ✅"

        // Remove message after five seconds
        setTimeout(() => {
            contactMessage.textContent = ""
        }, 5000)

        // Clear input fields
        contactForm.reset()
    }, () => {
        // Show error message
        contactMessage.textContent = "Message not sent (service error) ❌"

        // Remove message after five seconds
        setTimeout(() => {
            contactMessage.textContent = ""
        }, 5000)
    })
}
contactForm.addEventListener('submit', sendEmail)

/*======================== SHOW SCROLL UP ======================*/
const scrollUp = () => {
    const scrollUp = document.getElementById('scroll-up');
    // When the scroll is higher than 350 viewport height, add the show-scroll class to the scroll up button
    this.scrollY >= 350 ? scrollUp.classList.add('show-scroll')
                        : scrollUp.classList.remove('show-scroll')
}
window.addEventListener('scroll', scrollUp)

/*======================== SCROLL SECTIONS ACTIVE LINK ======================*/
const sections = document.querySelectorAll('section[id]')

const scrollActive = () =>{
    const scrollDown = window.scrollY
    
    sections.forEach(current =>{
        const sectionHeight = current.offsetHeight,
              sectionTop = current.offsetTop - 58,
              sectionId = current.getAttribute('id'),
              sectionsClass = document.querySelector('.nav__menu a[href*=' + sectionId + ']')
        
        if(scrollDown > sectionTop && scrollDown <= sectionTop + sectionHeight){
            sectionsClass.classList.add('active-link')
        }else{
            sectionsClass.classList.remove('active-link')
        }
    })
}
window.addEventListener('scroll', scrollActive)

/*======================== SCROLL REVEAL ANIMATION ======================*/
const sr = ScrollReveal({
    origin: 'top',
    distance: '60px',
    duration: 2000,
    reset: true, // Animation repeat
})

sr.reveal(`.home__content, .resume__content:nth-child(1), .footer__container`)
sr.reveal(`.home__data, .resume__content:nth-child(2)`, {delay: 300, origin: `bottom`})

sr.reveal(`.about__content, .contact__content`, {origin: `bottom`})
sr.reveal(`.about__image, .contact__form`, {delay: 300})

sr.reveal(`.projects__card`, {interval: 100})

/*=============== 3D TILT ON PROJECT CARDS ===============*/

const tiltCards = document.querySelectorAll('.projects__card');

// Tilt settings adapt to the current viewport + pointer capability.
// Breakpoints mirror the projects grid layout in styles.css.
const getTiltConfig = () => {
    const w = window.innerWidth;
    const canHover = window.matchMedia('(hover: hover)').matches;

    if (!canHover)   return { enabled: false };                                             // touch: no hover, skip effect
    if (w < 768)     return { enabled: true, maxTilt: 9,  popScale: 1.05, perspective: 900  }; // 1 col
    if (w < 1150)    return { enabled: true, maxTilt: 8,  popScale: 1.04, perspective: 900  }; // 2 col, touching (0 gap)
    if (w < 2048)    return { enabled: true, maxTilt: 10, popScale: 1.05, perspective: 1000 }; // 3 col, 32px gap
    return             { enabled: true, maxTilt: 10, popScale: 1.05, perspective: 1200 };       // 2K, body zoom 1.2
};

let tiltConfig = getTiltConfig();
window.addEventListener('resize', () => { tiltConfig = getTiltConfig(); });

tiltCards.forEach(card => {
    let rect = null;
    let frame = null;

    card.addEventListener('mouseenter', () => {
        if (!tiltConfig.enabled) return;
        rect = card.getBoundingClientRect(); // cache once to avoid delays
        card.style.transition = 'transform 0s'; // instant follow while tracking
        card.style.zIndex = 10; // bring to front
    });

    card.addEventListener('mousemove', (e) => {
        if (!tiltConfig.enabled || !rect) return;
        if (frame) cancelAnimationFrame(frame);

        frame = requestAnimationFrame(() => {
            const { maxTilt, popScale, perspective } = tiltConfig;
            const px = (e.clientX - rect.left) / rect.width;
            const py = (e.clientY - rect.top) / rect.height;
            const rotateY = (px - 0.5) * 2 * maxTilt; // range: -maxTilt to maxTilt
            const rotateX = (0.5 - py) * 2 * maxTilt; // range: -maxTilt to maxTilt
            card.style.transform = `perspective(${perspective}px) scale(${popScale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
    });

    card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.4s ease'; // smooth return to original state
        card.style.transform = '';
        card.style.zIndex = '';
        rect = null; // reset rect for next enter
    });
});

/*=============== HEADING FADES FOR POPUPS ===============*/
// When a card's popup panel (.projects__data) pokes up over the "Projects"
// heading, fade the heading out with a slight nudge so they don't collide.
const projectsTitle = document.querySelector('#projects .section__title');

if (projectsTitle) {
    // Heading's resting bottom in document coords — used to tell whether a card's
    // popup actually rises into the heading's band (top-row cards) or not.
    let restBottom = 0;
    const measure = () => {
        restBottom = projectsTitle.getBoundingClientRect().bottom + window.scrollY;
    };
    measure();
    window.addEventListener('resize', measure);

    // Horizontal extent of the visible heading text (the <h2> box spans the full
    // column, so measure the text, not the element).
    const textEdges = () => {
        const range = document.createRange();
        range.selectNodeContents(projectsTitle);
        const r = range.getBoundingClientRect();
        return { left: r.left, right: r.right };
    };

    const clearTitle = () => {
        projectsTitle.style.transform = '';
        projectsTitle.style.opacity = '';
    };

    tiltCards.forEach(card => {
        const panel = card.querySelector('.projects__data');

        card.addEventListener('mouseenter', () => {
            if (!panel) return;

            const cardRect = card.getBoundingClientRect();
            // Panel is anchored at the card's top edge and nudged down 1.5rem on hover.
            const popupTop = cardRect.top + window.scrollY + 24 - panel.offsetHeight;
            const text = textEdges();

            const overlapsVertically   = popupTop < restBottom;
            const overlapsHorizontally = cardRect.left < text.right &&
                                         cardRect.right > text.left;

            if (overlapsVertically && overlapsHorizontally) {
                projectsTitle.style.transform = 'translateY(-1rem)';
                projectsTitle.style.opacity = '0';
            } else {
                clearTitle();
            }
        });

        card.addEventListener('mouseleave', clearTitle);
    });
}

/*=============== PROJECT DETAILS MODAL ===============*/
const projectModal = document.getElementById('project-modal');
const projectModalClose = document.getElementById('project-modal-close');
const projectCards = document.querySelectorAll('.projects__card');
const stage = document.getElementById('pm-stage');
const dotsEl = document.getElementById('pm-dots');
const prevBtn = document.getElementById('pm-prev');
const nextBtn = document.getElementById('pm-next');

let csMedia = [];
let csActive = 0;

/* Build tiles + dots from an array of .pm__media descriptors */
function buildCarousel(mediaData) {
    stage.innerHTML = ''; dotsEl.innerHTML = '';
    csMedia = mediaData.length ? mediaData : [{'type': 'placeholder', label: 'no_media.png'}];

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

/* Coverflow positioning */
function layout() {
    const W = stage.clientWidth;
    const tileW = Math.round(W * 0.6);
    const step = Math.round(tileW * 0.82);
    const cx = W / 2;
    const H = stage.clientHeight - 32;
    
    [...stage.children].forEach((tile, i) => {
        const off = i - csActive, a = Math.abs(off), isC = (off === 0);
        const h = isC ? H : Math.round(H * 0.86);
        tile.style.width = tileW + 'px';
        tile.style.height = h + 'px';
        tile.style.top = (16 + (isC ? 0 : Math.round(H * 0.07))) + 'px';
        tile.style.transform = `translateX(${cx - tileW/2 + off * step}px) scale(${isC ? 1 : 0.82})`;
        tile.style.opacity = a <= 1 ? 1 : 0;
        tile.style.zIndex = 20 - a;
        tile.style.pointerEvents = a <= 1 ? 'auto' : 'none';
        tile.classList.toggle('is-active', isC);
    });

    [...dotsEl.children].forEach((d, i) => d.classList.toggle('is-active', i === csActive));
    prevBtn.disabled = (csActive === 0);
    nextBtn.disabled = (csActive === csMedia.length - 1);
}

function setActive(i) {
    csActive = Math.max(0, Math.min(i, csMedia.length - 1));
    layout();
}

prevBtn.addEventListener('click', () => setActive(csActive - 1));
nextBtn.addEventListener('click', () => setActive(csActive + 1));
window.addEventListener('resize', () => { if (projectModal.classList.contains('show-modal')) layout(); });

/* Read a card's <template> and open the modal */
function openProjectModal(card) {
    const tpl = card.querySelector('.project-detail');
    if (!tpl) return;
    const c = tpl.content;
    const txt = (sel) => (c.querySelector(sel)?.textContent || '').trim();

    document.getElementById('pm-tagline').textContent = txt('.pm__tagline');
    document.getElementById('pm-title').textContent = txt('.pm__title');
    document.getElementById('pm-desc').textContent = txt('.pm__desc');

    // Tech — clone the <li>s straight across
    document.getElementById('pm-tech').innerHTML = 
    [...c.querySelectorAll('.pm__tech-src li')].map(li => li.outerHTML).join('');

    // Stats
    document.getElementById('pm-stats').innerHTML =
    [...c.querySelectorAll('.pm__stats-src li')].map(li => `<span>${li.textContent}</span>`).join('');

    // Links
    const ghSrc = c.querySelector('.pm__github-src');
    const gh = document.getElementById('pm-github');
    gh.href = ghSrc ? ghSrc.getAttribute('href') : '#';
    document.getElementById('pm-github-label').textContent = ghSrc ? ghSrc.textContent : 'Source';
    const ctaSrc = c.querySelector('.pm__cta-src');
    document.getElementById('pm-details').href = ctaSrc ? ctaSrc.getAttribute('href') : '#';

    // Media
    const media = [...c.querySelectorAll('.pm__media')].map(el => ({
        type: el.dataset.type, src: el.dataset.src, label: el.dataset.label,
    }));

    buildCarousel(media);
    projectModal.classList.add('show-modal');
}
const closeprojectModal = () => { projectModal.classList.remove('show-modal'); };

/* Each card's arrow opens ITS OWN template */
projectCards.forEach(card => {
    const arrow = card.querySelector('.projects__arrow');
    if (arrow) arrow.addEventListener('click', () => openProjectModal(card));
    card.addEventListener('click', () => openProjectModal(card));
});

if (projectModalClose) projectModalClose.addEventListener('click', closeprojectModal);
if (projectModal) projectModal.addEventListener('click', (e) => { if (e.target === projectModal) closeprojectModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeprojectModal(); });


