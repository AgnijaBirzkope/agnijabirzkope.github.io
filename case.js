/* Case study behaviour: the screen stage, enlarging screens and the section index.
   Everything still reads fine without this script; it only adds the extras. */
(() => {
  document.documentElement.classList.add('js');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- enlarge a screen ---------- */
  const box = $('.lightbox');
  if (box) {
    const big = $('img', box);
    document.addEventListener('click', (e) => {
      const t = e.target.closest('img[data-zoom]');
      if (!t) return;
      big.src = t.currentSrc || t.src; big.alt = t.alt;
      box.showModal ? box.showModal() : box.setAttribute('open', '');
    });
    box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('.lightbox__close')) box.close ? box.close() : box.removeAttribute('open'); });
  }

  /* ---------- the screen stage: a small sticky viewer that follows the decision you are reading ---------- */
  const dec = $('.dec');
  if (dec) {
    const items = $$('.dec__item', dec);
    const holder = dec.closest('.sec') || dec;
    const stage = $('.stage', holder);
    const wide = window.matchMedia('(min-width: 900px)');
    const show = (item) => {
      items.forEach(i => i.classList.toggle('is-active', i === item));
      stage.innerHTML = '';
      const set = document.createElement('div');
      const shots = $$('.shots img', item);
      set.className = 'stage__set stage__set--' + shots.length;
      shots.forEach(s => { const c = s.cloneNode(true); c.removeAttribute('loading'); set.appendChild(c); });
      stage.appendChild(set);
    };
    const apply = () => { dec.classList.toggle('dec--stage', wide.matches); holder.classList.toggle('has-stage', wide.matches); if (wide.matches) show($('.is-active', dec) || items[0]); };
    wide.addEventListener('change', apply);
    apply();
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (!wide.matches) return;
        entries.forEach(en => { if (en.isIntersecting) show(en.target); });
      }, { rootMargin: '-35% 0px -55% 0px' });
      items.forEach(i => io.observe(i));
    }
  }

  /* ---------- the section index follows where you are ---------- */
  const index = $('.index');
  if (index && 'IntersectionObserver' in window) {
    const links = $$('a', index);
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    $$('.sec').forEach(s => io.observe(s));
  }
})();
