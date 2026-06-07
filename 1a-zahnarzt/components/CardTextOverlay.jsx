'use client';
import { AnimatePresence, motion } from 'framer-motion';

// Zeigt Kicker, Titel und Text der aktiven Karte mit weichem Wechsel.
export default function CardTextOverlay({ cards, active }) {
  const card = cards[active] || cards[0];
  return (
    <div className="slider-overlay">
      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -18, filter: 'blur(6px)' }}
          transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <span className="ov-kicker">{card.kicker}</span>
          <h3 className="serif">{card.title}</h3>
          <p>{card.text}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
