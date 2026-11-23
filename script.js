(() => {
  /* ---------- project cards: expand on hover / tap ---------- */
  const wrap = document.getElementById('panels');
  const panels = [...wrap.querySelectorAll('.panel')];

  const activate = (el) => {
    panels.forEach(p => p.classList.toggle('is-active', p === el));
    wrap.classList.toggle('has-active', !!el);
  };

  const canHover = window.matchMedia('(hover: hover)').matches;

  panels.forEach(p => {
    if (canHover) p.addEventListener('mouseenter', () => activate(p));
    p.addEventListener('focus', () => activate(p));
    // touch: first tap opens the card, links inside still work once open
    p.addEventListener('click', (e) => {
      if (!p.classList.contains('is-active')) { e.preventDefault(); activate(p); }
    });
  });

  if (canHover) wrap.addEventListener('mouseleave', () => activate(null));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { activate(null); document.activeElement.blur(); }
  });

  /* ---------- fade sections in as they scroll into view ---------- */
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: .15, rootMargin: '0px 0px -5% 0px' });
    items.forEach(el => io.observe(el));
  } else {
    items.forEach(el => el.classList.add('in'));
  }

  /* ---------- hero word: wave + cursor lift ---------- */
  const word = document.querySelector('.hero__chars');
  if (word && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const text = word.textContent;
    word.textContent = '';
    const chars = [...text].map((ch, i) => {
      const outer = document.createElement('span');
      outer.className = 'ch'; outer.style.setProperty('--i', i); outer.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span'); inner.textContent = ch === ' ' ? ' ' : ch;
      outer.appendChild(inner); word.appendChild(outer);
      return { inner, outer, y: 0 };
    });
    const hero = document.querySelector('.hero');
    let mx = -9999, my = -9999, size = 0, rects = [];
    const measure = () => {
      size = parseFloat(getComputedStyle(word).fontSize);
      rects = chars.map(c => { const r = c.outer.getBoundingClientRect(); return r.left + r.width / 2 + scrollX; });
    };
    measure();
    addEventListener('resize', measure);
    document.fonts && document.fonts.ready.then(measure);
    hero.addEventListener('pointermove', e => { mx = e.clientX + scrollX; my = e.clientY; });
    hero.addEventListener('pointerleave', () => { mx = -9999; });

    let t0 = performance.now(), visible = true;
    new IntersectionObserver(en => { visible = en[0].isIntersecting; }).observe(hero);
    const tick = (now) => {
      if (visible) {
        const t = (now - t0) / 1000;
        chars.forEach((c, i) => {
          const wave = Math.sin(t * 1.4 - i * .75) * size * .018;        // slow idle wave
          const d = (mx - rects[i]) / (size * .55);
          const lift = -Math.exp(-d * d) * size * .22 * (mx > -9000 ? 1 : 0); // cursor lift
          c.y += ((wave + lift) - c.y) * .12;                              // smooth follow
          c.inner.style.transform = 'translateY(' + c.y.toFixed(2) + 'px)';
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
})();
/* ---------- route: fills as you scroll, phases light up when it reaches them ---------- */
(() => {
  const route = document.querySelector('.route');
  if (!route) return;
  const stops = [...route.querySelectorAll('.stop')];
  const line = route.querySelector('.route__line');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ticking = false;

  const update = () => {
    ticking = false;
    const rect = route.getBoundingClientRect();
    const vh = window.innerHeight;
    const range = Math.max(rect.height, vh * 0.5);
    const p = reduce ? 1 : Math.min(1, Math.max(0, (vh * 0.82 - rect.top) / range));
    route.style.setProperty('--f', p.toFixed(4));

    const horizontal = getComputedStyle(route).flexDirection === 'row';
    const lr = line.getBoundingClientRect();
    const length = horizontal ? lr.width : lr.height;
    const origin = horizontal ? lr.left : lr.top;
    const reachedAt = p * length + 2;

    let last = -1;
    stops.forEach((el, i) => {
      const nr = el.querySelector('.node').getBoundingClientRect();
      const centre = (horizontal ? nr.left + nr.width / 2 : nr.top + nr.height / 2) - origin;
      const reached = reduce || centre <= reachedAt;
      el.classList.toggle('is-reached', reached);
      if (reached) last = i;
    });
    stops.forEach((el, i) => {
      el.classList.toggle('is-active', i === last && last < stops.length - 1 && last > 0);
      el.classList.toggle('is-passed', i < last || (i === last && last === stops.length - 1));
    });
  };
  const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
  update();
})();

/* project images: cut the baked-in shadows once, then shrink the picture ourselves, carefully,
   to exactly the size it is shown at on this screen (the browser's own shrinking is jagged) */
(() => {
  const panels = [...document.querySelectorAll('.panel')];

  const cleanCanvas = async (url) => {
    const blob = await (await fetch(url, { mode: 'cors' })).blob();
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext('2d');
    g.drawImage(bmp, 0, 0);
    const data = g.getImageData(0, 0, c.width, c.height);
    const px = data.data;
    for (let i = 3; i < px.length; i += 4) {
      const a = px[i] / 255 * 8 - 6.2;             // soft pixels (shadows) go clear, solid ones (phones) stay
      px[i] = a <= 0 ? 0 : a >= 1 ? 255 : Math.round(a * 255);
    }
    g.putImageData(data, 0, 0);
    return c;
  };

  // shrink in steps of half, then a last smooth step: much cleaner than one big jump
  const resample = (src, targetW) => {
    let cur = src, w = src.width, h = src.height;
    const ratio = targetW / w;
    const targetH = Math.max(1, Math.round(h * ratio));
    while (w / 2 >= targetW) {
      const nw = Math.round(w / 2), nh = Math.round(h / 2);
      const c = document.createElement('canvas'); c.width = nw; c.height = nh;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(cur, 0, 0, nw, nh);
      cur = c; w = nw; h = nh;
    }
    const out = document.createElement('canvas'); out.width = targetW; out.height = targetH;
    const g = out.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, targetW, targetH);
    return out;
  };

  const toURL = (canvas) => new Promise((res) => canvas.toBlob((b) => res(URL.createObjectURL(b)), 'image/png'));

  panels.forEach(async (panel) => {
    const img = panel.querySelector('.panel__media img');
    if (!img) return;
    try {
      const full = await cleanCanvas(img.src);
      const fullURL = await toURL(full);
      let activeURL = null, activeW = 0;

      const show = async () => {
        const target = Math.round(img.offsetWidth * (window.devicePixelRatio || 1));
        if (!target) return;
        if (!activeURL || Math.abs(target - activeW) > 8) {
          activeW = target;
          const old = activeURL;
          activeURL = await toURL(resample(full, Math.min(target, full.width)));
          if (old) URL.revokeObjectURL(old);
        }
        if (panel.classList.contains('is-active')) img.src = activeURL;
      };

      img.src = fullURL;                                  // closed card: full-size shadow-free picture
      new MutationObserver(() => {
        if (panel.classList.contains('is-active')) show(); // opened card: picture made for this exact size
        else img.src = fullURL;
      }).observe(panel, { attributes: true, attributeFilter: ['class'] });
      addEventListener('resize', () => { activeURL = null; if (panel.classList.contains('is-active')) show(); });
    } catch (e) { /* if anything fails, the original image just stays */ }
  });
})();

/* ---------- email: click copies the address and says so ---------- */
(() => {
  document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
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
        // clipboard blocked: fall back to opening the mail app
        window.location.href = link.getAttribute('href');
        return;
      }
      if (!mark) return;
      clearTimeout(timer);
      mark.textContent = 'Copied';
      link.classList.add('is-copied');
      timer = setTimeout(() => { mark.textContent = original; link.classList.remove('is-copied'); }, 2000);
    });
  });
})();
