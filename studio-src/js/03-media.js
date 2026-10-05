/* ═══════════════════════════════════════════════════════════════════════
   MODULE: MEDIA — library, import, object-URL cache, local image analysis,
   smart tags (filename/folder/manual/AI) and semantic matching.
   ═══════════════════════════════════════════════════════════════════════ */
const TAGS = {
  portrait: 'Portrait', founder: 'Gründerin', person: 'Person', team: 'Team', client: 'Kundin/Kunde', family: 'Familie',
  workspace: 'Arbeitsplatz', laptop: 'Laptop', desk: 'Schreibtisch', notebook: 'Notizbuch', coffee: 'Kaffee', camera: 'Kamera',
  studio: 'Studio', branding: 'Branding', logo: 'Logo', product: 'Produkt', packaging: 'Verpackung', jewelry: 'Schmuck',
  wedding: 'Hochzeit', flower: 'Blumen', outdoor: 'Draußen', nature: 'Natur', interior: 'Interior', detail: 'Detail',
  'behind-the-scenes': 'Behind the Scenes', process: 'Prozess', food: 'Food', fashion: 'Fashion', beauty: 'Beauty', city: 'Stadt',
  phone: 'Smartphone', book: 'Buch', hands: 'Hände', texture: 'Textur', event: 'Event', travel: 'Reise',
};
const MOODS = ['Luxury', 'Emotional', 'Founder', 'Cinematic', 'Calm', 'Elegant', 'Motivational'];
/** keyword stem → canonical tags (German + English). Used for filename tags AND text↔image matching. */
const SYNONYMS = [
  [/gründ|founder|gruender|selbstständ|selbststaend|unternehmer|chefin|inhaberin|ceo/, ['founder', 'portrait', 'workspace']],
  [/portr|gesicht|face|selfie|headshot|meine person/, ['portrait', 'person']],
  [/\b(ich|mich|mir)\b/, ['portrait'], 0.35],
  [/laptop|computer|macbook|rechner|bildschirm|screen/, ['laptop', 'workspace']],
  [/arbeitsplatz|workspace|büro|buero|office|homeoffice|schreibtisch|desk/, ['workspace', 'desk']],
  [/notiz|notebook|planer|planung|geplant|plan\b|schreib|journal|stift|kalender|konzept|idee/, ['notebook', 'desk']],
  [/kaffee|coffee|latte|cappuccino|café|cafe/, ['coffee']],
  [/kamera|camera|foto|photo|film|video|shooting|dreh|reel|aufnahme|content/, ['camera', 'behind-the-scenes']],
  [/marke|brand|branding|sichtbar|auftritt|identität|identity|design|logo|wirkung|präsenz|presence/, ['branding', 'logo', 'client']],
  [/kund|client|projekt|auftrag|case|referenz|testimonial|zusammenarbeit/, ['client', 'branding']],
  [/hochzeit|wedding|braut|bride|trauung/, ['wedding', 'flower']],
  [/schmuck|jewel|\bringe?\b|halskette|necklace|ohrring/, ['jewelry', 'detail', 'product']],
  [/blume|flower|floral|strauß|bouquet|rose/, ['flower']],
  [/produkt|product|\bartikel|\bshop\b|onlineshop/, ['product', 'detail']],
  [/verpack|packag|\bbox\b|karton|versand/, ['packaging', 'product']],
  [/familie|family|mama|mutter|kind|kinder|baby|papa/, ['family', 'person']],
  [/\bteam|kolleg|mitarbeiter/, ['team', 'person']],
  [/draußen|draussen|outdoor|natur|nature|park|wald|meer|strand|beach|garten/, ['outdoor', 'nature']],
  [/studio|\bset\b|\blicht\b|\blight\b/, ['studio', 'behind-the-scenes']],
  [/behind|bts|hinter den kulissen|kulisse|prozess|process|making|entstehung|arbeit\b|arbeite/, ['behind-the-scenes', 'process']],
  [/interior|wohnung|raum|zimmer|einrichtung|home\b/, ['interior']],
  [/hände|haende|hands|hand\b/, ['hands', 'detail']],
  [/detail|nahaufnahme|close/, ['detail']],
  [/essen|food|kuchen|restaurant|küche/, ['food']],
  [/mode|fashion|kleid|outfit/, ['fashion']],
  [/beauty|kosmetik|makeup|haut|skincare/, ['beauty']],
  [/stadt|city|street|straße/, ['city']],
  [/handy|smartphone|iphone|phone|instagram|social/, ['phone']],
  [/buch|book|lesen/, ['book']],
  [/\bevent|veranstaltung|workshop|\bfeier/, ['event']],
  [/reise|travel|urlaub|trip/, ['travel', 'outdoor']],
];
function textToTags(text) {
  const s = String(text || '').toLowerCase();
  const out = new Map();
  for (const [re, tags, wt = 1] of SYNONYMS) if (re.test(s)) tags.forEach((t, i) => out.set(t, Math.max(out.get(t) || 0, (i === 0 ? 1 : 0.6) * wt)));
  return out; // Map tag → weight
}
function tagLabel(t) { return TAGS[t] || t; }

