import * as THREE from 'three';

/**
 * Geometry + material factory for the Mindéa butterfly.
 *
 * The shape is hand-authored from bézier curves to mirror the golden butterfly
 * in the Mindéa logo: a large, gently rounded upper fore-wing and a smaller,
 * tapered hind-wing, joined at a slim body. It is extruded with a soft bevel so
 * the gold catches light like the polished metal in the logo.
 */

/** Right-hand half of the wing silhouette (mirror it for the left side). */
export function createWingShape(): THREE.Shape {
  const s = new THREE.Shape();

  // Inner top, right beside the body / head.
  s.moveTo(0.06, 0.92);

  // Upper fore-wing: sweep up and out to a broad, rounded outer edge.
  s.bezierCurveTo(0.72, 1.62, 1.78, 1.5, 1.74, 0.58);
  s.bezierCurveTo(1.72, 0.22, 1.42, 0.05, 0.92, 0.04);

  // Subtle notch between fore- and hind-wing.
  s.bezierCurveTo(1.18, -0.12, 1.46, -0.5, 1.34, -1.02);

  // Lower hind-wing: tapered, softly pointed tail.
  s.bezierCurveTo(1.18, -1.5, 0.6, -1.56, 0.32, -1.12);
  s.bezierCurveTo(0.2, -0.92, 0.12, -0.62, 0.16, -0.18);

  // Inner edge back up to the head.
  s.bezierCurveTo(0.08, 0.1, 0.05, 0.5, 0.06, 0.92);

  return s;
}

/** Extruded, bevelled wing geometry shared by both sides. */
export function createWingGeometry(): THREE.ExtrudeGeometry {
  const shape = createWingShape();
  const depth = 0.05;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 4,
    curveSegments: 48,
  });
  // The shape already lives in +X with its inner edge at the body (x ≈ 0), so the
  // wing naturally flaps around the body line. Only centre it through its own
  // thickness so the membrane sits on z = 0.
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Slim body: an elongated, slightly tapered capsule along the vertical axis. */
export function createBodyGeometry(): THREE.CapsuleGeometry {
  const geo = new THREE.CapsuleGeometry(0.11, 1.5, 8, 18);
  return geo;
}

/** Warm, polished gold material matching the logo's metallic surface. */
export function createGoldMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c9a13f'),
    metalness: 0.95,
    roughness: 0.28,
    emissive: new THREE.Color('#5a4012'),
    emissiveIntensity: 0.32,
    envMapIntensity: 1.15,
    side: THREE.DoubleSide,
  });
}

/** Slightly deeper, darker gold for the body so it reads against the wings. */
export function createBodyMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8b6432'),
    metalness: 0.9,
    roughness: 0.38,
    emissive: new THREE.Color('#3a2a0e'),
    emissiveIntensity: 0.3,
    envMapIntensity: 1.0,
  });
}

/** A single antenna as a thin tube along a curving path, with a tiny club tip. */
export function createAntenna(mirror: boolean): THREE.BufferGeometry {
  const dir = mirror ? -1 : 1;
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(dir * 0.04, 0.82, 0),
    new THREE.Vector3(dir * 0.32, 1.18, 0.04),
    new THREE.Vector3(dir * 0.46, 1.4, 0.02)
  );
  return new THREE.TubeGeometry(curve, 16, 0.012, 6, false);
}
