/* Case study behaviour: enlarging screens and the section index.
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

  /* ---------- key decisions: the screens stay on the left and follow the decision you are reading ---------- */
  const dec = $('.dec');
  if (dec) {
    const items = $$('.dec__item', dec);
    const holder = dec.closest('.sec') || dec;
    const stage = $('.stage', holder);
    const wide = window.matchMedia('(min-width: 900px)');
    const show = (item) => {
      items.forEach(i => i.classList.toggle('is-active', i === item));
      stage.innerHTML = '';
      const shots = $$('.shots img', item);
      const set = document.createElement('div');
      set.className = 'stage__set stage__set--' + shots.length;
      shots.forEach((s) => { const c = s.cloneNode(true); c.removeAttribute('loading'); set.appendChild(c); });
      stage.appendChild(set);
    };
    const apply = () => {
      dec.classList.toggle('dec--stage', wide.matches);
      holder.classList.toggle('has-stage', wide.matches);
      if (wide.matches) show($('.is-active', dec) || items[0]);
    };
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
  if (index) {
    const secs = $$('.sec');
    const lis = $$('li', index);
    let queued = false;
    const update = () => {
      queued = false;
      const line = innerHeight * 0.4;
      let cur = -1;
      secs.forEach((s, i) => { if (s.getBoundingClientRect().top <= line) cur = i; });
      const last = secs[secs.length - 1].getBoundingClientRect();
      index.classList.toggle('is-on', cur >= 0 && last.bottom > line);
      lis.forEach((li, i) => { li.classList.toggle('is-current', i === cur); li.classList.toggle('is-past', i < cur); });
      index.style.setProperty('--fill', (lis[Math.max(cur, 0)].offsetTop - lis[0].offsetTop) + 'px');
      /* stop with the last section: the map rides up with it instead of running over the footer */
      const barH = ($('.bar') || {}).offsetHeight || 64;
      const bottom = (innerHeight + barH) / 2 + index.offsetHeight / 2;
      const push = Math.min(0, last.bottom - 28 - bottom);
      index.style.setProperty('--push', push + 'px');
      /* once the map would reach the nav bar, the page is over and it fades out */
      if ((innerHeight + barH) / 2 - index.offsetHeight / 2 + push < barH + 8) index.classList.remove('is-on');
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    update();
  }

  /* ---------- planning route: fills as you scroll, stops light up when the line reaches them ---------- */
  const route = $('.route');
  if (route) {
    const stops = $$('.stop', route);
    const line = document.createElement('div');
    line.className = 'route__line';
    line.setAttribute('aria-hidden', 'true');
    line.innerHTML = '<span class="route__fill"></span>';
    route.prepend(line);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let queued = false;
    const update = () => {
      queued = false;
      const rr = route.getBoundingClientRect();
      const nodes = stops.map(s => $('.node', s).getBoundingClientRect());
      const horizontal = getComputedStyle(route).gridTemplateColumns.split(' ').length > 1;
      const c = (n) => horizontal ? n.left + n.width / 2 - rr.left : n.top + n.height / 2 - rr.top;
      const start = c(nodes[0]);
      const length = c(nodes[nodes.length - 1]) - start;
      route.style.setProperty(horizontal ? '--x0' : '--y0', start + 'px');
      route.style.setProperty('--len', length + 'px');
      const vh = innerHeight;
      const range = Math.max(rr.height, vh * 0.5);
      const p = reduce ? 1 : Math.min(1, Math.max(0, (vh * 0.82 - rr.top) / range));
      route.style.setProperty('--f', p.toFixed(4));
      const reachedAt = start + p * length + 2;
      let last = -1;
      stops.forEach((el, i) => {
        const reached = reduce || c(nodes[i]) <= reachedAt;
        el.classList.toggle('is-reached', reached);
        if (reached) last = i;
      });
      stops.forEach((el, i) => {
        el.classList.toggle('is-active', i === last && last < stops.length - 1);
        el.classList.toggle('is-passed', i < last || (i === last && last === stops.length - 1));
      });
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
    update();
  }
})();
