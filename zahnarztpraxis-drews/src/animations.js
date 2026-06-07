/* GSAP-gesteuerte Reveals, Hero-Intro und Parallax. */

export function heroIntro(gsap, reduced) {
  const items = gsap.utils.toArray('.hero-reveal');
  if (!items.length) return;
  if (reduced) {
    gsap.set(items, { opacity: 1, y: 0 });
    return;
  }

  const h1 = document.querySelector('.hero h1.hero-reveal');
  const others = items.filter((el) => el !== h1);
  const tl = gsap.timeline({ delay: 0.15 });

  if (h1) {
    splitHeadline(h1);
    gsap.set(h1, { opacity: 1, y: 0 });
    const words = h1.querySelectorAll('.word-in');
    gsap.set(words, { yPercent: 115 });
    tl.to(words, { yPercent: 0, duration: 0.95, ease: 'power4.out', stagger: 0.07 }, 0);
  }

  tl.to(others, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.12 }, h1 ? 0.2 : 0);
}

// Headline in einzelne Wörter zerlegen (Maskierungs-Reveal), Stilelemente wie <em> bleiben erhalten.
function splitHeadline(h1) {
  const frag = document.createDocumentFragment();
  const wrapWords = (text, parent) => {
    text.split(/(\s+)/).forEach((tok) => {
      if (tok === '') return;
      if (/^\s+$/.test(tok)) {
        parent.appendChild(document.createTextNode(tok));
        return;
      }
      const word = document.createElement('span');
      word.className = 'word';
      const inner = document.createElement('span');
      inner.className = 'word-in';
      inner.textContent = tok;
      word.appendChild(inner);
      parent.appendChild(word);
    });
  };
  h1.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      wrapWords(node.textContent, frag);
    } else {
      const clone = node.cloneNode(false); // z. B. <em> ohne Inhalt
      wrapWords(node.textContent, clone);
      frag.appendChild(clone);
    }
  });
  h1.textContent = '';
  h1.appendChild(frag);
}

// Zahlen sanft hochzählen lassen, sobald sie sichtbar werden.
export function initCounters(gsap, ScrollTrigger) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  gsap.utils.toArray('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const fmt = (v) => v.toFixed(dec).replace('.', ',');
    if (reduced || Number.isNaN(target)) {
      el.textContent = fmt(target);
      return;
    }
    const obj = { v: 0 };
    el.textContent = fmt(0);
    gsap.to(obj, {
      v: target,
      duration: 1.4,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: () => { el.textContent = fmt(obj.v); },
    });
  });
}

export function initReveals(gsap, ScrollTrigger) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = gsap.utils.toArray('.reveal');

  if (reduced) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }

  items.forEach((el) => {
    // Karten innerhalb eines Rasters leicht versetzt einblenden.
    gsap.fromTo(
      el,
      { opacity: 0, y: 34 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 86%',
          toggleActions: 'play none none none',
        },
        onComplete: () => el.classList.add('in'),
      }
    );
  });
}

export function initParallax(gsap, ScrollTrigger) {
  // Sanfter Parallax auf den Praxis-Visuals.
  gsap.utils.toArray('[data-parallax]').forEach((el) => {
    gsap.fromTo(
      el,
      { y: 40 },
      {
        y: -40,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      }
    );
  });

  // Karten mit leichtem 3D-Tilt auf Mausbewegung.
  gsap.utils.toArray('[data-tilt]').forEach((card) => {
    const setRX = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
    const setRY = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
    const setY = gsap.quickTo(card, 'y', { duration: 0.5, ease: 'power3' });
    gsap.set(card, { transformPerspective: 800, transformStyle: 'preserve-3d' });

    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      setRY(px * 7);
      setRX(-py * 7);
      setY(-6);
    });
    card.addEventListener('pointerleave', () => {
      setRX(0);
      setRY(0);
      setY(0);
    });
  });
}
