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