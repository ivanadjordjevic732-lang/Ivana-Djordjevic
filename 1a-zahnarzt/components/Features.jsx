'use client';
import { motion } from 'framer-motion';

const items = [
  { t: 'Höchste Präzision', d: 'Modernste Technik für perfekte Ergebnisse.', icon: 'M12 2v20M5 8c0-3 3-5 7-5s7 2 7 5M5 16c0 3 3 5 7 5' },
  { t: 'Erfahrung & Kompetenz', d: 'Jahrelange Expertise für Ihre Zahngesundheit.', icon: 'M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z' },
  { t: 'Premium Materialien', d: 'Nur das Beste für langanhaltende Qualität.', icon: 'm12 3 2.2 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.5Z' },
  { t: 'Individuelle Beratung', d: 'Maßgeschneiderte Lösungen für Ihr Lächeln.', icon: 'M12 21s-8-4.5-8-10a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5.5-8 10-8 10Z' },
];

export default function Features() {
  return (
    <section className="features" id="leistungen">
      <div className="wrap features-grid">
        {items.map((it, i) => (
          <motion.div
            className="feature"
            key={it.t}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: i * 0.08, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <svg className="fic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={it.icon} />
            </svg>
            <div>
              <b>{it.t}</b>
              <p>{it.d}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
