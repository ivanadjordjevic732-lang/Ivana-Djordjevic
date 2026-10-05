/* ═══════════════════════════════════════════════════════════════════════
   MODULE: BRAND KIT · TEMPLATES · BRAND STYLES · MAGIC RESIZE · SMART CREATOR
   ═══════════════════════════════════════════════════════════════════════ */
const BRAND_ASSETS = [{ k: 'logo', l: 'Logo' }, { k: 'logoLight', l: 'Logo hell' }, { k: 'logoDark', l: 'Logo dunkel' }, { k: 'icon', l: 'Icon' }, { k: 'butterfly', l: 'Schmetterling' }, { k: 'watermark', l: 'Wasserzeichen' }];
const Brand = {
  data: { colors: BRAND_COLORS.map(c => ({ ...c })), fonts: { head: FONT_HEAD, alt: FONT_ALT, body: FONT_BODY }, assets: {}, handle: '@mindea', tagline: 'Marken, die wirken, bevor sie erklären.' },
  async load() { const d = await DB.kvGet('brand', null); if (d) this.data = Object.assign(this.data, d); },
  async save() { try { await DB.kvSet('brand', this.data); } catch (e) { toast(friendlyError(e), 'error'); } Bus.emit('brand'); },
  colors() { return this.data.colors; },
  assetMedia(k) { const id = this.data.assets[k]; return id ? Media.get(id) : null; },
};

/* ── Brand styles (one click) ────────────────────────────────────────── */
const BRAND_STYLES = {
  signature: { l: 'Mindéa Signature', bg: C.ivory, text: C.black, muted: C.espresso, accent: C.gold, soft: C.cream, head: FONT_HEAD, body: FONT_BODY },
  quiet: { l: 'Quiet Luxury', bg: C.cream, text: C.espresso, muted: '#6B5B4A', accent: C.gold, soft: C.sand, head: FONT_HEAD, body: FONT_BODY },
  editorial: { l: 'Editorial', bg: C.white, text: C.black, muted: '#4A4038', accent: C.black, soft: C.cream, head: FONT_ALT, body: FONT_BODY },
  warm: { l: 'Warm Minimal', bg: C.sand, text: C.espresso, muted: C.espresso, accent: C.ivory, soft: C.cream, head: FONT_BODY, body: FONT_BODY, headWeight: 300 },
  dark: { l: 'Dark Luxury', bg: C.black, text: C.ivory, muted: C.sand, accent: C.lightgold, soft: C.espresso, head: FONT_HEAD, body: FONT_BODY },
  soft: { l: 'Soft Founder', bg: C.ivory, bg2: C.cream, text: C.espresso, muted: '#6B5B4A', accent: C.gold, soft: C.cream, head: FONT_HEAD, body: FONT_BODY, italic: true },
};
function applyBrandStyle(page, key) {
  const s = BRAND_STYLES[key]; if (!s || !page) return;
  if (page.bg.type !== 'image') { Object.assign(page.bg, s.bg2 ? { type: 'gradient', color: s.bg, color2: s.bg2, angle: 165 } : { type: 'color', color: s.bg }); }
  const onImage = page.bg.type === 'image';
  for (const el of page.elements) {
    if (el.type === 'text') {
      const r = el.role || (el.size > 60 ? 'headline' : 'body');
      if (['headline', 'quote', 'number', 'wordmark'].includes(r)) { el.font = s.head; el.color = r === 'number' ? s.accent : (onImage ? C.ivory : s.text); if (s.headWeight) el.weight = s.headWeight; if (s.italic && r === 'headline') el.italic = true; if (r === 'headline' && !s.italic && el.font !== FONT_HEAD) el.italic = false; }
      else if (r === 'subheadline' || r === 'badge') { el.font = s.body; el.color = onImage ? C.lightgold : s.accent; }
      else if (r === 'cta') { el.font = s.body; el.bg.on = true; el.bg.color = s.text; el.color = s.bg; }
      else { el.font = s.body; el.color = onImage ? C.cream : s.muted; }
    } else if (el.type === 'shape') {
      if (el.shape === 'scrim') continue;
      if (el.fill && el.fill !== 'none') el.fill = el.role === 'panel' ? s.soft : (el.role === 'dark' ? s.text : s.soft);
      if (el.stroke && el.stroke !== 'none') el.stroke = s.accent;
    } else if (el.type === 'graphic') el.color = s.accent === C.ivory ? C.espresso : s.accent;
  }
}

