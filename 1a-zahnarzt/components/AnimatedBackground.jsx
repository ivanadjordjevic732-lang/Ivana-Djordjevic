'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/*
  Ruhiger, dunkler Hintergrund: feine goldene Partikel und subtile Lichtlinien,
  die sich leicht mit Maus und Slider-Fortschritt mitbewegen.
*/
export default function AnimatedBackground({ progressRef, pointerRef, tier }) {
  const points = useRef();
  const lines = useRef();

  const count = tier === 'low' ? 140 : tier === 'mid' ? 280 : 460;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 26;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 2] = -2 - Math.random() * 10;
    }
    return arr;
  }, [count]);

  // ein paar dünne goldene Lichtlinien
  const lineData = useMemo(() => {
    const n = tier === 'low' ? 3 : 6;
    return new Array(n).fill(0).map((_, i) => ({
      y: (i / n - 0.5) * 12,
      z: -4 - i * 1.2,
      len: 18 + Math.random() * 10,
      speed: 0.06 + Math.random() * 0.05,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [tier]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const p = progressRef.current;
    const pointer = pointerRef.current;

    if (points.current) {
      points.current.rotation.z = t * 0.01;
      points.current.position.x = -p * 0.5 + pointer.x * 0.6;
      points.current.position.y = pointer.y * 0.4;
    }
    if (lines.current) {
      lines.current.children.forEach((line, i) => {
        const d = lineData[i];
        line.position.x = Math.sin(t * d.speed + d.phase) * 3 - p * 0.4;
        line.material.opacity = 0.06 + (Math.sin(t * 0.4 + d.phase) * 0.5 + 0.5) * 0.06;
      });
    }
  });

  return (
    <group>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          color="#d8b978"
          size={0.03}
          sizeAttenuation
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <group ref={lines}>
        {lineData.map((d, i) => (
          <mesh key={i} position={[0, d.y, d.z]}>
            <planeGeometry args={[d.len, 0.012]} />
            <meshBasicMaterial color="#c9a24b" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
