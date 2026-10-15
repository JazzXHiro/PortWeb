# Keerti Vardhan — Portfolio

Personal portfolio for **Keerti Vardhan**, a Computer Science student (UPES, India) focused on game development and software engineering. It is a hand-built static site with no frameworks and no build step: plain HTML, CSS and ES-module JavaScript.

**Live site:** https://k-vardhan.netlify.app/

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Netlify](https://img.shields.io/badge/Hosted_on-Netlify-00C7B7?logo=netlify&logoColor=white)

---

## Sections

| # | Section  | What's there |
|---|----------|--------------|
| — | Home     | Intro, typed roles, stats, CV download, "open to work" badge |
| 01 | About   | Bio and skills (HTML, CSS, JS, C, C++, Python, Unity, Godot, Pygame, Git) |
| 02 | Projects | Project cards, detail modal, link to project case studies |
| 03–04 | Resume | Experience and education |
| 05 | Contact | EmailJS form, contact details and social links |

## Project structure

```
index.html            Main page (home, about, projects, resume, contact)
project-jaded.html    Standalone case-study page for "Jaded"
css/
  styles.css          All styling (design tokens in :root)
js/
  main.js             Entry point: imports and starts every module
  scroll.js           Shared rAF scroll loop + measure pass (topbar, nav, progress, parallax)
  reveal.js           Scroll-triggered reveal animations
  counters.js         Count-up hero stats (triggered by reveal)
  cards.js            3D tilt on project cards
  modal.js            Project detail modal + media carousel
  contact.js          EmailJS contact form + auto-growing textarea
  ui.js               Typed role cycler, Discord copy-to-clipboard
  catMeow.js          Easter egg: clickable cat in the contact section
img/                  Images, screenshots and video used across the site
pdf/                  Resume/CV (gitignored, see Notes)
```

## Tech

- **HTML5 / CSS3**: custom properties for theming, `clamp()`-based fluid spacing, no CSS framework
- **Vanilla JavaScript** (ES modules), no bundler
- **[Remix Icon](https://remixicon.com/)** and **[Devicon](https://devicon.dev/)** via CDN
- **Google Fonts**: Unbounded and JetBrains Mono
- **EmailJS** for the contact form
- **GitHub REST API** for the live commit feed on the Jaded page

## Deployment

Hosted on **Netlify** and auto-deployed from the `main` branch. No build command; the publish directory is the repo root.

## Contact

- Use the contact form on the [live site](https://k-vardhan.netlify.app/#contact).

---

© 2026 Keerti Vardhan
