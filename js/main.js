/* ============================================================
   MINDÉA · 3D SCROLL EXPERIENCE
   One canvas, ten chapters. Every animation explains the offer:
   Presence = sichtbar werden · Story = eintauchen · Impact = Film.
   ============================================================ */
(function () {
'use strict';

/* ---------------- feature detection ---------------- */
var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var FORCE_NO3D = /[?&]no3d/.test(location.search);

function webglOK() {
  try {
    var c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) { return false; }
}

var FORCE_3D = false;
try { FORCE_3D = localStorage.getItem('mindea-3d') === 'on'; } catch (e) {}
var NO3D = FORCE_NO3D || (REDUCED && !FORCE_3D) || !webglOK() || typeof THREE === 'undefined';
var MOBILE = window.matchMedia('(max-width: 880px)').matches;

/* ---------------- tiny math helpers ---------------- */
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rng(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
function ez(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }        // smoothstep
function ezIn(x) { x = clamp(x, 0, 1); return x * x * x; }
function ezOut(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }

/* ---------------- DOM refs ---------------- */
var body = document.body;
var loader = document.getElementById('loader');
var sections = Array.prototype.slice.call(document.querySelectorAll('[data-chapter]'));
var vh = window.innerHeight;
var scrollY = 0;

/* metrics cache: {el, name, top, height, phases:[{el,from,to}]} */
var metrics = [];
function measure() {
  vh = window.innerHeight;
  metrics = sections.map(function (sec) {
    var rect = sec.getBoundingClientRect();
    var top = rect.top + window.pageYOffset;
    var phases = Array.prototype.slice.call(sec.querySelectorAll('.phase')).map(function (el) {
      return { el: el, from: parseFloat(el.dataset.from), to: parseFloat(el.dataset.to) };
    });
    return { el: sec, name: sec.dataset.chapter, top: top, height: rect.height, phases: phases };
  });
}

function sectionProgress(m) {
  var span = Math.max(m.height - vh, 1);
  return clamp((scrollY - m.top) / span, 0, 1);
}

/* ---------------- phases + theme (shared by both modes) ---------------- */
function updatePhases() {
  for (var i = 0; i < metrics.length; i++) {
    var m = metrics[i];
    if (m.top > scrollY + vh * 1.2 || m.top + m.height < scrollY - vh * 0.2) continue;
    var p = sectionProgress(m);
    for (var j = 0; j < m.phases.length; j++) {
      var ph = m.phases[j];
      var on = p >= ph.from && p <= ph.to;
      if (on !== ph.on) { ph.on = on; ph.el.classList.toggle('on', on); }
    }
  }
}

function updateTheme() {
  var center = scrollY + vh * 0.45;
  var theme = 'dark';
  for (var i = 0; i < metrics.length; i++) {
    var m = metrics[i];
    if (center >= m.top && center < m.top + m.height) {
      if (m.el.classList.contains('theme-light') || m.el.classList.contains('theme-paper')) theme = 'light';
      break;
    }
  }
  if (body.dataset.theme !== theme) body.dataset.theme = theme;
  body.classList.toggle('scrolled', scrollY > 40);
}

/* ---------------- modals ---------------- */
(function modals() {
  var backdrop = document.getElementById('modal-backdrop');
  var open = null;
  function show(id) {
    var mo = document.getElementById('modal-' + id);
    if (!mo) return;
    open = mo;
    backdrop.hidden = false; mo.hidden = false;
    requestAnimationFrame(function () { backdrop.classList.add('show'); mo.classList.add('show'); });
    var c = mo.querySelector('.modal-close');
    if (c) c.focus();
  }
  function hide() {
    if (!open) return;
    var mo = open; open = null;
    backdrop.classList.remove('show'); mo.classList.remove('show');
    setTimeout(function () { backdrop.hidden = true; mo.hidden = true; }, 420);
  }
  document.querySelectorAll('.cmp-card').forEach(function (btn) {
    btn.addEventListener('click', function () { show(btn.dataset.pkg); });
  });
  document.querySelectorAll('.modal-close').forEach(function (btn) {
    btn.addEventListener('click', hide);
  });
  document.querySelectorAll('.modal a[href="#kontakt"]').forEach(function (a) {
    a.addEventListener('click', hide);
  });
  backdrop.addEventListener('click', hide);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  window.__openPkg = show;
})();

/* ============================================================
   NO-3D / REDUCED-MOTION PATH
   ============================================================ */
if (NO3D) {
  body.classList.add('no3d');
  measure();
  function onScrollLite() { scrollY = window.pageYOffset; updateTheme(); }
  window.addEventListener('scroll', onScrollLite, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', function () { measure(); onScrollLite(); });
  loader.classList.add('done');
  // Fallback kam nur durch "Bewegung reduzieren": 3D als bewusste Wahl anbieten
  if (REDUCED && !FORCE_NO3D && webglOK() && typeof THREE !== 'undefined') {
    var btn = document.createElement('button');
    btn.id = 'enable3d';
    btn.type = 'button';
    btn.textContent = '3D-Erlebnis aktivieren';
    btn.addEventListener('click', function () {
      try { localStorage.setItem('mindea-3d', 'on'); } catch (e) {}
      location.reload();
    });
    body.appendChild(btn);
  }
  return;
}

/* ============================================================
   FULL 3D EXPERIENCE
   ============================================================ */

/* ---------------- smooth scroll ---------------- */
var lenis = null;
if (typeof Lenis !== 'undefined') {
  lenis = new Lenis({ lerp: MOBILE ? 0.12 : 0.085, smoothWheel: true });
}

/* ---------------- palette ---------------- */
var PAL = {
  ivory: 0xf8f5f0, cream: 0xf1eae0, sand: 0xe4d8c6, taupe: 0xa99c8c,
  brown: 0x2a211a, deep: 0x1c1610, black: 0x0f0b08, gold: 0xc0a468,
  paper: 0xefe6d8
};
var BG = { // background target per chapter
  hero: 0x191310, problem: 0xf6f2ea, presence: 0x17110c, book: 0xeadfc8,
  story: 0xe3d5bc, action: 0x14100b, impact: 0x0d0a07, process: 0x151009,
  compare: 0x1a140e, finale: 0x0b0805
};

/* ---------------- renderer / scene / camera ---------------- */
var canvas = document.getElementById('webgl');
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !MOBILE, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.6 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);

var scene = new THREE.Scene();
scene.background = new THREE.Color(BG.hero);
scene.fog = new THREE.Fog(BG.hero, 13, 38);

var camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 60);
function camDist() {
  var aspect = window.innerWidth / window.innerHeight;
  return aspect < 0.8 ? 12.5 : aspect < 1.2 ? 10.5 : 8.6;
}
camera.position.set(0, 0, camDist());

var ambient = new THREE.AmbientLight(0xfff4e0, 0.55);
scene.add(ambient);
var keyLight = new THREE.DirectionalLight(0xfff0d8, 0.85);
keyLight.position.set(3, 5, 6);
scene.add(keyLight);

var mouse = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener('pointermove', function (e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

/* ---------------- texture factory ---------------- */
function makeCanvas(w, h) {
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function tex(c) {
  var t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}
function addGrain(ctx, w, h, amt) {
  var n = Math.floor(w * h / 42);
  for (var i = 0; i < n; i++) {
    ctx.fillStyle = 'rgba(' + (Math.random() > 0.5 ? '255,250,240' : '20,12,6') + ',' + (Math.random() * amt) + ')';
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
  }
}
function vignette(ctx, w, h, a) {
  var g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(15,8,4,' + a + ')');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

/* an abstract warm "photograph" */
function photoTex(c1, c2, c3, opts) {
  opts = opts || {};
  var w = 256, h = opts.h || 320;
  var c = makeCanvas(w, h), x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, c1); g.addColorStop(0.55, c2); g.addColorStop(1, c3);
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  // soft light blob
  var r = x.createRadialGradient(w * 0.62, h * 0.3, 10, w * 0.62, h * 0.3, w * 0.75);
  r.addColorStop(0, 'rgba(255,244,220,0.5)'); r.addColorStop(1, 'rgba(255,244,220,0)');
  x.fillStyle = r; x.fillRect(0, 0, w, h);
  // horizon shape
  x.fillStyle = 'rgba(30,18,10,0.28)';
  x.beginPath();
  x.moveTo(0, h * 0.78);
  x.bezierCurveTo(w * 0.3, h * 0.68, w * 0.6, h * 0.86, w, h * 0.74);
  x.lineTo(w, h); x.lineTo(0, h); x.closePath(); x.fill();
  vignette(x, w, h, 0.5);
  addGrain(x, w, h, 0.09);
  // border
  x.strokeStyle = 'rgba(248,245,240,0.85)';
  x.lineWidth = opts.border === false ? 0 : 10;
  if (opts.border !== false) x.strokeRect(5, 5, w - 10, h - 10);
  return tex(c);
}

/* serif text on transparent ground */
function textTex(txt, o) {
  o = o || {};
  var fs = o.fs || 90;
  var font = (o.italic ? 'italic ' : '') + (o.weight || 300) + ' ' + fs + 'px ' + (o.sans ? "'Jost', sans-serif" : "'Cormorant Garamond', Georgia, serif");
  var mc = makeCanvas(8, 8).getContext('2d');
  mc.font = font;
  var tw = Math.ceil(mc.measureText(txt).width) + 40;
  var c = makeCanvas(tw, Math.ceil(fs * 1.5)), x = c.getContext('2d');
  x.font = font;
  x.fillStyle = o.color || '#f8f5f0';
  x.textBaseline = 'middle';
  x.fillText(txt, 20, c.height / 2);
  var t = tex(c);
  t.userData = { aspect: c.width / c.height };
  return t;
}
function textPlane(txt, o) {
  o = o || {};
  var t = textTex(txt, o);
  var hgt = o.h || 0.5;
  var m = new THREE.Mesh(
    new THREE.PlaneGeometry(hgt * t.userData.aspect, hgt),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: o.opacity != null ? o.opacity : 1 })
  );
  return m;
}

/* film strip */
function filmTex() {
  var w = 512, h = 168;
  var c = makeCanvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#181009'; x.fillRect(0, 0, w, h);
  var frames = ['#8a6a45', '#a3805a', '#6e5138'];
  for (var i = 0; i < 3; i++) {
    var fx = 18 + i * 166, fw = 150;
    var g = x.createLinearGradient(fx, 26, fx + fw, h - 26);
    g.addColorStop(0, frames[i]); g.addColorStop(1, '#3a2a1a');
    x.fillStyle = g; x.fillRect(fx, 26, fw, h - 52);
    var r = x.createRadialGradient(fx + fw * 0.6, h * 0.42, 4, fx + fw * 0.6, h * 0.42, 80);
    r.addColorStop(0, 'rgba(255,240,214,0.55)'); r.addColorStop(1, 'rgba(255,240,214,0)');
    x.fillStyle = r; x.fillRect(fx, 26, fw, h - 52);
  }
  x.fillStyle = '#0a0603';
  for (var s = 10; s < w; s += 30) { x.fillRect(s, 7, 14, 10); x.fillRect(s, h - 17, 14, 10); }
  addGrain(x, w, h, 0.08);
  return tex(c);
}

/* cinematic screen picture (letterboxed) */
function cinemaTex(warm) {
  var w = 512, h = 288;
  var c = makeCanvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#050302'; x.fillRect(0, 0, w, h);
  var g = x.createLinearGradient(0, 36, w, h - 36);
  g.addColorStop(0, warm ? '#c9a56b' : '#7a5f42');
  g.addColorStop(0.5, warm ? '#8a6540' : '#4c3826');
  g.addColorStop(1, '#241709');
  x.fillStyle = g; x.fillRect(0, 36, w, h - 72);
  var r = x.createRadialGradient(w * 0.5, h * 0.46, 8, w * 0.5, h * 0.46, w * 0.55);
  r.addColorStop(0, 'rgba(255,240,210,0.75)'); r.addColorStop(1, 'rgba(255,240,210,0)');
  x.fillStyle = r; x.fillRect(0, 36, w, h - 72);
  // silhouette figure in the light
  x.fillStyle = 'rgba(18,10,5,0.85)';
  x.beginPath();
  x.ellipse(w * 0.5, h * 0.52, 13, 13, 0, 0, 7);
  x.fill();
  x.beginPath();
  x.moveTo(w * 0.5 - 22, h - 36);
  x.quadraticCurveTo(w * 0.5, h * 0.55, w * 0.5 + 22, h - 36);
  x.closePath(); x.fill();
  vignette(x, w, h, 0.55);
  addGrain(x, w, h, 0.07);
  return tex(c);
}

/* paper */
function paperTex(lines) {
  var w = 256, h = 340;
  var c = makeCanvas(w, h), x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#f7f1e6'); g.addColorStop(1, '#eadfcb');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  if (lines) {
    x.strokeStyle = 'rgba(90,70,50,0.28)'; x.lineWidth = 2;
    for (var i = 0; i < 9; i++) {
      var y = 60 + i * 26 + Math.random() * 4;
      x.beginPath();
      x.moveTo(34, y);
      x.bezierCurveTo(w * 0.4, y - 3, w * 0.6, y + 3, w - 30 - Math.random() * 60, y);
      x.stroke();
    }
  }
  addGrain(x, w, h, 0.06);
  vignette(x, w, h, 0.16);
  return tex(c);
}

/* book cover */
function coverTex() {
  var w = 340, h = 470;
  var c = makeCanvas(w, h), x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#f3ecdf'); g.addColorStop(1, '#e2d5bd');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(163,132,80,0.75)'; x.lineWidth = 3;
  x.strokeRect(24, 24, w - 48, h - 48);
  x.fillStyle = '#3a2c1c';
  x.textAlign = 'center';
  x.font = "italic 300 47px 'Cormorant Garamond', Georgia, serif";
  x.fillText('Your Story', w / 2, h * 0.44);
  x.font = "300 19px 'Jost', sans-serif";
  x.fillStyle = 'rgba(122,95,60,0.95)';
  var word = 'M I N D É A';
  x.fillText(word, w / 2, h * 0.6);
  x.strokeStyle = 'rgba(163,132,80,0.6)'; x.lineWidth = 1;
  x.beginPath(); x.moveTo(w / 2 - 46, h * 0.51); x.lineTo(w / 2 + 46, h * 0.51); x.stroke();
  addGrain(x, w, h, 0.05);
  vignette(x, w, h, 0.14);
  return tex(c);
}

/* phone feed */
function feedTex() {
  var w = 256, h = 512;
  var c = makeCanvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#f4efe7'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#d8cdba'; x.fillRect(0, 0, w, 54);
  x.beginPath(); x.arc(30, 27, 13, 0, 7); x.fillStyle = '#b7a88f'; x.fill();
  x.fillStyle = '#b7a88f';
  x.fillRect(54, 18, 90, 8); x.fillRect(54, 32, 60, 6);
  var cols = ['#cbbda4', '#bfae92', '#d6c9b2', '#c5b69b', '#d0c2a9', '#baa98c'];
  for (var i = 0; i < 6; i++) {
    var cx = 10 + (i % 2) * 122, cy = 66 + Math.floor(i / 2) * 130;
    x.fillStyle = cols[i]; x.fillRect(cx, cy, 114, 96);
    x.fillStyle = '#a8987d';
    x.fillRect(cx, cy + 104, 80, 7); x.fillRect(cx, cy + 116, 54, 5);
  }
  addGrain(x, w, h, 0.04);
  return tex(c);
}

/* small content tile */
function tileTex(i) {
  var w = 128, h = 128;
  var c = makeCanvas(w, h), x = c.getContext('2d');
  var tones = [
    ['#cbb897', '#8f7a58'], ['#ddd0b8', '#a8946f'], ['#b8a584', '#6e5b3e'],
    ['#e2d6c0', '#b09a74'], ['#c2ae8a', '#7d6845'], ['#d5c6ab', '#96805c'],
    ['#c9b795', '#836e4b'], ['#e0d3ba', '#a68f68'], ['#bdaa86', '#75603f']
  ][i % 9];
  var g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, tones[0]); g.addColorStop(1, tones[1]);
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  var r = x.createRadialGradient(w * 0.4, h * 0.35, 4, w * 0.4, h * 0.35, w * 0.7);
  r.addColorStop(0, 'rgba(255,245,222,0.5)'); r.addColorStop(1, 'rgba(255,245,222,0)');
  x.fillStyle = r; x.fillRect(0, 0, w, h);
  if (i % 3 === 0) { x.fillStyle = 'rgba(40,26,14,0.5)'; x.fillRect(10, h - 30, w - 40, 8); x.fillRect(10, h - 18, w - 70, 6); }
  vignette(x, w, h, 0.35);
  addGrain(x, w, h, 0.07);
  return tex(c);
}

/* elegant brand board */
function brandTex() {
  var w = 512, h = 300;
  var c = makeCanvas(w, h), x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#2b2116'); g.addColorStop(1, '#171008');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  var r = x.createRadialGradient(w * 0.5, h * 0.4, 6, w * 0.5, h * 0.4, w * 0.5);
  r.addColorStop(0, 'rgba(226,196,138,0.28)'); r.addColorStop(1, 'rgba(226,196,138,0)');
  x.fillStyle = r; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(192,164,104,0.65)'; x.lineWidth = 2;
  x.strokeRect(16, 16, w - 32, h - 32);
  x.textAlign = 'center';
  x.fillStyle = '#f2ead9';
  x.font = "300 64px 'Cormorant Garamond', Georgia, serif";
  x.fillText('MINDÉA', w / 2, h * 0.47);
  x.font = "300 15px 'Jost', sans-serif";
  x.fillStyle = 'rgba(192,164,104,0.9)';
  x.fillText('M A R K E N ,   D I E   W I R K E N', w / 2, h * 0.65);
  addGrain(x, w, h, 0.05);
  return tex(c);
}

/* soft radial glow sprite texture */
function glowTex(colA) {
  var s = 256;
  var c = makeCanvas(s, s), x = c.getContext('2d');
  var g = x.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
  g.addColorStop(0, colA || 'rgba(255,238,205,0.9)');
  g.addColorStop(0.35, 'rgba(226,190,130,0.32)');
  g.addColorStop(1, 'rgba(226,190,130,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  return tex(c);
}
var GLOW_TEX = null; // built after fonts load

/* ---------------- mesh factories ---------------- */
function basicMat(o) {
  var m = new THREE.MeshBasicMaterial(o);
  m.transparent = true;
  m.userData.op = o.opacity != null ? o.opacity : 1;
  return m;
}
function stdMat(o) {
  var m = new THREE.MeshStandardMaterial(o);
  m.transparent = true;
  m.userData.op = o.opacity != null ? o.opacity : 1;
  return m;
}
function plane(w, h, material) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
}
function glowSprite(scale, opacity) {
  var m = plane(scale, scale, basicMat({ map: GLOW_TEX, blending: THREE.AdditiveBlending, depthWrite: false, opacity: opacity != null ? opacity : 0.8 }));
  return m;
}
function beamCone(hgt, rad, opacity) {
  var geo = new THREE.ConeGeometry(rad, hgt, 40, 1, true);
  var m = new THREE.Mesh(geo, basicMat({
    color: 0xf0d9a8, opacity: opacity != null ? opacity : 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  }));
  return m;
}
function waveGroup(n, width, color) {
  var g = new THREE.Group();
  var mat = basicMat({ color: color || PAL.gold, opacity: 0.9 });
  for (var i = 0; i < n; i++) {
    var b = new THREE.Mesh(new THREE.BoxGeometry(width / n * 0.44, 1, 0.02), mat.clone());
    b.position.x = -width / 2 + (i + 0.5) * (width / n);
    b.userData.seed = Math.random() * 10;
    g.add(b);
  }
  g.userData.bars = g.children;
  return g;
}
function animateWave(g, t, amp) {
  var bars = g.userData.bars;
  for (var i = 0; i < bars.length; i++) {
    var b = bars[i];
    var v = 0.06 + Math.abs(Math.sin(t * 2.1 + b.userData.seed + i * 0.55)) * amp;
    b.scale.y = v;
  }
}
function dustPoints(n, spread, size, opacity) {
  var pos = new Float32Array(n * 3);
  for (var i = 0; i < n * 3; i++) pos[i] = (Math.random() - 0.5) * spread;
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  var mat = new THREE.PointsMaterial({
    color: 0xe8d3a8, size: size || 0.03, transparent: true,
    opacity: opacity != null ? opacity : 0.4, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true
  });
  mat.userData.op = mat.opacity;
  return new THREE.Points(geo, mat);
}
function makeBook(scale) {
  var g = new THREE.Group();
  var W = 2.1, H = 2.9, D = 0.42;
  var pages = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, H - 0.12, D * 0.82),
    stdMat({ color: 0xf6efe1, roughness: 0.9 }));
  pages.position.z = 0;
  g.add(pages);
  var back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.07),
    stdMat({ color: 0xe8dcc4, roughness: 0.75 }));
  back.position.z = -D / 2;
  g.add(back);
  var spine = new THREE.Mesh(new THREE.BoxGeometry(0.1, H, D + 0.07),
    stdMat({ color: 0xdccdb0, roughness: 0.75 }));
  spine.position.x = -W / 2 - 0.02;
  g.add(spine);
  var front = new THREE.Group();
  front.position.set(-W / 2, 0, D / 2);
  var coverMat = stdMat({ color: 0xffffff, roughness: 0.72, map: coverTex() });
  var cover = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.07),
    [stdMat({ color: 0xe4d7bd }), stdMat({ color: 0xe4d7bd }), stdMat({ color: 0xe4d7bd }),
     stdMat({ color: 0xe4d7bd }), coverMat, stdMat({ color: 0xf1e8d5 })]);
  cover.position.x = W / 2;
  front.add(cover);
  g.add(front);
  var innerTex = paperTex(true);
  var innerPage = plane(W - 0.16, H - 0.2, basicMat({ map: innerTex }));
  innerPage.position.z = D * 0.41 + 0.002;
  g.add(innerPage);
  g.userData.front = front;
  g.userData.innerPage = innerPage;
  g.scale.setScalar(scale || 1);
  return g;
}
function makeFigure() {
  var g = new THREE.Group();
  var mat = stdMat({ color: 0x0d0906, roughness: 0.95 });
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 22, 18), mat);
  head.position.y = 1.62;
  var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.31, 0.95, 22), mat);
  torso.position.y = 0.98;
  var skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.5, 0.62, 22), mat);
  skirt.position.y = 0.31;
  g.add(head, torso, skirt);
  return g;
}
function makeScreen(w, h, map) {
  var g = new THREE.Group();
  var frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.09),
    stdMat({ color: 0x181009, roughness: 0.6, metalness: 0.25 }));
  g.add(frame);
  var face = plane(w, h, basicMat({ map: map, opacity: 1 }));
  face.position.z = 0.05;
  g.add(face);
  var glow = glowSprite(Math.max(w, h) * 2.4, 0);
  glow.position.z = 0.1;
  g.add(glow);
  g.userData.face = face; g.userData.glow = glow;
  return g;
}
function makeFilmCamera() {
  var g = new THREE.Group();
  var dark = stdMat({ color: 0x17110b, roughness: 0.55, metalness: 0.35 });
  var goldm = stdMat({ color: PAL.gold, roughness: 0.35, metalness: 0.7 });
  var bodyM = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.5), dark);
  bodyM.position.y = 1.25;
  var lens = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.5, 24), dark.clone());
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 1.25, 0.48);
  var ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 10, 30), goldm);
  ring.position.set(0, 1.25, 0.72);
  var reelA = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 26), dark.clone());
  reelA.rotation.z = Math.PI / 2;
  reelA.position.set(0.02, 1.78, -0.12);
  var reelB = reelA.clone();
  reelB.position.z = 0.14;
  g.add(bodyM, lens, ring, reelA, reelB);
  for (var i = 0; i < 3; i++) {
    var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.3, 8), dark.clone());
    var a = i * Math.PI * 2 / 3 + 0.5;
    leg.position.set(Math.cos(a) * 0.3, 0.55, Math.sin(a) * 0.3);
    leg.rotation.z = Math.cos(a) * 0.42;
    leg.rotation.x = -Math.sin(a) * 0.42;
    g.add(leg);
  }
  return g;
}
function makeSoftbox() {
  var g = new THREE.Group();
  var dark = stdMat({ color: 0x17110b, roughness: 0.6, metalness: 0.3 });
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.3, 8), dark);
  pole.position.y = 1.15;
  var panel = plane(0.85, 0.62, basicMat({ color: 0xfff2d8, opacity: 0.95 }));
  panel.position.y = 2.15;
  var glow = glowSprite(2.2, 0.5);
  glow.position.y = 2.15;
  g.add(pole, panel, glow);
  g.userData.panel = panel; g.userData.glow = glow;
  return g;
}