const Media = {
  list: [], urls: new Map(), imgs: new Map(), pending: new Map(),
  async load() { try { this.list = await DB.all('media'); } catch (e) { this.list = []; toast(friendlyError(e, 'Medien laden'), 'error'); } this.list.sort((a, b) => b.createdAt - a.createdAt); Bus.emit('media'); },
  get(id) { return this.list.find(m => m.id === id) || null; },
  byKind(k) { return this.list.filter(m => m.kind === k); },
  /** Object URL for a media blob; created once per session and cached. */
  async url(id) {
    if (this.urls.has(id)) return this.urls.get(id);
    if (this.pending.has('u' + id)) return this.pending.get('u' + id);
    const p = (async () => {
      const r = await DB.get('blobs', id);
      if (!r || !r.blob) throw new Error('Mediendatei fehlt');
      const u = URL.createObjectURL(r.blob); this.urls.set(id, u); this.pending.delete('u' + id); return u;
    })();
    this.pending.set('u' + id, p);
    return p;
  },
  async blob(id) { const r = await DB.get('blobs', id); return r && r.blob; },
  /** Decoded image for canvas drawing (sync accessor triggers async load + re-render). */
  imgSync(id) {
    if (!id) return null;
    const c = this.imgs.get(id); if (c) return c;
    if (!this.pending.has('i' + id)) {
      const p = this.url(id).then(loadImageURL).then(img => { this.imgs.set(id, img); this.pending.delete('i' + id); requestRender(); if (typeof requestVRender === 'function') requestVRender(); return img; })
        .catch(() => { this.pending.delete('i' + id); });
      this.pending.set('i' + id, p);
    }
    return null;
  },
  async img(id) { const c = this.imgs.get(id); if (c) return c; this.imgSync(id); return this.pending.get('i' + id) || this.imgs.get(id); },
  thumbURL(m) { if (!m || !m.thumb) return null; if (!m._thumbUrl) m._thumbUrl = URL.createObjectURL(m.thumb); return m._thumbUrl; },
  async save(m) { const { _thumbUrl, ...rest } = m; await DB.put('media', rest); },
  async update(id, patch) { const m = this.get(id); if (!m) return; Object.assign(m, patch); try { await this.save(m); } catch (e) { toast(friendlyError(e), 'error'); } Bus.emit('media'); },
  async remove(id) {
    try { await DB.del('media', id); await DB.del('blobs', id); } catch (e) { toast(friendlyError(e), 'error'); return; }
    const m = this.get(id); if (m && m._thumbUrl) URL.revokeObjectURL(m._thumbUrl);
    if (this.urls.has(id)) { URL.revokeObjectURL(this.urls.get(id)); this.urls.delete(id); }
    this.imgs.delete(id); this.list = this.list.filter(x => x.id !== id);
    GLCache.dropMedia(id);
    Bus.emit('media');
  },
  kindOf(file) {
    const t = file.type || '', n = (file.name || '').toLowerCase();
    if (t.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|heic|heif|bmp)$/.test(n)) return 'image';
    if (t.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv|avi)$/.test(n)) return 'video';
    if (t.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|oga|flac|opus)$/.test(n)) return 'audio';
    return null;
  },
  /**
   * Import files into the local library. Images are downscaled (max 2560px) to protect
   * storage; videos/audio are stored untouched (originals are never modified).
   */
  async import(files, opts = {}) {
    files = Array.from(files || []); if (!files.length) return [];
    const added = [], failed = [];
    const kill = files.length > 1 ? toast(`Importiere ${files.length} Dateien …`, 'info', { duration: 60000 }) : null;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const kind = this.kindOf(f);
      if (!kind) { failed.push({ f, why: 'Format nicht unterstützt' }); continue; }
      try {
        const rec = await this.importOne(f, kind, opts);
        added.push(rec);
        if (kill && i % 5 === 4) Bus.emit('media');
      } catch (e) {
        failed.push({ f, why: friendlyError(e) });
      }
    }
    kill && kill();
    Bus.emit('media');
    if (added.length) toast(`${added.length} ${added.length === 1 ? 'Datei' : 'Dateien'} importiert · lokal gespeichert`, 'success');
    if (failed.length) {
      const heic = failed.some(x => /\.hei[cf]$/i.test(x.f.name));
      toast(`${failed.length} Datei(en) nicht importiert: ${failed[0].f.name} – ${heic ? 'HEIC wird von diesem Browser nicht gelesen. Bitte als JPG exportieren (iPhone: Einstellungen › Kamera › Formate › „Maximale Kompatibilität“).' : failed[0].why}`, 'error', { duration: 9000 });
    }
    return added;
  },
  async importOne(f, kind, opts) {
    const id = uid('m');
    const rec = { id, name: f.name || (kind + '-' + id.slice(-4)), kind, type: f.type, size: f.size, createdAt: Date.now(), tags: [], aiTags: [], favorite: false, brandRole: opts.brandRole || null, folder: opts.folder || (f.webkitRelativePath ? f.webkitRelativePath.split('/').slice(0, -1).join('/') : ''), moods: [], analysis: null, desc: '' };
    let blob = f;
    if (kind === 'image') {
      const url = URL.createObjectURL(f);
      let img;
      try { img = await loadImageURL(url); } finally { URL.revokeObjectURL(url); }
      const maxSide = 2560;
      const sc = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      rec.w = Math.round(img.naturalWidth * sc); rec.h = Math.round(img.naturalHeight * sc); rec.origW = img.naturalWidth; rec.origH = img.naturalHeight;
      const keepPng = /png|webp|gif/.test(f.type) && opts.keepAlpha !== false;
      if (sc < 1 || /heic|heif|avif|bmp/.test(f.type)) {
        const c = makeCanvas(rec.w, rec.h); c.getContext('2d').drawImage(img, 0, 0, rec.w, rec.h);
        blob = await canvasToBlob(c, keepPng ? 'image/png' : 'image/jpeg', 0.92); rec.type = blob.type;
      }
      const tc = makeCanvas(Math.round(rec.w * Math.min(1, 360 / Math.max(rec.w, rec.h))), Math.round(rec.h * Math.min(1, 360 / Math.max(rec.w, rec.h))));
      tc.getContext('2d').drawImage(img, 0, 0, tc.width, tc.height);
      rec.thumb = await canvasToBlob(tc, keepPng ? 'image/png' : 'image/jpeg', 0.82);
      rec.analysis = await analyzeImage(img);
    } else if (kind === 'video') {
      const meta = await probeVideo(f);
      Object.assign(rec, { w: meta.w, h: meta.h, duration: meta.duration, thumb: meta.thumb, analysis: meta.analysis, hasAudio: meta.hasAudio });
    } else {
      rec.duration = await probeAudio(f);
    }
    // smart tags from filename + folder (e.g. "Hochzeit Anna/IMG_laptop.jpg")
    const nameTags = textToTags((rec.folder || '') + ' ' + rec.name.replace(/[_\-.]/g, ' '));
    rec.tags = Array.from(nameTags.keys()).slice(0, 6);
    if (opts.tags) rec.tags = Array.from(new Set([...rec.tags, ...opts.tags]));
    if (kind === 'audio' && opts.moods) rec.moods = opts.moods;
    await DB.put('blobs', { id, blob });
    await this.save(rec);
    this.list.unshift(rec);
    return rec;
  },
  /** Store a generated canvas/blob (frame grab, rendered slide) as a library image. */
  async addGenerated(blob, name, tags = []) {
    const file = new File([blob], name, { type: blob.type });
    const r = await this.importOne(file, 'image', { tags, keepAlpha: true });
    Bus.emit('media');
    return r;
  },
  /** Ranking: relevance ⟶ quality ⟶ aspect fit ⟶ calm text area ⟶ brand warmth, minus repetition. */
  rank(queryTags, opts = {}) {
    const { kind = 'image', aspect = 0.8, exclude = new Set(), used = new Set(), allowVideo = false } = opts;
    const pool = this.list.filter(m => (m.kind === kind || (allowVideo && m.kind === 'video')) && !exclude.has(m.id) && m.brandRole !== 'logo' && m.brandRole !== 'icon' && m.brandRole !== 'watermark');
    const res = [];
    for (const m of pool) {
      const tags = new Set([...(m.tags || []), ...(m.aiTags || [])]);
      let rel = 0;
      for (const [t, w] of queryTags) if (tags.has(t)) rel += w;
      if (m.desc) { const dt = textToTags(m.desc); for (const [t, w] of queryTags) if (dt.has(t)) rel += w * 0.5; }
      const a = m.analysis || {};
      const q = clamp((a.sharp || 0.5) * 0.7 + Math.min(1, (m.w || 1000) / 1600) * 0.3, 0, 1);
      const ar = m.w && m.h ? m.w / m.h : 1;
      const fit = 1 - Math.min(1, Math.abs(Math.log(ar / aspect)) / 1.2);
      const calm = a.calm != null ? a.calm : 0.5;
      const warm = a.warmth != null ? clamp(0.5 + a.warmth * 2, 0, 1) : 0.5;
      let score = rel * 3 + q * 0.6 + fit * 0.5 + calm * 0.4 + warm * 0.3 + (m.favorite ? 0.35 : 0);
      if (used.has(m.id)) score -= 2.5;
      res.push({ m, score, rel });
    }
    res.sort((a, b) => b.score - a.score);
    return res;
  },
};

