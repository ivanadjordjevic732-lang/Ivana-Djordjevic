/* ═══════════════════════════════════════════════════════════════════════
   MODULE: CANVAS RENDERING — pages, elements, text layout, captions.
   One renderer for editor preview, thumbnails and export (WYSIWYG).
   ═══════════════════════════════════════════════════════════════════════ */
let _renderQueued = false;
const RenderHooks = [];
function requestRender() { if (_renderQueued) return; _renderQueued = true; requestAnimationFrame(() => { _renderQueued = false; RenderHooks.forEach(f => { try { f(); } catch (e) { console.error(e); } }); }); }

const FONT_STACKS = { 'Cormorant Garamond': '"Cormorant Garamond", "Cormorant", Garamond, Georgia, serif', 'Playfair Display': '"Playfair Display", Didot, "Bodoni 72", Georgia, serif', 'Jost': 'Jost, "Futura", "Avenir Next", "Helvetica Neue", Arial, sans-serif', 'Georgia': 'Georgia, serif', 'Helvetica Neue': '"Helvetica Neue", Helvetica, Arial, sans-serif' };
/** CSS font-family stack with graceful fallbacks (offline / blocked web fonts). */
function ff(name) { return FONT_STACKS[name] || `"${name}", sans-serif`; }
function fontStr(el, size) { return `${el.italic ? 'italic ' : ''}${el.weight || 400} ${size || el.size}px ${ff(el.font)}`; }
function txTransform(t, mode) { return mode === 'upper' ? t.toUpperCase() : mode === 'lower' ? t.toLowerCase() : t; }
function measureLS(ctx, s, ls) { return ctx.measureText(s).width + Math.max(0, s.length - 1) * ls; }
/** Wrap text into lines that fit width w (letter-spacing aware, honors \n). */
function layoutLines(ctx, text, w, ls) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/ +/); let line = '';
    for (const word of words) {
      const t = line ? line + ' ' + word : word;
      if (line && measureLS(ctx, t, ls) > w) { out.push(line); line = word; }
      else line = t;
      // hard-break very long words
      while (measureLS(ctx, line, ls) > w && line.length > 1) {
        let i = line.length - 1; while (i > 1 && measureLS(ctx, line.slice(0, i), ls) > w) i--;
        out.push(line.slice(0, i)); line = line.slice(i);
      }
    }
    out.push(line);
  }
  return out;
}
const _measureCtx = makeCanvas(4, 4).getContext('2d');
function textMetrics(el) {
  const ctx = _measureCtx; ctx.font = fontStr(el);
  const ls = (el.ls || 0) * el.size * 0.1;
  const txt = txTransform(el.text || '', el.transform);
  const pad = el.bg && el.bg.on ? el.size * (el.bg.pad ?? 0.9) : 0;
  const innerW = Math.max(el.size, el.w - pad * 2);
  const lines = layoutLines(ctx, txt, innerW, ls);
  const lh = el.size * (el.lh || 1.2);
  return { lines, lh, ls, pad, h: lines.length * lh + pad * 2 * (el.bg && el.bg.on ? 0.55 : 0), innerW };
}
function fillTextLS(ctx, s, x, y, ls, align, stroke) {
  if (!ls) { stroke ? ctx.strokeText(s, x, y) : ctx.fillText(s, x, y); return; }
  const W = measureLS(ctx, s, ls);
  let cx = align === 'center' ? x - W / 2 : align === 'right' ? x - W : x;
  const prevAlign = ctx.textAlign; ctx.textAlign = 'left';
  for (const ch of s) { stroke ? ctx.strokeText(ch, cx, y) : ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + ls; }
  ctx.textAlign = prevAlign;
}