/* fade a whole group (cached material list) */
function collectMats(g) {
  var mats = [];
  g.traverse(function (o) {
    if (o.material) {
      var list = Array.isArray(o.material) ? o.material : [o.material];
      list.forEach(function (m) {
        if (m.userData.op == null) m.userData.op = m.opacity != null ? m.opacity : 1;
        if (m.userData.dw == null) m.userData.dw = m.depthWrite;
        m.transparent = true;
        mats.push(m);
      });
    }
  });
  g.userData.mats = mats;
}
function fadeGroup(g, f) {
  var mats = g.userData.mats;
  if (!mats) { collectMats(g); mats = g.userData.mats; }
  for (var i = 0; i < mats.length; i++) {
    var m = mats[i];
    m.opacity = m.userData.op * f;
    // ausgeblendete Objekte dürfen keine Löcher in den Tiefenpuffer schreiben
    m.depthWrite = m.userData.dw && m.opacity > 0.06;
  }
}

/* ---------------- chapters ---------------- */
var chapters = {};
function chapter(name, build) {
  var g = new THREE.Group();
  g.visible = false;
  scene.add(g);
  chapters[name] = { group: g, update: build(g) };
}

/* scale scene for narrow screens */
var WORLD = new THREE.Group();
scene.add(WORLD);
function addToWorld(g) { scene.remove(g); WORLD.add(g); }

