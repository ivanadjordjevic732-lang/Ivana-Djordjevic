'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { makePlaceholderTexture, loadImageTexture } from '@/lib/texture';

const SPACING = 3.0; // Abstand der Karten auf der X-Achse
const lerp = THREE.MathUtils.lerp;

export default function DentalCard({ index, total, card, progressRef, swingRef, pointerRef, tier }) {
  const group = useRef();
  const mat = useRef();

  // Platzhalter sofort, echtes Bild bei Bedarf nachladen.
  const placeholder = useMemo(() => makePlaceholderTexture(card, index), [card, index]);
  const [texture, setTexture] = useState(placeholder);

  useEffect(() => {
    let alive = true;
    if (card.image) {
      loadImageTexture(card.image).then((tex) => { if (alive) setTexture(tex); }).catch(() => {});
    }
    return () => { alive = false; };
  }, [card.image]);

  useEffect(() => () => placeholder.dispose(), [placeholder]);

  const smoothness = tier === 'low' ? 2 : 4;

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const rel = index - progressRef.current; // 0 = aktiv
    const dist = Math.abs(rel);

    // Karten weiter als 3 Plätze ausblenden (Performance).
    const visible = dist < 3.2;
    g.visible = visible;
    if (!visible) return;

    const swing = swingRef.current;
    const isActive = dist < 0.5;
    const pointer = pointerRef.current;

    // Zielwerte: aktive Karte vorne und groß, Nachbarn nach hinten.
    const targetX = rel * SPACING;
    const targetZ = -dist * 1.15 + (isActive ? 0.4 : 0);
    const targetScale = Math.max(0.62, 1 - dist * 0.14) * (isActive ? 1.06 : 1);
    const targetRotY = rel * 0.16 + swing + (isActive ? pointer.x * 0.18 : 0);
    const targetRotX = isActive ? -pointer.y * 0.12 : 0;

    const k = 0.12;
    g.position.x = lerp(g.position.x, targetX, k);
    g.position.z = lerp(g.position.z, targetZ, k);
    g.rotation.y = lerp(g.rotation.y, targetRotY, k);
    g.rotation.x = lerp(g.rotation.x, targetRotX, k);
    const s = lerp(g.scale.x, targetScale, k);
    g.scale.setScalar(s);

    if (mat.current) {
      const op = THREE.MathUtils.clamp(1 - (dist - 1.6) * 0.7, 0.0, 1);
      mat.current.opacity = lerp(mat.current.opacity, op, k);
    }
  });

  return (
    <group ref={group} position={[index * SPACING, 0, 0]}>
      <RoundedBox args={[2.5, 3.3, 0.14]} radius={0.09} smoothness={smoothness} castShadow receiveShadow>
        <meshPhysicalMaterial
          ref={mat}
          map={texture}
          roughness={0.28}
          metalness={0.0}
          clearcoat={1}
          clearcoatRoughness={0.12}
          envMapIntensity={1.25}
          transparent
          opacity={1}
        />
      </RoundedBox>
      {/* feine goldene Lichtkante */}
      <lineSegments scale={[2.52, 3.32, 0.16]}>
        <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
        <lineBasicMaterial color="#d8b978" transparent opacity={0.28} />
      </lineSegments>
    </group>
  );
}