/* ── Template building blocks (relative to any format) ───────────────── */
function TB(W, H) {
  const S = Math.min(W / 1080, H / 1350);
  const api = {
    S, W, H,
    t(role, text, o = {}) {
      const el = mkText(role, W, H, { text });
      el.w = Math.round((o.w ?? 0.8) * W); el.x = Math.round((o.x ?? (1 - (o.w ?? 0.8)) / 2) * W);
      if (o.size) el.size = Math.round(o.size * S);
      ['align', 'color', 'font', 'weight', 'italic', 'ls', 'lh', 'transform', 'name'].forEach(k => { if (o[k] !== undefined) el[k] = o[k]; });
      if (o.bg) Object.assign(el.bg, o.bg, { on: true });
      if (o.opacity != null) el.opacity = o.opacity;
      el.h = textMetrics(el).h;
      el.y = Math.round(o.yc != null ? o.yc * H - el.h / 2 : o.yb != null ? o.yb * H - el.h : (o.y ?? 0.4) * H);
      return el;
    },
    s(shape, x, y, w, hh, o = {}) { const el = mkShape(shape, W, H); Object.assign(el, { x: Math.round(x * W), y: Math.round(y * H), w: Math.round(w * W), h: Math.max(1, Math.round(hh * H)) }, o); return el; },
    sq(shape, x, y, size, o = {}) { const px = size * Math.min(W, H); const el = mkShape(shape, W, H); Object.assign(el, { x: Math.round(x * W - px / 2), y: Math.round(y * H - px / 2), w: Math.round(px), h: Math.round(px) }, o); return el; },
    img(x, y, w, hh, o = {}) { const el = mkImage(null, W, H); Object.assign(el, { x: Math.round(x * W), y: Math.round(y * H), w: Math.round(w * W), h: Math.round(hh * H), name: o.name || 'Bild' }, o); el.wantTags = o.tags || []; return el; },
    g(kind, cx, cy, size, o = {}) { const el = mkGraphic(kind, W, H); const g = GRAPHICS[kind]; const px = size * Math.min(W, H); el.h = Math.round(px); el.w = Math.round(px * (g.ar || 1)); el.x = Math.round(cx * W - el.w / 2); el.y = Math.round(cy * H - el.h / 2); Object.assign(el, o); return el; },
    // stack texts vertically starting at y (fraction), gap in base px
    stack(els, y, gap = 24) { let cy = y * H; els.forEach(e => { e.y = Math.round(cy); cy += e.h + gap * S; }); return els; },
  };
  return api;
}
const handle = () => Brand.data.handle || '@mindea';
const TEMPLATES = [
  { id: 'founder-quote', name: 'Founder Quote', cat: 'Persönlich', tags: ['portrait', 'founder'], build(b) {
    return { bg: { color: C.ivory }, els: [b.g('quote', 0.5, 0.24, 0.14, { color: C.gold }), b.t('quote', '„Ich habe Mindéa gegründet, weil Marken mehr verdienen als laute Werbung.“', { w: 0.76, yc: 0.48, size: 76 }), b.s('line', 0.44, 0.69, 0.12, 0.002, { stroke: C.gold, strokeW: 2 }), b.t('subheadline', 'Ivana · Gründerin von Mindéa', { yc: 0.74, size: 26, color: C.espresso }), b.t('wordmark', 'MINDÉA', { yc: 0.92, size: 34, w: 0.4 })] };
  } },
  { id: 'founder-story', name: 'Founder Story', cat: 'Persönlich', tags: ['portrait', 'founder', 'workspace'], build(b) {
    const tall = b.H / b.W > 1.1;
    return { bg: { color: C.cream }, els: tall ? [b.img(0, 0, 1, 0.56, { tags: ['portrait', 'founder'] }), b.t('subheadline', 'Meine Geschichte', { x: 0.08, w: 0.84, y: 0.6, size: 24, align: 'left', color: C.gold }), b.t('headline', 'Warum ich Mindéa gegründet habe', { x: 0.08, w: 0.84, y: 0.64, size: 80, align: 'left' }), b.t('body', 'Ein ruhiger Blick hinter die Kulissen – und was ich daraus für deine Marke gelernt habe.', { x: 0.08, w: 0.78, y: 0.83, size: 30, align: 'left', color: C.espresso })]
      : [b.img(0, 0, 0.5, 1, { tags: ['portrait', 'founder'] }), b.t('subheadline', 'Meine Geschichte', { x: 0.55, w: 0.4, y: 0.25, size: 22, align: 'left', color: C.gold }), b.t('headline', 'Warum ich Mindéa gegründet habe', { x: 0.55, w: 0.4, y: 0.32, size: 64, align: 'left' }), b.t('body', 'Ein ruhiger Blick hinter die Kulissen.', { x: 0.55, w: 0.4, y: 0.66, size: 26, align: 'left', color: C.espresso })] };
  } },
  { id: 'expert-tip', name: 'Experten-Tipp', cat: 'Wissen', build(b) {
    return { bg: { color: C.espresso }, els: [b.t('subheadline', 'Experten-Tipp', { yc: 0.18, size: 24, color: C.lightgold }), b.g('sparkle', 0.5, 0.26, 0.04, { color: C.lightgold }), b.t('headline', 'Zeig zuerst das Gefühl – dann das Angebot.', { w: 0.8, yc: 0.46, size: 90, color: C.ivory }), b.s('line', 0.42, 0.62, 0.16, 0.002, { stroke: C.gold, strokeW: 2 }), b.t('body', 'Menschen entscheiden in Sekunden, ob sich eine Marke richtig anfühlt. Bilder und Bewegung erzählen das schneller als jeder Text.', { w: 0.72, yc: 0.74, size: 30, color: C.sand }), b.t('subheadline', handle(), { yc: 0.93, size: 20, color: C.sand })] };
  } },
  { id: 'myth', name: 'Mythos vs Realität', cat: 'Wissen', build(b) {
    return { bg: { color: C.cream }, els: [b.s('rect', 0, 0.5, 1, 0.5, { fill: C.black, role: 'dark' }), b.t('subheadline', 'Mythos', { yc: 0.12, size: 24, color: C.gold }), b.t('headline', 'Für eine starke Marke brauchst du ein großes Budget.', { w: 0.8, yc: 0.29, size: 66, color: C.black }), b.t('subheadline', 'Realität', { yc: 0.62, size: 24, color: C.lightgold }), b.t('headline', 'Du brauchst Klarheit – und Bilder, die sie zeigen.', { w: 0.8, yc: 0.79, size: 66, color: C.ivory })] };
  } },
  { id: 'three-tips', name: '3 Tipps', cat: 'Wissen', build(b) {
    const els = [b.t('subheadline', '3 Tipps', { y: 0.1, size: 24, color: C.gold }), b.t('headline', 'für eine Marke, die sofort wirkt', { w: 0.8, y: 0.14, size: 72 })];
    ['Ein Gefühl statt zehn Botschaften.', 'Wiederkehrende Farben & Schriften.', 'Echte Bilder deiner Arbeit.'].forEach((tx, i) => { const y = 0.4 + i * 0.17; els.push(b.t('number', '0' + (i + 1), { x: 0.1, w: 0.18, y, size: 90, align: 'left', color: C.gold }), b.t('body', tx, { x: 0.3, w: 0.6, y: y + 0.025, size: 34, align: 'left', color: C.black, weight: 400 }), b.s('line', 0.1, y + 0.135, 0.8, 0.001, { stroke: C.sand, strokeW: 2 })); });
    return { bg: { color: C.ivory }, els };
  } },
  { id: 'five-mistakes', name: '5 Fehler', cat: 'Wissen', build(b) {
    const els = [b.t('headline', '5 Fehler, die deine Marke unsichtbar machen', { w: 0.82, y: 0.08, size: 66 })];
    ['Zu viele Farben', 'Kein klares Gefühl', 'Stockfotos statt echter Bilder', 'Jeder Post sieht anders aus', 'Kein Call-to-Action'].forEach((tx, i) => { const y = 0.36 + i * 0.11; els.push(b.t('number', String(i + 1), { x: 0.12, w: 0.1, y, size: 56, align: 'left', color: C.gold }), b.t('body', tx, { x: 0.24, w: 0.66, y: y + 0.012, size: 34, align: 'left', weight: 400, color: C.black })); });
    els.push(b.t('subheadline', 'Speichern für später', { yc: 0.94, size: 20, color: C.espresso }));
    return { bg: { color: C.cream }, els };
  } },
  { id: 'before-after', name: 'Vorher / Nachher', cat: 'Projekte', tags: ['client', 'branding'], build(b) {
    const tall = b.H / b.W > 1.1;
    const els = tall ? [b.img(0.06, 0.12, 0.88, 0.37, { tags: ['client'] }), b.img(0.06, 0.53, 0.88, 0.37, { tags: ['branding'] }), b.t('badge', 'Vorher', { x: 0.09, w: 0.26, y: 0.14, size: 20, color: C.black, bg: { color: C.ivory, radius: 999, opacity: 0.92 } }), b.t('badge', 'Nachher', { x: 0.09, w: 0.28, y: 0.55, size: 20, color: C.ivory, bg: { color: C.black, radius: 999, opacity: 0.92 } }), b.t('subheadline', 'Transformation', { yc: 0.06, size: 22, color: C.gold })]
      : [b.img(0.04, 0.16, 0.45, 0.72), b.img(0.51, 0.16, 0.45, 0.72), b.t('badge', 'Vorher', { x: 0.06, w: 0.16, y: 0.19, size: 18, color: C.black, bg: { color: C.ivory, radius: 999 } }), b.t('badge', 'Nachher', { x: 0.53, w: 0.18, y: 0.19, size: 18, color: C.ivory, bg: { color: C.black, radius: 999 } }), b.t('subheadline', 'Transformation', { yc: 0.08, size: 22, color: C.gold })];
    return { bg: { color: C.ivory }, els };
  } },
  { id: 'testimonial', name: 'Kundenstimme', cat: 'Projekte', tags: ['client', 'portrait'], build(b) {
    return { bg: { color: C.ivory }, els: [b.g('sparkles', 0.5, 0.17, 0.08, { color: C.gold }), b.t('quote', '„Endlich fühlt sich meine Marke so an, wie ich bin. Die Anfragen kamen von ganz allein.“', { w: 0.78, yc: 0.43, size: 64 }), (() => { const w = 150 * b.S / b.W, hh = 150 * b.S / b.H; return b.img(0.5 - w / 2, 0.6, w, hh, { radius: 999, tags: ['client', 'portrait'] }); })(), b.t('subheadline', 'Sarah M. · Coach', { yc: 0.75, size: 22, color: C.espresso }), b.t('wordmark', 'MINDÉA', { yc: 0.92, size: 28, w: 0.4 })] };
  } },
  { id: 'case-study', name: 'Case Study', cat: 'Projekte', tags: ['client', 'branding'], build(b) {
    const els = [b.img(0, 0, 1, 0.5, { tags: ['client', 'branding'] }), b.t('subheadline', 'Case Study', { x: 0.08, w: 0.84, y: 0.55, size: 22, align: 'left', color: C.gold }), b.t('headline', 'Atelier Nora – neue Markenpräsenz', { x: 0.08, w: 0.84, y: 0.59, size: 64, align: 'left' })];
    [['+38 %', 'Reichweite'], ['3×', 'mehr Anfragen'], ['14 Tage', 'Umsetzung']].forEach(([n, l], i) => { els.push(b.t('number', n, { x: 0.08 + i * 0.29, w: 0.27, y: 0.77, size: 60, align: 'left', color: C.gold }), b.t('body', l, { x: 0.08 + i * 0.29, w: 0.27, y: 0.86, size: 24, align: 'left', color: C.espresso })); });
    return { bg: { color: C.ivory }, els };
  } },
  { id: 'offer', name: 'Angebot', cat: 'Angebot', build(b) {
    const els = [b.t('subheadline', 'Neues Angebot', { yc: 0.12, size: 22, color: C.gold }), b.t('headline', 'Dein Markenfilm in 14 Tagen', { w: 0.82, yc: 0.26, size: 80 })];
    ['Konzept & Skript', 'Cinematic Schnitt', 'Formate für alle Kanäle'].forEach((tx, i) => els.push(b.g('check', 0.2, 0.45 + i * 0.08, 0.045, { color: C.gold }), b.t('body', tx, { x: 0.26, w: 0.6, yc: 0.45 + i * 0.08, size: 32, align: 'left', weight: 400, color: C.black })));
    els.push(b.t('cta', 'Jetzt anfragen', { w: 0.5, yc: 0.8, size: 24 }), b.t('subheadline', handle(), { yc: 0.92, size: 20, color: C.espresso }));
    return { bg: { color: C.cream }, els };
  } },
  ...[['brand-presence', 'Brand Presence', '398 €', ['Kurzfilm für deine Marke', 'Optimiert für Reels & Stories', 'Mindéa Cinematic Look']], ['brand-story', 'Brand Story', '598 €', ['Story-Film mit Voiceover', '5 Kapitel deiner Marke', 'Shotlist & Konzept']], ['brand-impact', 'Brand Impact', '898 €', ['Premium-Spot in 10 Szenen', 'Dramaturgie & Musik', 'Alle Formate inklusive']]].map(([id, n, price, feats]) => ({
    id, name: n, cat: 'Angebot', tags: ['branding', 'camera'], build(b) {
      const els = [b.s('roundrect', 0.08, 0.08, 0.84, 0.84, { fill: C.ivory, radius: 28 * b.S, role: 'panel' }), b.t('subheadline', 'Mindéa Paket', { yc: 0.17, size: 22, color: C.gold }), b.t('headline', n, { yc: 0.29, size: 92 }), b.t('number', price, { yc: 0.43, size: 70, color: C.gold })];
      feats.forEach((f, i) => els.push(b.t('body', f, { yc: 0.55 + i * 0.07, size: 30, color: C.espresso, weight: 400 })));
      els.push(b.t('cta', 'Termin sichern', { w: 0.46, yc: 0.82, size: 22 }));
      return { bg: { color: C.cream }, els };
    },
  })),
  { id: 'reel-cover', name: 'Reel Cover', cat: 'Reel & Story', tags: ['portrait', 'founder', 'camera'], build(b) {
    return { bg: { type: 'image', color: C.black, dim: 28, wantTags: ['portrait', 'founder'] }, els: [b.t('subheadline', 'Neues Reel', { yc: 0.6, size: 22, color: C.lightgold }), b.t('headline', 'So wirkt deine Marke in 3 Sekunden', { w: 0.84, yc: 0.7, size: 92, color: C.ivory }), b.t('wordmark', 'MINDÉA', { yc: 0.9, size: 28, w: 0.4, color: C.ivory })] };
  } },
  { id: 'story-cta', name: 'Story CTA', cat: 'Reel & Story', build(b) {
    return { bg: { color: C.black }, els: [b.t('subheadline', 'Neugierig?', { yc: 0.3, size: 24, color: C.lightgold }), b.t('headline', 'Lass uns deine Marke sichtbar machen.', { w: 0.8, yc: 0.42, size: 88, color: C.ivory }), b.g('arrow-curve', 0.5, 0.6, 0.12, { color: C.lightgold, rot: 80 }), b.t('cta', 'Schreib mir „Marke“', { w: 0.6, yc: 0.72, size: 24, color: C.black, bg: { color: C.lightgold, radius: 999 } }), b.t('subheadline', handle(), { yc: 0.86, size: 20, color: C.sand })] };
  } },
  { id: 'car-cover', name: 'Carousel Cover', cat: 'Karussell', build(b) {
    return { bg: { color: C.ivory }, els: [b.t('subheadline', handle(), { x: 0.08, w: 0.6, y: 0.07, size: 20, align: 'left', color: C.espresso }), b.t('headline', 'Warum leise Marken lauter wirken', { x: 0.08, w: 0.84, yc: 0.5, size: 104, align: 'left' }), b.s('line', 0.08, 0.72, 0.18, 0.002, { stroke: C.gold, strokeW: 3 }), b.t('subheadline', 'Swipe →', { x: 0.6, w: 0.32, yb: 0.93, size: 22, align: 'right', color: C.gold })] };
  } },
  { id: 'car-content', name: 'Carousel Content', cat: 'Karussell', build(b) {
    return { bg: { color: C.cream }, els: [b.t('number', '02', { x: 0.08, w: 0.3, y: 0.08, size: 110, align: 'left', color: C.gold }), b.t('headline', 'Ein Gefühl statt zehn Botschaften', { x: 0.08, w: 0.84, y: 0.32, size: 74, align: 'left' }), b.t('body', 'Wenn deine Marke alles sagen will, bleibt am Ende nichts hängen. Entscheide dich für ein Gefühl – und erzähle es konsequent.', { x: 0.08, w: 0.8, y: 0.56, size: 32, align: 'left', color: C.espresso }), b.t('subheadline', handle(), { x: 0.08, w: 0.5, yb: 0.94, size: 18, align: 'left', color: C.espresso })] };
  } },
  { id: 'car-cta', name: 'Carousel CTA', cat: 'Karussell', build(b) {
    return { bg: { color: C.black }, els: [b.g('sparkle', 0.5, 0.25, 0.05, { color: C.lightgold }), b.t('headline', 'Speichere dir den Beitrag.', { w: 0.8, yc: 0.42, size: 90, color: C.ivory }), b.t('body', 'Und schreib mir, wenn du deine Marke sichtbar machen möchtest.', { w: 0.7, yc: 0.58, size: 32, color: C.sand }), b.t('cta', 'Folge ' + handle(), { w: 0.56, yc: 0.75, size: 22, color: C.black, bg: { color: C.lightgold, radius: 999 } })] };
  } },
  { id: 'portfolio', name: 'Portfolio', cat: 'Projekte', tags: ['client', 'branding', 'product'], build(b) {
    const tall = b.H / b.W > 1.1;
    return { bg: { color: C.ivory }, els: tall ? [b.t('subheadline', 'Portfolio', { yc: 0.07, size: 22, color: C.gold }), b.img(0.06, 0.12, 0.88, 0.42, { tags: ['client'] }), b.img(0.06, 0.56, 0.43, 0.3, { tags: ['branding'] }), b.img(0.51, 0.56, 0.43, 0.3, { tags: ['product', 'detail'] }), b.t('headline', 'Ausgewählte Arbeiten', { yc: 0.93, size: 46 })]
      : [b.t('subheadline', 'Portfolio', { yc: 0.08, size: 20, color: C.gold }), b.img(0.04, 0.16, 0.44, 0.74), b.img(0.5, 0.16, 0.46, 0.36), b.img(0.5, 0.54, 0.46, 0.36)] };
  } },
  { id: 'bts', name: 'Behind the Scenes', cat: 'Persönlich', tags: ['behind-the-scenes', 'camera', 'workspace'], build(b) {
    const fw = 0.7, fh = fw * b.W / 0.84 / b.H; const x = 0.15, y = 0.12;
    return { bg: { color: C.sand }, els: [b.g('paper', 0.5, 0.5, 2.2, { color: C.cream }), b.img(x + fw * 0.06, y + fw * b.W * 0.06 / b.H, fw * 0.88, fh - fw * b.W * 0.06 / b.H - fh * 0.2, { tags: ['behind-the-scenes', 'camera', 'workspace'] }), b.g('polaroid', x + fw / 2, y + fh / 2, fh * b.H / Math.min(b.W, b.H), { color: C.white }), b.t('quote', 'behind the scenes', { yc: Math.min(0.9, y + fh + 0.08), size: 64, color: C.espresso }), b.g('arrow-curve', 0.78, Math.min(0.82, y + fh + 0.02), 0.1, { color: C.espresso, rot: 200 })] };
  } },
  { id: 'film-end', name: 'Markenfilm-Abspann', cat: 'Reel & Story', build(b) {
    return { bg: { color: C.black }, els: [b.t('wordmark', 'MINDÉA', { yc: 0.44, size: 84, w: 0.8, color: C.ivory }), b.s('line', 0.45, 0.52, 0.1, 0.001, { stroke: C.gold, strokeW: 2 }), b.t('quote', Brand.data.tagline, { w: 0.76, yc: 0.58, size: 40, color: C.sand }), b.t('subheadline', handle(), { yc: 0.86, size: 20, color: C.sand })] };
  } },
  { id: 'blank', name: 'Leere Seite', cat: 'Basis', build() { return { bg: { color: C.ivory }, els: [] }; } },
];
/** Build a page from a template; fills image slots with the best-matching own media. */
function buildTemplatePage(t, fmt, opts = {}) {
  const b = TB(fmt.w, fmt.h); const r = t.build(b);
  const pg = newPage(t.name, r.bg.color);
  Object.assign(pg.bg, r.bg); delete pg.bg.wantTags;
  pg.elements = r.els;
  if (opts.fillMedia !== false) {
    const used = new Set(opts.used || []);
    const slots = pg.elements.filter(e => e.type === 'image' && !e.mediaId);
    for (const s of slots) {
      const q = new Map((s.wantTags && s.wantTags.length ? s.wantTags : (t.tags || [])).map(x => [x, 1]));
      const ranked = Media.rank(q, { aspect: s.w / s.h, used });
      if (ranked.length && (ranked[0].rel > 0 || opts.anyImage)) { s.mediaId = ranked[0].m.id; s.name = ranked[0].m.name; s.alts = ranked.slice(0, 8).map(x => x.m.id); used.add(s.mediaId); }
    }
    if (r.bg.type === 'image') {
      const q = new Map((r.bg.wantTags || t.tags || []).map(x => [x, 1]));
      const ranked = Media.rank(q, { aspect: fmt.w / fmt.h, used });
      if (ranked.length) { pg.bg.mediaId = ranked[0].m.id; used.add(pg.bg.mediaId); } else { pg.bg.type = 'color'; pg.bg.color = C.espresso; }
    }
  }
  pg.elements.forEach(e => { delete e.wantTags; });
  return pg;
}
const _tplThumbCache = new Map();
function templateThumb(t, fmt, w) {
  const key = t.id + fmt.w + 'x' + fmt.h + w;
  let src = _tplThumbCache.get(key);
  if (!src) { const pg = buildTemplatePage(t, fmt, { fillMedia: false }); src = renderPageToCanvas(pg, fmt, w * 2); _tplThumbCache.set(key, src); }
  const c = makeCanvas(src.width, src.height); c.getContext('2d').drawImage(src, 0, 0); return c;
}

