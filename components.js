/* Shared components. The nav bar and the footer are written once, here, and every page uses
   <site-header></site-header> and <site-footer></site-footer>. Change them here and every page updates. */
(() => {
  // on the home page the links jump within the page; everywhere else they go back to the home page
  const path = location.pathname.replace(/\/+$/, '');
  const onHome = path === '' || /(^|\/)index\.html$/.test(path);
  const to = (hash) => (onHome ? hash : 'index.html' + (hash === '#top' ? '' : hash));

  class SiteHeader extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <header class="bar">
          <a class="bar__name" href="${to('#top')}">Agnija Birzkope</a>
          <nav class="bar__links">
            <a href="${to('#about')}">About</a>
            <a href="${to('#work')}">Work</a>
            <a href="#contact">Contact</a>
          </nav>
        </header>`;
    }
  }

  class SiteFooter extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <footer class="contact" id="contact">
          <div class="contact__row">
            <p class="contact__lead">Let’s work together.</p>
            <nav class="contact__links" aria-label="Contact">
              <a href="mailto:birzkope.a@gmail.com"><span>birzkope.a@gmail.com</span><i></i></a>
              <a href="https://www.linkedin.com/in/agnija-birzkope-71b853339/" target="_blank" rel="noopener"><span>LinkedIn</span><i></i></a>
              <a href="agnija-birzkope-cv.pdf" target="_blank" rel="noopener"><span>CV</span><i></i></a>
            </nav>
          </div>
          <p class="contact__foot"><span>© 2026 Agnija Birzkope</span><span>Open to internships Feb to May</span><a href="#top">Back to top</a></p>
        </footer>`;
      // clicking the email copies it and says so
      this.querySelectorAll('a[href^="mailto:"]').forEach(link => {
        const mark = link.querySelector('i');
        const original = mark ? mark.textContent : '';
        const address = link.getAttribute('href').replace('mailto:', '');
        let timer;
        if (mark) mark.setAttribute('aria-live', 'polite');
        link.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            await navigator.clipboard.writeText(address);
          } catch (err) {
            window.location.href = link.getAttribute('href'); // clipboard blocked: open the mail app instead
            return;
          }
          if (!mark) return;
          clearTimeout(timer);
          mark.textContent = 'Copied';
          link.classList.add('is-copied');
          timer = setTimeout(() => { mark.textContent = original; link.classList.remove('is-copied'); }, 2000);
        });
      });
    }
  }

  customElements.define('site-header', SiteHeader);
  customElements.define('site-footer', SiteFooter);
})();