/* ── Local image analysis (no network): brightness, warmth, saturation,
      sharpness, palette, 3×3 calm-grid for text placement, faces (if the
      browser offers FaceDetector) ─────────────────────────────────────── */
async function analyzeImage(src) {
  const sw = src.naturalWidth || src.videoWidth || src.width, sh = src.naturalHeight || src.videoHeight || src.height;
  const S = 96, w = sw >= sh ? S : Math.round(S * sw / sh), h = sw >= sh ? Math.round(S * sh / sw) : S;
  const c = makeCanvas(w, h), ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let sr = 0, sg = 0, sb = 0, sl = 0, ss = 0; const n = w * h; const lum = new Float32Array(n);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b; lum[p] = l;
    sr += r; sg += g; sb += b; sl += l; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); ss += mx ? (mx - mn) / mx : 0;
  }
  // sharpness: laplacian variance
  let lv = 0, lm = 0, cnt = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; const L = 4 * lum[i] - lum[i - 1] - lum[i + 1] - lum[i - w] - lum[i + w]; lm += L; lv += L * L; cnt++; }
  const lapVar = cnt ? lv / cnt - (lm / cnt) ** 2 : 0;
  // 3x3 grid mean/variance
  const grid = [];
  for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) {
    let m = 0, v = 0, k = 0;
    for (let y = Math.floor(gy * h / 3); y < Math.floor((gy + 1) * h / 3); y++) for (let x = Math.floor(gx * w / 3); x < Math.floor((gx + 1) * w / 3); x++) { const L = lum[y * w + x]; m += L; v += L * L; k++; }
    m /= k || 1; v = v / (k || 1) - m * m; grid.push({ m: round(m, 3), v: round(Math.max(0, v), 4) });
  }
  // palette: coarse histogram of quantized colors
  const hist = new Map();
  for (let i = 0; i < d.length; i += 16) { const k = (d[i] >> 5) << 6 | (d[i + 1] >> 5) << 3 | (d[i + 2] >> 5); hist.set(k, (hist.get(k) || 0) + 1); }
  const palette = Array.from(hist.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => rgbToHex(((k >> 6) & 7) * 32 + 16, ((k >> 3) & 7) * 32 + 16, (k & 7) * 32 + 16));
  const meanV = grid.reduce((s, g) => s + g.v, 0) / 9;
  const res = {
    lum: round(sl / n, 3), warmth: round((sr - sb) / n, 3), sat: round(ss / n, 3), sharp: round(clamp(Math.sqrt(lapVar) * 9, 0, 1), 3),
    palette, grid, calm: round(clamp(1 - Math.sqrt(Math.min(...grid.map(g => g.v))) * 6, 0, 1), 3), busy: round(clamp(Math.sqrt(meanV) * 5, 0, 1), 3), faces: [],
  };
  try {
    if ('FaceDetector' in window) {
      const fd = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 4 });
      const big = makeCanvas(Math.min(640, sw), Math.round(Math.min(640, sw) * sh / sw)); big.getContext('2d').drawImage(src, 0, 0, big.width, big.height);
      const faces = await fd.detect(big);
      res.faces = faces.map(f => ({ x: round(f.boundingBox.x / big.width, 3), y: round(f.boundingBox.y / big.height, 3), w: round(f.boundingBox.width / big.width, 3), h: round(f.boundingBox.height / big.height, 3) }));
    }
  } catch (e) { }
  return res;
}
/** Find the calmest band (top / middle / bottom) for text; avoids faces. */
function textZoneFor(m) {
  const a = m && m.analysis; if (!a || !a.grid) return { zone: 'bottom', dark: true, overlay: true };
  const rows = [0, 1, 2].map(r => { const g = a.grid.slice(r * 3, r * 3 + 3); return { r, v: g.reduce((s, x) => s + x.v, 0) / 3, m: g.reduce((s, x) => s + x.m, 0) / 3 }; });
  for (const f of a.faces || []) { const fr = clamp(Math.floor((f.y + f.h / 2) * 3), 0, 2); rows[fr].v += 1; }
  const best = rows.slice().sort((x, y) => (x.v - y.v) || (y.r === 0 ? 1 : -1))[0];
  return { zone: ['top', 'middle', 'bottom'][best.r], dark: best.m > 0.55, overlay: best.v > 0.012 || (best.m > 0.35 && best.m < 0.65) };
}

