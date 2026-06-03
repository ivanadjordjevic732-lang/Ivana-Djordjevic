'use client';

/**
 * Butterfly3D
 *
 * Real 3D extruded butterfly built from THREE.Shape + ExtrudeGeometry,
 * materialised in brushed gold PBR with environment-map reflections.
 *
 * If /images/mindea-logo.png exists in /public/images, the geometric
 * butterfly is hidden and the image is shown on a flat plane instead —
 * giving you the actual logo 1:1.
 *
 * The exposed handle lets the parent (Hero) drive scroll progress and
 * read the current world position (for ParticleTrail).
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import gsap from 'gsap';

export type ButterflyHandle = {
  getWorldPosition: (out: THREE.Vector3) => THREE.Vector3;
  setScrollProgress: (p: number) => void;
};

type Props = {
  mouse: React.MutableRefObject<{ x: number; y: number }>;
};

/* ---------- Shape factories ---------- */
const extrudeSettings: THREE.ExtrudeGeometryOptions = {
  depth: 4,
  bevelEnabled: true,
  bevelThickness: 1,
  bevelSize: 0.8,
  bevelSegments: 4,
  curveSegments: 18,
};

function makeBodyGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.7, 22);
  s.bezierCurveTo(-1.1, 10, -1.0, -10, -0.4, -22);
  s.lineTo(0.4, -22);
  s.bezierCurveTo(1.0, -10, 1.1, 10, 0.7, 22);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { ...extrudeSettings, depth: 5 });
  g.center();
  return g;
}

function makeWingUpper(mirror: 1 | -1) {
  const m = mirror;
  const s = new THREE.Shape();
  s.moveTo(2 * m, 3);
  s.bezierCurveTo(15 * m, 22, 38 * m, 20, 45 * m, 5);
  s.bezierCurveTo(47 * m, -8, 32 * m, -14, 18 * m, -10);
  s.bezierCurveTo(8 * m, -7, 4 * m, -2, 2 * m, 3);
  return new THREE.ExtrudeGeometry(s, extrudeSettings);
}

function makeWingLower(mirror: 1 | -1) {
  const m = mirror;
  const s = new THREE.Shape();
  s.moveTo(2 * m, -5);
  s.bezierCurveTo(14 * m, -12, 32 * m, -22, 34 * m, -34);
  s.bezierCurveTo(35 * m, -42, 24 * m, -40, 12 * m, -32);
  s.bezierCurveTo(6 * m, -26, 2 * m, -14, 2 * m, -5);
  return new THREE.ExtrudeGeometry(s, extrudeSettings);
}

