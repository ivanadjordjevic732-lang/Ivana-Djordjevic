/* ═══════════════════════════════════════════════════════════════════════
   MODULE: MOTION GRAPHICS — premium vector graphics with draw-on animation.
   All graphics are resolution-independent (HD at any export size).
   ═══════════════════════════════════════════════════════════════════════ */
const G_CATS = { lines: 'Linien & Pfeile', marks: 'Marker', icons: 'Icons', frames: 'Rahmen & Papier', bubbles: 'Notizen & Blasen', sparks: 'Funken' };

function curvePts(fn, n = 64) { const a = []; for (let i = 0; i <= n; i++) a.push(fn(i / n)); return a; }
function bez(p0, p1, p2, p3) { return t => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; }; }
function wobble(pts, amt, seed) { const r = mulberry32(seed); let ox = 0, oy = 0; return pts.map(([x, y]) => { ox = ox * 0.8 + (r() - 0.5) * amt; oy = oy * 0.8 + (r() - 0.5) * amt; return [x + ox, y + oy]; }); }
function scalePts(pts, w, h, ox = 0, oy = 0) { return pts.map(([x, y]) => [ox + x * w, oy + y * h]); }
function headFor(pts, size) {
  const n = pts.length; const [x1, y1] = pts[n - 1]; const [x0, y0] = pts[Math.max(0, n - 4)];
  const a = Math.atan2(y1 - y0, x1 - x0);
  return [[[x1 - Math.cos(a - 0.5) * size, y1 - Math.sin(a - 0.5) * size], [x1, y1], [x1 - Math.cos(a + 0.5) * size, y1 - Math.sin(a + 0.5) * size]]];
}
function plen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
/** Draw polylines sequentially up to progress p (0..1) — hand-drawn "draw on". */
function drawStrokes(ctx, strokes, p) {
  const lens = strokes.map(plen); const total = lens.reduce((a, b) => a + b, 0) || 1;
  let remain = total * clamp(p, 0, 1);
  for (let s = 0; s < strokes.length && remain > 0; s++) {
    const pts = strokes[s]; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (seg >= remain) { const f = remain / (seg || 1); ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); remain = 0; break; }
      ctx.lineTo(pts[i][0], pts[i][1]); remain -= seg;
    }
    ctx.stroke();
  }
}
function sparklePath(ctx, cx, cy, r, k = 0.22) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4; const rr = i % 2 ? r * k : r; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.closePath();
}
function rrPath(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

const GRAPHICS = {
  'arrow-curve': { label: 'Geschwungener Pfeil', cat: 'lines', ar: 1.6, scale: 0.26, draw(ctx, w, h, p, el, seed) {
    const pts = wobble(scalePts(curvePts(bez([0.06, 0.78], [0.25, 0.05], [0.62, 0.02], [0.92, 0.42]), 80), w, h), Math.min(w, h) * 0.006, seed);
    drawStrokes(ctx, [pts], Math.min(1, p / 0.82)); if (p > 0.82) drawStrokes(ctx, headFor(pts, Math.min(w, h) * 0.2), (p - 0.82) / 0.18);
  } },
  'arrow-loop': { label: 'Pfeil mit Schleife', cat: 'lines', ar: 1.5, scale: 0.28, draw(ctx, w, h, p, el, seed) {
    const pts = scalePts(curvePts(t => { const x = 0.05 + t * 0.85; const loop = Math.exp(-Math.pow((t - 0.45) * 7, 2)); return [x + Math.sin(t * Math.PI * 2) * 0.1 * loop - loop * 0.05, 0.62 - Math.sin(t * Math.PI) * 0.18 - Math.cos(t * Math.PI * 2) * 0.22 * loop + t * 0.1]; }, 120), w, h);
    drawStrokes(ctx, [wobble(pts, Math.min(w, h) * 0.004, seed)], Math.min(1, p / 0.85)); if (p > 0.85) drawStrokes(ctx, headFor(pts, Math.min(w, h) * 0.18), (p - 0.85) / 0.15);
  } },
  'arrow-line': { label: 'Feiner Pfeil', cat: 'lines', ar: 4, scale: 0.12, sw: 2, draw(ctx, w, h, p) {
    const y = h / 2; const pts = [[0, y], [w, y]]; drawStrokes(ctx, [pts], Math.min(1, p / 0.8)); if (p > 0.8) drawStrokes(ctx, headFor(pts, h * 0.45), (p - 0.8) / 0.2);
  } },
  line: { label: 'Linie', cat: 'lines', ar: 6, scale: 0.06, sw: 2, draw(ctx, w, h, p) { drawStrokes(ctx, [[[0, h / 2], [w, h / 2]]], p); } },
  'line-v': { label: 'Linie vertikal', cat: 'lines', ar: 0.15, scale: 0.4, sw: 2, draw(ctx, w, h, p) { drawStrokes(ctx, [[[w / 2, 0], [w / 2, h]]], p); } },
  underline: { label: 'Handstrich', cat: 'marks', ar: 5, scale: 0.08, sw: 4, draw(ctx, w, h, p, el, seed) {
    const pts = wobble(scalePts(curvePts(t => [t, 0.55 + Math.sin(t * Math.PI * 1.2) * 0.18 - t * 0.12], 60), w, h), h * 0.03, seed); drawStrokes(ctx, [pts], p);
  } },
  'circle-mark': { label: 'Markierungskreis', cat: 'marks', ar: 1.7, scale: 0.26, sw: 3, draw(ctx, w, h, p, el, seed) {
    const pts = wobble(curvePts(t => { const a = -Math.PI * 0.85 + t * Math.PI * 2.15; const r = 1 + t * 0.06; return [w / 2 + Math.cos(a) * w * 0.46 * r, h / 2 + Math.sin(a) * h * 0.42 * r]; }, 110), Math.min(w, h) * 0.008, seed); drawStrokes(ctx, [pts], p);
  } },
  highlight: { label: 'Highlight-Strich', cat: 'marks', ar: 5, scale: 0.09, sw: 26, color: '#D9C393', alpha: 0.55, draw(ctx, w, h, p, el) {
    ctx.lineWidth = h * 0.7; ctx.globalAlpha *= 0.55; drawStrokes(ctx, [[[h * 0.35, h * 0.58], [w - h * 0.35, h * 0.42]]], p);
  } },
  scribble: { label: 'Scribble', cat: 'marks', ar: 1.4, scale: 0.18, sw: 2.5, draw(ctx, w, h, p, el, seed) {
    const pts = wobble(scalePts(curvePts(t => [0.1 + t * 0.8 + Math.cos(t * 26) * 0.08, 0.5 + Math.sin(t * 26) * 0.32], 160), w, h), Math.min(w, h) * 0.01, seed); drawStrokes(ctx, [pts], p);
  } },
  bracket: { label: 'Klammer', cat: 'marks', ar: 0.35, scale: 0.32, sw: 2.5, draw(ctx, w, h, p) { drawStrokes(ctx, [scalePts(curvePts(bez([0.9, 0.02], [0.1, 0.05], [0.4, 0.5], [0.05, 0.5]), 40), w, h), scalePts(curvePts(bez([0.05, 0.5], [0.4, 0.5], [0.1, 0.95], [0.9, 0.98]), 40), w, h)], p); } },
  check: { label: 'Häkchen', cat: 'icons', ar: 1, scale: 0.14, sw: 3, draw(ctx, w, h, p) {
    const c = curvePts(t => [w / 2 + Math.cos(-Math.PI / 2 + t * Math.PI * 2) * w * 0.45, h / 2 + Math.sin(-Math.PI / 2 + t * Math.PI * 2) * h * 0.45], 70);
    drawStrokes(ctx, [c, [[w * 0.3, h * 0.52], [w * 0.45, h * 0.66], [w * 0.72, h * 0.36]]], p);
  } },
  bulb: { label: 'Idee', cat: 'icons', ar: 0.8, scale: 0.16, sw: 2.5, draw(ctx, w, h, p) {
    const cx = w / 2, r = w * 0.32, cy = h * 0.38;
    const arc = curvePts(t => { const a = Math.PI * 0.72 + t * Math.PI * 1.56; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }, 60);
    const L = arc[0], R = arc[arc.length - 1];
    drawStrokes(ctx, [[[cx - r * 0.42, h * 0.72], [L[0], L[1]]], arc, [[R[0], R[1]], [cx + r * 0.42, h * 0.72]], [[cx - r * 0.45, h * 0.72], [cx + r * 0.45, h * 0.72]], [[cx - r * 0.35, h * 0.8], [cx + r * 0.35, h * 0.8]], [[cx - r * 0.2, h * 0.88], [cx + r * 0.2, h * 0.88]],
      [[cx, cy - r * 1.25], [cx, cy - r * 1.5]], [[cx - r * 1.1, cy - r * 0.85], [cx - r * 1.3, cy - r * 1.05]], [[cx + r * 1.1, cy - r * 0.85], [cx + r * 1.3, cy - r * 1.05]]], p);
  } },
  growth: { label: 'Wachstum', cat: 'icons', ar: 1.4, scale: 0.22, sw: 2.5, draw(ctx, w, h, p) {
    ctx.save(); ctx.globalAlpha *= 0.35; drawStrokes(ctx, [[[0, h * 0.95], [w, h * 0.95]]], Math.min(1, p * 2)); ctx.restore();
    const pts = scalePts([[0.02, 0.85], [0.25, 0.68], [0.42, 0.74], [0.62, 0.45], [0.78, 0.5], [0.95, 0.12]], w, h);
    drawStrokes(ctx, [pts], Math.min(1, p / 0.85));
    if (p > 0.85) { drawStrokes(ctx, headFor(pts, Math.min(w, h) * 0.16), (p - 0.85) / 0.15); }
  } },
  person: { label: 'Person', cat: 'icons', ar: 1, scale: 0.14, sw: 2.5, draw(ctx, w, h, p) {
    const head = curvePts(t => [w / 2 + Math.cos(-Math.PI / 2 + t * Math.PI * 2) * w * 0.17, h * 0.3 + Math.sin(-Math.PI / 2 + t * Math.PI * 2) * h * 0.17], 50);
    const body = curvePts(t => { const a = Math.PI + t * Math.PI; return [w / 2 + Math.cos(a) * w * 0.34, h * 0.95 + Math.sin(a) * h * 0.38]; }, 50);
    drawStrokes(ctx, [head, body], p);
  } },
  heart: { label: 'Herz', cat: 'icons', ar: 1.1, scale: 0.12, sw: 2.5, draw(ctx, w, h, p) {
    drawStrokes(ctx, [curvePts(t => { const a = t * Math.PI * 2; const x = 16 * Math.pow(Math.sin(a), 3), y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); return [w / 2 + x / 34 * w, h * 0.45 - y / 34 * h]; }, 90)], p);
  } },
  camera: { label: 'Kamera', cat: 'icons', ar: 1.3, scale: 0.15, sw: 2.5, draw(ctx, w, h, p) {
    const lens = curvePts(t => [w / 2 + Math.cos(t * Math.PI * 2) * w * 0.17, h * 0.58 + Math.sin(t * Math.PI * 2) * w * 0.17], 50);
    drawStrokes(ctx, [[[w * .05, h * .28], [w * .32, h * .28], [w * .38, h * .14], [w * .62, h * .14], [w * .68, h * .28], [w * .95, h * .28], [w * .95, h * .92], [w * .05, h * .92], [w * .05, h * .28]], lens], p);
  } },
  pin: { label: 'Ort', cat: 'icons', ar: 0.75, scale: 0.15, sw: 2.5, draw(ctx, w, h, p) {
    const outline = curvePts(t => { const a = Math.PI * 0.75 + t * Math.PI * 1.5; return [w / 2 + Math.cos(a) * w * 0.42, h * 0.38 + Math.sin(a) * w * 0.42]; }, 60);
    drawStrokes(ctx, [[[w / 2, h * 0.96]].concat(outline.reverse(), [[w / 2, h * 0.96]]), curvePts(t => [w / 2 + Math.cos(t * 6.283) * w * 0.14, h * 0.38 + Math.sin(t * 6.283) * w * 0.14], 30)], p);
  } },
  message: { label: 'Nachricht', cat: 'icons', ar: 1.2, scale: 0.14, sw: 2.5, draw(ctx, w, h, p) {
    drawStrokes(ctx, [[[w * .08, h * .1], [w * .92, h * .1], [w * .92, h * .7], [w * .4, h * .7], [w * .2, h * .92], [w * .22, h * .7], [w * .08, h * .7], [w * .08, h * .1]], [[w * .25, h * .32], [w * .75, h * .32]], [[w * .25, h * .48], [w * .6, h * .48]]], p);
  } },
  star: { label: 'Stern (fein)', cat: 'sparks', ar: 1, scale: 0.12, sw: 2, draw(ctx, w, h, p) {
    const pts = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? 0.2 : 0.48; pts.push([w / 2 + Math.cos(a) * w * r, h / 2 + Math.sin(a) * h * r]); } drawStrokes(ctx, [pts], p);
  } },
  sparkle: { label: 'Funke', cat: 'sparks', ar: 1, scale: 0.1, fill: true, draw(ctx, w, h, p, el, seed, t) {
    const s = easeOut(p) * (1 + Math.sin((t || 0) * 2.2) * 0.04); sparklePath(ctx, w / 2, h / 2, Math.min(w, h) / 2 * s); ctx.fill();
  } },
  sparkles: { label: 'Funken (3)', cat: 'sparks', ar: 1.2, scale: 0.16, fill: true, draw(ctx, w, h, p, el, seed, t) {
    const S = [[0.35, 0.45, 0.32, 0], [0.78, 0.25, 0.16, 0.25], [0.72, 0.78, 0.11, 0.45]];
    for (const [x, y, r, d] of S) { const q = easeOut(clamp((p - d) / 0.55, 0, 1)); if (q <= 0) continue; const tw = 0.85 + 0.15 * Math.sin((t || 0) * 2 + d * 10); sparklePath(ctx, x * w, y * h, r * Math.min(w, h) * q * tw); ctx.fill(); }
  } },
  dots: { label: 'Punkte', cat: 'sparks', ar: 3, scale: 0.04, fill: true, draw(ctx, w, h, p) { for (let i = 0; i < 3; i++) { const q = clamp(p * 3 - i, 0, 1); ctx.beginPath(); ctx.arc(w * (0.17 + i * 0.33), h / 2, h * 0.3 * q, 0, 7); ctx.fill(); } } },
  numbers: { label: '01 / 02 / 03', cat: 'marks', ar: 3.2, scale: 0.12, text: true, draw(ctx, w, h, p, el) {
    const n = 3, act = clamp(el.index || 1, 1, n);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.font = `400 ${h * 0.62}px ${ff("Cormorant Garamond")}`;
    for (let i = 1; i <= n; i++) {
      const q = clamp(p * 3 - (i - 1) * 0.6, 0, 1); if (q <= 0) continue;
      ctx.save(); ctx.globalAlpha *= q * (i === act ? 1 : 0.38);
      ctx.fillText(String(i).padStart(2, '0'), w * (i - 0.5) / n, h * 0.42 + (1 - q) * h * 0.15); ctx.restore();
    }
    ctx.lineWidth = Math.max(1, h * 0.03); drawStrokes(ctx, [[[w * (act - 0.82) / n, h * 0.88], [w * (act - 0.18) / n, h * 0.88]]], clamp(p * 1.4 - 0.4, 0, 1));
  } },
  quote: { label: 'Anführungszeichen', cat: 'marks', ar: 1.2, scale: 0.14, text: true, draw(ctx, w, h, p) {
    ctx.save(); ctx.globalAlpha *= easeOut(p); ctx.font = `400 ${h * 1.6}px ${ff("Cormorant Garamond")}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText('“', w / 2, h * 1.12 + (1 - easeOut(p)) * h * 0.1); ctx.restore();
  } },
  'brand-mark': { label: 'Mindéa Markenzeichen', cat: 'marks', ar: 1, scale: 0.16, text: true, draw(ctx, w, h, p, el) {
    const logo = Brand.assetMedia('icon') || Brand.assetMedia('logo');
    const q = easeOut(p);
    if (logo) { const img = Media.imgSync(logo.id); if (img) { const s = Math.min(w / img.naturalWidth, h / img.naturalHeight); ctx.save(); ctx.globalAlpha *= q; ctx.drawImage(img, (w - img.naturalWidth * s) / 2, (h - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s); ctx.restore(); return; } }
    drawStrokes(ctx, [curvePts(t => [w / 2 + Math.cos(-Math.PI / 2 + t * 6.283) * w * 0.46, h / 2 + Math.sin(-Math.PI / 2 + t * 6.283) * h * 0.46], 80)], p);
    ctx.save(); ctx.globalAlpha *= clamp(p * 2 - 0.8, 0, 1); ctx.font = `500 ${h * 0.5}px ${ff("Cormorant Garamond")}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('M', w / 2, h * 0.53); ctx.restore();
  } },
  speech: { label: 'Sprechblase (editorial)', cat: 'bubbles', ar: 1.5, scale: 0.26, sw: 2, draw(ctx, w, h, p, el) {
    const r = Math.min(w, h) * 0.12;
    const pts = [[r, h * 0.04], [w - r, h * 0.04], [w * 0.98, h * 0.04 + r], [w * 0.98, h * 0.7 - r], [w - r, h * 0.7], [w * 0.36, h * 0.7], [w * 0.2, h * 0.95], [w * 0.24, h * 0.7], [r, h * 0.7], [w * 0.02, h * 0.7 - r], [w * 0.02, h * 0.04 + r], [r, h * 0.04]];
    drawStrokes(ctx, [pts], p);
    if (el.label) { ctx.save(); ctx.globalAlpha *= clamp(p * 2 - 1, 0, 1); ctx.font = `italic 500 ${h * 0.17}px ${ff("Cormorant Garamond")}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(el.label, w / 2, h * 0.37, w * 0.85); ctx.restore(); }
  } },
  thought: { label: 'Gedankenblase', cat: 'bubbles', ar: 1.4, scale: 0.22, sw: 2, draw(ctx, w, h, p, el) {
    const main = curvePts(t => [w * 0.55 + Math.cos(t * 6.283) * w * 0.42, h * 0.38 + Math.sin(t * 6.283) * h * 0.33], 80);
    const c1 = curvePts(t => [w * 0.2 + Math.cos(t * 6.283) * w * 0.06, h * 0.8 + Math.sin(t * 6.283) * w * 0.06], 30);
    const c2 = curvePts(t => [w * 0.08 + Math.cos(t * 6.283) * w * 0.03, h * 0.95 + Math.sin(t * 6.283) * w * 0.03], 20);
    drawStrokes(ctx, [main, c1, c2], p);
    if (el.label) { ctx.save(); ctx.globalAlpha *= clamp(p * 2 - 1, 0, 1); ctx.font = `italic 500 ${h * 0.16}px ${ff("Cormorant Garamond")}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(el.label, w * 0.55, h * 0.38, w * 0.7); ctx.restore(); }
  } },
  note: { label: 'Notizzettel', cat: 'bubbles', ar: 0.9, scale: 0.34, color: '#F1E9DB', fill: true, draw(ctx, w, h, p, el) {
    const q = easeOut(p); ctx.save(); ctx.globalAlpha *= q;
    ctx.translate(w / 2, h / 2); ctx.rotate((1 - q) * 0.05 - 0.02); ctx.translate(-w / 2, -h / 2);
    ctx.shadowColor = 'rgba(23,19,15,.18)'; ctx.shadowBlur = Math.min(w, h) * 0.06; ctx.shadowOffsetY = Math.min(w, h) * 0.02;
    ctx.fillRect(w * 0.04, h * 0.06, w * 0.92, h * 0.9); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = rgba(C.sand, 0.9); ctx.lineWidth = Math.max(1, h * 0.004);
    for (let i = 1; i < 7; i++) { ctx.beginPath(); ctx.moveTo(w * 0.12, h * (0.2 + i * 0.1)); ctx.lineTo(w * 0.88, h * (0.2 + i * 0.1)); ctx.stroke(); }
    ctx.fillStyle = rgba(C.lightgold, 0.65); ctx.save(); ctx.translate(w / 2, h * 0.06); ctx.rotate(-0.05); ctx.fillRect(-w * 0.16, -h * 0.035, w * 0.32, h * 0.07); ctx.restore();
    if (el.label) { ctx.fillStyle = C.black; ctx.font = `italic 500 ${h * 0.085}px ${ff("Cormorant Garamond")}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; wrapFill(ctx, el.label, w * 0.13, h * 0.285, w * 0.74, h * 0.1); }
    ctx.restore();
  } },
  polaroid: { label: 'Polaroid-Rahmen', cat: 'frames', ar: 0.84, scale: 0.5, color: '#FFFFFF', fill: true, draw(ctx, w, h, p, el) {
    const q = easeOut(p); ctx.save(); ctx.globalAlpha *= q;
    ctx.shadowColor = 'rgba(23,19,15,.22)'; ctx.shadowBlur = w * 0.05; ctx.shadowOffsetY = w * 0.015;
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.rect(w * 0.06, w * 0.06, w * 0.88, h - w * 0.06 - h * 0.2); ctx.fill('evenodd');
    ctx.shadowColor = 'transparent';
    if (el.label) { ctx.fillStyle = C.black; ctx.font = `italic 500 ${h * 0.065}px ${ff("Cormorant Garamond")}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(el.label, w / 2, h - h * 0.1, w * 0.85); }
    ctx.restore();
  } },
  film: { label: 'Film-Frame', cat: 'frames', ar: 0.62, scale: 0.6, color: '#17130F', fill: true, draw(ctx, w, h, p) {
    const q = easeOut(p); ctx.save(); ctx.globalAlpha *= q; const sw = w * 0.12;
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.rect(sw, h * 0.03, w - sw * 2, h * 0.94); ctx.fill('evenodd');
    ctx.globalCompositeOperation = 'destination-out';
    const n = Math.max(6, Math.round(h / (sw * 1.1)));
    for (let i = 0; i < n; i++) { const y = (i + 0.3) * h / n; rrPath(ctx, sw * 0.28, y, sw * 0.44, h / n * 0.45, sw * 0.08); ctx.fill(); rrPath(ctx, w - sw * 0.72, y, sw * 0.44, h / n * 0.45, sw * 0.08); ctx.fill(); }
    ctx.restore();
  } },
  frame: { label: 'Feiner Rahmen', cat: 'frames', ar: 0.8, scale: 0.7, sw: 2, draw(ctx, w, h, p) { const i = 0; drawStrokes(ctx, [[[i, i], [w - i, i], [w - i, h - i], [i, h - i], [i, i]]], p); } },
  corners: { label: 'Eckrahmen', cat: 'frames', ar: 0.8, scale: 0.7, sw: 2, draw(ctx, w, h, p) { const L = Math.min(w, h) * 0.14; drawStrokes(ctx, [[[0, L], [0, 0], [L, 0]], [[w - L, 0], [w, 0], [w, L]], [[w, h - L], [w, h], [w - L, h]], [[L, h], [0, h], [0, h - L]]], p); } },
  paper: { label: 'Papierstruktur', cat: 'frames', ar: 0.8, scale: 1, color: '#F1E9DB', fill: true, draw(ctx, w, h, p, el, seed) {
    ctx.save(); ctx.globalAlpha *= 0.35 * easeOut(p); ctx.fillRect(0, 0, w, h);
    const r = mulberry32(seed); ctx.globalAlpha = 0.08 * easeOut(p); ctx.fillStyle = '#2A221A';
    for (let i = 0; i < 900; i++) { const x = r() * w, y = r() * h, s = r() * Math.max(1, w / 900) * 1.4; ctx.fillRect(x, y, s, s); }
    ctx.globalAlpha = 0.05 * easeOut(p); ctx.strokeStyle = '#2A221A'; ctx.lineWidth = Math.max(0.5, w / 1400);
    for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * w * 0.12, y + (r() - 0.5) * h * 0.02); ctx.stroke(); }
    ctx.restore();
  } },
  label: { label: 'Label', cat: 'bubbles', ar: 3.2, scale: 0.09, sw: 1.5, defLabel: 'Wichtig', text: true, draw(ctx, w, h, p, el) {
    drawStrokes(ctx, [[[h / 2, 0], [w - h / 2, 0], [w, h / 2], [w - h / 2, h], [h / 2, h], [0, h / 2], [h / 2, 0]]], p);
    ctx.save(); ctx.globalAlpha *= clamp(p * 2 - 1, 0, 1); ctx.font = `500 ${h * 0.36}px ${ff("Jost")}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (h * 0.06) + 'px';
    ctx.fillText((el.label || 'Wichtig').toUpperCase(), w / 2, h * 0.53, w * 0.8); ctx.restore();
  } },
};
function wrapFill(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(/\s+/); let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; } else line = t; }
  if (line) ctx.fillText(line, x, y);
}
/** Draw a graphic element in its local box. p = intro progress, t = time (for subtle loops). */
function drawGraphicLocal(ctx, el, p = 1, t = 0) {
  const g = GRAPHICS[el.kind]; if (!g) return;
  const w = el.w, hh = el.h;
  ctx.strokeStyle = el.color; ctx.fillStyle = el.color;
  ctx.lineWidth = (el.strokeW || g.sw || 3) * Math.max(0.6, Math.min(w, hh) / 160);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  g.draw(ctx, w, hh, p, el, hashStr(el.id || 'x'), t);
}