/* ====== 01 · HERO — aus Fragmenten wird ein Film ====== */
function buildHero(g) {
  var photo = plane(1.5, 1.9, basicMat({ map: photoTex('#caa273', '#8a6a45', '#3c2a18'), side: THREE.DoubleSide }));
  var film = plane(2.5, 0.82, basicMat({ map: filmTex(), side: THREE.DoubleSide }));
  var wave = waveGroup(26, 2.1, PAL.gold);
  var word = textPlane('Deine Geschichte', { italic: true, h: 0.42, color: '#efe6d2' });
  var beam = beamCone(7, 2.4, 0.1);
  beam.position.y = 3.2;
  var masterGlow = glowSprite(5, 0);
  var master = plane(3.05, 1.75, basicMat({ map: cinemaTex(true), opacity: 0 }));
  var dust = dustPoints(MOBILE ? 60 : 140, 12, 0.035, 0.35);
  g.add(photo, film, wave, word, beam, masterGlow, master, dust);

  var scatter = {
    photo: [-3.4, 1.25, -1.6, 0.3, -0.35],
    film: [3.2, 0.9, -2.6, -0.15, 0.3],
    wave: [-2.9, -1.5, -1.0, 0.1, 0.25],
    word: [2.8, -1.35, -0.6, -0.08, -0.22]
  };
  var gather = { photo: [-0.0, 0.05, -0.55], film: [0, -0.02, -0.3], wave: [0, -0.6, 0.15], word: [0, 0.62, 0.15] };

  function place(mesh, s, e, k, t, idle) {
    mesh.position.set(
      lerp(s[0], e[0], k) + Math.sin(t * 0.7 + s[0]) * 0.06 * idle,
      lerp(s[1], e[1], k) + Math.cos(t * 0.6 + s[1]) * 0.07 * idle,
      lerp(s[2], e[2], k)
    );
    mesh.rotation.y = lerp(s[3] || 0, 0, k);
    mesh.rotation.z = lerp(s[4] || 0, 0, k);
  }

  collectMats(g);
  return function (p, t) {
    var fade = 1 - ez(rng(p, 0.8, 0.98));
    fadeGroup(g, fade);
    var k = ez(rng(p, 0.05, 0.52));
    var idle = 1 - k;
    place(photo, scatter.photo, gather.photo, k, t, idle);
    place(film, scatter.film, gather.film, k, t, idle);
    place(wave, scatter.wave, gather.wave, k, t, idle);
    place(word, scatter.word, gather.word, k, t, idle);
    animateWave(wave, t, 0.5 - k * 0.25);
    beam.material.opacity = (0.05 + Math.sin(t * 0.8) * 0.015 + k * 0.08) * fade;
    beam.scale.x = beam.scale.z = 1 + Math.sin(t * 0.5) * 0.05;

    var born = ez(rng(p, 0.45, 0.62));
    master.material.opacity = born * fade;
    masterGlow.material.opacity = born * 0.75 * fade;
    master.scale.setScalar(0.92 + born * 0.08);
    // shrink fragments into the born film
    var absorb = ez(rng(p, 0.5, 0.66));
    [photo, film, wave, word].forEach(function (m) {
      m.scale.setScalar(1 - absorb * 0.65);
    });
    // camera flies through the media
    g.position.z = ezIn(rng(p, 0.58, 1)) * 9;
    g.rotation.y = Math.sin(t * 0.15) * 0.02;
  };
}