/* ── Video / audio probing ───────────────────────────────────────────── */
function probeVideo(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video'); v.preload = 'auto'; v.muted = true; v.playsInline = true; v.src = url;
    let done = false;
    const fail = (e) => { if (done) return; done = true; URL.revokeObjectURL(url); rej(e || new Error('Video nicht unterstützt')); };
    const to = setTimeout(() => fail(new Error('Video konnte nicht gelesen werden (Zeitüberschreitung). Format evtl. nicht unterstützt')), 20000);
    v.onerror = () => { clearTimeout(to); fail(new Error('Videoformat wird von diesem Browser nicht unterstützt')); };
    v.onloadedmetadata = () => {
      let dur = v.duration;
      const seekTo = isFinite(dur) && dur > 0 ? Math.min(0.6, dur / 3) : 0.1;
      const grab = async () => {
        if (done) return;
        try {
          if (!isFinite(dur) || !dur) dur = v.duration;
          const W = v.videoWidth || 1080, H = v.videoHeight || 1920;
          const sc = Math.min(1, 360 / Math.max(W, H));
          const c = makeCanvas(W * sc, H * sc); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
          const thumb = await canvasToBlob(c, 'image/jpeg', 0.8);
          const analysis = await analyzeImage(v).catch(() => null);
          const hasAudio = v.mozHasAudio !== undefined ? v.mozHasAudio : (v.audioTracks ? v.audioTracks.length > 0 : undefined);
          done = true; clearTimeout(to); URL.revokeObjectURL(url);
          res({ w: W, h: H, duration: isFinite(dur) ? dur : 0, thumb, analysis, hasAudio });
        } catch (e) { clearTimeout(to); fail(e); }
      };
      v.onseeked = grab;
      if (!isFinite(dur)) { v.currentTime = 1e7; v.ontimeupdate = () => { v.ontimeupdate = null; dur = v.duration; v.currentTime = Math.min(0.6, dur / 3); }; }
      else v.currentTime = seekTo;
    };
  });
}
function probeAudio(file) {
  return new Promise((res) => {
    const url = URL.createObjectURL(file); const a = new Audio(); a.preload = 'metadata'; a.src = url;
    const fin = d => { URL.revokeObjectURL(url); res(isFinite(d) ? d : 0); };
    a.onloadedmetadata = () => fin(a.duration); a.onerror = () => fin(0); setTimeout(() => fin(a.duration), 8000);
  });
}

