/* Custom Cursor mit magnetischen Buttons. Nur auf Desktop mit feinem Zeiger. */

export function initCursor(gsap) {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;
  const dot = cursor.querySelector('.cursor-dot');
  const ring = cursor.querySelector('.cursor-ring');

  document.body.classList.add('cursor-active');

  const xDot = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
  const yDot = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
  const xRing = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3' });
  const yRing = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3' });

  window.addEventListener('pointermove', (e) => {
    xDot(e.clientX);
    yDot(e.clientY);
    xRing(e.clientX);
    yRing(e.clientY);
  });

  window.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
  window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));

  // Hover-Vergrößerung über interaktiven Elementen.
  document.querySelectorAll('[data-cursor], a, button').forEach((el) => {
    el.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
  });

  // Magnetische Buttons.
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = 0.4;
    const setX = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const setY = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      setX(mx * strength);
      setY(my * strength);
    });
    el.addEventListener('pointerleave', () => {
      setX(0);
      setY(0);
    });
  });
}
