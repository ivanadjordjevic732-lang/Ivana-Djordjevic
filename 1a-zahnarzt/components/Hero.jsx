'use client';
import { motion } from 'framer-motion';
import HeroVisual from './HeroVisual';

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

        <HeroVisual />
      </div>
    </section>
  );
}