/* ====== 02 · PROBLEM — Smartphone → Markenwelt ====== */
function buildProblem(g) {
  var phone = new THREE.Group();
  var pbody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.0, 0.13),
    stdMat({ color: 0x2d261e, roughness: 0.45, metalness: 0.4 }));
  var screen = plane(1.36, 2.86, basicMat({ map: feedTex() }));
  screen.position.z = 0.072;
  phone.add(pbody, screen);
  phone.position.set(0, -0.1, 0);
  g.add(phone);

  var tiles = [];
  var tileGroup = new THREE.Group();
  g.add(tileGroup);
  var N = 9;
  for (var i = 0; i < N; i++) {
    var tp = plane(0.44, 0.44, basicMat({ map: tileTex(i), side: THREE.DoubleSide }));
    var col = i % 3, row = Math.floor(i / 3);
    tp.userData.grid = [(col - 1) * 0.46, 0.55 - row * 0.46 - 0.35, 0.1];
    tp.userData.scatter = [
      (Math.random() - 0.5) * 7.5,
      (Math.random() - 0.5) * 4.2,
      0.6 + Math.random() * 1.6,
      (Math.random() - 0.5) * 1.4
    ];
    tiles.push(tp);
    tileGroup.add(tp);
  }
  // final elegant wall around a brand board
  var finals = [
    [-2.55, 0.85, 0, 0.8], [-1.75, -0.75, 0, 0.62], [-2.9, -0.35, 0, 0.5],
    [2.55, 0.8, 0, 0.66], [1.8, -0.85, 0, 0.8], [2.95, -0.15, 0, 0.5],
    [-1.9, 1.25, 0, 0.45], [2.2, 1.4, 0, 0.45], [0, -1.55, 0, 0.55]
  ];
  var board = plane(2.9, 1.7, basicMat({ map: brandTex(), opacity: 0 }));
  board.position.set(0, 0.25, -0.1);
  var boardGlow = glowSprite(5.4, 0);
  boardGlow.position.copy(board.position);
  g.add(board, boardGlow);
  g.position.x = 1.45; // Telefon rechts neben dem Text (Desktop)

  collectMats(g);
  return function (p, t) {
    var aspect = window.innerWidth / window.innerHeight;
    g.position.x = aspect < 1.1 ? 0 : 1.45;
    var gf = 1 - ez(rng(p, 0.88, 1));
    fadeGroup(g, gf);
    var intro = ez(rng(p, 0, 0.16));
    phone.position.y = lerp(-2.6, -0.1, intro) + Math.sin(t * 0.8) * 0.03;
    phone.rotation.y = lerp(-0.7, -0.12, intro) + Math.sin(t * 0.5) * 0.02;
    phone.rotation.x = lerp(0.2, 0.02, intro);

    var out = ez(rng(p, 0.24, 0.5));      // tiles escape the phone
    var order = ez(rng(p, 0.5, 0.8));     // and find structure
    for (var i = 0; i < tiles.length; i++) {
      var tp = tiles[i], gd = tp.userData.grid, sc = tp.userData.scatter, fi = finals[i];
      var x1 = lerp(gd[0] + phone.position.x, sc[0], out);
      var y1 = lerp(gd[1] + phone.position.y + 0.4, sc[1], out);
      var z1 = lerp(gd[2], sc[2], out);
      tp.position.set(lerp(x1, fi[0], order), lerp(y1, fi[1], order), lerp(z1, fi[2] + 0.15, order));
      tp.rotation.z = lerp(sc[3] * out, 0, order);
      tp.rotation.y = Math.sin(t * 0.6 + i) * 0.05 * (1 - order);
      var s = lerp(lerp(1, 1.35, out), fi[3] * 2.2, order);
      tp.scale.setScalar(s);
      tp.material.opacity = tp.material.userData.op * (1 - order * (i === 8 ? 0.4 : 0.15)) * gf;
    }
    // phone recedes as the brand world appears
    var recede = ez(rng(p, 0.5, 0.78));
    phone.position.z = -recede * 2.4;
    phone.rotation.y = lerp(phone.rotation.y, 0, recede);
    pbody.material.opacity = pbody.material.userData.op * (1 - recede * 0.85) * gf;
    screen.material.opacity = screen.material.userData.op * (1 - recede * 0.85) * gf;
    board.material.opacity = order * gf;
    boardGlow.material.opacity = order * 0.45 * gf;
    board.position.y = 0.25 + Math.sin(t * 0.7) * 0.02;
    g.position.z = ez(rng(p, 0.86, 1)) * 2.2;
  };
}

