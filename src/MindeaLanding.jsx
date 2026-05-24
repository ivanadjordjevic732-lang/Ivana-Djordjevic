import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from 'framer-motion';

/* ------------------------------------------------------------------
   MINDÉA — Cinematic Brand Studio
   Dark Luxury landing — React + Tailwind + Framer Motion
   Drop into Next.js or Vite as a single component.
   ------------------------------------------------------------------ */

const NAV = [
  { href: '#studio',     label: 'Studio' },
  { href: '#leistungen', label: 'Leistungen' },
  { href: '#wirkung',    label: 'Wirkung' },
  { href: '#pakete',     label: 'Pakete' },
  { href: '#anfrage',    label: 'Anfrage' },
];

const STATS = [
  { value: '3 Sek.', label: 'für den ersten Eindruck' },
  { value: '100%',   label: 'remote umsetzbar' },
  { value: '0',      label: 'Kamerateam nötig' },
  { value: '1',      label: 'Markenmoment, der bleibt' },
];

const FEATURES = [
  { title: 'Brand Presence',        desc: 'Ein cineastischer erster Eindruck für deine Marke.', large: true },
  { title: 'Brand Story',           desc: 'Eine emotionale Markenstory aus Stimme, Bildern und Persönlichkeit.' },
  { title: 'Brand Impact',          desc: 'Eine intensive Markeninszenierung für Website, Instagram und Launch-Momente.' },
  { title: 'KI-gestützte Produktion', desc: 'Modern, effizient und trotzdem persönlich.', large: true },
  { title: 'Ohne Drehtag',          desc: 'Du brauchst kein Kamerateam, kein Studio und keine perfekte Vorbereitung.' },
  { title: 'Premium Markenwirkung', desc: 'Für Selbstständige, die sichtbar werden wollen, ohne laut zu werden.' },
];

const EASE = [0.16, 1, 0.3, 1];

