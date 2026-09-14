# Keerti Vardhan — Portfolio

Personal portfolio site for Keerti Vardhan (Computer Science). A static, single-page site with a home/about section, a project showcase with a modal viewer, a resume/CV section, and a contact form.

**Live site:** https://jazzxhiro.github.io/PortWeb/

## Structure

```
index.html          Main page (home, about, projects, resume, contact)
project-jaded.html   Standalone case-study page for the "Jaded" project
css/styles.css       All styling
js/
  main.js            Entry point / setup
  ui.js              General UI behavior
  cards.js           Project card rendering
  modal.js           Project detail modal
  scroll.js          Scroll effects
  reveal.js          Scroll-triggered reveal animations
  counters.js        Animated stat counters
  catMeow.js         Easter-egg cat interaction
img/                 Images and media used across the site
pdf/                 Resume/CV (ignored in git — see below)
```

## Running locally

No build step is required — it's plain HTML/CSS/JS. Serve the folder with any static server, e.g.:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Contact form

The contact form uses [EmailJS](https://www.emailjs.com/) (loaded via CDN in `js/contact.js`) to send messages without a backend.

## Deployment

Hosted for free on **GitHub Pages**, deployed from the `main` branch.

## Notes

- `img/`, `docs/`, `pdf/`, and `info.txt` are gitignored — media/local-only assets aren't tracked in the repo.