/* ====== 03 · PRESENCE — aus unsichtbar wird präsent ====== */
function buildPresence(g) {
  var floor = plane(26, 26, basicMat({ color: 0x0c0805, opacity: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.7;
  var figure = makeFigure();
  figure.position.y = -1.7;
  figure.scale.setScalar(1.35);
  var spot = new THREE.SpotLight(0xffe6b8, 0, 22, 0.5, 0.55, 1.4);
  spot.position.set(0, 6.4, 1.2);
  spot.target = figure;
  g.add(spot);
  var beam = beamCone(8.2, 2.5, 0.14);
  beam.position.y = 2.4;
  var baseGlow = glowSprite(4.6, 0);
  baseGlow.rotation.x = -Math.PI / 2;
  baseGlow.position.y = -1.66;
  var rimL = beamCone(6, 1.2, 0.07); rimL.position.set(-2.6, 1.6, -1.2); rimL.rotation.z = 0.3;
  var rimR = beamCone(6, 1.2, 0.07); rimR.position.set(2.6, 1.6, -1.2); rimR.rotation.z = -0.3;
  g.add(floor, figure, beam, baseGlow, rimL, rimR);

  var frames = [];
  var palettes = [
    ['#d8b98a', '#9a7c52', '#4a3520'], ['#e6d6ba', '#b39a6e', '#5c4426'],
    ['#c2a377', '#7e6440', '#38270f'], ['#e0c99f', '#a8895c', '#4e3a1e'],
    ['#cdb18a', '#8f7448', '#3f2d15'], ['#e8dcc2', '#bfa678', '#63481f']
  ];
  for (var i = 0; i < 6; i++) {
    var pal = palettes[i] || palettes[0];
    var f = plane(1.05, 1.35, basicMat({
      map: photoTex(pal[0] || '#d8b98a', pal[1] || '#9a7c52', pal[2] || '#4a3520'),
      side: THREE.DoubleSide, opacity: 0
    }));
    var a = -1.3 + i * 0.52;
    f.userData.pos = [Math.sin(a) * 3.3, 0.35 + (i % 3) * 0.75 - 0.4, -1.4 - Math.cos(a) * 1.2];
    f.userData.rot = -Math.sin(a) * 0.5;
    f.userData.delay = i * 0.055;
    f.position.set(f.userData.pos[0], f.userData.pos[1] - 0.9, f.userData.pos[2]);
    frames.push(f);
    g.add(f);
  }
  collectMats(g);
  return function (p, t) {
    var fade = Math.min(ez(rng(p, 0, 0.08)) + 0.35, 1) * (1 - ez(rng(p, 0.88, 1)));
    fadeGroup(g, fade);
    var on = ez(rng(p, 0.06, 0.3));         // Spotlight geht an
    spot.intensity = on * 2.6 * (1 - ez(rng(p, 0.9, 1)));
    beam.material.opacity = on * 0.11 * (1 + Math.sin(t * 1.4) * 0.08) * fade;
    baseGlow.material.opacity = on * 0.6 * fade;
    var rims = ez(rng(p, 0.28, 0.46));
    rimL.material.opacity = rims * 0.06 * fade;
    rimR.material.opacity = rims * 0.06 * fade;
    for (var i = 0; i < frames.length; i++) {
      var f = frames[i];
      var k = ez(rng(p, 0.38 + f.userData.delay, 0.58 + f.userData.delay));
      f.material.opacity = k * 0.95 * fade;
      f.position.y = lerp(f.userData.pos[1] - 0.9, f.userData.pos[1], k) + Math.sin(t * 0.7 + i) * 0.05;
      f.rotation.y = f.userData.rot + Math.sin(t * 0.4 + i * 2) * 0.04;
    }
    figure.rotation.y = Math.sin(t * 0.3) * 0.08;
    // Kamera kommt langsam näher: aus unsichtbar wird präsent
    g.position.z = ez(rng(p, 0.12, 0.85)) * 2.6;
    g.position.y = ez(rng(p, 0.12, 0.85)) * 0.5;
  };
}

/* ====== 04 · BOOK — Your Story ====== */
function buildBook(g) {
  var book = makeBook(1);
  g.add(book);
  var glow = glowSprite(7, 0);
  glow.position.z = 0.5;
  g.add(glow);
  var dust = dustPoints(MOBILE ? 40 : 90, 10, 0.03, 0.3);
  g.add(dust);
  collectMats(g);
  return function (p, t) {
    var out = ez(rng(p, 0.94, 1));
    fadeGroup(g, 1 - out * 0.7);
    var intro = ez(rng(p, 0, 0.3));
    book.position.y = lerp(-2.4, 0.1, intro) + Math.sin(t * 0.7) * 0.05;
    book.rotation.y = lerp(0.9, 0.18, intro) + Math.sin(t * 0.4) * 0.02;
    book.rotation.x = lerp(-0.25, -0.05, intro);
    var open = ez(rng(p, 0.36, 0.82));
    book.userData.front.rotation.y = -open * 2.65;
    // die Website zieht den Besucher ins Buch hinein
    var into = ezIn(rng(p, 0.6, 1));
    book.scale.setScalar(1 + into * 3.4);
    book.position.z = into * 5.2;
    book.position.x = into * 0.9;
    glow.material.opacity = ez(rng(p, 0.7, 1)) * 0.95 * (1 - out * 0.7);
    glow.scale.setScalar(7 + into * 10);
  };
}

/* ====== 05 · STORY — zwischen den Seiten ====== */
function buildStory(g) {
  var pageL = plane(4.6, 5.4, basicMat({ map: paperTex(true), color: 0xe8dcc2, side: THREE.DoubleSide }));
  pageL.position.set(-2.9, 0, -1.4);
  pageL.rotation.y = 0.65;
  var pageR = plane(4.6, 5.4, basicMat({ map: paperTex(false), color: 0xe8dcc2, side: THREE.DoubleSide }));
  pageR.position.set(2.9, 0, -1.4);
  pageR.rotation.y = -0.65;
  g.add(pageL, pageR);

  // altes Foto → lebendige Filmszene
  var oldPhoto = plane(1.35, 1.7, basicMat({ map: photoTex('#b9a586', '#8a7255', '#4c3a24') }));
  oldPhoto.position.set(-1.9, 0.35, -0.9);
  oldPhoto.rotation.y = 0.4;
  var scenePlane = plane(2.4, 1.35, basicMat({ map: cinemaTex(false), opacity: 0 }));
  scenePlane.position.set(-1.4, 0.35, -0.5);
  g.add(oldPhoto, scenePlane);

  // WARUM? — Buchstaben schweben aus dem Papier
  var letters = [];
  var word = 'Warum?';
  var lg = new THREE.Group();
  for (var i = 0; i < word.length; i++) {
    var lp = textPlane(word[i], { italic: true, h: 0.72, color: '#3a2c1a' });
    lp.position.x = (i - (word.length - 1) / 2) * 0.42;
    lp.userData.i = i;
    letters.push(lp);
    lg.add(lp);
  }
  lg.position.set(1.9, 0.45, -0.8);
  lg.rotation.y = -0.35;
  g.add(lg);

  // Wellenform → Stimme
  var wave = waveGroup(30, 2.0, 0x8a6f42);
  wave.position.set(1.7, -1.15, -0.6);
  wave.rotation.y = -0.3;
  g.add(wave);
  var waveGlow = glowSprite(2.6, 0);
  waveGlow.position.copy(wave.position);
  g.add(waveGlow);

  // das große Filmfenster am Ende
  var filmScreen = makeScreen(3.3, 1.85, cinemaTex(true));
  filmScreen.position.set(0, 0.15, -2.6);
  g.add(filmScreen);

  collectMats(g);
  return function (p, t) {
    var out = ez(rng(p, 0.92, 1));
    var pf = 1 - out * 0.8;
    pageL.material.opacity = pageL.material.userData.op * pf;
    pageR.material.opacity = pageR.material.userData.op * pf;
    // Foto löst sich von der Seite und wird Film
    var lift = ez(rng(p, 0.05, 0.28));
    oldPhoto.position.z = -0.9 + lift * 1.1;
    oldPhoto.position.x = -1.9 + lift * 0.4;
    oldPhoto.rotation.y = 0.4 - lift * 0.4;
    oldPhoto.rotation.z = Math.sin(t * 0.6) * 0.03 * (1 - lift);
    var toScene = ez(rng(p, 0.2, 0.38));
    oldPhoto.material.opacity = oldPhoto.material.userData.op * (1 - toScene);
    scenePlane.material.opacity = toScene * (1 - ez(rng(p, 0.55, 0.72)));
    scenePlane.position.z = -0.5 + toScene * 0.4;
    scenePlane.scale.setScalar(0.9 + toScene * 0.25);

    // Buchstaben schweben aus dem Papier
    for (var i = 0; i < letters.length; i++) {
      var lp = letters[i];
      var k = ez(rng(p, 0.28 + i * 0.02, 0.48 + i * 0.02));
      lp.position.z = k * (0.7 + i * 0.12);
      lp.position.y = k * (0.25 + Math.sin(i * 2.2) * 0.22) + Math.sin(t * 0.8 + i) * 0.03 * k;
      lp.rotation.y = -k * 0.2 + Math.sin(t * 0.5 + i * 1.3) * 0.06 * k;
      lp.material.opacity = (0.6 + k * 0.4) * (1 - ez(rng(p, 0.58, 0.75)));
    }

    // Stimme
    var voice = ez(rng(p, 0.42, 0.6));
    animateWave(wave, t, 0.25 + voice * 0.85);
    waveGlow.material.opacity = voice * 0.5 * (1 - ez(rng(p, 0.6, 0.78)));
    wave.position.y = -1.15 + voice * 0.3;

    // Buchseiten öffnen sich zur Leinwand
    var wide = ez(rng(p, 0.5, 0.78));
    pageL.rotation.y = 0.65 + wide * 0.5;
    pageR.rotation.y = -0.65 - wide * 0.5;
    pageL.position.x = -2.9 - wide * 1.6;
    pageR.position.x = 2.9 + wide * 1.6;
    var filmIn = ez(rng(p, 0.55, 0.8));
    fadeGroup(filmScreen, filmIn * pf);
    filmScreen.userData.glow.material.opacity = filmIn * 0.7 * pf;
    filmScreen.position.z = -2.6 + filmIn * 0.9;
    filmScreen.position.y = 0.15 + Math.sin(t * 0.6) * 0.02;

    g.position.z = ez(rng(p, 0.05, 0.9)) * 1.6;
  };
}

/* ====== 06 · ACTION — Buch wird Monitor ====== */
function buildAction(g) {
  var book = makeBook(0.8);
  book.userData.front.rotation.y = -2.65;
  book.rotation.y = 0.15;
  g.add(book);
  var monitor = makeScreen(2.9, 1.7, cinemaTex(false));
  monitor.position.y = 0.25;
  var stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.3, 1.4, 14),
    stdMat({ color: 0x171009, roughness: 0.6, metalness: 0.3 }));
  stand.position.y = -1.2;
  monitor.add(stand);
  var rec = glowSprite(0.5, 0);
  rec.material.color = new THREE.Color(0xff5a3c);
  rec.position.set(1.25, 1.02, 0.12);
  monitor.add(rec);
  g.add(monitor);
  collectMats(g);
  fadeGroup(monitor, 0);
  return function (p, t) {
    var close = ez(rng(p, 0.05, 0.32));
    book.userData.front.rotation.y = -2.65 * (1 - close);
    book.rotation.y = 0.15 + close * 0.5;
    book.position.y = Math.sin(t * 0.7) * 0.04;
    var swap = ez(rng(p, 0.3, 0.5));
    fadeGroup(book, (1 - swap));
    book.scale.setScalar(0.8 * (1 - swap * 0.35));
    fadeGroup(monitor, swap);
    monitor.position.z = lerp(-1.4, 0.3, ez(swap));
    // Screen-Flackern beim Countdown, Flash bei ACTION
    var flicker = 0.75 + Math.sin(t * 22) * 0.05 * ez(rng(p, 0.36, 0.76));
    monitor.userData.face.material.opacity = swap * flicker;
    rec.material.opacity = swap * (0.4 + Math.abs(Math.sin(t * 2.4)) * 0.6);
    var flash = ez(rng(p, 0.78, 0.86)) * (1 - ez(rng(p, 0.9, 1)) * 0.6);
    monitor.userData.glow.material.opacity = swap * 0.25 + flash * 0.9;
  };
}

/* ====== 07 · IMPACT — das virtuelle Filmstudio ====== */
function buildImpact(g) {
  var floor = plane(30, 30, basicMat({ color: 0x0a0705 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.75;
  g.add(floor);
  var grid = new THREE.GridHelper(24, 24, 0x33261a, 0x211812);
  grid.position.y = -1.74;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  grid.material.userData = { op: 0.35 };
  g.add(grid);

  var screen = makeScreen(3.6, 2.02, cinemaTex(true));
  screen.position.set(0, 0.4, -2.8);
  g.add(screen);

  var cam = makeFilmCamera();
  cam.position.set(-2.7, -1.75, 0.4);
  cam.rotation.y = 0.5;
  g.add(cam);

  var boxA = makeSoftbox(); boxA.position.set(2.7, -1.75, -0.4); g.add(boxA);
  var boxB = makeSoftbox(); boxB.position.set(-3.4, -1.75, -1.6); boxB.scale.setScalar(0.85); g.add(boxB);

  // Notizen (IDEA)
  var notes = new THREE.Group();
  for (var i = 0; i < 5; i++) {
    var n = plane(0.5, 0.36, basicMat({ map: paperTex(true), side: THREE.DoubleSide }));
    n.position.set(-1.6 + i * 0.75 + (i % 2) * 0.1, 0.9 + (i % 3) * 0.4, 0.6);
    n.rotation.z = (Math.random() - 0.5) * 0.3;
    notes.add(n);
  }
  g.add(notes);

  // Verbindungen (STORY)
  var lineGeo = new THREE.BufferGeometry();
  var linePts = [];
  var anchor = [[-1.6, 0.9, 0.6], [-0.8, 1.7, 0.6], [0.2, 1.0, 0.6], [1.1, 1.6, 0.6], [1.9, 1.0, 0.6]];
  for (var li = 0; li < anchor.length - 1; li++) { linePts.push.apply(linePts, anchor[li]); linePts.push.apply(linePts, anchor[li + 1]); }
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePts, 3));
  var lineMat = new THREE.LineBasicMaterial({ color: PAL.gold, transparent: true, opacity: 0 });
  lineMat.userData = { op: 0.7 };
  var lines = new THREE.LineSegments(lineGeo, lineMat);
  g.add(lines);

  // VISUALS frames
  var vframes = [];
  for (var vi = 0; vi < 3; vi++) {
    var vf = plane(1.15, 0.66, basicMat({ map: photoTex('#d3b184', '#93764c', '#402d18'), opacity: 0 }));
    vf.position.set(-1.5 + vi * 1.5, 0.35, -0.7);
    vframes.push(vf);
    g.add(vf);
  }

  // VOICE wave
  var wave = waveGroup(24, 1.9, PAL.gold);
  wave.position.set(0, -0.85, 0.4);
  g.add(wave);

  // EDIT timeline
  var timeline = new THREE.Group();
  var bar = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.03, 0.03), basicMat({ color: 0x6b563a }));
  timeline.add(bar);
  var clips = [];
  for (var ci = 0; ci < 9; ci++) {
    var clip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.05),
      basicMat({ color: ci % 3 === 0 ? PAL.gold : 0x8a744e, opacity: 0.9 }));
    clip.position.x = -2 + ci * 0.48;
    clip.position.y = 0.14;
    clips.push(clip);
    timeline.add(clip);
  }
  timeline.position.set(0, -1.35, 0.9);
  g.add(timeline);

  var dust = dustPoints(MOBILE ? 50 : 120, 14, 0.03, 0.3);
  g.add(dust);

  collectMats(g);
  return function (p, t) {
    var gf = 1 - ez(rng(p, 0.9, 1)) * 0.85;
    fadeGroup(g, gf);
    var w = function (a, b) { return ez(rng(p, a, b)); };
    // Stationen des Films
    var idea = w(0.03, 0.12), story = w(0.16, 0.26), visuals = w(0.29, 0.4),
        voice = w(0.42, 0.53), edit = w(0.55, 0.66), impact = w(0.68, 0.8);

    notes.children.forEach(function (n, i) {
      n.material.opacity = idea * 0.9 * (1 - impact * 0.75) * gf;
      n.position.y = 0.9 + (i % 3) * 0.4 + idea * 0.15 + Math.sin(t + i) * 0.03;
    });
    lineMat.opacity = story * 0.7 * (1 - impact * 0.8) * gf;
    vframes.forEach(function (vf, i) {
      var k = ez(rng(p, 0.29 + i * 0.03, 0.4 + i * 0.03));
      vf.material.opacity = k * (1 - impact * 0.7) * gf;
      vf.position.y = 0.35 + k * 0.2;
    });
    animateWave(wave, t, voice * 0.7 + 0.05);
    wave.userData.bars.forEach(function (b) { b.material.opacity = voice * 0.9 * (1 - impact * 0.7) * gf; });
    clips.forEach(function (c, i) {
      var k = ez(rng(p, 0.55 + i * 0.012, 0.62 + i * 0.012));
      c.scale.y = Math.max(k, 0.001);
      c.material.opacity = k * 0.95 * (1 - impact * 0.6) * gf;
    });
    bar.material.opacity = edit * 0.9 * (1 - impact * 0.6) * gf;

    // Licht-Setup lebt
    boxA.userData.glow.material.opacity = (0.25 + voice * 0.3) * (1 - impact * 0.4) * gf;
    boxB.userData.glow.material.opacity = (0.2 + edit * 0.3) * (1 - impact * 0.4) * gf;
    cam.rotation.y = 0.5 + Math.sin(t * 0.3) * 0.05;

    // IMPACT: alles verschmilzt zum fertigen Spot auf dem großen Screen
    screen.userData.face.material.opacity = (0.25 + impact * 0.75) * gf;
    screen.userData.glow.material.opacity = (impact * 0.85 + Math.sin(t * 1.2) * 0.04 * impact) * gf;
    screen.position.z = -2.8 + impact * 1.1;
    screen.scale.setScalar(1 + impact * 0.18);

    // Kamerafahrt durch das Studio
    var pan = ez(rng(p, 0.05, 0.68));
    g.position.x = Math.sin(pan * Math.PI) * -1.1;
    g.position.z = ez(rng(p, 0.05, 0.8)) * 1.8;
    g.rotation.y = Math.sin(pan * Math.PI) * 0.1;
  };
}