export default function MindeaLanding() {
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY       = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.35]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      document.documentElement.style.setProperty('--mx', e.clientX + 'px');
      document.documentElement.style.setProperty('--my', e.clientY + 'px');
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-[#F6F1E8] font-light antialiased overflow-x-hidden selection:bg-[#C8A96A] selection:text-black">
      <FilmGrain />
      <MouseGlow />
      <GridBackdrop />

      <Navbar scrolled={scrolled} onOpenMenu={() => setMobileOpen(true)} />
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* HERO ----------------------------------------------------------- */}
      <section
        ref={heroRef}
        id="studio"
        className="relative min-h-screen flex items-center px-6 md:px-16 pt-40 pb-32 overflow-hidden"
      >
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 pointer-events-none"
        >
          <HeroVisual />
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-12 md:gap-16 items-end">
          <div className="md:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.3, ease: EASE }}
              className="flex items-center gap-4 text-[10px] tracking-[0.4em] uppercase text-[#C8A96A] mb-10"
            >
              <span className="w-10 h-px bg-[#C8A96A]" />
              Cinematic Brand Studio · Berlin
            </motion.div>

            <h1 className="font-serif font-extralight tracking-[-0.02em] leading-[0.95] text-[clamp(46px,8.6vw,148px)] text-[#F6F1E8]">
              <RevealLine delay={0.45}>Marken, die man</RevealLine>
              <RevealLine delay={0.6}>nicht nur sieht.</RevealLine>
              <RevealLine delay={0.75}>
                <span className="italic text-[#C8A96A]">Sondern fühlt.</span>
              </RevealLine>
            </h1>
          </div>

          <div className="md:col-span-5 md:pl-10 md:pb-3">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 1.0, ease: EASE }}
              className="text-[15px] md:text-[17px] leading-[1.78] text-[#F6F1E8]/70 max-w-md font-light"
            >
              Mindéa verwandelt deine Bilder, deine Stimme und deine Geschichte
              in cineastische Brand Videos, die Vertrauen schaffen, bevor du
              ein Wort erklärst.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 1.15, ease: EASE }}
              className="mt-10 flex items-center gap-7 flex-wrap"
            >
              <GoldButton href="#anfrage" primary>Brand Video anfragen</GoldButton>
              <a
                href="#pakete"
                className="group text-[11px] tracking-[0.32em] uppercase text-[#F6F1E8]/70 hover:text-[#C8A96A] transition-colors duration-500 inline-flex items-center gap-3"
              >
                Pakete ansehen
                <span aria-hidden className="inline-block transition-transform duration-500 group-hover:translate-x-1.5">→</span>
              </a>
            </motion.div>
          </div>
        </div>

        <ScrollCue />
      </section>

      {/* STATS ---------------------------------------------------------- */}
      <section id="wirkung" className="relative px-6 md:px-16 py-24 md:py-28 border-y border-[#C8A96A]/15">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-y-14 md:gap-y-0 md:gap-x-0 md:divide-x divide-[#C8A96A]/15">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1.1, delay: i * 0.08, ease: EASE }}
              className="md:px-10 first:md:pl-0"
            >
              <div className="font-serif font-extralight text-[44px] md:text-[64px] leading-none tracking-tight text-[#F6F1E8] mb-4">
                {s.value}
              </div>
              <div className="text-[10.5px] tracking-[0.3em] uppercase text-[#F6F1E8]/55">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES BENTO ------------------------------------------------- */}
      <section id="leistungen" className="relative px-6 md:px-16 py-32 md:py-48">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end gap-10 mb-20 md:mb-24">
            <h2 className="font-serif font-extralight text-[clamp(36px,5.6vw,82px)] leading-[1] tracking-[-0.012em] max-w-3xl">
              <RevealLine>Eine Marke ist</RevealLine>
              <RevealLine delay={0.1}>
                <span className="italic text-[#C8A96A]">kein Posting.</span>
              </RevealLine>
            </h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, delay: 0.25, ease: EASE }}
              className="text-[15px] text-[#F6F1E8]/55 max-w-sm md:ml-auto md:text-right leading-[1.75]"
            >
              Sechs Bausteine, die ein Mindéa-Projekt zu einem cineastischen
              Markenmoment machen.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 auto-rows-[minmax(220px,auto)]">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* PACKAGES TEASE / SECTION ANCHOR -------------------------------- */}
      <section id="pakete" className="relative px-6 md:px-16 py-32 md:py-44 border-t border-[#C8A96A]/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-12 gap-10 items-end mb-16">
            <h2 className="md:col-span-7 font-serif font-extralight text-[clamp(36px,5.4vw,80px)] leading-[1.02] tracking-[-0.01em]">
              <RevealLine>Drei <span className="italic text-[#C8A96A]">Inszenierungen.</span></RevealLine>
              <RevealLine delay={0.1}>Ein Studio.</RevealLine>
            </h2>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, delay: 0.2, ease: EASE }}
              className="md:col-span-5 text-[15px] leading-[1.78] text-[#F6F1E8]/60 max-w-md md:ml-auto"
            >
              Jedes Mindéa-Programm ist ein eigenes Kapitel — kuratiert für die
              Phase, in der sich deine Marke gerade befindet.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <PackageCard
              index={1}
              title={<>Brand <span className="italic text-[#C8A96A]">Presence</span></>}
              lede="Der erste cineastische Auftritt. Für Gründerinnen, die bereit sind, gesehen zu werden — leise, präzise, edel."
              items={[
                '1 Brand Film · 60–90 Sek.',
                '3 Editorial Still Frames',
                'Mindéa Color & Sound Grading',
                'Strategischer Brand-Tonality Call',
              ]}
            />
            <PackageCard
              index={2}
              featured
              tag="Signature"
              title={<>Brand <span className="italic text-[#C8A96A]">Story</span></>}
              lede="Ein vollständiges Markenkapitel. Ein Film, der ein Gefühl trägt — eine visuelle Identität, die international wirkt."
              items={[
                '1 Hero Brand Film · bis 3 Min.',
                '5 Cinematic Still Frames',
                '3 Social Cuts in Editorial-Stil',
                'Brand Sound Design & Voice Layer',
                'Mindéa Strategy Session',
              ]}
            />
            <PackageCard
              index={3}
              title={<>Brand <span className="italic text-[#C8A96A]">Impact</span></>}
              lede="Eine vollständige cineastische Kampagne. Für Marken, die in eine neue Dimension wechseln — und das auch fühlen sollen."
              items={[
                '3 Brand Films · Kapitel-Konzept',
                '10 Editorial Still Frames',
                'Komplette Social Suite',
                'Kampagnen-Choreografie & Rollout',
                '6 Monate kuratierte Begleitung',
              ]}
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA ------------------------------------------------------ */}
      <section id="anfrage" className="relative px-6 md:px-16 py-40 md:py-52 text-center overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-[1100px] aspect-square rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(200,169,106,0.18), transparent 65%)' }}
          />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: EASE }}
            className="inline-flex items-center gap-4 text-[10px] tracking-[0.4em] uppercase text-[#C8A96A] mb-10"
          >
            <span className="w-10 h-px bg-[#C8A96A]" />
            Beginne dein Kapitel
          </motion.div>

          <h2 className="font-serif font-extralight text-[clamp(42px,7.5vw,128px)] leading-[1.02] tracking-[-0.02em] mb-10">
            <RevealLine>Wenn deine Marke</RevealLine>
            <RevealLine delay={0.12}>
              bereit ist, <span className="italic text-[#C8A96A]">gefühlt zu werden.</span>
            </RevealLine>
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, delay: 0.3, ease: EASE }}
            className="text-[#F6F1E8]/65 max-w-xl mx-auto mb-12 leading-[1.78]"
          >
            Mindéa arbeitet pro Saison mit einer kleinen, kuratierten Anzahl
            von Marken. Jedes Projekt beginnt mit einem persönlichen Gespräch.
          </motion.p>

          <GoldButton href="mailto:hello@mindea-studio.de" filled>
            Projekt anfragen
          </GoldButton>
        </div>
      </section>

      {/* FOOTER --------------------------------------------------------- */}
      <footer className="relative border-t border-[#C8A96A]/15 px-6 md:px-16 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 text-[11px] tracking-[0.22em] uppercase text-[#F6F1E8]/40">
          <div className="font-serif text-2xl tracking-[0.08em] text-[#F6F1E8] normal-case">Mindéa</div>
          <div>© 2026 · A Studio of Quiet Cinema · Berlin</div>
          <div className="flex gap-7">
            <a className="hover:text-[#C8A96A] transition-colors duration-500" href="#">Impressum</a>
            <a className="hover:text-[#C8A96A] transition-colors duration-500" href="#">Datenschutz</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ==================================================================
   SUB-COMPONENTS
   ================================================================== */

