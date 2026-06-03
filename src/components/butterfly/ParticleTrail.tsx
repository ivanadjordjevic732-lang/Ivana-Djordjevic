'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';

interface ParticleTrailProps {
  /** The butterfly's live world position (written by ButterflyModel). */
  positionRef: MutableRefObject<THREE.Vector3>;
  /** Pool size – lower on mobile for GPU/CPU headroom. */
  count?: number;
  reducedMotion?: boolean;
}

const LIFESPAN = 1.6; // seconds a grain of light lingers

/**
 * A pooled, additively-blended point cloud on the GPU. Grains are emitted mostly
 * when the butterfly moves (a sparse shimmer at rest), biased behind its flight
 * direction, then rise softly and fade. Warm gold "light dust" — kept subtle so
 * it never blows out into a bright blob.
 */
export function ParticleTrail({
  positionRef,
  count = 340,
  reducedMotion = false,
}: ParticleTrailProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material, life, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const aLife = new Float32Array(count);
    const aSize = new Float32Array(count);
    const vels = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] = -9999;
      aLife[i] = 0;
      aSize[i] = 5 + Math.random() * 10;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(aLife, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColorWarm: { value: new THREE.Color('#f0d28e') },
        uColorDeep: { value: new THREE.Color('#c4922c') },
      },
      vertexShader: /* glsl */ `
        attribute float aLife;
        attribute float aSize;
        varying float vLife;
        void main() {
          vLife = aLife;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * aLife * (200.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vLife;
        uniform vec3 uColorWarm;
        uniform vec3 uColorDeep;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          vec3 col = mix(uColorDeep, uColorWarm, core);
          gl_FragColor = vec4(col, core * vLife * 0.5);
        }
      `,
    });

    return { geometry: geo, material: mat, life: aLife, velocities: vels };
  }, [count]);

  const head = useRef(0);
  const frame = useRef(0);
  const lastPos = useRef(new THREE.Vector3());
  const inited = useRef(false);
  const tmpVel = useRef(new THREE.Vector3());

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30);
    frame.current++;
    const geo = pointsRef.current?.geometry;
    if (!geo) return;

    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const lifeAttr = geo.getAttribute('aLife') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;

    const cur = positionRef.current;
    if (!inited.current) {
      lastPos.current.copy(cur);
      inited.current = true;
    }

    const vel = tmpVel.current.copy(cur).sub(lastPos.current);
    const speed = vel.length();

    // Emit mainly when moving; a faint ambient sparkle otherwise.
    let emit = Math.min(3, Math.floor(speed * 90));
    if (emit === 0 && !reducedMotion && frame.current % 5 === 0) emit = 1;

    for (let e = 0; e < emit; e++) {
      const i = head.current;
      head.current = (head.current + 1) % count;
      const i3 = i * 3;

      positions[i3] = cur.x - vel.x * Math.random() * 5 + (Math.random() - 0.5) * 0.28;
      positions[i3 + 1] =
        cur.y - vel.y * Math.random() * 5 + (Math.random() - 0.5) * 0.34;
      positions[i3 + 2] =
        cur.z - vel.z * Math.random() * 5 + (Math.random() - 0.5) * 0.22;

      velocities[i3] = -vel.x * 1.6 + (Math.random() - 0.5) * 0.05;
      velocities[i3 + 1] = 0.04 + Math.random() * 0.07;
      velocities[i3 + 2] = -vel.z * 1.6 + (Math.random() - 0.5) * 0.05;

      life[i] = 1;
    }

    for (let i = 0; i < count; i++) {
      if (life[i] <= 0) continue;
      life[i] -= delta / LIFESPAN;
      if (life[i] < 0) life[i] = 0;

      const i3 = i * 3;
      positions[i3] += velocities[i3] * delta;
      positions[i3 + 1] += velocities[i3 + 1] * delta;
      positions[i3 + 2] += velocities[i3 + 2] * delta;
      velocities[i3] *= 0.93;
      velocities[i3 + 2] *= 0.93;
    }

    lastPos.current.copy(cur);
    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}
