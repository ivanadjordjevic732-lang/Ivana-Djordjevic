/*
  Hero-3D-Szene: ein langsam rotierendes, abstraktes Objekt in Emaille-Optik.
  Matt-weiß, leicht durchscheinend, weiches Studiolicht, dezente Tiefenschärfe.
  Wird nur auf dem Desktop und bei erlaubter Bewegung geladen (siehe main.js).
*/
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export function createHeroScene(host, { gsap, ScrollTrigger, lowPower = false }) {
  const width = () => host.clientWidth || window.innerWidth;
  const height = () => host.clientHeight || window.innerHeight;
  const isNarrow = () => window.innerWidth < 921;
  const maxDPR = lowPower ? 1.5 : 2; // auf Mobil die Pixeldichte deckeln

  /* ---------- Renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDPR));
  renderer.setSize(width(), height());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  /* ---------- Szene & Kamera ---------- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, width() / height(), 0.1, 100);
  camera.position.set(0, 0, 6.2);

  /* ---------- Studio-Environment (ohne externe Datei) ---------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  /* ---------- Lichter ---------- */
  scene.add(new THREE.HemisphereLight(0xffffff, 0x143933, 0.55));

  const key = new THREE.DirectionalLight(0xfff4e2, 2.1); // weiches, warmes Studiolicht
  key.position.set(4, 6, 5);
  scene.add(key);

  const gold = new THREE.PointLight(0xffcf8a, 9, 30, 2); // warmes Gold-Akzentlicht
  gold.position.set(3.5, -1.5, 3);
  scene.add(gold);

  const teal = new THREE.PointLight(0x2e7d6f, 7, 30, 2); // Petrol-Teal-Grundton
  teal.position.set(-4, 1.5, 2);
  scene.add(teal);

  /* ---------- Abstraktes Emaille-Objekt ---------- */
  const group = new THREE.Group();
  let baseY = 0; // Grund-Höhe, wird je nach Viewport gesetzt
  function layoutGroup() {
    if (isNarrow()) {
      // schmal: mittig, etwas tiefer und kleiner, damit der Text frei bleibt
      group.position.x = 0;
      baseY = -0.55;
      group.scale.setScalar(0.82);
    } else {
      group.position.x = 1.35;
      baseY = 0;
      group.scale.setScalar(1);
    }
  }
  layoutGroup();
  scene.add(group);

  const detail = lowPower ? 12 : 24; // weniger Geometrie auf Mobil
  const geo = new THREE.IcosahedronGeometry(1.55, detail);
  deform(geo, 0.16);
  geo.computeVertexNormals();

  // Transmission ist der teuerste Effekt, auf Mobil etwas zurücknehmen.
  const baseTransmission = lowPower ? 0.32 : 0.5;
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xf4efe5,
    roughness: 0.38,
    metalness: 0.0,
    transmission: baseTransmission,
    thickness: 1.4,
    ior: 1.42,
    clearcoat: 0.55,
    clearcoatRoughness: 0.45,
    sheen: 0.6,
    sheenColor: new THREE.Color(0xfff3df),
    attenuationColor: new THREE.Color(0xe9e1cf),
    attenuationDistance: 4,
    envMapIntensity: 1.05,
  });
  const enamel = new THREE.Mesh(geo, material);
  group.add(enamel);

  // dezenter Gold-Kern als Glanzpunkt
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.55, 6),
    new THREE.MeshStandardMaterial({ color: 0xb08a4e, roughness: 0.3, metalness: 0.6, emissive: 0x3a2a12, emissiveIntensity: 0.4 })
  );
  group.add(core);

  /* ---------- Partikelfeld ---------- */
  const particles = makeParticles();
  scene.add(particles.points);

  /* ---------- Postprocessing: dezente Tiefenschärfe (nur Desktop) ---------- */
  let composer = null;
  let bokeh = null;
  try {
    if (lowPower) throw new Error('skip-postprocessing'); // Mobil ohne Bokeh, schont GPU
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bokeh = new BokehPass(scene, camera, { focus: 6.2, aperture: 0.0006, maxblur: 0.006 });
    composer.addPass(bokeh);
    composer.addPass(new OutputPass());
    composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    composer.setSize(width(), height());
  } catch (e) {
    composer = null; // Fallback auf direktes Rendern
  }

  /* ---------- Maus-Parallax ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5);
    pointer.ty = (e.clientY / window.innerHeight - 0.5);
  });

  /* ---------- Scroll-gesteuerte Kamera ---------- */
  const scrollState = { progress: 0 };
  const st = ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 1,
    onUpdate: (self) => { scrollState.progress = self.progress; },
  });

  /* ---------- Render-Loop, pausiert wenn unsichtbar ---------- */
  let running = true;
  const visIO = new IntersectionObserver(
    (entries) => entries.forEach((en) => { running = en.isIntersecting; }),
    { threshold: 0 }
  );
  visIO.observe(host);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    if (!running) return;
    const t = clock.getElapsedTime();
    const p = scrollState.progress;

    // sanfte Eigenrotation
    group.rotation.y = t * 0.18 + pointer.x * 0.4;
    group.rotation.x = Math.sin(t * 0.25) * 0.12 + pointer.y * 0.3;
    core.rotation.y = -t * 0.4;
    core.rotation.x = t * 0.3;

    // Maus weich nachführen
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    // Kamera nähert und senkt sich beim Scrollen, Objekt gleitet weg
    camera.position.z = 6.2 - p * 1.6;
    camera.position.y = p * 0.8;
    group.position.y = baseY - p * 1.2;
    group.rotation.z = p * 0.3;
    enamel.material.transmission = baseTransmission + p * 0.2;
    camera.lookAt(group.position.x * 0.4, 0, 0);

    // Partikel leicht treiben lassen
    particles.points.rotation.y = t * 0.02 + pointer.x * 0.15;
    particles.points.rotation.x = pointer.y * 0.1;

    if (composer) composer.render();
    else renderer.render(scene, camera);
  }
  loop();

  /* ---------- Resize ---------- */
  function onResize() {
    const w = width();
    const h = height();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
    layoutGroup(); // Position/Größe je nach Breite neu setzen
  }
  window.addEventListener('resize', onResize);

  return { renderer, scene, camera };

  /* ===================== Helfer ===================== */
  function deform(geometry, amount) {
    const pos = geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const n =
        0.5 * Math.sin(v.x * 2.0 + v.y * 1.3) +
        0.35 * Math.sin(v.y * 2.6 - v.z * 1.7) +
        0.3 * Math.sin(v.z * 2.2 + v.x * 1.1) +
        0.2 * Math.sin((v.x + v.y + v.z) * 3.1);
      const scale = 1.55 * (1 + n * amount);
      v.multiplyScalar(scale);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
  }

  function makeParticles() {
    const count = lowPower ? 120 : 280;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi) - 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const m = new THREE.PointsMaterial({
      color: 0xc9b98f,
      size: 0.045,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    return { points: new THREE.Points(g, m) };
  }
}