/** Decoded audio buffers (music/voice/waveforms/analysis), cached per media. */
const AudioCache = {
  map: new Map(), pending: new Map(),
  async get(id) {
    if (this.map.has(id)) return this.map.get(id);
    if (this.pending.has(id)) return this.pending.get(id);
    const p = (async () => {
      const blob = await Media.blob(id); if (!blob) throw new Error('Datei fehlt');
      const ab = await blob.arrayBuffer();
      const ctx = getAudioCtx();
      const buf = await new Promise((ok, no) => { const r = ctx.decodeAudioData(ab, ok, no); if (r && r.then) r.then(ok, no); });
      this.map.set(id, buf); this.pending.delete(id); return buf;
    })().catch(e => { this.pending.delete(id); throw e; });
    this.pending.set(id, p); return p;
  },
  peaks(id, n = 400) {
    const b = this.map.get(id); if (!b) return null;
    const key = id + ':' + n; if (this['_' + key]) return this['_' + key];
    const ch = b.getChannelData(0), step = Math.max(1, Math.floor(ch.length / n)), out = new Float32Array(n);
    for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step; j < Math.min(ch.length, (i + 1) * step); j += 16) m = Math.max(m, Math.abs(ch[j])); out[i] = m; }
    this['_' + key] = out; return out;
  },
};
