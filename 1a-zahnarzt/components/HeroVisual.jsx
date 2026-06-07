'use client';
import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useReducedMotion } from '@/lib/hooks';

// HERO-BILD: liegt unter public/images/hero.svg. Durch echtes Foto ersetzen
// (gleicher Name) oder Pfad hier anpassen.
const HERO_IMAGE = '/images/hero.svg';

export default function HeroVisual() {
  const reduced = useReducedMotion();
  const wrap = useRef(null);

  // Mausposition -0.5..0.5, weich gefedert für sanften Parallax.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 16 });
  const sy = useSpring(my, { stiffness: 60, damping: 16 });

  // Verschiedene Tiefen für die Ebenen.
  const imgX = useTransform(sx, (v) => v * -26);
  const imgY = useTransform(sy, (v) => v * -26);
  const ringX = useTransform(sx, (v) => v * 40);
  const ringY = useTransform(sy, (v) => v * 40);
  const glowX = useTransform(sx, (v) => v * 60);
  const glowY = useTransform(sy, (v) => v * 60);
  const rotX = useTransform(sy, (v) => v * 6);
  const rotY = useTransform(sx, (v) => v * -8);

  const onMove = (e) => {
    if (reduced) return;
    const r = wrap.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.div
      className="hero-visual"
      ref={wrap}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={reduced ? undefined : { rotateX: rotX, rotateY: rotY, transformPerspective: 1000 }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {/* sanfte Schwebebewegung der ganzen Komposition */}
      <motion.div
        className="hv-float"
        animate={reduced ? {} : { y: [0, -14, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div className="hv-glow" style={reduced ? undefined : { x: glowX, y: glowY }} aria-hidden="true" />

        {/* Bild-Ebene mit langsamem Zoom */}
        <motion.div className="hv-img-layer" style={reduced ? undefined : { x: imgX, y: imgY }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={`hv-img${reduced ? '' : ' zoom'}`} src={HERO_IMAGE} alt="1A Gebiss mit Instrumenten, Platzhalterbild" />
        </motion.div>

        {/* rotierender Goldring wie in der Referenz */}
        <motion.div className="hv-ring-layer" style={reduced ? undefined : { x: ringX, y: ringY }} aria-hidden="true">
          <span className={`hv-ring${reduced ? '' : ' spin'}`} />
          <span className={`hv-ring inner${reduced ? '' : ' spin-rev'}`} />
        </motion.div>

        {/* feiner Spray-Partikel-Effekt */}
        {!reduced && (
          <div className="hv-spray" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} style={{ '--i': i }} />
            ))}
          </div>
        )}
      </motion.div>

      <div className="play-pill">
        <span className="circle" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </span>
        Animation ansehen
      </div>
    </motion.div>
  );
}