/* ====== 08 · PROZESS — der Produktionsweg ====== */
function buildProcess(g) {
  var stations = [];
  var SPACING = 7;
  function station(z, buildFn) {
    var s = new THREE.Group();
    s.position.z = -z * SPACING - 2;
    buildFn(s);
    stations.push(s);
    g.add(s);
  }
  // Pfadlichter
  var pathDots = new THREE.Group();
  for (var i = 0; i < 30; i++) {
    var d = glowSprite(0.35, 0.5);
    d.position.set((i % 2 === 0 ? -1 : 1) * 1.9, -1.5, -i * 1.3 - 1);
    pathDots.add(d);
  }
  g.add(pathDots);

  // 01 STRATEGIE — Notizen füllen den leeren Raum
  station(0, function (s) {
    for (var i = 0; i < 6; i++) {
      var n = plane(0.55, 0.4, basicMat({ map: paperTex(true), side: THREE.DoubleSide }));
      n.position.set(-1.3 + (i % 3) * 1.3, 0.8 - Math.floor(i / 3) * 1.1, 0);
      n.rotation.z = (i % 2 ? 1 : -1) * 0.08;
      n.userData.i = i;
      s.add(n);
    }
  });
  // 02 STORY — Elemente verbinden sich
  station(1, function (s) {
    var pts = [];
    var nodes = [];
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * Math.PI * 2;
      var node = glowSprite(0.5, 0.8);
      node.position.set(Math.cos(a) * 1.5, Math.sin(a) * 1.0, 0);
      nodes.push(node.position);
      s.add(node);
    }
    for (var j = 0; j < nodes.length; j++) {
      var nA = nodes[j], nB = nodes[(j + 2) % nodes.length];
      pts.push(nA.x, nA.y, nA.z, nB.x, nB.y, nB.z);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    var lm = new THREE.LineBasicMaterial({ color: PAL.gold, transparent: true, opacity: 0.5 });
    lm.userData = { op: 0.5 };
    s.add(new THREE.LineSegments(geo, lm));
  });
  // 03 CREATION — Bilder werden cineastisch
  station(2, function (s) {
    for (var i = 0; i < 3; i++) {
      var f = plane(1.5, 0.85, basicMat({ map: cinemaTex(i === 1), side: THREE.DoubleSide }));
      f.position.set(-1.7 + i * 1.7, 0.1 + (i % 2) * 0.5, 0);
      f.rotation.y = (1 - i) * 0.25;
      s.add(f);
    }
  });
  // 04 PRODUCTION — Timeline
  station(3, function (s) {
    var bar = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.03, 0.03), basicMat({ color: 0x6b563a }));
    s.add(bar);
    for (var i = 0; i < 8; i++) {
      var c = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.05),
        basicMat({ color: i % 3 === 0 ? PAL.gold : 0x8a744e }));
      c.position.set(-1.6 + i * 0.44, 0.16, 0);
      s.add(c);
    }
    var camMini = makeFilmCamera();
    camMini.scale.setScalar(0.55);
    camMini.position.set(2.3, -1.5, 0.4);
    camMini.rotation.y = -0.5;
    s.add(camMini);
  });
  // 05 YOUR FILM — der große Screen
  var finalScreen;
  station(4, function (s) {
    finalScreen = makeScreen(3.4, 1.9, cinemaTex(true));
    finalScreen.position.y = 0.2;
    s.add(finalScreen);
    var beam = beamCone(6, 2.6, 0.1);
    beam.position.y = 2.6;
    s.add(beam);
  });

  collectMats(g);
  return function (p, t) {
    var gf = 1 - ez(rng(p, 0.94, 1)) * 0.8;
    // der Besucher bewegt sich den Produktionsweg entlang
    var travel = ez(rng(p, 0.08, 0.9));
    g.position.z = travel * (4 * SPACING + 3);
    for (var i = 0; i < stations.length; i++) {
      var s = stations[i];
      var worldZ = s.position.z + g.position.z;
      var near = 1 - clamp(Math.abs(worldZ - 1.5) / 4.6, 0, 1);
      fadeGroup(s, ez(near) * gf);
      s.rotation.y = Math.sin(t * 0.25 + i) * 0.03;
    }
    finalScreen.userData.glow.material.opacity = ez(rng(p, 0.78, 0.92)) * 0.8 * gf;
    pathDots.children.forEach(function (d, i) {
      d.material.opacity = (0.25 + Math.abs(Math.sin(t * 1.4 + i * 0.6)) * 0.3) * gf;
    });
  };
}

