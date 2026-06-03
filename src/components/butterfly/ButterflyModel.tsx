'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { makeBodyTexture, makeWingTexture } from './geometry';
import { useCursorInteraction } from './useCursorInteraction';
import type { ScrollState } from './useScrollAnimation';

interface ButterflyModelProps {
  scroll: MutableRefObject<ScrollState>;
  /** Output: the butterfly's world position each frame (read by the trail). */
  positionRef: MutableRefObject<THREE.Vector3>;
  reducedMotion?: boolean;
}

/** Overall wing-plane span in world units. */
const WP = 2.3;
/** Resting height – the butterfly floats above the wordmark. */
const BASE_Y = 1.02;

export function ButterflyModel({
  scroll,
  positionRef,
  reducedMotion = false,
}: ButterflyModelProps) {
  const root = useRef<THREE.Group>(null);
  const leftWing = useRef<THREE.Group>(null);
  const rightWing = useRef<THREE.Group>(null);
  const cursor = useCursorInteraction();

  // Build painted textures, split wing halves and geometries once.
  const built = useMemo(() => {
    const wingTex = makeWingTexture();
    const bodyTex = makeBodyTexture();

    const texL = wingTex.clone();
    texL.needsUpdate = true;
    texL.wrapS = THREE.ClampToEdgeWrapping;
    texL.repeat.set(0.5, 1);
    texL.offset.set(0, 0);

    const texR = wingTex.clone();
    texR.needsUpdate = true;
    texR.wrapS = THREE.ClampToEdgeWrapping;
    texR.repeat.set(0.5, 1);
    texR.offset.set(0.5, 0);

    const wingMaterial = (map: THREE.Texture) =>
      new THREE.MeshStandardMaterial({
        map,
        transparent: true,
        alphaTest: 0.18,
        side: THREE.DoubleSide,
        metalness: 0.55,
        roughness: 0.42,
        envMapIntensity: 1.0,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: map,
        emissiveIntensity: 0.1,
      });

    const rGeo = new THREE.PlaneGeometry(WP / 2, WP);
    rGeo.translate(WP / 4, 0, 0);
    const lGeo = new THREE.PlaneGeometry(WP / 2, WP);
    lGeo.translate(-WP / 4, 0, 0);

    const bodyGeo = new THREE.PlaneGeometry(WP, WP);
    const bodyMat = new THREE.MeshStandardMaterial({
      map: bodyTex,
      transparent: true,
      alphaTest: 0.2,
      side: THREE.DoubleSide,
      metalness: 0.6,
      roughness: 0.4,
      envMapIntensity: 1.0,
    });

    return {
      wingTex,
      bodyTex,
      texL,
      texR,
      rGeo,
      lGeo,
      bodyGeo,
      matL: wingMaterial(texL),
      matR: wingMaterial(texR),
      bodyMat,
    };
  }, []);

  // Release GPU resources on unmount.
  useEffect(() => {
    return () => {
      built.wingTex.dispose();
      built.bodyTex.dispose();
      built.texL.dispose();
      built.texR.dispose();
      built.rGeo.dispose();
      built.lGeo.dispose();
      built.bodyGeo.dispose();
      built.matL.dispose();
      built.matR.dispose();
      built.bodyMat.dispose();
    };
  }, [built]);

  const eased = useRef({ x: 0, y: BASE_Y, z: 0, rotY: 0 });

  useFrame((_, rawDelta) => {
    const t = performance.now() / 1000;
    const delta = Math.min(rawDelta, 1 / 30);
    const { progress } = scroll.current;

    // Wing flap — slow, elegant; planes tilt around the body line.
    const flapSpeed = reducedMotion ? 0 : 1.6;
    const flap = -0.12 + Math.sin(t * flapSpeed) * 0.5;
    if (leftWing.current) leftWing.current.rotation.y = flap;
    if (rightWing.current) rightWing.current.rotation.y = -flap;

    if (!root.current) return;

    const bob = reducedMotion ? 0 : Math.sin(t * 0.6) * 0.1;
    const sway = reducedMotion ? 0 : Math.sin(t * 0.4) * 0.045;

    // Scroll choreography: weave left↔right, descend, drift forward, turn.
    const targetX = Math.sin(progress * Math.PI * 1.5) * 1.35;
    const targetY = BASE_Y - progress * 1.7;
    const targetZ = Math.sin(progress * Math.PI) * -0.6;
    const targetRotY = progress * 0.8;

    const s = 1 - Math.exp(-3 * delta);
    eased.current.x += (targetX - eased.current.x) * s;
    eased.current.y += (targetY - eased.current.y) * s;
    eased.current.z += (targetZ - eased.current.z) * s;
    eased.current.rotY += (targetRotY - eased.current.rotY) * s;

    const tilt = cursor.update(delta);

    root.current.position.set(
      eased.current.x,
      eased.current.y + bob,
      eased.current.z
    );
    root.current.rotation.set(
      tilt.x + sway * 0.35,
      eased.current.rotY + tilt.y,
      sway
    );

    root.current.getWorldPosition(positionRef.current);
  });

  return (
    <group ref={root} scale={0.62} position={[0, BASE_Y, 0]}>
      {/* Right wing half – flaps around the body line */}
      <group ref={rightWing}>
        <mesh geometry={built.rGeo} material={built.matR} />
      </group>
      {/* Left wing half */}
      <group ref={leftWing}>
        <mesh geometry={built.lGeo} material={built.matL} />
      </group>
      {/* Static body, slightly in front so the wings flap behind it */}
      <mesh geometry={built.bodyGeo} material={built.bodyMat} position={[0, 0, 0.03]} />
    </group>
  );
}
