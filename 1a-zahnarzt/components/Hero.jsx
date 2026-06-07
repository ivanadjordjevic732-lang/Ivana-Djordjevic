'use client';
import { motion } from 'framer-motion';

const fade = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.9, delay: 0.1 + i * 0.12, ease: [0.2, 0.7, 0.2, 1] } }),
};

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap hero-grid">
        <div>
          <motion.span className="eyebrow" variants={fade} initial="hidden" animate="show" custom={0}>
            Präzision. Erfahrung. Vertrauen.
          </motion.span>
          <motion.h1 variants={fade} initial="hidden" animate="show" custom={1}>
            <span className="gold">1A</span> Leistung<br />für Ihr Lächeln
          </motion.h1>
          <motion.p className="lead" variants={fade} initial="hidden" animate="show" custom={2}>
            Mit modernster Technologie und höchster Präzision sorgen wir für Ihre
            Zahngesundheit auf höchstem Niveau. Für ein Lächeln, das überzeugt.
          </motion.p>
          <motion.div className="hero-actions" variants={fade} initial="hidden" animate="show" custom={3}>
            <a href="#leistungen" className="btn btn-gold">Unsere Leistungen</a>
            <a href="#praxis" className="btn btn-ghost">Mehr über uns</a>
          </motion.div>
        </div>

        <motion.div className="hero-visual" variants={fade} initial="hidden" animate="show" custom={3}>
          {/* PHOTO-SLOT: hochwertiges Hero-Bild (z. B. 1A-Gebiss mit Instrumenten) einsetzen */}
          <div className="slot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5.5c-2-2-5.5-2-7 .5-1.4 2.4-.3 6 1 9 .7 1.7 1.2 3.5 2 3.5s1-2 2-2 1.2 2 2 2 1.3-1.8 2-3.5c1.3-3 2.4-6.6 1-9-1.5-2.5-5-2.5-7-.5Z" />
            </svg>
            <small>Platzhalter · Hero-Bild einsetzen</small>
          </div>
          <div className="play-pill">
            <span className="circle" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </span>
            Animation ansehen
          </div>
        </motion.div>
      </div>
    </section>
  );
}