function FilmGrain() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none z-[60] opacity-[0.08] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/></svg>\")",
        animation: 'mindeaGrain 1.6s steps(6) infinite',
      }}
    />
  );
}

function MouseGlow() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none z-[1]"
      style={{
        background:
          'radial-gradient(560px circle at var(--mx, 50%) var(--my, 38%), rgba(200,169,106,0.10), transparent 70%)',
      }}
    />
  );
}

function GridBackdrop() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none z-0 opacity-[0.06]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(246,241,232,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(246,241,232,0.22) 1px, transparent 1px)',
        backgroundSize: '88px 88px',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 25%, transparent 80%)',
        maskImage: 'radial-gradient(ellipse at center, black 25%, transparent 80%)',
      }}
    />
  );
}

function Navbar({ scrolled, onOpenMenu }) {
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 px-6 md:px-12 transition-all duration-700 ease-out ${
        scrolled
          ? 'py-3 bg-black/65 backdrop-blur-xl border-b border-[#C8A96A]/10'
          : 'py-6 border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <a href="#" className="font-serif text-2xl tracking-[0.08em] text-[#F6F1E8]">Mindéa</a>

        <ul className="hidden md:flex gap-10">
          {NAV.map((n) => (
            <li key={n.href}>
              <a
                href={n.href}
                className="group relative text-[11px] tracking-[0.28em] uppercase text-[#F6F1E8]/70 hover:text-[#C8A96A] transition-colors duration-500"
              >
                {n.label}
                <span className="absolute left-0 -bottom-1.5 w-0 h-px bg-[#C8A96A] group-hover:w-full transition-all duration-500" />
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#anfrage"
          className="hidden md:inline-flex relative items-center px-6 py-3 rounded-full text-[11px] tracking-[0.28em] uppercase text-[#F6F1E8] border border-[#C8A96A]/40 hover:border-[#C8A96A] transition-all duration-500 group"
        >
          <span className="relative z-10">Projekt anfragen</span>
          <span
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              boxShadow:
                '0 0 50px rgba(200,169,106,0.4), inset 0 0 16px rgba(200,169,106,0.16)',
            }}
          />
        </a>

        <button
          onClick={onOpenMenu}
          className="md:hidden flex flex-col items-end gap-[6px]"
          aria-label="Menü öffnen"
        >
          <span className="block w-7 h-px bg-[#F6F1E8]" />
          <span className="block w-5 h-px bg-[#F6F1E8]" />
        </button>
      </div>
    </nav>
  );
}

function MobileMenu({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '-100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ duration: 0.8, ease: EASE }}
          className="fixed inset-0 z-[80] bg-black flex flex-col items-center justify-center gap-8 px-6"
        >
          <button
            onClick={onClose}
            className="absolute top-8 right-8 text-[10px] tracking-[0.34em] uppercase text-[#F6F1E8]/70 hover:text-[#C8A96A] transition-colors"
          >
            Schließen ✕
          </button>

          {NAV.map((n, i) => (
            <motion.a
              key={n.href}
              href={n.href}
              onClick={onClose}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.06, ease: EASE }}
              className="font-serif text-4xl text-[#F6F1E8] hover:text-[#C8A96A] transition-colors duration-500"
            >
              {n.label}
            </motion.a>
          ))}

          <motion.a
            href="#anfrage"
            onClick={onClose}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
            className="mt-6 px-7 py-3.5 rounded-full border border-[#C8A96A] text-[11px] tracking-[0.32em] uppercase text-[#F6F1E8]"
          >
            Projekt anfragen
          </motion.a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HeroVisual() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        animate={{ scale: [1, 1.04, 1], rotate: [0, 4, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="w-[140%] md:w-[78%] max-w-[1100px] aspect-square"
      >
        <svg viewBox="0 0 800 800" className="w-full h-full opacity-80" aria-hidden>
          <defs>
            <radialGradient id="mindeaCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#C8A96A" stopOpacity="0.55" />
              <stop offset="45%"  stopColor="#A68F72" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="mindeaRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#C8A96A" stopOpacity="0" />
              <stop offset="50%"  stopColor="#C8A96A" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#C8A96A" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Soft golden core */}
          <circle cx="400" cy="400" r="320" fill="url(#mindeaCore)">
            <animate attributeName="r" values="300;340;300" dur="10s" repeatCount="indefinite" />
          </circle>

          {/* Orbital rings */}
          {[260, 320, 380].map((r, i) => (
            <circle
              key={r}
              cx="400" cy="400" r={r}
              fill="none"
              stroke="url(#mindeaRing)"
              strokeWidth="0.9"
              opacity={0.55 - i * 0.12}
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`0 400 400`}
                to={`${i % 2 ? -360 : 360} 400 400`}
                dur={`${30 + i * 9}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}

          {/* AI Waveform */}
          <g transform="translate(140 400)" opacity="0.55">
            {Array.from({ length: 60 }).map((_, i) => {
              const h = 8 + 38 * Math.abs(Math.sin(i * 0.42));
              return (
                <rect
                  key={i}
                  x={i * 9}
                  y={-h / 2}
                  width="1.4"
                  height={h}
                  fill="#C8A96A"
                  opacity={0.4 + 0.6 * Math.abs(Math.cos(i * 0.3))}
                >
                  <animate
                    attributeName="height"
                    values={`${h};${h * 0.35};${h}`}
                    dur={`${3 + (i % 5)}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="y"
                    values={`${-h / 2};${-h * 0.18};${-h / 2}`}
                    dur={`${3 + (i % 5)}s`}
                    repeatCount="indefinite"
                  />
                </rect>
              );
            })}
          </g>

          {/* Floating particles */}
          {Array.from({ length: 28 }).map((_, i) => {
            const x = 120 + (i * 53) % 560;
            const y = 120 + (i * 91) % 560;
            return (
              <circle key={i} cx={x} cy={y} r="1.4" fill="#C8A96A" opacity="0.55">
                <animate attributeName="opacity" values="0.15;0.85;0.15" dur={`${4 + (i % 6)}s`} repeatCount="indefinite" />
                <animate attributeName="r"       values="0.8;2.4;0.8"    dur={`${5 + (i % 4)}s`} repeatCount="indefinite" />
              </circle>
            );
          })}
        </svg>
      </motion.div>
    </div>
  );
}

function ScrollCue() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.4, delay: 1.6, ease: EASE }}
      className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 text-[10px] tracking-[0.34em] uppercase text-[#F6F1E8]/45"
    >
      <span>Scroll</span>
      <span className="relative block w-px h-14 overflow-hidden bg-gradient-to-b from-transparent to-[#C8A96A]/70">
        <motion.span
          animate={{ y: ['-100%', '110%'] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F6F1E8] to-transparent"
        />
      </span>
    </motion.div>
  );
}