/* ---------- Component ---------- */
export const Butterfly3D = forwardRef<ButterflyHandle, Props>(function Butterfly3D(
  { mouse },
  ref,
) {
  const rootRef = useRef<THREE.Group>(null!);
  const butterflyRef = useRef<THREE.Group>(null!);
  const wingLRef = useRef<THREE.Group>(null!);
  const wingRRef = useRef<THREE.Group>(null!);
  const logoPlaneRef = useRef<THREE.Mesh>(null!);
  const [introDone, setIntroDone] = useState(false);
  const scrollProgress = useRef(0);

  // Try to load the real logo PNG (optional)
  const [logoTex, setLogoTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const loader = new TextureLoader();
    loader.load(
      '/images/mindea-logo.png',
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        setLogoTex(tex);
      },
      undefined,
      () => {},
    );
  }, []);

  // Geometries (memoised, disposed automatically when component unmounts)
  const geos = useMemo(
    () => ({
      body: makeBodyGeometry(),
      upR: makeWingUpper(1),
      loR: makeWingLower(1),
      upL: makeWingUpper(-1),
      loL: makeWingLower(-1),
    }),
    [],
  );

  // Loading timeline — butterfly first, wings unfold, then settle
  useEffect(() => {
    if (!butterflyRef.current || !wingLRef.current || !wingRRef.current) return;

    // Initial states
    butterflyRef.current.scale.set(0, 0, 0);
    wingLRef.current.rotation.y = Math.PI * 0.5;
    wingRRef.current.rotation.y = -Math.PI * 0.5;

    const tl = gsap.timeline({
      delay: 0.4,
      onComplete: () => setIntroDone(true),
    });
    tl.to(butterflyRef.current.scale, { x: 0.022, y: 0.022, z: 0.022, duration: 1.8, ease: 'expo.out' }, 0);
    tl.to(wingRRef.current.rotation, { y: 0, duration: 2.0, ease: 'expo.out' }, 0.4);
    tl.to(wingLRef.current.rotation, { y: 0, duration: 2.0, ease: 'expo.out' }, 0.4);

    return () => {
      tl.kill();
    };
  }, []);

  // Imperative handle for parent (Hero → ParticleTrail follows this)
  useImperativeHandle(ref, () => ({
    getWorldPosition: (out: THREE.Vector3) => {
      if (rootRef.current) rootRef.current.getWorldPosition(out);
      return out;
    },
    setScrollProgress: (p: number) => {
      scrollProgress.current = p;
    },
  }));

  /* Frame loop — living-presence motion, mouse tilt, scroll lift */
  const mouseSmoothed = useRef({ x: 0, y: 0 });
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!rootRef.current) return;

    // Smooth mouse
    mouseSmoothed.current.x += (mouse.current.x - mouseSmoothed.current.x) * 0.045;
    mouseSmoothed.current.y += (mouse.current.y - mouseSmoothed.current.y) * 0.045;

    // Mouse-driven 5-10° tilt on the root
    rootRef.current.rotation.y = mouseSmoothed.current.x * 0.12; // ~7° max
    rootRef.current.rotation.x = -mouseSmoothed.current.y * 0.08; // ~4.5° max

    // Scroll lift — butterfly drifts up and a touch forward as user scrolls
    const sp = scrollProgress.current;
    rootRef.current.position.y = sp * 1.6;
    rootRef.current.position.z = sp * 0.8;

    if (!butterflyRef.current) return;

    // Living-presence: side drift, breathing scale
    butterflyRef.current.position.x = Math.sin(t * 0.28) * 0.35;
    butterflyRef.current.position.y = Math.sin(t * 0.52) * 0.12;

    if (introDone) {
      const breath = 0.022 * (1 + Math.sin(t * 0.45) * 0.04);
      butterflyRef.current.scale.setScalar(breath);

      // Wing fold cycle + subtle flutter
      const cycle = Math.sin(t * 0.32) * 0.5 + 0.5;
      const flutter = Math.sin(t * 2.6) * 0.04;
      wingRRef.current.rotation.y = -cycle * 0.45 + flutter;
      wingLRef.current.rotation.y = cycle * 0.45 - flutter;
    }
  });

  // If the real logo PNG exists → use it on a plane and hide the geometric butterfly
  const showRealLogo = !!logoTex;

  return (
    <group ref={rootRef}>
      {/* Geometric butterfly (fallback / always present, hidden if logo PNG loaded) */}
      <group ref={butterflyRef} visible={!showRealLogo}>
        <mesh geometry={geos.body}>
          <meshStandardMaterial
            color={0x8a6e3f}
            metalness={0.88}
            roughness={0.34}
            envMapIntensity={1.2}
          />
        </mesh>
        <group ref={wingRRef}>
          <mesh geometry={geos.upR}>
            <meshStandardMaterial
              color={0xc8a96a}
              metalness={0.92}
              roughness={0.28}
              envMapIntensity={1.4}
            />
          </mesh>
          <mesh geometry={geos.loR}>
            <meshStandardMaterial
              color={0xc8a96a}
              metalness={0.92}
              roughness={0.28}
              envMapIntensity={1.4}
            />
          </mesh>
        </group>
        <group ref={wingLRef}>
          <mesh geometry={geos.upL}>
            <meshStandardMaterial
              color={0xc8a96a}
              metalness={0.92}
              roughness={0.28}
              envMapIntensity={1.4}
            />
          </mesh>
          <mesh geometry={geos.loL}>
            <meshStandardMaterial
              color={0xc8a96a}
              metalness={0.92}
              roughness={0.28}
              envMapIntensity={1.4}
            />
          </mesh>
        </group>
      </group>

      {/* Real logo plane (only visible when /images/mindea-logo.png loaded) */}
      {logoTex && (
        <mesh ref={logoPlaneRef} position={[0, 0, 0]}>
          <planeGeometry
            args={[
              4.6,
              4.6 *
                ((logoTex.image as HTMLImageElement)?.height /
                  Math.max(1, (logoTex.image as HTMLImageElement)?.width || 1)),
            ]}
          />
          <meshBasicMaterial map={logoTex} transparent depthWrite={false} />
        </mesh>
      )}
    </group>
  );
});
