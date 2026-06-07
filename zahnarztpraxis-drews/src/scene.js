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
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/* Kompakte 3D-Simplex-Noise (Ashima/Stefan Gustavson) für das GPU-Displacement. */
const NOISE_GLSL = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;


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

  // Gemeinsame Zeit-Uniform für die lebendige Oberfläche.
  const uTime = { value: 0 };

  // Transmission ist der teuerste Effekt, auf Mobil etwas zurücknehmen.
  const baseTransmission = lowPower ? 0.32 : 0.5;
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xf4efe5,
    roughness: 0.36,
    metalness: 0.0,
    transmission: baseTransmission,
    thickness: 1.4,
    ior: 1.42,
    clearcoat: 0.6,
    clearcoatRoughness: 0.4,
    sheen: 0.65,
    sheenColor: new THREE.Color(0xfff3df),
    // feines Perlmutt-Schimmern, sehr dezent, nie comichaft
    iridescence: lowPower ? 0.0 : 0.22,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [120, 420],
    attenuationColor: new THREE.Color(0xe9e1cf),
    attenuationDistance: 4,
    envMapIntensity: 1.1,
  });

  // GPU-Displacement: die Oberfläche „atmet" sanft, ohne CPU-Last.
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.uniforms.uAmp = { value: lowPower ? 0.05 : 0.085 };
    shader.uniforms.uFreq = { value: 1.15 };
    shader.uniforms.uSpeed = { value: 0.22 };
    shader.vertexShader =
      'uniform float uTime;uniform float uAmp;uniform float uFreq;uniform float uSpeed;\n' +
      NOISE_GLSL +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float nAmp = snoise(normalize(position) * uFreq + vec3(0.0, 0.0, uTime * uSpeed));
         transformed += normal * nAmp * uAmp;`
      );
  };

  const enamel = new THREE.Mesh(geo, material);
  group.add(enamel);

  // dezenter Gold-Kern als Glanzpunkt (leuchtet leicht für den Bloom)
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.55, 6),
    new THREE.MeshStandardMaterial({ color: 0xc89a57, roughness: 0.28, metalness: 0.65, emissive: 0xb0833f, emissiveIntensity: 0.7 })
  );
  group.add(core);

  // weicher Lichthof hinter dem Objekt für räumliche Tiefe
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlowTexture(),
      color: 0xffe6b8,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  glow.scale.set(7, 7, 1);
  glow.position.set(group.position.x, baseY, -1.2);
  scene.add(glow);

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
    // sehr dezenter Bloom: lässt nur Goldkern und Glanzlichter weich strahlen
    const bloom = new UnrealBloomPass(new THREE.Vector2(width(), height()), 0.35, 0.7, 0.9);
    composer.addPass(bloom);
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
    uTime.value = t; // lässt die Oberfläche atmen

    // langsam bewegte Umgebungsreflexionen für mehr Lebendigkeit
    if (scene.environmentRotation) scene.environmentRotation.y = t * 0.05;

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

    // Halo folgt dem Objekt und blendet beim Scrollen sanft aus
    glow.position.x = group.position.x;
    glow.position.y = group.position.y;
    glow.material.opacity = (0.5 + Math.sin(t * 0.8) * 0.06) * (1 - p * 0.7);

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

  function makeGlowTexture() {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.25, 'rgba(255,225,170,0.55)');
    g.addColorStop(0.6, 'rgba(176,138,78,0.15)');
    g.addColorStop(1, 'rgba(176,138,78,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
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