/* ── Magic Resize ────────────────────────────────────────────────────── */
function magicResizePage(pg, from, to) {
  const n = deepClone(pg); n.id = uid('pg');
  const sx = to.w / from.w, sy = to.h / from.h, s = Math.min(sx, sy);
  for (const el of n.elements) {
    el.id = uid('el');
    const full = el.w >= from.w * 0.9 && el.h >= from.h * 0.9;
    const fullW = el.w >= from.w * 0.9;
    const cx = (el.x + el.w / 2) / from.w, cy = (el.y + el.h / 2) / from.h;
    if (full) { el.x = 0; el.y = 0; el.w = to.w; el.h = to.h; continue; }
    if (el.type === 'text') { el.size = Math.max(8, Math.round(el.size * s)); el.w = Math.round(Math.min(to.w * 0.92, el.w * (fullW ? sx : s))); el.h = textMetrics(el).h; }
    else if (fullW && el.type === 'image') { el.w = to.w; el.h = Math.round(el.h * sy); }
    else { el.w = Math.round(el.w * s); el.h = Math.round(el.h * s); }
    if (el.strokeW) el.strokeW = Math.max(0.5, el.strokeW * s);
    if (el.radius && el.radius < 900) el.radius = Math.round(el.radius * s);
    el.x = Math.round(cx * to.w - el.w / 2); el.y = Math.round(cy * to.h - el.h / 2);
    // keep important content inside a safe margin
    const m = Math.min(to.w, to.h) * 0.03;
    if (!fullW) el.x = clamp(el.x, m, Math.max(m, to.w - el.w - m));
    el.y = clamp(el.y, fullW ? 0 : m, Math.max(m, to.h - el.h - (fullW ? 0 : m)));
  }
  return n;
}
async function magicResizeDialog() {
  const p = App.project; if (!p || p.type === 'video') { toast('Magic Resize funktioniert für Designs.', 'info'); return; }
  let target = 'story';
  const list = h('div', { class: 'opt-grid' });
  const draw = () => { clear(list); Object.entries(FORMATS).filter(([k]) => k !== 'custom').forEach(([k, f]) => list.appendChild(h('button', { class: 'opt' + (k === target ? ' on' : ''), type: 'button', onclick: () => { target = k; draw(); } }, h('b', null, f.label), h('span', null, f.w + ' × ' + f.h)))); };
  draw();
  const m = modal({ title: 'Magic Resize', icon: 'resize', cls: 'wide', content: [h('p', { class: 'muted', style: { marginTop: 0 } }, 'Erstellt eine Kopie deines Designs im neuen Format. Elemente werden proportional neu angeordnet, nichts Wichtiges wird abgeschnitten. Dein Original bleibt unverändert.'), list],
    actions: [{ label: 'Abbrechen' }, { label: 'Kopie erstellen', primary: true, icon: 'resize', onClick: async () => {
      const f = FORMATS[target]; const to = { w: f.w, h: f.h };
      const np = Projects.create({ type: p.type, formatKey: target, name: p.name + ' · ' + f.label, pages: p.pages.map(pg => magicResizePage(pg, p.format, to)) });
      await Projects.put(np); await setProject(np, 'design'); toast('Neues Format erstellt: ' + f.label, 'success');
    } }] });
  return m;
}

