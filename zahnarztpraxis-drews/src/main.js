import './style.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initReveals, initParallax, heroIntro } from './animations.js';
import { initCursor } from './cursor.js';

gsap.registerPlugin(ScrollTrigger);

/* ---------- Umgebung erkennen ---------- */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isFinePointer = window.matchMedia('(pointer: fine)').matches;
const isDesktop = window.matchMedia('(min-width: 921px)').matches;
// 3D nur, wenn es sich lohnt und niemandem schadet.
const allow3D = isDesktop && isFinePointer && !prefersReducedMotion;

/* ---------- Jahr im Footer ---------- */
document.getElementById('yr').textContent = new Date().getFullYear();

/* ---------- Sticky Header ---------- */
const hdr = document.getElementById('hdr');
const onScrollHeader = () => hdr.classList.toggle('scrolled', window.scrollY > 20);
onScrollHeader();

/* ---------- Mobiles Menü ---------- */
const burger = document.getElementById('burger');
const menu = document.getElementById('menu');
const closeMenu = () => {
  menu.classList.remove('open');
  burger.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', 'Menü öffnen');
};
burger.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
});
menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));

/* ---------- Smooth Scroll (Lenis) ---------- */
let lenis = null;
async function initSmoothScroll() {
  if (prefersReducedMotion) {
    // Ohne Lenis, dafür native Anker-Sprünge respektieren die Reduktion.
    window.addEventListener('scroll', onScrollHeader, { passive: true });
    setupAnchorLinks(null);
    return;
  }
  const { default: Lenis } = await import('lenis');
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6,
  });
  lenis.on('scroll', () => {
    ScrollTrigger.update();
    onScrollHeader();
  });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  setupAnchorLinks(lenis);
}

/* ---------- Anker-Links sanft ansteuern ---------- */
function setupAnchorLinks(lenisInstance) {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const id = link.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    link.addEventListener('click', (e) => {
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenisInstance) {
        lenisInstance.scrollTo(target, { offset: -80, duration: 1.2 });
      } else {
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    });
  });
}

/* ---------- Start ---------- */
async function start() {
  await initSmoothScroll();
  heroIntro(gsap, prefersReducedMotion);
  initReveals(gsap, ScrollTrigger);
  if (!prefersReducedMotion) initParallax(gsap, ScrollTrigger);
  if (isFinePointer && isDesktop) initCursor(gsap);

  if (allow3D) {
    lazyInit3D();
  }
}

/* ---------- 3D-Szene erst laden, wenn der Hero sichtbar ist ---------- */
function lazyInit3D() {
  const host = document.getElementById('hero-canvas');
  if (!host) return;
  let started = false;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting && !started) {
          started = true;
          io.disconnect();
          try {
            const { createHeroScene } = await import('./scene.js');
            createHeroScene(host, { gsap, ScrollTrigger });
            document.body.classList.add('scene-on');
          } catch (err) {
            // Wenn WebGL fehlschlägt, bleibt der edle Verlauf stehen.
            console.warn('3D-Szene konnte nicht geladen werden, Fallback aktiv.', err);
          }
        }
      });
    },
    { threshold: 0.05 }
  );
  io.observe(host);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