/* ====== 09 · COMPARE — drei Objekte, drei Wege ====== */
var compareItems = [];
function buildCompare(g) {
  function pedestal(x) {
    var wrap = new THREE.Group();
    wrap.position.x = x;
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.09, 40),
      stdMat({ color: 0x241a10, roughness: 0.5, metalness: 0.3 }));
    disc.position.y = -1.15;
    var ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.012, 8, 60),
      basicMat({ color: PAL.gold, opacity: 0 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.09;
    wrap.add(disc, ring);
    wrap.userData.ring = ring;
    g.add(wrap);
    return wrap;
  }
  var gap = MOBILE ? 2.4 : 3.3;

  // PRESENCE: Licht
  var pres = pedestal(-gap);
  var pFig = makeFigure(); pFig.scale.setScalar(0.62); pFig.position.y = -1.12; pres.add(pFig);
  var pBeam = beamCone(3.4, 1.05, 0.16); pBeam.position.y = 0.6; pres.add(pBeam);
  var pGlow = glowSprite(2.2, 0.55); pGlow.position.y = -1; pres.add(pGlow);

  // STORY: das geöffnete Buch
  var stor = pedestal(0);
  var sBook = makeBook(0.52);
  sBook.userData.front.rotation.y = -2.5;
  sBook.position.y = -0.1;
  sBook.rotation.x = -0.12;
  stor.add(sBook);

  // IMPACT: Kamera + Screen
  var imp = pedestal(gap);
  var iCam = makeFilmCamera(); iCam.scale.setScalar(0.5); iCam.position.set(-0.45, -1.12, 0.35); iCam.rotation.y = 0.6; imp.add(iCam);
  var iScreen = makeScreen(1.5, 0.86, cinemaTex(true)); iScreen.position.set(0.35, -0.05, -0.3); iScreen.userData.glow.material.opacity = 0.3; imp.add(iScreen);

  compareItems = [
    { wrap: pres, pkg: 'presence', base: -gap },
    { wrap: stor, pkg: 'story', base: 0 },
    { wrap: imp, pkg: 'impact', base: gap }
  ];
  collectMats(g);
  return function (p, t) {
    for (var i = 0; i < compareItems.length; i++) {
      var it = compareItems[i];
      var target = it.hot ? 1.1 : 1;
      it.scale = lerp(it.scale || 1, target, 0.12);
      it.wrap.scale.setScalar(it.scale);
      it.wrap.rotation.y = Math.sin(t * 0.3 + i * 2.1) * 0.14 + (it.hot ? Math.sin(t * 0.9) * 0.06 : 0);
      it.wrap.position.y = Math.sin(t * 0.6 + i) * 0.05;
      it.wrap.userData.ring.material.opacity = lerp(it.wrap.userData.ring.material.opacity, it.hot ? 0.9 : 0, 0.15);
    }
    pBeam.material.opacity = 0.13 + Math.sin(t * 1.3) * 0.03;
  };
}