/* ── Smart Creator wizard ────────────────────────────────────────────── */
const SC_EXAMPLES = ['Instagram Reel über meine Gründung', 'Kundenprojekt zeigen', 'Angebot bewerben', 'Testimonial', 'Founder Story', '3 Tipps für Sichtbarkeit'];
function scIntent(text) {
  const s = text.toLowerCase();
  if (/testimon|kundenstimme|feedback|bewertung|review/.test(s)) return { tpl: 'testimonial', fmt: 'post45' };
  if (/angebot|paket|offer|preis|buchen|launch/.test(s)) return { tpl: 'offer', fmt: 'post45' };
  if (/kundenprojekt|case|projekt|referenz|portfolio/.test(s)) return { tpl: 'case-study', fmt: 'post45' };
  if (/vorher|nachher|before|after/.test(s)) return { tpl: 'before-after', fmt: 'post45' };
  if (/tipp|tips/.test(s)) return { tpl: 'three-tips', fmt: 'post45' };
  if (/fehler|mistake/.test(s)) return { tpl: 'five-mistakes', fmt: 'post45' };
  if (/mythos|myth/.test(s)) return { tpl: 'myth', fmt: 'post45' };
  if (/zitat|quote/.test(s)) return { tpl: 'founder-quote', fmt: 'post45' };
  if (/story|geschichte|gründ|founder/.test(s)) return { tpl: /reel|video/.test(s) ? 'reel-cover' : 'founder-story', fmt: /reel|video/.test(s) ? 'reel' : 'post45' };
  if (/behind|bts|kulissen/.test(s)) return { tpl: 'bts', fmt: 'story' };
  if (/reel|video|tiktok|short/.test(s)) return { tpl: 'reel-cover', fmt: 'reel' };
  return { tpl: 'founder-quote', fmt: 'post45' };
}
function smartCreator() {
  const st = { step: 0, what: '', fmt: 'post45', style: 'signature', media: [], headline: '', body: '', cta: '', tpl: 'founder-quote' };
  const steps = ['Idee', 'Format', 'Stil', 'Medien', 'Text', 'Erzeugen'];
  const body = h('div');
  const m = modal({ title: 'Smart Creator', icon: 'wand', cls: 'wide', content: body });
  const nav = (canNext = true, nextLabel = 'Weiter') => h('div', { class: 'row', style: { marginTop: '18px', justifyContent: 'space-between' } }, st.step ? btn('Zurück', () => { st.step--; draw(); }, { cls: 'ghost', icon: 'chevL' }) : h('span'), btn(nextLabel, () => { st.step++; draw(); }, { cls: 'primary', disabled: !canNext }));
  const draw = () => {
    clear(body);
    body.appendChild(h('div', { class: 'row', style: { gap: '6px', marginBottom: '16px', flexWrap: 'wrap' } }, steps.map((s, i) => h('span', { class: 'badge' + (i === st.step ? ' dark' : '') }, (i + 1) + ' ' + s))));
    if (st.step === 0) {
      const inp = h('textarea', { class: 'textarea', placeholder: 'Was möchtest du erstellen?', 'aria-label': 'Was möchtest du erstellen?', style: { minHeight: '80px' } }); inp.value = st.what;
      inp.addEventListener('input', () => { st.what = inp.value; nx.querySelector('.btn.primary').disabled = !st.what.trim(); });
      const ex = h('div', { class: 'chips', style: { marginTop: '10px' } }, SC_EXAMPLES.map(x => chip(x, false, () => { inp.value = st.what = x; nx.querySelector('.btn.primary').disabled = false; })));
      const nx = nav(!!st.what.trim());
      body.append(h('h3', { class: 'h2', style: { margin: '0 0 10px' } }, 'Was möchtest du erstellen?'), inp, ex, nx);
    } else if (st.step === 1) {
      if (st._i !== st.what) { const it = scIntent(st.what); st.tpl = it.tpl; st.fmt = it.fmt; st._i = st.what; }
      const g = h('div', { class: 'opt-grid' }); Object.entries(FORMATS).filter(([k]) => k !== 'custom').forEach(([k, f]) => g.appendChild(h('button', { class: 'opt' + (k === st.fmt ? ' on' : ''), type: 'button', onclick: () => { st.fmt = k; draw(); } }, h('b', null, f.label), h('span', null, f.w + ' × ' + f.h))));
      body.append(h('h3', { class: 'h2', style: { margin: '0 0 10px' } }, 'Format'), g, nav());
    } else if (st.step === 2) {
      const g = h('div', { class: 'opt-grid' }); Object.entries(BRAND_STYLES).forEach(([k, s]) => g.appendChild(h('button', { class: 'opt' + (k === st.style ? ' on' : ''), type: 'button', onclick: () => { st.style = k; draw(); }, style: { background: k === st.style ? '' : s.bg, color: k === st.style ? '' : s.text } }, h('b', { style: `font-family:'${s.head}';font-size:18px` }, s.l), h('span', { style: { color: 'inherit', opacity: .7 } }, s.head + ' · ' + s.body))));
      const tg = h('div', { class: 'opt-grid', style: { marginTop: '14px' } }); TEMPLATES.filter(t => t.id !== 'blank').forEach(t => tg.appendChild(h('button', { class: 'opt' + (t.id === st.tpl ? ' on' : ''), type: 'button', onclick: () => { st.tpl = t.id; draw(); } }, h('b', null, t.name), h('span', null, t.cat))));
      body.append(h('h3', { class: 'h2', style: { margin: '0 0 10px' } }, 'Stil'), g, h('div', { class: 'lbl', style: { marginTop: '16px' } }, 'Layout (automatisch vorgeschlagen)'), tg, nav());
    } else if (st.step === 3) {
      const imgs = Media.list.filter(x => x.kind === 'image' || x.kind === 'video').slice(0, 60);
      const g = h('div', { class: 'media-grid' });
      imgs.forEach(mm => { const c = h('div', { class: 'mcard' + (st.media.includes(mm.id) ? ' sel' : ''), role: 'button', tabindex: '0', 'aria-label': mm.name, onclick: () => { st.media = st.media.includes(mm.id) ? st.media.filter(x => x !== mm.id) : [...st.media, mm.id]; c.classList.toggle('sel'); } }, h('div', { class: 'check', html: icon('check', 's') }), h('div', { class: 'mth' }, h('img', { src: Media.thumbURL(mm), alt: '', loading: 'lazy' }))); g.appendChild(c); });
      body.append(h('h3', { class: 'h2', style: { margin: '0 0 6px' } }, 'Medien auswählen'), h('p', { class: 'muted small', style: { marginTop: 0 } }, 'Optional. Ohne Auswahl sucht Mindéa passende Bilder aus deiner Mediathek.'),
        imgs.length ? g : emptyState('media', 'Mediathek leer', 'Du kannst trotzdem fortfahren – Platzhalter lassen sich später ersetzen.', btn('Medien importieren', async () => { await Media.import(await pickFiles('image/*,video/*')); draw(); }, { cls: 'primary', icon: 'upload' })), nav());
    } else if (st.step === 4) {
      if (!st.headline) st.headline = st.what.replace(/^(instagram\s+)?(reel|post|story)\s+(über|zu)\s+/i, '').replace(/^./, c => c.toUpperCase());
      const hl = h('input', { class: 'input', value: st.headline, 'aria-label': 'Headline' }); hl.addEventListener('input', () => st.headline = hl.value);
      const bd = h('textarea', { class: 'textarea', 'aria-label': 'Text' }); bd.value = st.body; bd.addEventListener('input', () => st.body = bd.value);
      const ct = h('input', { class: 'input', value: st.cta, placeholder: 'z. B. Schreib mir „Marke“', 'aria-label': 'CTA' }); ct.addEventListener('input', () => st.cta = ct.value);
      const aiBtn = btn(AI.connected() ? 'Mit KI formulieren' : 'KI-Verbindung erforderlich', async () => {
        if (!AI.connected()) { showView('ai'); m.close(); return; }
        setBtnBusy(aiBtn, true);
        try { const r = await AI.json(`Schreibe Text für einen Social-Media-Post (${FORMATS[st.fmt].label}) zum Thema: "${st.what}". Marke: Mindéa – Quiet Luxury, warm, klar, ruhig, nicht marktschreierisch. Deutsch. Antworte als JSON {"headline": "max 8 Wörter", "body": "max 28 Wörter", "cta": "max 5 Wörter"}.`, { maxTokens: 600 });
          st.headline = r.headline || st.headline; st.body = r.body || st.body; st.cta = r.cta || st.cta; draw(); } catch (e) { toast(friendlyError(e, 'KI'), 'error'); }
        setBtnBusy(aiBtn, false);
      }, { cls: AI.connected() ? '' : 'ghost', icon: 'ai' });
      body.append(h('h3', { class: 'h2', style: { margin: '0 0 10px' } }, 'Text'), field('Headline', hl), field('Text (optional)', bd), field('CTA (optional)', ct), aiBtn, nav(true, 'Erzeugen'));
    } else {
      body.appendChild(h('div', { class: 'row', style: { gap: '12px', padding: '20px 0' } }, h('div', { class: 'spinner lg' }), h('div', null, 'Design wird erzeugt …')));
      createFromWizard(st).then(() => m.close()).catch(e => { toast(friendlyError(e), 'error'); st.step = 4; draw(); });
    }
  };
  draw();
}
async function createFromWizard(st) {
  const f = FORMATS[st.fmt];
  const vids = st.media.map(id => Media.get(id)).filter(x => x && x.kind === 'video');
  if (['reel', 'tiktok', 'short', 'story'].includes(st.fmt) && vids.length) {
    const p = Projects.create({ type: 'video', formatKey: st.fmt, name: st.headline || st.what });
    vids.forEach(v => p.video.main.push(newClip(v)));
    if (st.headline) { const t = mkText('headline', f.w, f.h, { text: st.headline, color: C.ivory, size: Math.round(f.w * 0.075) }); t.y = Math.round(f.h * 0.2); t.shadow.on = true; p.video.items.push(newItem('text', { start: 0, dur: 3, el: t, anim: 'slideUp', name: st.headline })); }
    applyStyleToVideo(p, st.style);
    await Projects.put(p); await setProject(p, 'video'); toast('Video-Projekt erstellt – füge jetzt Untertitel oder Musik hinzu.', 'success'); return;
  }
  const t = TEMPLATES.find(x => x.id === st.tpl) || TEMPLATES[0];
  const imgIds = st.media.filter(id => Media.get(id)?.kind === 'image');
  const fmt = { w: f.w, h: f.h };
  const pg = buildTemplatePage(t, fmt, { used: [] });
  // user-chosen images first
  pg.elements.filter(e => e.type === 'image').forEach((e, i) => { if (imgIds[i]) { e.mediaId = imgIds[i]; e.alts = imgIds; } });
  if (pg.bg.type === 'image' && imgIds[0]) pg.bg.mediaId = imgIds[0];
  const texts = pg.elements.filter(e => e.type === 'text');
  const head = texts.find(e => e.role === 'headline' || e.role === 'quote'); if (head && st.headline) { head.text = head.role === 'quote' ? '„' + st.headline + '“' : st.headline; head.h = textMetrics(head).h; }
  const bd = texts.find(e => e.role === 'body'); if (bd && st.body) { bd.text = st.body; bd.h = textMetrics(bd).h; } else if (!bd && st.body && head) { const b2 = mkText('body', f.w, f.h, { text: st.body }); b2.y = head.y + head.h + f.h * 0.03; pg.elements.push(b2); }
  const cta = texts.find(e => e.role === 'cta'); if (cta && st.cta) { cta.text = st.cta; } else if (!cta && st.cta) { const c2 = mkText('cta', f.w, f.h, { text: st.cta }); c2.y = Math.round(f.h * 0.84); pg.elements.push(c2); }
  applyBrandStyle(pg, st.style);
  const p = Projects.create({ type: 'design', formatKey: st.fmt, name: st.headline || st.what, pages: [pg] });
  await Projects.put(p); await setProject(p, 'design');
  toast('Design erstellt – alles ist frei bearbeitbar.', 'success');
}
function applyStyleToVideo(p, styleKey) {
  const s = BRAND_STYLES[styleKey] || BRAND_STYLES.signature;
  p.video.cap.style = styleKey === 'editorial' ? 'editorial' : styleKey === 'warm' ? 'clean' : styleKey === 'dark' ? 'luxury' : 'mindea';
  p.video.items.forEach(it => { if (it.track === 'text' && it.el) { it.el.font = s.head; } if (it.track === 'graphics' && it.el) it.el.color = s.accent; });
}
function setBtnBusy(b, busy) { if (!b) return; b.disabled = busy; if (busy) { b.dataset.html = b.innerHTML; b.innerHTML = '<span class="spinner"></span>' + b.innerHTML; } else if (b.dataset.html) b.innerHTML = b.dataset.html; }
