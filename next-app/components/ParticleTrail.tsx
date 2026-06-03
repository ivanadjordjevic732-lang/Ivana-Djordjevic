'use client';

/**
 * ParticleTrail
 *
 * Emits a fading gold-dust trail behind a moving 3D source.
 * Uses a single THREE.Points BufferGeometry with a ring buffer of
 * positions + ages — cheap, GPU-friendly, no allocations per frame.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import type { ButterflyHandle } from './Butterfly3D';

const COUNT = 240;
const EMIT_INTERVAL = 0.035; // seconds between particle emissions
const LIFE = 2.6; // seconds a particle stays visible
const SPREAD = 0.12; // random jitter at emission

type Props = {
  sourceRef: React.RefObject<ButterflyHandle>;
};

export function ParticleTrail({ sourceRef }: Props) {
  const pointsRef = useRef<THREE.Points>(null!);
  const matRef = useRef<THREE.PointsMaterial>(null!);
  const lastEmit = useRef(0);

  const { geometry, positions, ages, opacities } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const ages = new Float32Array(COUNT);
    const opacities = new Float32Array(COUNT);
    // Initialise all ages past LIFE so they're invisible until emitted
    for (let i = 0; i < COUNT; i++) ages[i] = LIFE + 1;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
    return { geometry: g, positions, ages, opacities };
  }, []);

  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    if (!sourceRef.current) return;
    sourceRef.current.getWorldPosition(tmp);

    // Emit on cadence
    lastEmit.current += dt;
    if (lastEmit.current >= EMIT_INTERVAL) {
      lastEmit.current = 0;
      // Find the oldest particle (largest age) → recycle it
      let oldest = 0;
      let maxAge = -Infinity;
      for (let i = 0; i < COUNT; i++) {
        if (ages[i] > maxAge) {
          maxAge = ages[i];
          oldest = i;
        }
      }
      positions[oldest * 3] = tmp.x + (Math.random() - 0.5) * SPREAD;
      positions[oldest * 3 + 1] = tmp.y + (Math.random() - 0.5) * SPREAD;
      positions[oldest * 3 + 2] = tmp.z + (Math.random() - 0.5) * SPREAD;
      ages[oldest] = 0;
    }

    // Age all + compute fade
    let maxOpacity = 0;
    for (let i = 0; i < COUNT; i++) {
      ages[i] += dt;
      const a = ages[i];
      const o = a < LIFE ? Math.max(0, 1 - a / LIFE) : 0;
      opacities[i] = o;
      if (o > maxOpacity) maxOpacity = o;
      // Tiny upward drift over particle lifetime — feels like warm dust rising
      if (a < LIFE) {
        positions[i * 3 + 1] += dt * 0.04;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aOpacity.needsUpdate = true;
    // Use average opacity to modulate material — cheap proxy for per-vertex alpha
    if (matRef.current) matRef.current.opacity = 0.55 * maxOpacity;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        ref={matRef}
        color={0xc8a96a}
        size={0.045}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
