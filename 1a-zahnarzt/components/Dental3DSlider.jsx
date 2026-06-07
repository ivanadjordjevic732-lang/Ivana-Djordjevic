'use client';
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import DentalCard from './DentalCard';
import AnimatedBackground from './AnimatedBackground';

// Lässt das Drehmoment (Swing) nach dem Ziehen sanft ausklingen.
function SwingDecay({ swingRef }) {
  useFrame(() => {
    swingRef.current = THREE.MathUtils.lerp(swingRef.current, 0, 0.06);
  });
  return null;
}

export default function Dental3DSlider({ progressRef, cards, tier }) {
  const pointerRef = useRef({ x: 0, y: 0 });
  const swingRef = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const wrap = useRef(null);

  const dpr = tier === 'low' ? 1 : tier === 'mid' ? [1, 1.5] : [1, 2];

  const setPointerFromEvent = (e) => {
    const r = wrap.current.getBoundingClientRect();
    pointerRef.current.x = (e.clientX - r.left) / r.width - 0.5;
    pointerRef.current.y = (e.clientY - r.top) / r.height - 0.5;
  };

  const onPointerDown = (e) => {
    dragging.current = true;
    lastX.current = e.clientX;
    wrap.current.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    setPointerFromEvent(e);
    if (!dragging.current) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    // Horizontales Ziehen steuert den Slider (über den Seiten-Scroll).
    window.scrollBy(0, -dx * 1.25);
    // leichtes Drehen auf der Y-Achse je nach Ziehgeschwindigkeit
    swingRef.current = THREE.MathUtils.clamp(swingRef.current + dx * 0.0014, -0.5, 0.5);
  };
  const endDrag = () => { dragging.current = false; };

  return (
    <div
      className="slider-canvas"
      ref={wrap}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      style={{ cursor: 'grab' }}
    >
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 0, 6.4], fov: 36 }}
        gl={{ antialias: tier !== 'low', alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 5]} intensity={1.1} color="#fff3df" castShadow={tier !== 'low'} />
        <directionalLight position={[-5, 1, 2]} intensity={0.5} color="#c9a24b" />

        {/* Studio-Reflexe ohne externe Datei, gebaut aus Lichtflächen */}
        <Environment resolution={tier === 'low' ? 64 : 256} frames={1}>
          <Lightformer intensity={2.2} color="#fff6e6" position={[0, 2, 4]} scale={[8, 4, 1]} />
          <Lightformer intensity={1.4} color="#d8b978" position={[-5, 0, 2]} scale={[4, 6, 1]} />
          <Lightformer intensity={1.0} color="#ffffff" position={[5, -1, 3]} scale={[4, 4, 1]} />
        </Environment>

        <AnimatedBackground progressRef={progressRef} pointerRef={pointerRef} tier={tier} />

        <group position={[0, 0.1, 0]}>
          {cards.map((card, i) => (
            <DentalCard
              key={card.id}
              index={i}
              total={cards.length}
              card={card}
              progressRef={progressRef}
              swingRef={swingRef}
              pointerRef={pointerRef}
              tier={tier}
            />
          ))}
        </group>

        {tier !== 'low' && (
          <ContactShadows position={[0, -1.95, 0]} opacity={0.5} scale={16} blur={2.8} far={4.5} color="#000000" resolution={tier === 'mid' ? 256 : 512} />
        )}

        <SwingDecay swingRef={swingRef} />
      </Canvas>
    </div>
  );
}
