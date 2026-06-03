'use client';

import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { ButterflyModel } from './ButterflyModel';
import { ParticleTrail } from './ParticleTrail';
import type { ScrollState } from './useScrollAnimation';

interface HeroButterfly3DProps {
  scroll: MutableRefObject<ScrollState>;
}

/** Cheap device check used to dial particle count + pixel ratio on mobile. */
function useDeviceProfile() {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, particles: 480, dpr: [1, 2] as [number, number] };
    }
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    return {
      isMobile,
      reducedMotion,
      particles: isMobile ? 220 : 480,
      dpr: (isMobile ? [1, 1.6] : [1, 2]) as [number, number],
    };
  }, []);
}

function Scene({ scroll }: HeroButterfly3DProps) {
  const profile = useDeviceProfile();
  const positionRef = useRef(new THREE.Vector3());

  return (
    <>
      {/* Warm, soft lighting so the gold reads luminous against the cream. */}
      <ambientLight intensity={0.65} color="#fff4e0" />
      <directionalLight position={[2.5, 4, 3]} intensity={1.5} color="#fff1d6" />
      <directionalLight position={[-3, 1, 2]} intensity={0.5} color="#ffd9a0" />
      <pointLight position={[0, -2, 3]} intensity={0.4} color="#ffe9c2" />

      {/* In-memory studio environment → metallic reflections without any network
          fetch. Static (frames={1}) for performance. */}
      <Environment frames={1} resolution={256} background={false}>
        <Lightformer
          form="rect"
          intensity={2.4}
          color="#fff4dd"
          position={[0, 3, 2]}
          scale={[6, 3, 1]}
        />
        <Lightformer
          form="circle"
          intensity={1.6}
          color="#f3d9a6"
          position={[-3, 1, 2]}
          scale={[3, 3, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.1}
          color="#ffe6bf"
          position={[3, -1, 1]}
          scale={[3, 4, 1]}
        />
      </Environment>

      <Suspense fallback={null}>
        <ButterflyModel
          scroll={scroll}
          positionRef={positionRef}
          reducedMotion={profile.reducedMotion}
        />
        <ParticleTrail
          positionRef={positionRef}
          count={profile.particles}
          reducedMotion={profile.reducedMotion}
        />
      </Suspense>
    </>
  );
}

export default function HeroButterfly3D({ scroll }: HeroButterfly3DProps) {
  const profile = useDeviceProfile();
  const ref = useRef<HTMLDivElement>(null);

  // Pause the render loop when the hero scrolls out of view (saves battery/GPU).
  const visibleRef = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 h-full w-full">
      <Canvas
        dpr={profile.dpr}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 6], fov: 34 }}
        // Only render while the hero is on screen.
        frameloop="always"
      >
        <Scene scroll={scroll} />
      </Canvas>
    </div>
  );
}