function RevealLine({ children, delay = 0 }) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        className="block"
        initial={{ y: '108%' }}
        whileInView={{ y: '0%' }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 1.2, ease: EASE, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function GoldButton({ href, children, primary = false, filled = false }) {
  const base =
    'group relative inline-flex items-center gap-4 px-8 py-4 rounded-full text-[11px] tracking-[0.32em] uppercase font-medium transition-all duration-500 ease-out';
  const variant = filled
    ? 'bg-[#C8A96A] text-black hover:bg-[#F6F1E8]'
    : primary
      ? 'text-[#F6F1E8] border border-[#C8A96A]/60 hover:border-[#C8A96A]'
      : 'text-[#F6F1E8] border border-[#F6F1E8]/30 hover:border-[#C8A96A]';

  return (
    <motion.a
      href={href}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={`${base} ${variant}`}
    >
      <span className="relative z-10">{children}</span>
      <span className="relative z-10 inline-flex items-center">
        <span className="block w-4 h-px bg-current transition-all duration-500 group-hover:w-6" />
        <span className="block w-[6px] h-[6px] border-t border-r border-current rotate-45 -ml-[3px]" />
      </span>
      {!filled && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            boxShadow:
              '0 0 50px rgba(200,169,106,0.45), inset 0 0 18px rgba(200,169,106,0.18)',
          }}
        />
      )}
    </motion.a>
  );
}

