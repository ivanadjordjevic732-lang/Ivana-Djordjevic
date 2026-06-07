/* GSAP-gesteuerte Reveals, Hero-Intro und Parallax. */

export function heroIntro(gsap, reduced) {
  const items = document.querySelectorAll('.hero-reveal');
  if (!items.length) return;
  if (reduced) {
    gsap.set(items, { opacity: 1, y: 0 });
    return;
  }
  gsap.to(items, {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'power3.out',
    stagger: 0.12,
    delay: 0.15,
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
