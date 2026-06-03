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

const LIFESPAN = 1.7; // seconds a grain of light lingers

/**
 * A pooled, additively-blended point cloud rendered on the GPU. Each frame we
 * emit a few grains at the butterfly's position, biased behind its flight
 * direction, then let them rise softly and fade. Warm gold "light dust".
 */
export function ParticleTrail({
  positionRef,
  count = 480,
  reducedMotion = false,
}: ParticleTrailProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material, life, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const aLife = new Float32Array(count);
    const aSize = new Float32Array(count);
    const vels = new Float32Array(count * 3);

    // Start fully faded and parked off-screen.
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] = -9999;
      aLife[i] = 0;
      aSize[i] = 9 + Math.random() * 16;
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
        uColorWarm: { value: new THREE.Color('#f2d493') },
        uColorDeep: { value: new THREE.Color('#c9962f') },
      },
      vertexShader: /* glsl */ `
        attribute float aLife;
        attribute float aSize;
        varying float vLife;
        void main() {
          vLife = aLife;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * aLife * (300.0 / -mv.z);
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
          // Soft round grain with a bright warm core.
          float core = smoothstep(0.5, 0.0, d);
          vec3 col = mix(uColorDeep, uColorWarm, core);
          float alpha = core * vLife;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    return { geometry: geo, material: mat, life: aLife, velocities: vels };
  }, [count]);

  const head = useRef(0);
  const lastPos = useRef(new THREE.Vector3());
  const inited = useRef(false);
  const tmpVel = useRef(new THREE.Vector3());

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30);
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

    // Flight direction (this frame's movement).
    const vel = tmpVel.current.copy(cur).sub(lastPos.current);
    const speed = vel.length();

    // Emit: a steady ambient shimmer plus more when the butterfly moves.
    const emitCount = reducedMotion
      ? 1
      : Math.min(6, 1 + Math.floor(speed * 140));

    for (let e = 0; e < emitCount; e++) {
      const i = head.current;
      head.current = (head.current + 1) % count;

      const i3 = i * 3;
      // Spawn slightly behind the flight path with a soft scatter.
      positions[i3] = cur.x - vel.x * Math.random() * 6 + (Math.random() - 0.5) * 0.22;
      positions[i3 + 1] =
        cur.y - vel.y * Math.random() * 6 + (Math.random() - 0.5) * 0.22;
      positions[i3 + 2] =
        cur.z - vel.z * Math.random() * 6 + (Math.random() - 0.5) * 0.22;

      // Drift: gentle upward float plus a touch of backward inertia.
      velocities[i3] = -vel.x * 2 + (Math.random() - 0.5) * 0.06;
      velocities[i3 + 1] = 0.05 + Math.random() * 0.08;
      velocities[i3 + 2] = -vel.z * 2 + (Math.random() - 0.5) * 0.06;

      life[i] = 1;
    }

    // Age + move every live grain.
    for (let i = 0; i < count; i++) {
      if (life[i] <= 0) continue;
      life[i] -= delta / LIFESPAN;
      if (life[i] < 0) life[i] = 0;

      const i3 = i * 3;
      positions[i3] += velocities[i3] * delta;
      positions[i3 + 1] += velocities[i3 + 1] * delta;
      positions[i3 + 2] += velocities[i3 + 2] * delta;
      // Ease drift toward stillness so grains hang before fading.
      velocities[i3] *= 0.94;
      velocities[i3 + 2] *= 0.94;
    }

    lastPos.current.copy(cur);
    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}