/* ── Element drawing ─────────────────────────────────────────────────── */
function drawElement(ctx, el, o = {}) {
  if (el.hidden && !o.showHidden) return;
  ctx.save();
  ctx.globalAlpha *= (el.opacity ?? 1) * (o.alpha ?? 1);
  ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
  if (el.rot) ctx.rotate(el.rot * Math.PI / 180);
  if (o.anim) applyAnim(ctx, el, o.anim);
  ctx.translate(-el.w / 2, -el.h / 2);
  try {
    if (el.type === 'text') drawTextLocal(ctx, el, o);
    else if (el.type === 'shape') drawShapeLocal(ctx, el);
    else if (el.type === 'image') drawImageLocal(ctx, el, o);
    else if (el.type === 'graphic') drawGraphicLocal(ctx, el, o.progress ?? 1, o.t || 0);
  } finally { ctx.restore(); }
}
function applyAnim(ctx, el, a) {
  // a: {kind, q (0..1 intro), out (0..1 outro)}
  const q = easeOut(a.q), k = a.kind;
  if (k === 'fade') ctx.globalAlpha *= q;
  else if (k === 'slideUp') { ctx.globalAlpha *= q; ctx.translate(0, (1 - q) * el.h * 0.5); }
  else if (k === 'pop') { const s = a.q < 1 ? 0.85 + 0.15 * easeOutBack(a.q) : 1; ctx.globalAlpha *= clamp(a.q * 3, 0, 1); ctx.scale(s, s); }
  else if (k === 'scale') { const s = 1.12 - 0.12 * q; ctx.globalAlpha *= q; ctx.scale(s, s); }
  if (a.out != null && a.out < 1) ctx.globalAlpha *= clamp(a.out, 0, 1);
}
function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

