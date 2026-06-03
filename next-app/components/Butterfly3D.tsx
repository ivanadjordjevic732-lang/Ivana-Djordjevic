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
  bevelThickness: 1.2,
  bevelSize: 0.9,
  bevelSegments: 6,
  curveSegments: 24,
};

function makeBodyGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 23);
  s.bezierCurveTo(-1.1, 22, -1.3, 16, -1.2, 8);
  s.bezierCurveTo(-1.1, 0, -1.0, -10, -0.5, -22);
  s.lineTo(0.5, -22);
  s.bezierCurveTo(1.0, -10, 1.1, 0, 1.2, 8);
  s.bezierCurveTo(1.3, 16, 1.1, 22, 0.5, 23);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { ...extrudeSettings, depth: 5.5 });
  g.center();
  return g;
}

function makeWingUpper(mirror: 1 | -1) {
  const m = mirror;
  const s = new THREE.Shape();
  s.moveTo(2 * m, 5);
  s.bezierCurveTo(7 * m, 16, 14 * m, 23, 24 * m, 24);
  s.bezierCurveTo(36 * m, 25, 45 * m, 18, 48 * m, 8);
  s.bezierCurveTo(50 * m, 0, 46 * m, -8, 38 * m, -11);
  s.bezierCurveTo(28 * m, -13, 16 * m, -10, 8 * m, -6);
  s.bezierCurveTo(4 * m, -3, 2 * m, 1, 2 * m, 5);
  return new THREE.ExtrudeGeometry(s, extrudeSettings);
}

function makeWingLower(mirror: 1 | -1) {
  const m = mirror;
  const s = new THREE.Shape();
  s.moveTo(2 * m, -7);
  s.bezierCurveTo(11 * m, -12, 20 * m, -19, 26 * m, -28);
  s.bezierCurveTo(30 * m, -36, 28 * m, -44, 22 * m, -43);
  s.bezierCurveTo(18 * m, -42, 14 * m, -36, 11 * m, -30);
  s.bezierCurveTo(8 * m, -22, 4 * m, -14, 2 * m, -7);
  return new THREE.ExtrudeGeometry(s, extrudeSettings);
}

function makeAntennaGeometry(mirror: 1 | -1) {
  const m = mirror;
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0.3 * m, 22, 0),
    new THREE.Vector3(1.5 * m, 27, 0),
    new THREE.Vector3(3.5 * m, 32, 0),
    new THREE.Vector3(5.5 * m, 36, 0),
  );
  return new THREE.TubeGeometry(curve, 28, 0.18, 8);
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
      antR: makeAntennaGeometry(1),
      antL: makeAntennaGeometry(-1),
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
        {/* Body */}
        <mesh geometry={geos.body}>
          <meshPhysicalMaterial
            color={0x9a7e48}
            metalness={0.90}
            roughness={0.30}
            clearcoat={0.55}
            clearcoatRoughness={0.2}
            envMapIntensity={1.5}
          />
        </mesh>
        {/* Right wings */}
        <group ref={wingRRef}>
          <mesh geometry={geos.upR}>
            <meshPhysicalMaterial
              color={0xd4b274}
              metalness={0.95}
              roughness={0.22}
              clearcoat={0.7}
              clearcoatRoughness={0.15}
              reflectivity={0.55}
              envMapIntensity={1.8}
            />
          </mesh>
          <mesh geometry={geos.loR}>
            <meshPhysicalMaterial
              color={0xd4b274}
              metalness={0.95}
              roughness={0.22}
              clearcoat={0.7}
              clearcoatRoughness={0.15}
              reflectivity={0.55}
              envMapIntensity={1.8}
            />
          </mesh>
        </group>
        {/* Left wings */}
        <group ref={wingLRef}>
          <mesh geometry={geos.upL}>
            <meshPhysicalMaterial
              color={0xd4b274}
              metalness={0.95}
              roughness={0.22}
              clearcoat={0.7}
              clearcoatRoughness={0.15}
              reflectivity={0.55}
              envMapIntensity={1.8}
            />
          </mesh>
          <mesh geometry={geos.loL}>
            <meshPhysicalMaterial
              color={0xd4b274}
              metalness={0.95}
              roughness={0.22}
              clearcoat={0.7}
              clearcoatRoughness={0.15}
              reflectivity={0.55}
              envMapIntensity={1.8}
            />
          </mesh>
        </group>
        {/* Antennae */}
        <mesh geometry={geos.antR}>
          <meshPhysicalMaterial color={0xd4b274} metalness={0.95} roughness={0.22} envMapIntensity={1.5} />
        </mesh>
        <mesh geometry={geos.antL}>
          <meshPhysicalMaterial color={0xd4b274} metalness={0.95} roughness={0.22} envMapIntensity={1.5} />
        </mesh>
        {/* Antenna light dots */}
        <mesh position={[5.5, 36, 0]}>
          <sphereGeometry args={[0.6, 16, 12]} />
          <meshStandardMaterial color={0xfbf6ec} emissive={0xfbf6ec} emissiveIntensity={2.4} />
        </mesh>
        <mesh position={[-5.5, 36, 0]}>
          <sphereGeometry args={[0.6, 16, 12]} />
          <meshStandardMaterial color={0xfbf6ec} emissive={0xfbf6ec} emissiveIntensity={2.4} />
        </mesh>
        {/* Vertical spark beam above head */}
        <mesh position={[0, 32, 0]}>
          <cylinderGeometry args={[0.12, 0.04, 14, 8]} />
          <meshStandardMaterial color={0xfbf6ec} emissive={0xfbf6ec} emissiveIntensity={2.4} />
        </mesh>
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