function FeatureCard({ title, desc, index, large = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 1.2, delay: index * 0.06, ease: EASE }}
      whileHover={{ y: -6 }}
      className={`group relative overflow-hidden rounded-2xl border border-[#C8A96A]/15 bg-[#0B0B0B] p-8 md:p-10 flex flex-col justify-between min-h-[280px] ${
        large ? 'md:col-span-2' : ''
      }`}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          boxShadow:
            'inset 0 0 0 1px rgba(200,169,106,0.45), 0 0 80px -20px rgba(200,169,106,0.45)',
        }}
      />
      <span
        aria-hidden
        className="absolute -top-px left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(200,169,106,0.8), transparent)',
        }}
      />

      <div className="relative">
        <div className="font-serif italic text-sm text-[#C8A96A]/90 mb-6">
          — {String(index + 1).padStart(2, '0')}
        </div>
        <h3
          className={`font-serif font-normal tracking-[-0.005em] leading-[1.08] text-[#F6F1E8] ${
            large ? 'text-3xl md:text-[44px]' : 'text-2xl md:text-3xl'
          }`}
        >
          {title}
        </h3>
      </div>

      <p className="relative mt-10 text-[14px] leading-[1.72] text-[#F6F1E8]/55 max-w-md">
        {desc}
      </p>
    </motion.div>
  );
}

