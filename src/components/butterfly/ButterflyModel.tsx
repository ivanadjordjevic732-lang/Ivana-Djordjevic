'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import {
  createAntenna,
  createBodyGeometry,
  createBodyMaterial,
  createGoldMaterial,
  createWingGeometry,
} from './geometry';
import { useCursorInteraction } from './useCursorInteraction';
import type { ScrollState } from './useScrollAnimation';

interface ButterflyModelProps {
  scroll: MutableRefObject<ScrollState>;
  /** Output: the butterfly's world position each frame (read by the trail). */
  positionRef: MutableRefObject<THREE.Vector3>;
  reducedMotion?: boolean;
}

export function ButterflyModel({
  scroll,
  positionRef,
  reducedMotion = false,
}: ButterflyModelProps) {
  const root = useRef<THREE.Group>(null);
  const leftWing = useRef<THREE.Group>(null);
  const rightWing = useRef<THREE.Group>(null);
  const cursor = useCursorInteraction();

  // Build geometry + materials once; dispose handled by R3F on unmount.
  const { wingGeo, bodyGeo, antennaL, antennaR, gold, bodyMat } = useMemo(
    () => ({
      wingGeo: createWingGeometry(),
      bodyGeo: createBodyGeometry(),
      antennaL: createAntenna(false),
      antennaR: createAntenna(true),
      gold: createGoldMaterial(),
      bodyMat: createBodyMaterial(),
    }),
    []
  );

  // Smoothed values so scroll / cursor changes never snap.
  const eased = useRef({ x: 0, y: 0, z: 0, rotY: 0 });

  useFrame((_, rawDelta) => {
    const t = performance.now() / 1000;
    const delta = Math.min(rawDelta, 1 / 30); // clamp for stability on stutters
    const { progress } = scroll.current;

    // ── Wing flap: slow, elegant, with a small resting dihedral. ──────────────
    const flapSpeed = reducedMotion ? 0 : 1.6;
    const flap = -0.18 + Math.sin(t * flapSpeed) * 0.55;
    if (leftWing.current) leftWing.current.rotation.y = flap;
    if (rightWing.current) rightWing.current.rotation.y = -flap;

    if (!root.current) return;

    // ── Idle floating: a gentle vertical bob and sway. ────────────────────────
    const bob = reducedMotion ? 0 : Math.sin(t * 0.6) * 0.12;
    const sway = reducedMotion ? 0 : Math.sin(t * 0.4) * 0.05;

    // ── Scroll choreography: weave left↔right, drift down and forward, turn. ──
    const targetX = Math.sin(progress * Math.PI * 1.5) * 1.45;
    const targetY = 0.15 - progress * 1.25;
    const targetZ = Math.sin(progress * Math.PI) * -0.6;
    const targetRotY = progress * 0.9;

    // Frame-rate independent smoothing toward the scroll targets.
    const s = 1 - Math.exp(-3 * delta);
    eased.current.x += (targetX - eased.current.x) * s;
    eased.current.y += (targetY - eased.current.y) * s;
    eased.current.z += (targetZ - eased.current.z) * s;
    eased.current.rotY += (targetRotY - eased.current.rotY) * s;

    // ── Cursor tilt (clamped, springy). ───────────────────────────────────────
    const tilt = cursor.update(delta);

    root.current.position.set(
      eased.current.x,
      eased.current.y + bob,
      eased.current.z
    );
    root.current.rotation.set(
      tilt.x + sway * 0.4,
      eased.current.rotY + tilt.y,
      sway
    );

    // Publish world position for the particle trail.
    root.current.getWorldPosition(positionRef.current);
  });

  return (
    <group ref={root} scale={0.62}>
      {/* Body */}
      <mesh geometry={bodyGeo} material={bodyMat} castShadow />
      {/* Antennae */}
      <mesh geometry={antennaL} material={bodyMat} />
      <mesh geometry={antennaR} material={bodyMat} />
      {/* Right wing group – flaps around the body line */}
      <group ref={rightWing}>
        <mesh geometry={wingGeo} material={gold} castShadow />
      </group>
      {/* Left wing group – mirror of the right */}
      <group ref={leftWing} scale={[-1, 1, 1]}>
        <mesh geometry={wingGeo} material={gold} castShadow />
      </group>
    </group>
  );
}
