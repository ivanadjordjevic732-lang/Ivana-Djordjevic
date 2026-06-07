'use client';
import dynamic from 'next/dynamic';
import { useCallback, useRef, useState } from 'react';
import { cards } from '@/lib/data';
import { useReducedMotion, useDeviceTier } from '@/lib/hooks';
import ScrollScene from './ScrollScene';
import CardTextOverlay from './CardTextOverlay';
import FallbackGallery from './FallbackGallery';

// 3D-Slider nur im Browser laden (kein SSR), zusätzlich erst bei Sichtbarkeit mounten.
const Dental3DSlider = dynamic(() => import('./Dental3DSlider'), {
  ssr: false,
  loading: () => <div className="canvas-loading">3D-Szene wird geladen …</div>,
});

export default function SliderSection() {
  const reduced = useReducedMotion();
  const tier = useDeviceTier();
  const progressRef = useRef(0);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);

  const onProgress = useCallback((p) => {
    progressRef.current = p;
    const i = Math.max(0, Math.min(cards.length - 1, Math.round(p)));
    setActive((prev) => (prev !== i ? i : prev));
  }, []);

  // Bei reduzierter Bewegung die statische, edle Galerie zeigen.
  if (reduced) return <FallbackGallery />;

  return (
    <ScrollScene count={cards.length} onProgress={onProgress} onActiveViewChange={setInView}>
      <div className="slider-stage">
        <div className="slider-head">
          <span className="eyebrow">Premium Technologie</span>
          <h2 className="serif">Perfektion bis ins Detail</h2>
        </div>

        {inView ? (
          <Dental3DSlider progressRef={progressRef} cards={cards} tier={tier} />
        ) : (
          <div className="canvas-loading">3D-Szene wird geladen …</div>
        )}

        <CardTextOverlay cards={cards} active={active} />

        <div className="slider-progress" aria-hidden="true">
          {cards.map((c, i) => (
            <span key={c.id} className={i === active ? 'on' : ''} />
          ))}
        </div>

        <div className="slider-hint">Scrollen · Ziehen · Wischen</div>
      </div>
    </ScrollScene>
  );
}