/* ====== 10 · FINALE — ein letzter Lichtstrahl ====== */
function buildFinale(g) {
  var beam = beamCone(9, 2.2, 0.13);
  beam.position.y = 3.4;
  var core = glowSprite(3, 0.4);
  var photo = plane(0.85, 1.05, basicMat({ map: photoTex('#caa273', '#8a6a45', '#3c2a18') }));
  var film = plane(1.3, 0.44, basicMat({ map: filmTex() }));
  var wave = waveGroup(18, 1.2, PAL.gold);
  var word = textPlane('Story', { italic: true, h: 0.4, color: '#e8dcc2' });
  var dust = dustPoints(MOBILE ? 60 : 150, 10, 0.03, 0.4);
  g.add(beam, core, photo, film, wave, word, dust);
  var starts = [[-3.1, 1.4, -1], [3.0, 1.0, -1.4], [-2.7, -1.4, -0.6], [2.7, -1.2, -0.8]];
  var els = [photo, film, wave, word];
  collectMats(g);
  return function (p, t) {
    var k = ez(rng(p, 0.08, 0.5));
    var absorb = ez(rng(p, 0.42, 0.58));
    for (var i = 0; i < els.length; i++) {
      var el = els[i], s = starts[i];
      el.position.set(
        lerp(s[0], 0, k) + Math.sin(t * 0.7 + i * 2) * 0.06 * (1 - k),
        lerp(s[1], 0.1, k) + Math.cos(t * 0.5 + i) * 0.06 * (1 - k),
        lerp(s[2], 0, k)
      );
      el.scale.setScalar(1 - absorb * 0.92);
      fadeGroup(el, 1 - absorb);
    }
    animateWave(wave, t, 0.35 * (1 - absorb));
    beam.material.opacity = 0.09 + k * 0.08 + Math.sin(t * 0.9) * 0.015;
    var flare = ez(rng(p, 0.46, 0.58)) * (1 - ez(rng(p, 0.62, 0.85)) * 0.55);
    core.material.opacity = 0.25 + flare * 0.75;
    core.scale.setScalar(3 + flare * 6);
    g.rotation.y = Math.sin(t * 0.12) * 0.03;
  };
}

/* ---------------- build all chapters ---------------- */
function buildAll() {
  chapter('hero', buildHero);
  chapter('problem', buildProblem);
  chapter('presence', buildPresence);
  chapter('book', buildBook);
  chapter('story', buildStory);
  chapter('action', buildAction);
  chapter('impact', buildImpact);
  chapter('process', buildProcess);
  chapter('compare', buildCompare);
  chapter('finale', buildFinale);
}

/* ---------------- compare interaction ---------------- */
var raycaster = new THREE.Raycaster();
var ndc = new THREE.Vector2();
var compareSection = document.getElementById('angebote');
var compareStage = document.querySelector('.compare-stage');
var cmpCards = Array.prototype.slice.call(document.querySelectorAll('.cmp-card'));

function compareActive() {
  var ch = chapters.compare;
  return ch && ch.group.visible;
}
window.addEventListener('pointermove', function (e) {
  if (!compareActive()) return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  var hitPkg = null;
  for (var i = 0; i < compareItems.length; i++) {
    var hits = raycaster.intersectObject(compareItems[i].wrap, true);
    if (hits.length) { hitPkg = compareItems[i].pkg; break; }
  }
  for (var j = 0; j < compareItems.length; j++) {
    compareItems[j].hot = compareItems[j].pkg === hitPkg;
  }
  cmpCards.forEach(function (cardEl) {
    cardEl.classList.toggle('hot', cardEl.dataset.pkg === hitPkg);
  });
  if (compareStage) compareStage.style.cursor = hitPkg ? 'pointer' : '';
}, { passive: true });

if (compareStage) {
  compareStage.style.pointerEvents = 'auto';
  compareStage.addEventListener('click', function (e) {
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    for (var i = 0; i < compareItems.length; i++) {
      if (raycaster.intersectObject(compareItems[i].wrap, true).length) {
        window.__openPkg(compareItems[i].pkg);
        return;
      }
    }
  });
}
cmpCards.forEach(function (cardEl) {
  cardEl.addEventListener('mouseenter', function () {
    compareItems.forEach(function (it) { it.hot = it.pkg === cardEl.dataset.pkg; });
  });
  cardEl.addEventListener('mouseleave', function () {
    compareItems.forEach(function (it) { it.hot = false; });
  });
});

/* ---------------- background & camera ---------------- */
var bgColor = new THREE.Color(BG.hero);
var bgTarget = new THREE.Color(BG.hero);

function updateWorldOffsetForCompare() {
  // richtet die 3D-Objekte am freien Bühnenbereich der Vergleichssektion aus
  var ch = chapters.compare;
  if (!ch || !ch.group.visible || !compareStage) return;
  var rect = compareStage.getBoundingClientRect();
  var cy = rect.top + rect.height / 2;
  var ndcY = -(cy / window.innerHeight) * 2 + 1;
  var halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  ch.group.position.y = ndcY * halfH;
}

/* ---------------- main loop ---------------- */
var clock = new THREE.Clock();
var running = true;
document.addEventListener('visibilitychange', function () {
  running = !document.hidden;
  if (running) tick(performance.now());
});

function tick(time) {
  if (!running) return;
  requestAnimationFrame(tick);
  if (lenis) lenis.raf(time);
  scrollY = window.pageYOffset;
  var t = clock.getElapsedTime();

  updatePhases();
  updateTheme();

  // chapter progress + visibility
  var centerName = 'hero';
  for (var i = 0; i < metrics.length; i++) {
    var m = metrics[i];
    var ch = chapters[m.name];
    if (!ch) continue;
    var visible = (m.top < scrollY + vh * 1.02) && (m.top + m.height > scrollY - vh * 0.12);
    ch.group.visible = visible;
    if (visible) {
      // schmale Screens: Szenen kompakter stellen, damit nichts seitlich verloren geht
      if (m.name !== 'process') {
        var aspect = window.innerWidth / window.innerHeight;
        ch.group.scale.setScalar(aspect < 0.85 ? 0.68 : 1);
      }
      ch.update(sectionProgress(m), t);
    }
    var center = scrollY + vh * 0.5;
    if (center >= m.top && center < m.top + m.height) centerName = m.name;
  }
  // Footer: Finale-Licht bleibt an
  if (scrollY + vh * 0.5 > metrics[metrics.length - 1].top + metrics[metrics.length - 1].height) {
    centerName = 'finale';
    chapters.finale.group.visible = true;
    chapters.finale.update(1, t);
  }

  bgTarget.setHex(BG[centerName] != null ? BG[centerName] : BG.hero);
  bgColor.lerp(bgTarget, 0.07);
  scene.background = bgColor;
  scene.fog.color.copy(bgColor);

  updateWorldOffsetForCompare();

  // sanfte Mausparallaxe — Tiefe, nie Ablenkung
  mouse.sx = lerp(mouse.sx, mouse.x, 0.04);
  mouse.sy = lerp(mouse.sy, mouse.y, 0.04);
  camera.position.x = mouse.sx * 0.28;
  camera.position.y = -mouse.sy * 0.2;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

/* ---------------- resize ---------------- */
var resizeTimer;
window.addEventListener('resize', function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.z = camDist();
    camera.updateProjectionMatrix();
    measure();
  }, 120);
});

/* ---------------- boot ---------------- */
function boot() {
  GLOW_TEX = glowTex();
  buildAll();
  measure();
  updatePhases();
  updateTheme();
  tick(performance.now());
  loader.classList.add('done');
}

var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
var fontLoads = document.fonts ? Promise.all([
  document.fonts.load("300 90px 'Cormorant Garamond'"),
  document.fonts.load("italic 300 90px 'Cormorant Garamond'"),
  document.fonts.load("300 20px 'Jost'")
]).catch(function () {}) : Promise.resolve();
var timeout = new Promise(function (res) { setTimeout(res, 2600); });

Promise.race([Promise.all([fontsReady, fontLoads]), timeout]).then(function () {
  requestAnimationFrame(boot);
});

})();