function drawTextLocal(ctx, el, o = {}) {
  const m = textMetrics(el);
  el.h = Math.max(el.size, m.h); // keep box in sync with content
  ctx.font = fontStr(el); ctx.textBaseline = 'middle';
  const align = el.align || 'left'; ctx.textAlign = align;
  const words = o.wordReveal; // number of words visible (wordwise animation)
  if (el.bg && el.bg.on) {
    ctx.save(); ctx.globalAlpha *= el.bg.opacity ?? 1; ctx.fillStyle = el.bg.color;
    const maxLine = Math.max(...m.lines.map(l => measureLS(ctx, l, m.ls)));
    const bw = Math.min(el.w, maxLine + m.pad * 2);
    const bx = align === 'center' ? (el.w - bw) / 2 : align === 'right' ? el.w - bw : 0;
    rrPath(ctx, bx, 0, bw, el.h, Math.min(el.bg.radius ?? 0, el.h / 2)); ctx.fill(); ctx.restore();
  }
  const top = (el.h - m.lines.length * m.lh) / 2;
  const x = align === 'center' ? el.w / 2 : align === 'right' ? el.w - m.pad : m.pad;
  let wordCount = 0;
  m.lines.forEach((line, i) => {
    let s = line;
    if (words != null) { const ws = line.split(' '); const vis = Math.max(0, Math.min(ws.length, words - wordCount)); wordCount += ws.length; if (!vis) return; s = ws.slice(0, vis).join(' '); }
    const y = top + m.lh * (i + 0.5);
    if (el.shadow && el.shadow.on) { ctx.shadowColor = rgba(el.shadow.color, el.shadow.opacity ?? 0.35); ctx.shadowBlur = el.shadow.blur; ctx.shadowOffsetX = el.shadow.x; ctx.shadowOffsetY = el.shadow.y; }
    if (el.stroke && el.stroke.on && el.stroke.w > 0) { ctx.save(); ctx.strokeStyle = el.stroke.color; ctx.lineWidth = el.stroke.w * 2; ctx.lineJoin = 'round'; fillTextLS(ctx, s, x, y, m.ls, align, true); ctx.restore(); }
    ctx.fillStyle = el.color;
    fillTextLS(ctx, s, x, y, m.ls, align);
    ctx.shadowColor = 'transparent';
    if (el.underline || el.strike) {
      const lw = measureLS(ctx, s, m.ls); const lx = align === 'center' ? x - lw / 2 : align === 'right' ? x - lw : x;
      ctx.fillStyle = el.color; const th = Math.max(1, el.size * 0.055);
      if (el.underline) ctx.fillRect(lx, y + el.size * 0.42, lw, th);
      if (el.strike) ctx.fillRect(lx, y + el.size * 0.02, lw, th);
    }
  });
}
function drawShapeLocal(ctx, el) {
  const w = el.w, h = el.h, s = el.shape;
  const fill = el.fill && el.fill !== 'none', stroke = el.stroke && el.stroke !== 'none' && el.strokeW > 0;
  ctx.fillStyle = el.fill; ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeW; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const fs = () => { if (fill) ctx.fill(); if (stroke) ctx.stroke(); };
  if (s === 'scrim') { const g = el.dir === 'down' ? ctx.createLinearGradient(0, 0, 0, h) : ctx.createLinearGradient(0, h, 0, 0); g.addColorStop(0, rgba(el.fill, el.strength ?? 0.6)); g.addColorStop(1, rgba(el.fill, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); return; }
  if (s === 'rect') { ctx.beginPath(); ctx.rect(0, 0, w, h); fs(); }
  else if (s === 'roundrect') { rrPath(ctx, 0, 0, w, h, el.radius || 0); fs(); }
  else if (s === 'circle') { ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); fs(); }
  else if (s === 'frame') { const i = el.strokeW / 2; ctx.beginPath(); el.radius ? rrPath(ctx, i, i, w - i * 2, h - i * 2, el.radius) : ctx.rect(i, i, w - i * 2, h - i * 2); ctx.stroke(); }
  else if (s === 'line') { ctx.lineWidth = Math.max(el.strokeW, 0.5); ctx.strokeStyle = stroke ? el.stroke : el.fill; ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke(); }
  else if (s === 'arrow') { ctx.strokeStyle = stroke ? el.stroke : el.fill; ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.moveTo(w - h * 0.9, 0 + h * 0.05); ctx.lineTo(w, h / 2); ctx.lineTo(w - h * 0.9, h * 0.95); ctx.stroke(); }
  else if (s === 'chevron') { ctx.strokeStyle = stroke ? el.stroke : el.fill; ctx.beginPath(); ctx.moveTo(w * 0.15, h * 0.05); ctx.lineTo(w * 0.85, h / 2); ctx.lineTo(w * 0.15, h * 0.95); ctx.stroke(); }
  else if (s === 'divider') { const c = stroke ? el.stroke : el.fill; ctx.strokeStyle = c; ctx.fillStyle = c; const d = h * 0.45; ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w / 2 - d * 2, h / 2); ctx.moveTo(w / 2 + d * 2, h / 2); ctx.lineTo(w, h / 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(w / 2, h / 2 - d); ctx.lineTo(w / 2 + d, h / 2); ctx.lineTo(w / 2, h / 2 + d); ctx.lineTo(w / 2 - d, h / 2); ctx.closePath(); ctx.fill(); }
  else if (s === 'badge') { rrPath(ctx, 0, 0, w, h, h / 2); fs(); }
  else if (s === 'callout') { const r = Math.min(el.radius || 18, h * 0.3); const th = h * 0.22; ctx.beginPath(); rrPath(ctx, 0, 0, w, h - th, r); fs(); ctx.beginPath(); ctx.moveTo(w * 0.18, h - th - 1); ctx.lineTo(w * 0.12, h); ctx.lineTo(w * 0.32, h - th - 1); ctx.closePath(); if (fill) ctx.fill(); }
  if ((s === 'badge' || s === 'callout') && el.text) {
    ctx.fillStyle = el.textColor || C.ivory; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fsz = s === 'badge' ? h * 0.42 : Math.min(h * 0.22, w * 0.09);
    ctx.font = `500 ${fsz}px ${ff("Jost")}`;
    fillTextLS(ctx, s === 'badge' ? el.text.toUpperCase() : el.text, w / 2, s === 'badge' ? h * 0.53 : (h - h * 0.22) / 2, s === 'badge' ? fsz * 0.18 : 0, 'center');
  }
}
/** Compute source crop for fill/fit with zoom & offset (ox/oy in -1..1). */
function coverCrop(sw, sh, dw, dh, zoom = 1, ox = 0, oy = 0, fit = 'fill') {
  if (fit === 'fit') return { crop: { x: 0, y: 0, w: sw, h: sh }, dst: (() => { const s = Math.min(dw / sw, dh / sh) * zoom; const w = sw * s, h = sh * s; return { x: (dw - w) / 2 + ox * (dw - w) / 2 * -1, y: (dh - h) / 2 + oy * (dh - h) / 2 * -1, w, h }; })() };
  const sr = sw / sh, dr = dw / dh;
  let cw = sr > dr ? sh * dr : sw, ch = sr > dr ? sh : sw / dr;
  cw /= Math.max(1, zoom); ch /= Math.max(1, zoom);
  const maxX = (sw - cw) / 2, maxY = (sh - ch) / 2;
  return { crop: { x: maxX + clamp(ox, -1, 1) * maxX, y: maxY + clamp(oy, -1, 1) * maxY, w: cw, h: ch }, dst: { x: 0, y: 0, w: dw, h: dh } };
}
function drawImageLocal(ctx, el, o = {}) {
  const img = o.source || Media.imgSync(el.mediaId);
  const w = el.w, h = el.h;
  ctx.save();
  if (el.radius) { rrPath(ctx, 0, 0, w, h, el.radius); ctx.clip(); }
  if (!img) {
    ctx.fillStyle = rgba(C.sand, 0.55); ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = rgba(C.gold, 0.6); ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.006); ctx.strokeRect(0, 0, w, h);
    ctx.fillStyle = rgba(C.espresso, 0.55); ctx.font = `400 ${Math.max(10, Math.min(w, h) * 0.06)}px ${ff("Jost")}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(el.mediaId ? 'Bild lädt …' : 'Bild wählen', w / 2, h / 2);
    ctx.restore(); return;
  }
  const sw = img.naturalWidth || img.videoWidth || img.width, sh = img.naturalHeight || img.videoHeight || img.height;
  const { crop, dst } = coverCrop(sw, sh, w, h, el.zoom || 1, el.ox || 0, el.oy || 0, el.fit);
  drawGraded(ctx, img, crop, dst.x, dst.y, dst.w, dst.h, effAdj(el.look, el.adj), { cacheKey: o.source ? null : el.mediaId, flipX: el.flipX, flipY: el.flipY });
  ctx.restore();
}

/* ── Page background & full page render ─────────────────────────────── */
function drawBackground(ctx, bg, W, H, o = {}) {
  if (o.transparent) return;
  if (!bg) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); return; }
  if (bg.type === 'gradient') {
    const a = (bg.angle || 160) * Math.PI / 180, cx = W / 2, cy = H / 2, r = Math.hypot(W, H) / 2;
    const g = ctx.createLinearGradient(cx - Math.sin(a) * r, cy + Math.cos(a) * r, cx + Math.sin(a) * r, cy - Math.cos(a) * r);
    g.addColorStop(0, bg.color); g.addColorStop(1, bg.color2 || bg.color); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else { ctx.fillStyle = bg.color || '#fff'; ctx.fillRect(0, 0, W, H); }
  if (bg.type === 'image' && bg.mediaId) {
    const img = Media.imgSync(bg.mediaId);
    if (img) { const { crop } = coverCrop(img.naturalWidth, img.naturalHeight, W, H, bg.zoom || 1, bg.ox || 0, bg.oy || 0); drawGraded(ctx, img, crop, 0, 0, W, H, effAdj(bg.look, bg.adj), { cacheKey: bg.mediaId }); }
    if (bg.dim) { ctx.fillStyle = rgba(C.black, bg.dim / 100); ctx.fillRect(0, 0, W, H); }
  }
}
function renderPage(ctx, page, W, H, o = {}) {
  drawBackground(ctx, page.bg, W, H, o);
  for (const el of page.elements) { if (o.skip && o.skip.has(el.id)) continue; drawElement(ctx, el, o); }
}
/** Render a page to a new canvas at given pixel width. */
function renderPageToCanvas(page, fmt, pxW, o = {}) {
  const s = pxW / fmt.w; const c = makeCanvas(fmt.w * s, fmt.h * s); const ctx = c.getContext('2d');
  ctx.scale(s, s); renderPage(ctx, page, fmt.w, fmt.h, o); return c;
}
async function preloadPageMedia(pages) {
  const ids = new Set();
  for (const p of pages) { if (p.bg && p.bg.mediaId) ids.add(p.bg.mediaId); for (const e of p.elements) if (e.mediaId) ids.add(e.mediaId); }
  const logo = Brand.assetMedia && (Brand.assetMedia('icon') || Brand.assetMedia('logo')); if (logo) ids.add(logo.id);
  await Promise.all(Array.from(ids).map(id => Media.img(id).catch(() => null)));
}
async function makeProjectThumb(p, size = 360) {
  const f = p.format; const s = size / Math.max(f.w, f.h);
  const c = makeCanvas(f.w * s, f.h * s); const ctx = c.getContext('2d'); ctx.scale(s, s);
  if (p.type === 'video') { await VE.renderStill(ctx, p, Math.min(1, VE.t || 0.5)); }
  else if (p.pages[0]) { await preloadPageMedia([p.pages[0]]); renderPage(ctx, p.pages[0], f.w, f.h); }
  return c.toDataURL('image/jpeg', 0.75);
}

/* ── Captions ────────────────────────────────────────────────────────── */
const CAPTION_STYLES = {
  minimal: { l: 'Minimal', font: 'Jost', weight: 500, size: 0.05, color: '#FFFFFF', shadow: true, upper: false, emph: '#D9C393', emphItalic: false, active: '#D9C393' },
  mindea: { l: 'Mindéa', font: 'Cormorant Garamond', weight: 600, size: 0.066, color: '#F8F5F0', shadow: true, emph: '#D9C393', emphItalic: true, active: '#D9C393', lh: 1.08 },
  editorial: { l: 'Editorial', font: 'Playfair Display', weight: 500, italic: true, size: 0.054, color: '#FFFFFF', shadow: true, emph: '#D9C393', emphItalic: false, active: '#F1E9DB' },
  bold: { l: 'Bold', font: 'Jost', weight: 700, size: 0.056, color: '#FFFFFF', shadow: true, upper: true, emph: '#D9C393', stroke: '#17130F', active: '#D9C393', ls: 0.02 },
  box: { l: 'Box', font: 'Jost', weight: 500, size: 0.046, color: '#F8F5F0', box: '#17130F', boxA: 0.82, emph: '#D9C393', active: '#D9C393' },
  clean: { l: 'Clean', font: 'Jost', weight: 400, size: 0.046, color: '#FFFFFF', shadow: true, soft: true, emph: '#F1E9DB', active: '#FFFFFF' },
  luxury: { l: 'Luxury', font: 'Cormorant Garamond', weight: 500, size: 0.05, color: '#F1E9DB', shadow: true, upper: true, ls: 0.16, emph: '#D9C393', active: '#D9C393' },
};
const CAPTION_POS = [{ v: 'top', l: 'Oben' }, { v: 'middle', l: 'Mitte' }, { v: 'bottom', l: 'Unten' }, { v: 'safe', l: 'Safe Zone Reel' }, { v: 'free', l: 'Frei' }];
const CAPTION_ANIMS = [{ v: 'none', l: 'Keine' }, { v: 'fade', l: 'Fade' }, { v: 'pop', l: 'Pop' }, { v: 'slideUp', l: 'Slide Up' }, { v: 'word', l: 'Wortweise' }, { v: 'scale', l: 'Scale' }];
function capY(set, cap, H) {
  if (cap && cap.y != null) return cap.y * H;
  switch (set.position) { case 'top': return H * 0.2; case 'middle': return H * 0.5; case 'bottom': return H * 0.84; case 'free': return (set.y ?? 0.72) * H; default: return H * 0.68; }
}
/** Layout caption words into ≤2 balanced lines. Returns [{words:[{w,i}], width}] */
function capLayout(ctx, words, maxW, ls) {
  const sp = ctx.measureText(' ').width;
  const widths = words.map(w => measureLS(ctx, w, ls));
  const total = widths.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  if (total <= maxW || words.length < 2) return [{ idx: words.map((_, i) => i), width: total }];
  // balanced split
  let best = 1, bestD = Infinity, acc = 0;
  for (let i = 1; i < words.length; i++) { acc += widths[i - 1] + (i > 1 ? sp : 0); const d = Math.abs(total - acc * 2); if (d < bestD && acc <= maxW) { bestD = d; best = i; } }
  const A = words.slice(0, best).map((_, i) => i), B = words.slice(best).map((_, i) => i + best);
  const wid = ix => ix.reduce((s, i) => s + widths[i], 0) + sp * (ix.length - 1);
  return [{ idx: A, width: wid(A) }, { idx: B, width: wid(B) }];
}
function drawCaption(ctx, cap, set, t, W, H, o = {}) {
  const st = Object.assign({}, CAPTION_STYLES[cap.style || set.style] || CAPTION_STYLES.mindea);
  const size = Math.round(st.size * Math.min(W, H * 0.62) * (set.size || 1) * (cap.size || 1));
  const raw = (cap.text || '').trim(); if (!raw) return;
  const words = raw.split(/\s+/).map(w => st.upper ? w.toUpperCase() : w);
  if (cap.emoji) words.push(cap.emoji);
  ctx.save();
  ctx.font = `${st.italic ? 'italic ' : ''}${st.weight} ${size}px ${ff(st.font)}`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const ls = (st.ls || 0) * size;
  const lines = capLayout(ctx, words, W * 0.82, ls);
  const lh = size * (st.lh || 1.18);
  const cy = capY(set, cap, H);
  const anim = set.animation || 'fade';
  const dur = Math.max(0.01, cap.end - cap.start), q = clamp((t - cap.start) / 0.22, 0, 1), qo = clamp((cap.end - t) / 0.14, 0, 1);
  // word timing (real word timestamps if present, else even split)
  const wt = words.map((_, i) => cap.words && cap.words[i] ? cap.words[i].s : cap.start + dur * i / words.length);
  let visible = words.length;
  if (anim === 'word') visible = wt.filter(s => s <= t + 0.02).length || 1;
  if (anim === 'fade') ctx.globalAlpha *= easeOut(q) * qo;
  else if (anim === 'slideUp') { ctx.globalAlpha *= easeOut(q) * qo; ctx.translate(0, (1 - easeOut(q)) * size * 0.45); }
  else if (anim === 'pop') { const s = q < 1 ? 0.88 + 0.12 * easeOutBack(q) : 1; ctx.globalAlpha *= clamp(q * 3, 0, 1) * qo; ctx.translate(W / 2, cy); ctx.scale(s, s); ctx.translate(-W / 2, -cy); }
  else if (anim === 'scale') { const s = 1.08 - 0.08 * easeOut(q); ctx.globalAlpha *= easeOut(q) * qo; ctx.translate(W / 2, cy); ctx.scale(s, s); ctx.translate(-W / 2, -cy); }
  else if (anim === 'word') ctx.globalAlpha *= qo;
  const blockH = lines.length * lh;
  const sp = ctx.measureText(' ').width;
  const emph = new Set(set.emphasis === false ? [] : (cap.emph || []));
  if (st.box) {
    const bw = Math.max(...lines.map(l => l.width)) + size * 1.0, bh = blockH + size * 0.55;
    ctx.save(); ctx.globalAlpha *= st.boxA ?? 0.85; ctx.fillStyle = st.box; rrPath(ctx, W / 2 - bw / 2, cy - bh / 2, bw, bh, size * 0.28); ctx.fill(); ctx.restore();
  }
  let wordIdx = 0;
  lines.forEach((ln, li) => {
    let x = W / 2 - ln.width / 2; const y = cy - blockH / 2 + lh * (li + 0.5);
    ln.idx.forEach(i => {
      const word = words[i]; const ww = measureLS(ctx, word, ls);
      if (i < visible) {
        // subtle active-word highlight — only with real word timestamps
        const isActive = !!(set.highlight && cap.words && cap.words.length && t >= wt[i] && (i === words.length - 1 || t < wt[i + 1]));
        const isEmph = emph.has(i);
        ctx.save();
        if (isEmph && st.emphItalic) ctx.font = `italic ${st.weight} ${size * 1.04}px ${ff(st.font)}`;
        if (st.shadow) { ctx.shadowColor = st.soft ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.5)'; ctx.shadowBlur = size * (st.soft ? 0.5 : 0.28); ctx.shadowOffsetY = size * 0.04; }
        if (st.stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = st.stroke; ctx.lineWidth = size * 0.1; fillTextLS(ctx, word, x, y, ls, 'left', true); ctx.shadowColor = 'transparent'; }
        ctx.fillStyle = isEmph ? st.emph : (isActive ? st.active : st.color);
        if (anim === 'word') { const wq = clamp((t - wt[i]) / 0.18, 0, 1); ctx.globalAlpha *= easeOut(wq); ctx.translate(0, (1 - easeOut(wq)) * size * 0.2); }
        fillTextLS(ctx, word, x, y, ls, 'left');
        ctx.restore();
      }
      x += ww + sp; wordIdx++;
    });
  });
  ctx.restore();
  return { y: cy, h: blockH };
}

/* ── Safe zones (orientation only, never exported) ──────────────────── */
function safeZoneRects(fmt) {
  if (fmt.w / fmt.h > 0.6) return null;
  const W = fmt.w, H = fmt.h;
  if (fmt.safe === 'story') return [{ x: 0, y: 0, w: W, h: H * 0.13, l: 'Profil & Fortschritt' }, { x: 0, y: H * 0.86, w: W, h: H * 0.14, l: 'Antwortfeld' }];
  return [{ x: 0, y: 0, w: W, h: H * 0.11, l: 'Kopfzeile' }, { x: 0, y: H * 0.78, w: W, h: H * 0.22, l: 'Caption & Profil' }, { x: W * 0.86, y: H * 0.42, w: W * 0.14, h: H * 0.36, l: 'Aktionen' }];
}