function PackageCard({ index, title, lede, items, featured = false, tag }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 1.2, delay: (index - 1) * 0.08, ease: EASE }}
      whileHover={{ y: -6 }}
      className={`group relative overflow-hidden rounded-2xl p-10 md:p-12 flex flex-col transition-colors duration-700 ${
        featured
          ? 'bg-gradient-to-b from-[#1a1612] to-[#0B0B0B] border border-[#C8A96A]/40'
          : 'bg-[#0B0B0B] border border-[#C8A96A]/15 hover:border-[#C8A96A]/45'
      }`}
    >
      {featured && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow:
              '0 0 80px -30px rgba(200,169,106,0.55), inset 0 0 0 1px rgba(200,169,106,0.18)',
          }}
        />
      )}

      <div className="relative font-serif italic text-sm text-[#C8A96A] mb-8 tracking-[0.04em]">
        — {String(index).padStart(2, '0')}{tag ? ` · ${tag}` : ''}
      </div>

      <h3 className="relative font-serif font-normal text-3xl md:text-[40px] leading-[1.08] tracking-[-0.005em] text-[#F6F1E8] mb-5">
        {title}
      </h3>

      <p className="relative text-[14.5px] leading-[1.72] text-[#F6F1E8]/55 mb-8 pb-7 border-b border-[#C8A96A]/15">
        {lede}
      </p>

      <ul className="relative flex-1 space-y-2.5 mb-10">
        {items.map((it) => (
          <li
            key={it}
            className="relative pl-6 text-[14px] leading-[1.6] text-[#F6F1E8]/70"
          >
            <span className="absolute left-0 top-[13px] w-3 h-px bg-[#C8A96A]" />
            {it}
          </li>
        ))}
      </ul>

      <a
        href="#anfrage"
        className="relative inline-flex items-center gap-3 text-[11px] tracking-[0.32em] uppercase text-[#F6F1E8] group-hover:text-[#C8A96A] transition-all duration-500"
      >
        Anfrage stellen
        <span className="inline-block transition-transform duration-500 group-hover:translate-x-1.5">→</span>
      </a>
    </motion.div>
  );
}

/* ------------------------------------------------------------------
   Required global keyframes — add this once to your global CSS
   (or inject via <style jsx global> in Next.js):

   @keyframes mindeaGrain {
     0%   { transform: translate(0, 0); }
     20%  { transform: translate(-5%, 3%); }
     40%  { transform: translate(4%, -2%); }
     60%  { transform: translate(-3%, 4%); }
     80%  { transform: translate(2%, -3%); }
     100% { transform: translate(0, 0); }
   }

   Recommended Tailwind config additions:
   theme: {
     extend: {
       colors: {
         mindea: {
           ink:    '#000000',
           deep:   '#0B0B0B',
           cream:  '#F6F1E8',
           gold:   '#C8A96A',
           taupe:  '#A68F72',
         },
       },
       fontFamily: {
         serif: ['"Cormorant Garamond"', 'Times New Roman', 'serif'],
         sans:  ['Inter', 'ui-sans-serif', 'system-ui'],
       },
     },
   }
   ------------------------------------------------------------------ */
