/* ═══════════════════════════════════════════════════════════════════════
   MODULE: MEDIA ANALYSIS + AUTO EDIT ENGINE + AUTO EDIT UI
   Real local analysis: voice activity (pauses), loudness, scene changes,
   color statistics, subject position. Optional: transcription (Whisper),
   language model (Claude) for hook/key statements. Everything lands in the
   timeline as normal, editable items. The original file is never touched.
   ═══════════════════════════════════════════════════════════════════════ */
const Analysis = {
  /** Voice activity detection on decoded audio → speech segments [s,e] (source time). */
  async speech(mediaId, onProgress) {
    const buf = await AudioCache.get(mediaId);
    const sr = buf.sampleRate, hop = Math.round(sr * 0.02), n = Math.floor(buf.length / hop);
    const chs = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
    const db = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0; const o = i * hop;
      for (let j = 0; j < hop; j += 2) { let v = 0; for (const c of chs) v += c[o + j] || 0; v /= chs.length; s += v * v; }
      db[i] = 10 * Math.log10(s / (hop / 2) + 1e-10);
      if (onProgress && i % 5000 === 0) onProgress(i / n);
    }
    const sorted = Array.from(db).sort((a, b) => a - b);
    const floor = sorted[Math.floor(sorted.length * 0.1)] ?? -60, peak = sorted[Math.floor(sorted.length * 0.98)] ?? -10;
    const thr = Math.max(floor + Math.min(12, (peak - floor) * 0.35), -52);
    // hysteresis + hangover
    const segs = []; let on = false, st = 0, last = 0;
    for (let i = 0; i < n; i++) {
      const t = i * 0.02;
      if (db[i] > thr) { if (!on) { on = true; st = t; } last = t; }
      else if (on && t - last > 0.18) { segs.push([Math.max(0, st - 0.04), last + 0.06]); on = false; }
    }
    if (on) segs.push([st, last + 0.06]);
    // merge tiny gaps, drop clicks
    const merged = [];
    for (const s of segs) { const p = merged[merged.length - 1]; if (p && s[0] - p[1] < 0.12) p[1] = s[1]; else merged.push(s.slice()); }
    const speech = merged.filter(s => s[1] - s[0] > 0.12).map(s => [round(s[0], 3), round(s[1], 3)]);
    // loudness of speech parts → normalization gain (target ≈ −18 dBFS RMS)
    let acc = 0, cnt = 0, pk = 0;
    for (const [a, b] of speech) for (let i = Math.floor(a / 0.02); i < Math.min(n, Math.ceil(b / 0.02)); i++) { acc += Math.pow(10, db[i] / 10); cnt++; }
    for (const c of chs) for (let i = 0; i < c.length; i += 64) pk = Math.max(pk, Math.abs(c[i]));
    const rms = cnt ? 10 * Math.log10(acc / cnt) : -30;
    const gain = clamp(Math.pow(10, (-18 - rms) / 20), 0.5, 4);
    return { speech, floor: round(floor, 1), rms: round(rms, 1), peak: round(20 * Math.log10(pk + 1e-9), 1), normGain: round(Math.min(gain, 0.98 / Math.max(pk, 0.05)) || 1, 3), duration: buf.duration };
  },
  /** Sample frames: color stats, scene changes, subject x-position (face or skin/saliency heuristic). */
  async frames(mediaId, onProgress) {
    const url = await Media.url(mediaId);
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('Video kann nicht analysiert werden')); setTimeout(res, 8000); });
    const md = Media.get(mediaId); const dur = isFinite(v.duration) && v.duration > 0 ? v.duration : (md && md.duration) || 0; if (!dur) return null;
    const step = clamp(dur / 60, 0.5, 2), W = 96, H = Math.max(2, Math.round(96 * (v.videoHeight || 9) / (v.videoWidth || 16)));
    const c = makeCanvas(W, H), ctx = c.getContext('2d', { willReadFrequently: true });
    const fd = 'FaceDetector' in window ? new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 }) : null; const big = fd ? makeCanvas(320, Math.round(320 * H / W)) : null;
    const samples = []; let prev = null; const scenes = [];
    let sumR = 0, sumG = 0, sumB = 0, lumHist = new Float32Array(32), nPix = 0;
    for (let t = Math.min(0.2, dur / 2); t < dur; t += step) {
      await new Promise(res => { const done = () => { v.removeEventListener('seeked', done); res(); }; v.addEventListener('seeked', done); v.currentTime = t; setTimeout(done, 1500); });
      ctx.drawImage(v, 0, 0, W, H); const d = ctx.getImageData(0, 0, W, H).data;
      let diff = 0, sx = 0, sw = 0; const rowSkin = new Float32Array(H);
      const lum = new Float32Array(W * H);
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        const r = d[i], g = d[i + 1], b = d[i + 2]; const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; lum[p] = L;
        sumR += r; sumG += g; sumB += b; lumHist[Math.min(31, Math.floor(L * 32))]++; nPix++;
        if (prev) diff += Math.abs(L - prev[p]);
        // skin-tone heuristic (YCbCr range) weighted toward center rows
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b, cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        if (cr > 135 && cr < 175 && cb > 85 && cb < 135 && r > 60) { const x = p % W; const y = Math.floor(p / W); const wgt = 1 - Math.abs(y / H - 0.4); sx += x * wgt; sw += wgt; rowSkin[y]++; }
      }
      if (prev) { const md = diff / (W * H); if (md > 0.16) scenes.push(round(t, 2)); }
      prev = lum;
      let x = sw > W * H * 0.01 ? sx / sw / W : null, src = 'skin', fy0 = null, fy1 = null;
      if (x != null) { // vertical extent of the skin region ≈ face (top of the blob, max 32 % of the height)
        const mx = Math.max(...rowSkin); const dense = []; for (let y = 0; y < H; y++) if (rowSkin[y] >= mx * 0.3 && rowSkin[y] >= 2) dense.push(y);
        if (dense.length) { fy0 = dense[0] / H; fy1 = Math.min(dense[dense.length - 1] + 1, dense[0] + H * 0.32) / H; }
      }
      if (fd) { try { big.getContext('2d').drawImage(v, 0, 0, big.width, big.height); const f = await fd.detect(big); if (f[0]) { const bb = f[0].boundingBox; x = (bb.x + bb.width / 2) / big.width; fy0 = bb.y / big.height; fy1 = (bb.y + bb.height * 1.15) / big.height; src = 'face'; } } catch (e) { } }
      // brightness of the caption band (lower third, centre) → readability box if bright
      let bl = 0, bn = 0; for (let y = Math.floor(H * 0.68); y < Math.floor(H * 0.86); y++) for (let xx = Math.floor(W * 0.3); xx < Math.floor(W * 0.7); xx++) { bl += lum[y * W + xx]; bn++; }
      samples.push({ t: round(t, 2), x: x == null ? null : round(x, 3), fy0: fy0 == null ? null : round(fy0, 3), fy1: fy1 == null ? null : round(fy1, 3), band: bn ? round(bl / bn, 3) : null, src });
      onProgress && onProgress(t / dur);
    }
    v.removeAttribute('src'); v.load();
    // percentiles of luminance
    const cum = []; let acc = 0; for (let i = 0; i < 32; i++) { acc += lumHist[i]; cum.push(acc / nPix); }
    const pct = q => (cum.findIndex(v2 => v2 >= q) + 0.5) / 32;
    return { color: { r: sumR / nPix / 255, g: sumG / nPix / 255, b: sumB / nPix / 255, p02: pct(0.02), p50: pct(0.5), p98: pct(0.98) }, scenes, samples, duration: dur, w: v.videoWidth, h: v.videoHeight };
  },
};
/** Per-video subject track (face/skin box + caption-band brightness), cached in the media record. */
async function ensureSubjectTrack(mediaId) {
  const m = Media.get(mediaId); if (!m) return null;
  if (m.analysis && m.analysis.track) return m.analysis.track;
  const kill = toast('Analysiere Bildinhalt (Gesichter & Helligkeit) …', 'info', { duration: 60000 });
  try { const fr = await Analysis.frames(mediaId); if (!fr) return null; await Media.update(mediaId, { analysis: Object.assign({}, m.analysis, { track: fr.samples }) }); return fr.samples; }
  catch (e) { return null; } finally { kill(); }
}
async function ensureSpeech(p) {
  let ok = false;
  for (const id of new Set(p.video.main.filter(c => c.kind === 'video').map(c => c.mediaId))) {
    const m = Media.get(id); if (!m) continue;
    if (m.analysis && m.analysis.speech) { ok = true; continue; }
    try { const k = toast('Analysiere Tonspur …', 'info', { duration: 30000 }); const a = await Analysis.speech(id); k(); await Media.update(id, { analysis: Object.assign({}, m.analysis, { speech: a.speech, normGain: a.normGain, rms: a.rms }) }); ok = true; }
    catch (e) { /* no audio track */ }
  }
  return ok;
}
async function ensureLoudness(p) {
  await ensureSpeech(p);
  const gains = p.video.main.map(c => Media.get(c.mediaId)?.analysis?.normGain).filter(Boolean);
  if (gains.length) p.video.audio.normGain = round(gains.reduce((a, b) => a + b, 0) / gains.length, 3);
}
/** Transcribe the main media of a project; stores transcript (source time). */
async function transcribeProject(p, onProgress) {
  const main = p.video.main.find(c => c.kind === 'video'); if (!main) { toast('Kein Video in der VIDEO-Spur.', 'info'); return false; }
  const r = await Transcriber.run(main.mediaId, { lang: AI.cfg.lang || 'auto', onProgress });
  if (!r.words.length) throw new Error('Es wurde keine Sprache erkannt.');
  p.video.transcript = { mediaId: main.mediaId, words: r.words, text: r.text || r.words.map(w => w.w).join(' '), source: r.source, estimated: r.estimated, timeline: false };
  commit('transcript');
  return true;
}

/* ── Contextual graphics & emoji rules ───────────────────────────────── */
const CONTEXT_RULES = [
  { re: /\b(drei|3|vier|4|fünf|5)\s+(dinge|tipps|fehler|schritte|gründe|punkte|wege|fragen|things|tips|steps|reasons)\b/i, g: 'numbers', pos: 'top', w: 3 },
  { re: /\b(wichtig|wichtigste|entscheidend|merk dir|important)\w*/i, g: 'underline', pos: 'caption', w: 2 },
  { re: /\b(idee|ideen|einfall|idea)\b/i, g: 'bulb', pos: 'side', w: 2 },
  { re: /\b(wachstum|wachsen|gewachsen|mehr kunden|mehr anfragen|steigen|gestiegen|growth|grow)\w*/i, g: 'growth', pos: 'side', w: 2 },
  { re: /\b(kundin|kunde|kunden|kundinnen|client|klientin)\b/i, g: 'person', pos: 'side', w: 1 },
  { re: /\b(marke|marken|brand|branding|logo)\b/i, g: 'brand-mark', pos: 'side', w: 1 },
  { re: /\b(geschafft|erledigt|fertig|genau so|richtig|done)\b/i, g: 'check', pos: 'side', w: 1 },
  { re: /\b(liebe|herz|love)\b/i, g: 'heart', pos: 'side', w: 1 },
  { re: /\b(kamera|filmen|foto|video|dreh)\w*/i, g: 'camera', pos: 'side', w: 1 },
  { re: /\b(besonders|magisch|magie|zauber|wow|special)\w*/i, g: 'sparkles', pos: 'side', w: 1 },
  { re: /\b(frage|fragst|warum|wieso|why)\b/i, g: 'thought', pos: 'side', w: 1 },
  { re: /\b(hier|ort|studio|standort)\b/i, g: 'pin', pos: 'side', w: 0.5 },
];
const EMOJI_RULES = [[/\b(liebe|herz|love|dankbar)\w*/i, '🤍'], [/\b(besonders|magisch|wow|special)\w*/i, '✨'], [/\b(idee|ideen|idea)\b/i, '💡'], [/\b(wachstum|wachsen|growth)\w*/i, '📈'], [/\b(kamera|filmen|video|dreh)\w*/i, '🎬'], [/\b(ziel|ziele|goal)\b/i, '🎯'], [/\b(geschafft|erfolg|success)\w*/i, '🥂']];
const AE_PRESETS = {
  founder: { l: 'Mindéa Founder', d: 'Ruhig, emotional, persönlich.', mode: 'cinematic', intensity: 'calm', look: 'mcine', cap: 'mindea', anim: 'fade', mood: ['Founder', 'Emotional', 'Calm'] },
  expert: { l: 'Mindéa Expert', d: 'Klar, hochwertig, fachlich.', mode: 'social', intensity: 'balanced', look: 'editorial', cap: 'clean', anim: 'fade', mood: ['Elegant', 'Calm'] },
  story: { l: 'Mindéa Story', d: 'Emotionaler Storytelling-Schnitt.', mode: 'cinematic', intensity: 'balanced', look: 'warm', cap: 'editorial', anim: 'slideUp', mood: ['Emotional', 'Cinematic'] },
  luxury: { l: 'Luxury Brand', d: 'Sehr clean, langsam, cinematic.', mode: 'clean', intensity: 'calm', look: 'quiet', cap: 'luxury', anim: 'fade', mood: ['Luxury', 'Elegant'] },
  dynamic: { l: 'Social Dynamic', d: 'Schneller und lebendiger.', mode: 'fast', intensity: 'dynamic', look: 'warm', cap: 'bold', anim: 'pop', mood: ['Motivational'] },
};
const AE_MODES = {
  clean: { l: 'Clean Cut', d: 'Nur Pausen und Leerlauf reduzieren.', minPause: 0.75, keep: 0.28, pre: 0.14, post: 0.22, fillers: false, punch: 0 },
  social: { l: 'Social Edit', d: 'Dynamischer Schnitt.', minPause: 0.36, keep: 0.1, pre: 0.08, post: 0.14, fillers: true, punch: 0.5 },
  cinematic: { l: 'Cinematic Founder', d: 'Ruhiger Premium-Schnitt mit Atempausen.', minPause: 1.0, keep: 0.38, pre: 0.16, post: 0.3, fillers: true, punch: 0.25, push: true },
  fast: { l: 'Fast Reel', d: 'Schneller Social-Media-Schnitt.', minPause: 0.24, keep: 0.05, pre: 0.05, post: 0.1, fillers: true, punch: 0.7 },
};
const AE_INTENSITY = { calm: { l: 'Ruhig', d: 'Wenige Einblendungen.', broll: 22, gfx: 18, zoomEvery: 3 }, balanced: { l: 'Balanced', d: 'Professionelle Social-Bearbeitung.', broll: 11, gfx: 9, zoomEvery: 2 }, dynamic: { l: 'Dynamisch', d: 'Mehr B-Roll, Zooms und Grafiken.', broll: 6, gfx: 5.5, zoomEvery: 1 } };
const FILLERS = /^(äh|ähm|öhm|öh|hm|hmm|ehm|em|uh|um|uhm|erm|mhm)[.,!?]*$/i;

/** Match an LLM suggestion (made on source sentences) to a timeline sentence by text. */
function llmFind(arr, s) {
  const n = x => CapEngine.clean(String(x).replace(/\s+/g, '')).slice(0, 22);
  const a = n(s.text); return arr.find(x => { const b = n(x.text || ''); return b && a && (a.startsWith(b.slice(0, 14)) || b.startsWith(a.slice(0, 14))); }) || null;
}
/** Build an auto-edited video state (draft) from a source media + analysis. */
function buildAutoEdit({ media, fmtKey, opts, audio, frames, transcript, llm }) {
  const f = FORMATS[fmtKey]; const mode = AE_MODES[opts.mode], inten = AE_INTENSITY[opts.intensity], preset = AE_PRESETS[opts.preset];
  const v = newVideoState(); const summary = []; const stats = { pauses: 0, removed: 0, fillers: 0, repeats: 0, captions: 0, broll: 0, gfx: 0, punch: 0, emoji: 0 };
  const dur = media.duration || (audio && audio.duration) || 0;
  // 1) keep ranges from speech + transcript-based cuts
  let keep = [[0, dur]];
  if (audio && audio.speech.length) {
    const sp = audio.speech; keep = [];
    let s = Math.max(0, sp[0][0] - mode.pre), e = sp[0][1] + mode.post;
    for (let i = 1; i < sp.length; i++) {
      const gap = sp[i][0] - sp[i - 1][1];
      if (gap > mode.minPause) { keep.push([s, Math.min(dur, e + mode.keep / 2)]); s = Math.max(0, sp[i][0] - mode.pre - mode.keep / 2); stats.pauses++; stats.removed += gap - mode.keep - mode.pre - mode.post; }
      e = sp[i][1] + mode.post;
    }
    keep.push([s, Math.min(dur, e)]);
  }
  const words = transcript ? transcript.words : null;
  if (words && mode.fillers) {
    const cuts = [];
    words.forEach((w, i) => { if (FILLERS.test(w.w) && w.e - w.s > 0.12) { cuts.push([w.s, w.e]); stats.fillers++; } });
    // immediate repeats (1–3 word n-grams): "ich habe ich habe" → drop first
    const norm = x => CapEngine.clean(x.w);
    for (let n = 3; n >= 1; n--) for (let i = 0; i + 2 * n <= words.length; i++) {
      let same = true; for (let k = 0; k < n; k++) if (norm(words[i + k]) !== norm(words[i + n + k]) || !norm(words[i + k])) { same = false; break; }
      if (same && words[i + n].s - words[i + n - 1].e < 0.8) { cuts.push([words[i].s - 0.02, words[i + n].s - 0.02]); stats.repeats++; i += n; }
    }
    for (const [a, b] of cuts) { const nk = []; for (const [s, e] of keep) { if (b <= s || a >= e) { nk.push([s, e]); continue; } if (a > s) nk.push([s, a]); if (b < e) nk.push([b, e]); } keep = nk; }
  }
  keep = keep.filter(([s, e]) => e - s > 0.3);
  if (!keep.length) keep = [[0, dur]];
  // 2) main clips (same media, jump cuts) + punch-ins + reframing + color
  const srcAR = (media.w || 16) / (media.h || 9), dstAR = f.w / f.h;
  const needReframe = opts.reframe && srcAR > dstAR * 1.15;
  let reframe = null;
  if (needReframe && frames && frames.samples.length) {
    // smooth subject track with deadzone → calm virtual camera, no jumpy moves
    let cur = null; const k = [];
    for (const s of frames.samples) { if (s.x == null) continue; if (cur == null) cur = s.x; const d = s.x - cur; if (Math.abs(d) > 0.06) cur += d * 0.35; k.push({ t: s.t, x: round(clamp(cur, 0.15, 0.85), 3) }); }
    reframe = k.length ? k : null;
  }
  let autoAdj = null;
  if (opts.color && frames && frames.color) {
    const c = frames.color, mean = (c.r + c.g + c.b) / 3;
    const wb = clamp(((c.b - c.r) / Math.max(0.05, mean)) * 60, -25, 25); // neutralize casts partially (keep skin warm)
    const bright = clamp((0.47 - c.p50) * 120, -25, 30);
    const contrast = clamp((0.78 - (c.p98 - c.p02)) * 40, -15, 18);
    const hl = c.p98 > 0.96 ? -18 : -6, sh = c.p02 < 0.03 ? 12 : 4;
    autoAdj = { warmth: round(wb * 0.5 + 4, 1), brightness: round(bright, 1), contrast: round(contrast, 1), highlights: hl, shadows: sh, saturation: c.r - c.b > 0.12 ? -8 : -2 };
  }
  const keyIdx = new Set((llm && llm.key_times) || []);
  keep.forEach(([a, b], i) => {
    const clip = newClip(media, { in: round(a, 3), out: round(b, 3), auto: true, name: media.name });
    clip.look = opts.color ? (opts.cinematic ? preset.look : 'original') : 'original';
    if (opts.cinematic) clip.adj = { vignette: 14, grain: 7 };
    if (autoAdj) clip.autoAdj = autoAdj;
    if (reframe) clip.reframe = reframe;
    if (opts.punch && mode.punch > 0 && i > 0) {
      const hasKey = Array.from(keyIdx).some(t => t >= a && t <= b);
      if (hasKey || i % inten.zoomEvery === 0) { clip.zoom = [1, 1.06, 1.12][(i + (hasKey ? 1 : 0)) % 3] || 1.06; if (clip.zoom > 1) stats.punch++; }
    }
    if (mode.push && opts.punch) { clip.zoomTo = (clip.zoom || 1) * 1.04; }
    v.main.push(clip);
  });
  if (v.main.length > 1 && opts.mode === 'cinematic') v.main.forEach((c, i) => { if (i) c.trans = { type: 'cross', dur: 0.18 }; });
  const tmpP = { format: { w: f.w, h: f.h }, video: v };
  // 3) captions
  const tlWords = words ? mapWordsToTimeline(tmpP, media.id, words) : null;
  if (opts.captions && tlWords && tlWords.length) {
    v.captions = CapEngine.segment(tlWords, opts.wordsPer || (opts.mode === 'fast' ? 3 : 4), { emphasis: true });
    if (transcript.estimated) v.captions.forEach(c => c.words = null);
    stats.captions = v.captions.length;
  }
  v.cap.style = preset.cap; v.cap.animation = preset.anim; v.cap.position = 'safe'; v.cap.highlight = true; v.cap.wordsPer = Math.min(4, opts.wordsPer || 4);
  // sentence list in timeline time (for b-roll / graphics / hook)
  const sentences = [];
  if (tlWords && tlWords.length) { let cur = []; tlWords.forEach((w, i) => { cur.push(w); if (/[.!?…]$/.test(w.w) || i === tlWords.length - 1 || (tlWords[i + 1] && tlWords[i + 1].s - w.e > 0.7)) { sentences.push({ text: cur.map(x => x.w).join(' '), s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; } }); }
  const total = videoDuration(tmpP);
  // 4) hook title (first seconds)
  const hook = llm && llm.hook ? llm.hook : null;
  if (opts.hookTitle && hook) {
    const t = mkText('headline', f.w, f.h, { text: hook, color: C.ivory, size: Math.round(f.w * 0.068), font: FONT_HEAD }); t.shadow.on = true; t.shadow.opacity = 0.45; t.h = textMetrics(t).h; t.y = Math.round(f.h * 0.14);
    v.items.push(newItem('text', { start: 0.15, dur: Math.min(3, total - 0.2), el: t, anim: 'slideUp', name: 'Hook', auto: true }));
  }
  // 5) B-roll from own library
  const used = new Set([media.id]);
  if (opts.broll && sentences.length) {
    let lastB = -99;
    sentences.forEach((s, i) => {
      if (s.s < 2.2 || s.s - lastB < inten.broll || s.e > total - 1) return;
      const sug = llmFind((llm && llm.broll) || [], s);
      const q = sug ? new Map(sug.tags.map(t => [String(t).toLowerCase(), 1])) : textToTags(s.text);
      if (!q.size) return;
      const ranked = Media.rank(q, { aspect: dstAR, used, allowVideo: true }).filter(r => r.rel > 0 && r.m.id !== media.id);
      if (!ranked.length) return;
      const m = ranked[0].m; used.add(m.id);
      const d = clamp((s.e - s.s) * 0.6, 1.8, opts.intensity === 'dynamic' ? 2.6 : 3.4);
      v.items.push(newItem('broll', { mediaId: m.id, name: m.name, start: round(s.s + 0.35, 2), dur: round(d, 2), in: m.kind === 'video' ? Math.min(1, (m.duration || 2) * 0.2) : 0, fade: 0.25, kb: true, look: preset.look, auto: true, alts: ranked.slice(0, 6).map(r => r.m.id) }));
      lastB = s.s; stats.broll++;
    });
  }
  // 6) contextual motion graphics (quality over quantity: strongest matches first, generous spacing)
  if (opts.graphics && sentences.length) {
    const cands = [];
    sentences.forEach((s, i) => {
      const gs = llmFind((llm && llm.graphics) || [], s);
      const rule = gs ? (CONTEXT_RULES.find(r => r.g === gs.kind) || { g: gs.kind, pos: 'side', w: 2 }) : CONTEXT_RULES.find(r => r.re.test(s.text));
      if (!rule || !GRAPHICS[rule.g]) return;
      cands.push({ s, i, rule, w: (rule.w || 1) + (gs ? 2 : 0) });
    });
    cands.sort((a, b) => b.w - a.w || a.s.s - b.s.s);
    const placed = []; const minStart = hook ? 3.2 : 0.4;
    for (const c of cands) {
      const s = c.s, kind = c.rule.g;
      if (s.s < minStart || s.e > total - 0.3) continue;
      if (placed.some(x => Math.abs(x - s.s) < inten.gfx)) continue;
      if (v.items.some(it => it.track === 'broll' && s.s + 0.3 < it.start + it.dur && s.s + 2.5 > it.start)) continue; // never stack on b-roll
      const el = mkGraphic(kind, f.w, f.h, { color: C.lightgold });
      if (c.rule.pos === 'top') { el.y = Math.round(f.h * 0.14); el.x = Math.round((f.w - el.w) / 2); el.index = 1; }
      else if (c.rule.pos === 'caption') { el.w = Math.round(f.w * 0.42); el.h = Math.round(el.w / 5); el.x = Math.round((f.w - el.w) / 2); el.y = Math.round(f.h * 0.68 + f.h * 0.045); }
      else { el.x = Math.round(f.w * (c.i % 2 ? 0.68 : 0.12)); el.y = Math.round(f.h * 0.3); }
      v.items.push(newItem('graphics', { start: round(s.s + 0.15, 2), dur: round(clamp(s.e - s.s, 1.6, 3), 2), el, drawDur: 0.8, name: GRAPHICS[kind].label, auto: true }));
      placed.push(s.s); stats.gfx++;
      if (placed.length >= Math.max(1, Math.round(total / inten.gfx))) break;
    }
  }
  // 7) emojis — restrained
  if (opts.emoji !== 'off' && v.captions.length) {
    const max = { minimal: 2, normal: Math.ceil(total / 15), social: Math.ceil(total / 6) }[opts.emoji] || 0; let last = -99;
    for (const c of v.captions) { if (stats.emoji >= max) break; const r = EMOJI_RULES.find(([re]) => re.test(c.text)); if (r && c.start - last > (opts.emoji === 'social' ? 5 : 12)) { c.emoji = r[1]; last = c.start; stats.emoji++; } }
  }
  // 8) music from own library by mood
  if (opts.music) {
    const tracks = Media.byKind('audio').filter(m => (m.moods || []).some(x => preset.mood.includes(x)));
    const pick = tracks[0] || null;
    if (pick) { v.items.push(newItem('audio', { mediaId: pick.id, name: pick.name, start: 0, dur: round(Math.min(total, pick.duration || total), 2), in: 0, volume: 0.42, fadeIn: 1.2, fadeOut: 2, auto: true })); summary.push('Musik „' + pick.name.replace(/\.[a-z0-9]+$/i, '') + '“ (' + preset.mood[0] + ') unter die Stimme gelegt'); }
  }
  // 9) audio
  v.audio.enhance = !!opts.enhance; v.audio.gate = !!opts.enhance && !!audio; v.audio.ducking = true; v.audio.duckLevel = 0.22;
  if (audio) v.audio.normGain = audio.normGain;
  if (opts.cinematic) { v.fadeIn = 0.4; v.fadeOut = 0.8; }
  const removedS = Math.max(0, dur - total);
  summary.unshift(...[
    stats.pauses ? `${stats.pauses} Pausen entfernt (${removedS.toFixed(1).replace('.', ',')} s kürzer)` : 'Keine langen Pausen gefunden',
    stats.fillers || stats.repeats ? `${stats.fillers} Füllwörter & ${stats.repeats} Wiederholungen geschnitten` : null,
    `${stats.captions} Untertitel erstellt`, `${stats.broll} B-Roll-Vorschläge aus deiner Mediathek`, `${stats.gfx} Motion Graphics`, stats.punch ? `${stats.punch} dezente Punch-ins` : null,
    autoAdj ? 'Farbkorrektur + Look „' + LOOKS[opts.cinematic ? preset.look : 'original'].l + '“' : null, reframe ? 'Auto-Reframing auf 9:16 (Motiv folgen)' : null,
    opts.enhance ? 'Audio optimiert (Stimme, Lautheit, Pausen-Rauschen)' : null, stats.emoji ? `${stats.emoji} Emoji(s) – zurückhaltend` : null,
  ].filter(Boolean));
  v.autoEdit = { at: Date.now(), preset: opts.preset, mode: opts.mode, summary, stats: Object.assign(stats, { removedS: round(removedS, 1), total: round(total, 1) }), originalDuration: dur, mediaId: media.id };
  if (transcript) v.transcript = { mediaId: media.id, words: transcript.words, text: transcript.text, source: transcript.source, estimated: transcript.estimated, timeline: false };
  return v;
}
function revertAutoEdit(p) {
  const v = p.video, ae = v.autoEdit; if (!ae) return;
  const m = Media.get(ae.mediaId);
  v.main = m ? [newClip(m)] : v.main.filter(c => !c.auto);
  v.items = v.items.filter(i => !i.auto); v.captions = []; v.autoEdit = null; v.audio.enhance = false; v.audio.gate = false; v.fadeIn = v.fadeOut = 0;
  toast('Original wiederhergestellt', 'success');
}

/* ── Local hook / key-statement heuristic (used when no LLM) ─────────── */
function localKeyStatements(sentences) {
  const score = s => { let sc = 0; const t = s.text.toLowerCase(); if (/\?/.test(t)) sc += 2; if (/\d|drei|fünf|zehn/.test(t)) sc += 1.5; if (/(nie|immer|wichtig|warum|geheimnis|fehler|wahrheit|niemand|alles|endlich)/.test(t)) sc += 2; const n = t.split(' ').length; if (n >= 5 && n <= 14) sc += 1.5; return sc; };
  const ranked = sentences.map((s, i) => ({ i, s, sc: score(s) })).sort((a, b) => b.sc - a.sc);
  return { hook: ranked[0] && ranked[0].sc >= 3 && ranked[0].s.text.split(' ').length <= 12 ? ranked[0].s.text : null, key_times: ranked.slice(0, 4).filter(x => x.sc >= 2.5).map(x => x.s.s + 0.2) };
}

/* ── Auto Edit UI ────────────────────────────────────────────────────── */
const AutoEditUI = {
  root: null, state: 'pick', media: null, opts: null, result: null, cache: {}, compare: 'after', running: false,
  defaults() { return { preset: 'founder', mode: 'cinematic', intensity: 'calm', emoji: 'minimal', fmt: 'reel', captions: true, broll: true, graphics: true, punch: true, reframe: true, color: true, cinematic: true, enhance: true, music: true, hookTitle: true, useLLM: true, transcribe: AI.cfg.stt === 'openai' ? 'openai' : 'local', script: '', wordsPer: 4 }; },
  mount(root) { this.root = root; this.sc = h('div', { class: 'scroll', style: { flex: 1 } }); root.appendChild(this.sc); this.opts = this.defaults(); Bus.on('vframe', () => { if (App.view === 'autoedit' && this.state === 'result') this.drawPreview(); }); Bus.on('vplay', p => { if (this.playB) this.playB.innerHTML = icon(p ? 'pause' : 'play'); }); },
  show() { if (this.state !== 'result') VE.override = null; this.render(); },
  hide() { VE.pause(); VE.override = null; },
  render() {
    const sc = clear(this.sc); const w = h('div', { class: 'ae-wrap' }); sc.appendChild(w);
    w.appendChild(h('div', { class: 'hero' }, h('div', null, h('div', { class: 'eyebrow' }, 'Auto Edit'), h('h1', { class: 'h1' }, 'Rohvideo rein. ', h('em', null, 'Social-ready'), ' raus.'), h('p', { class: 'lead' }, 'Mindéa entfernt Pausen, erstellt Untertitel, setzt dezente Zooms, B-Roll aus deiner Mediathek, Grafiken, Farbe und Ton – alles bleibt danach frei bearbeitbar.'))));
    ({ pick: this.vPick, settings: this.vSettings, analyzing: this.vAnalyzing, result: this.vResult })[this.state].call(this, w);
  },
  vPick(w) {
    const drop = h('div', { class: 'drop' }, h('div', { class: 'ei', html: icon('video', 'l'), style: { width: '60px', height: '60px', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' } }), h('h3', { class: 'h2' }, 'Video hochladen'), h('p', { class: 'muted', style: { margin: 0 } }, 'Talking Head, Founder-Story, Behind the Scenes oder Kundenprojekt. Die Datei bleibt lokal und unverändert.'),
      btn('Video auswählen', async () => { const [f] = await pickFiles('video/*', false); if (!f) return; const [m] = await Media.import([f]); if (m) this.choose(m); }, { cls: 'primary lg', icon: 'upload' }));
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); }); drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', async e => { e.preventDefault(); drop.classList.remove('over'); const f = Array.from(e.dataTransfer.files).find(x => Media.kindOf(x) === 'video'); if (!f) { toast('Bitte eine Videodatei ablegen.', 'info'); return; } const [m] = await Media.import([f]); if (m) this.choose(m); });
    w.appendChild(drop);
    const vids = Media.byKind('video');
    if (vids.length) {
      w.appendChild(h('div', { class: 'sec-h', style: { marginTop: '28px' } }, h('h2', { class: 'h2' }, 'Oder aus der Mediathek')));
      const g = h('div', { class: 'media-grid' });
      vids.slice(0, 24).forEach(m => g.appendChild(h('div', { class: 'mcard', role: 'button', tabindex: '0', 'aria-label': m.name, onclick: () => this.choose(m), onkeydown: e => e.key === 'Enter' && this.choose(m) }, h('div', { class: 'mth' }, m.thumb ? h('img', { src: Media.thumbURL(m), alt: '' }) : null, h('span', { class: 'dur' }, fmtTime(m.duration || 0, false))), h('div', { class: 'mi' }, h('div', { class: 'mn' }, m.name)))));
      w.appendChild(g);
    }
  },
  choose(m) { this.media = m; this.state = 'settings'; this.result = null; this.render(); },
  vSettings(w) {
    const o = this.opts, m = this.media;
    const top = h('div', { class: 'card', style: { display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' } }, m.thumb ? h('img', { src: Media.thumbURL(m), alt: '', style: { width: '64px', height: '64px', objectFit: 'cover', borderRadius: '12px' } }) : null, h('div', { class: 'grow' }, h('b', null, m.name), h('div', { class: 'small muted' }, `${fmtTime(m.duration || 0)} · ${m.w}×${m.h} · Original bleibt unverändert`)), btn('Anderes Video', () => { this.state = 'pick'; this.render(); }, { cls: 'ghost sm' }));
    w.appendChild(top);
    const optGrid = (title, map, key, after) => { const c = h('div', { class: 'card', style: { marginBottom: '14px' } }, h('h4', null, title)); const g = h('div', { class: 'opt-grid', style: { marginTop: '10px' } }); Object.entries(map).forEach(([k, d]) => g.appendChild(h('button', { class: 'opt' + (o[key] === k ? ' on' : ''), type: 'button', 'aria-pressed': o[key] === k, onclick: () => { o[key] = k; if (after) after(k); this.render(); } }, h('b', null, d.l), h('span', null, d.d)))); c.appendChild(g); return c; };
    w.appendChild(optGrid('Preset', AE_PRESETS, 'preset', k => { const p = AE_PRESETS[k]; o.mode = p.mode; o.intensity = p.intensity; }));
    w.appendChild(optGrid('Schnitt', AE_MODES, 'mode'));
    w.appendChild(optGrid('Grafik-Intensität', AE_INTENSITY, 'intensity'));
    const c2 = h('div', { class: 'card', style: { marginBottom: '14px' } }, h('h4', null, 'Format & Sprache'));
    c2.append(h('div', { class: 'lbl', style: { margin: '10px 0 6px' } }, 'Zielformat'), chips([{ v: 'reel', l: 'Reel 9:16' }, { v: 'liportrait', l: '4:5' }, { v: 'square', l: '1:1' }, { v: 'youtube', l: '16:9' }], o.fmt, v => o.fmt = v),
      h('div', { class: 'lbl', style: { margin: '14px 0 6px' } }, 'Emoji-Level'), chips([{ v: 'off', l: 'Aus' }, { v: 'minimal', l: 'Minimal' }, { v: 'normal', l: 'Normal' }, { v: 'social', l: 'Social' }], o.emoji, v => o.emoji = v),
      h('div', { class: 'lbl', style: { margin: '14px 0 6px' } }, 'Transkription'),
      chips([{ v: 'local', l: 'Lokal (Whisper)' }, { v: 'openai', l: 'OpenAI Whisper' }, { v: 'script', l: 'Skript einfügen' }, { v: 'none', l: 'Ohne Transkript' }], o.transcribe, v => { o.transcribe = v; this.render(); }));
    if (o.transcribe === 'script') { const ta = h('textarea', { class: 'textarea', placeholder: 'Was wird im Video gesagt? Die Wortzeiten werden an die erkannten Sprechpassagen angepasst (Schätzung).', 'aria-label': 'Skript' }); ta.value = o.script; ta.oninput = () => o.script = ta.value; c2.append(h('div', { style: { height: '8px' } }), ta); }
    else if (o.transcribe === 'local' || o.transcribe === 'openai') { c2.append(h('div', { class: 'grid2', style: { marginTop: '10px' } }, field('Sprache', selectEl(STT_LANGS, AI.cfg.lang || 'auto', v => { AI.cfg.lang = v; AI.save(); })), o.transcribe === 'local' ? field('Modell', selectEl(WHISPER_MODELS, AI.cfg.whisperModel, v => { AI.cfg.whisperModel = v; AI.save(); })) : field('OpenAI-Schlüssel', h('div', { class: 'small ' + (AI.cfg.openaiKey ? '' : 'muted') }, AI.cfg.openaiKey ? 'hinterlegt' : 'fehlt – im KI Studio eintragen'))), h('div', { class: 'notice' }, iconEl(o.transcribe === 'openai' ? 'cloud' : 'shield', 's'), h('span', null, STT_ENGINES.find(e => e.v === o.transcribe).note))); }
    else c2.append(h('p', { class: 'tiny muted' }, 'Ohne Transkript: Pausen-Schnitt, Farbe, Ton und Reframing funktionieren; Untertitel, B-Roll und Grafiken benötigen Text.'));
    w.appendChild(c2);
    const c3 = h('div', { class: 'card', style: { marginBottom: '14px' } }, h('h4', null, 'Bausteine'));
    const tg = (l, k, tip, dis) => toggle(l, o[k], v => o[k] = v, { tip, disabled: dis });
    c3.append(h('div', { class: 'two-col', style: { marginTop: '8px', gap: '0 24px' } }, h('div', null, tg('Untertitel', 'captions'), tg('B-Roll aus meiner Mediathek', 'broll'), tg('Motion Graphics', 'graphics'), tg('Dezente Punch-ins', 'punch'), tg('Hook als Titel', 'hookTitle')),
      h('div', null, tg('Auto-Reframing (Motiv folgen)', 'reframe'), tg('Farbkorrektur', 'color'), tg('Cinematic Look (Vignette, feines Grain)', 'cinematic'), tg('Stimme verbessern', 'enhance'), tg('Musik aus Mediathek (nach Stimmung)', 'music'), tg(AI.connected() ? 'KI-Analyse (Hook & Kernaussagen, Claude)' : 'KI-Analyse – KI-Verbindung erforderlich', 'useLLM', null, !AI.connected()))));
    const nb = Media.byKind('image').length + Media.byKind('video').length - 1, na = Media.byKind('audio').filter(m => (m.moods || []).length).length;
    c3.appendChild(h('p', { class: 'tiny muted', style: { marginBottom: 0 } }, `Mediathek: ${Math.max(0, nb)} Bilder/Videos für B-Roll · ${na} Musikstücke mit Stimmung. Tipp: Tagge deine Medien in der Mediathek für bessere Treffer.`));
    w.appendChild(c3);
    w.appendChild(h('div', { class: 'row', style: { justifyContent: 'flex-end', gap: '10px' } }, btn('Automatisch bearbeiten', () => this.run(), { cls: 'gold lg', icon: 'wand' })));
  },
  steps: [['audio', 'Audio analysieren'], ['lang', 'Sprache erkennen & transkribieren'], ['scenes', 'Szenen erkennen'], ['key', 'Wichtige Aussagen erkennen'], ['media', 'Medien zuordnen'], ['caps', 'Untertitel erstellen'], ['gfx', 'Grafiken platzieren'], ['color', 'Farblook vorbereiten'], ['cut', 'Schnitt erstellen']],
  vAnalyzing(w) {
    const c = h('div', { class: 'card' }); w.appendChild(c);
    c.appendChild(h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h4', null, 'Analyse läuft'), btn('Abbrechen', () => { this.cancel = true; }, { cls: 'sm ghost' })));
    const list = h('div', { class: 'steps', style: { marginTop: '10px' } });
    this.steps.forEach(([k, l], i) => { const st = this.stepState[k] || {}; const row = h('div', { class: 'step ' + (st.s || ''), id: 'st-' + k }, h('span', { class: 'sn' }, st.s === 'done' ? h('span', { html: icon('check', 's') }) : st.s === 'run' ? h('span', { class: 'spinner', style: { width: '14px', height: '14px' } }) : String(i + 1)), h('div', { class: 'st' }, h('b', null, l), h('span', null, st.note || ''), st.p != null ? h('div', { class: 'progress' }, h('div', { style: { width: Math.round(st.p * 100) + '%' } })) : null)); list.appendChild(row); });
    c.appendChild(list);
  },
  setStep(k, s, note, p) { this.stepState[k] = { s, note, p }; if (this.state === 'analyzing' && App.view === 'autoedit') this.render(); },
  async run() {
    if (this.running) return; this.running = true; this.cancel = false;
    const m = this.media, o = this.opts; this.stepState = {}; this.state = 'analyzing'; this.render();
    const C_ = this.cache[m.id] = this.cache[m.id] || {};
    const chk = () => { if (this.cancel) throw new Error('abgebrochen'); };
    try {
      // 1 audio
      this.setStep('audio', 'run', 'Pausen, Lautheit und Sprechpassagen …');
      if (!C_.audio) { try { C_.audio = await Analysis.speech(m.id, p => this.setStep('audio', 'run', 'Pausen, Lautheit und Sprechpassagen …', p)); await Media.update(m.id, { analysis: Object.assign({}, m.analysis, { speech: C_.audio.speech, normGain: C_.audio.normGain, rms: C_.audio.rms }) }); } catch (e) { C_.audio = null; } }
      this.setStep('audio', C_.audio ? 'done' : 'skip', C_.audio ? `${C_.audio.speech.length} Sprechpassagen · Lautheit ${C_.audio.rms} dB` : 'Keine auswertbare Tonspur – Pausen-Schnitt entfällt'); chk();
      // 2 transcription
      let tr = null;
      if (o.transcribe === 'local' || o.transcribe === 'openai') {
        const key = 'tr_' + o.transcribe + (AI.cfg.lang || 'auto');
        if (!C_[key]) { this.setStep('lang', 'run', 'Starte Spracherkennung …'); const prev = AI.cfg.stt; AI.cfg.stt = o.transcribe; try { C_[key] = await Transcriber.run(m.id, { lang: AI.cfg.lang || 'auto', onProgress: s => { const pm = s.match(/(\d+) %/); this.setStep('lang', 'run', s, pm ? +pm[1] / 100 : null); } }); } finally { AI.cfg.stt = prev; } }
        tr = C_[key]; this.setStep('lang', 'done', `${tr.words.length} Wörter · ${tr.source}${tr.estimated ? ' · Wortzeiten geschätzt' : ''}`);
      } else if (o.transcribe === 'script' && o.script.trim()) {
        const sp = C_.audio ? C_.audio.speech : null; const words = CapEngine.alignScript(o.script, { start: sp && sp.length ? sp[0][0] : 0, end: m.duration, speech: sp });
        tr = { words, text: o.script, source: 'Skript', estimated: true }; this.setStep('lang', 'done', 'Skript an Sprechpassagen ausgerichtet (Schätzung)');
      } else this.setStep('lang', 'skip', 'Ohne Transkript');
      chk();
      // 3 scenes / frames
      this.setStep('scenes', 'run', 'Bilder werden abgetastet …', 0);
      if (!C_.frames) { try { C_.frames = await Analysis.frames(m.id, p => this.setStep('scenes', 'run', 'Bilder werden abgetastet …', p)); } catch (e) { C_.frames = null; } }
      if (C_.frames) await Media.update(m.id, { analysis: Object.assign({}, Media.get(m.id).analysis, { track: C_.frames.samples }) });
      this.setStep('scenes', C_.frames ? 'done' : 'skip', C_.frames ? `${C_.frames.samples.length} Bilder analysiert · ${C_.frames.scenes.length} Szenenwechsel · Motiv: ${C_.frames.samples.some(s => s.src === 'face') ? 'Gesichtserkennung' : 'Bildanalyse (Hauttöne/Mitte)'}` : 'Bildanalyse nicht möglich'); chk();
      // 4 key statements
      let llm = null;
      if (tr) {
        const sentences = []; let cur = []; tr.words.forEach((w2, i) => { cur.push(w2); if (/[.!?…]$/.test(w2.w) || i === tr.words.length - 1) { sentences.push({ text: cur.map(x => x.w).join(' '), s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; } });
        if (o.useLLM && AI.connected()) {
          this.setStep('key', 'run', 'Claude analysiert Hook und Kernaussagen …');
          try {
            if (await AI.consent('cloud')) {
              const r = await AI.json(`Hier ist das Transkript eines Social-Media-Videos als nummerierte Sätze (Zeit in Sekunden):\n${sentences.map((s, i) => `${i}: [${s.s.toFixed(1)}] ${s.text}`).join('\n').slice(0, 14000)}\n\nAufgaben: 1) Formuliere einen starken, ruhigen Hook-Titel (max 7 Wörter) für die ersten Sekunden. 2) Nenne die Indizes der 3 wichtigsten Aussagen. 3) Schlage für bis zu 5 Sätze B-Roll vor (Tags NUR aus: ${Object.keys(TAGS).join(', ')}). 4) Schlage für max 3 Sätze eine dezente Grafik vor (NUR aus: numbers, underline, bulb, growth, person, brand-mark, check, heart, camera, sparkles). JSON: {"hook": "...", "key": [i], "broll": [{"sentence": i, "tags": ["..."]}], "graphics": [{"sentence": i, "kind": "..."}]}`, { maxTokens: 1500 });
              llm = { hook: r.hook, key_times: (r.key || []).map(i => sentences[i] && sentences[i].s + 0.2).filter(x => x != null),
                broll: (r.broll || []).filter(b => sentences[b.sentence] && Array.isArray(b.tags)).map(b => ({ text: sentences[b.sentence].text, tags: b.tags })),
                graphics: (r.graphics || []).filter(g => sentences[g.sentence] && GRAPHICS[g.kind]).map(g => ({ text: sentences[g.sentence].text, kind: g.kind })) };
            }
          } catch (e) { toast(friendlyError(e, 'KI-Analyse'), 'error'); }
        }
        if (!llm) llm = localKeyStatements(sentences);
        this.setStep('key', 'done', llm.hook ? `Hook: „${llm.hook}“` : 'Kernaussagen markiert');
      } else this.setStep('key', 'skip', 'Benötigt Transkript');
      chk();
      this.setStep('media', 'run', 'Mediathek wird durchsucht …');
      const res = buildAutoEdit({ media: m, fmtKey: o.fmt, opts: o, audio: C_.audio, frames: C_.frames, transcript: tr, llm });
      if (res.captions.length) { const pl = smartCaptionPlacement({ video: res, format: FORMATS[o.fmt] }); if (pl.moved || pl.boxed) res.autoEdit.summary.splice(2, 0, `Untertitel gesichtsfrei platziert (${pl.moved} verschoben, ${pl.boxed} mit Lesbarkeits-Hintergrund)`); }
      const st = res.autoEdit.stats;
      this.setStep('media', o.broll && tr ? 'done' : 'skip', o.broll && tr ? `${st.broll} passende Medien gefunden` : 'Übersprungen');
      this.setStep('caps', o.captions && tr ? 'done' : 'skip', o.captions && tr ? `${st.captions} Untertitel` : 'Benötigt Transkript');
      this.setStep('gfx', o.graphics && tr ? 'done' : 'skip', o.graphics && tr ? `${st.gfx} Grafiken · ${st.emoji} Emoji` : 'Übersprungen');
      this.setStep('color', o.color ? 'done' : 'skip', o.color ? 'Weißabgleich, Belichtung, Kontrast + Look' : 'Übersprungen');
      this.setStep('cut', 'done', `${res.main.length} Clips · ${fmtTime(st.total)} (vorher ${fmtTime(m.duration)})`);
      this.result = res; this.state = 'result'; this.compare = 'after';
      await sleep(300); this.render();
    } catch (e) {
      if (/abgebrochen/.test(e.message)) { this.state = 'settings'; toast('Analyse abgebrochen.', 'info'); }
      else { this.state = 'settings'; toast(friendlyError(e, 'Auto Edit'), 'error', { duration: 9000 }); }
      this.render();
    } finally { this.running = false; }
  },
  draftProject() {
    const f = FORMATS[this.opts.fmt];
    const p = Projects.create({ type: 'video', formatKey: this.opts.fmt, name: (this.media.name || 'Video').replace(/\.[a-z0-9]+$/i, '') + ' · Auto Edit', video: deepClone(this.result) });
    p.format.w = f.w; p.format.h = f.h; return p;
  },
  vResult(w) {
    const r = this.result, ae = r.autoEdit;
    const grid = h('div', { class: 'two-col' }); w.appendChild(grid);
    const left = h('div', { class: 'col', style: { gap: '14px' } });
    left.appendChild(h('div', { class: 'card' }, h('div', { class: 'eyebrow', style: { marginBottom: '4px' } }, 'Fertig'), h('h3', { class: 'h2', style: { margin: '0 0 12px' } }, 'Dein Schnitt ist bereit'),
      h('ul', { class: 'sum-list' }, [[ae.stats.pauses, 'Pausen entfernt'], [ae.stats.captions, 'Untertitel erstellt'], [ae.stats.broll, 'B-Roll-Vorschläge'], [ae.stats.gfx, 'Motion Graphics'], [ae.stats.punch, 'Punch-ins'], [fmtTime(ae.stats.total, false), 'neue Länge']].map(([n, l]) => h('li', null, h('b', null, String(n)), h('span', null, l)))),
      h('div', { style: { marginTop: '12px', lineHeight: 1.7 }, class: 'small' }, ae.summary.map(s => h('div', null, '· ' + s))),
      h('div', { class: 'row wrap', style: { marginTop: '16px', gap: '8px' } }, btn('Übernehmen', () => this.accept(false), { cls: 'primary', icon: 'check' }), btn('Bearbeiten', () => this.accept(true), { icon: 'pen' }), btn('Neu analysieren', () => { this.state = 'settings'; VE.override = null; this.render(); }, { cls: 'ghost', icon: 'rotate' })),
      h('p', { class: 'tiny muted', style: { marginBottom: 0 } }, 'Nichts ist eingebrannt: Alle Schnitte, Untertitel, B-Roll, Grafiken, Farben und Audio-Einstellungen bleiben einzeln editierbar. Das Original wird nie verändert.')));
    if (r.transcript) left.appendChild(h('div', { class: 'card' }, h('h4', null, 'Transkript'), h('div', { class: 'small', style: { maxHeight: '180px', overflow: 'auto', lineHeight: 1.6, marginTop: '6px' } }, r.transcript.text), h('div', { class: 'row wrap', style: { marginTop: '10px' } }, btn('Aus Video Karussell erstellen', async () => { const p = await this.accept(null); if (p) videoToCarousel(p); }, { cls: 'sm', icon: 'carousel' }))));
    const right = h('div', { class: 'col', style: { gap: '10px', alignItems: 'center' } });
    const p = this.draftP = this.draftProject(); VE.override = p; preloadVideoProject(p);
    const f = p.format; const pw = Math.min(360, f.w / f.h * 560);
    const cw = h('div', { class: 'vcanvas-wrap', style: { width: pw + 'px', maxWidth: '100%', aspectRatio: f.w + '/' + f.h } }); const cv = h('canvas'); cv.width = Math.min(f.w, pw * 2); cv.height = Math.round(cv.width * f.h / f.w); cw.appendChild(cv); this.prevCanvas = cv;
    this.playB = h('button', { class: 'play-btn', type: 'button', 'aria-label': 'Abspielen', html: icon('play'), onclick: () => VE.toggle() });
    right.append(seg([{ v: 'before', l: 'Vorher' }, { v: 'after', l: 'Nachher' }], this.compare, v => { this.compare = v; VE.pause(); VE.override = v === 'before' ? this.beforeProject() : this.draftP; VE.seek(0); }), cw, h('div', { class: 'vcontrols' }, ibtn('skipB', 'Anfang', () => VE.seek(0)), this.playB, this.tcEl = h('span', { class: 'tc' })));
    grid.append(left, right);
    VE.seek((p.video.fadeIn || 0) + 0.05);
  },
  beforeProject() { const f = FORMATS[this.opts.fmt]; const p = Projects.create({ type: 'video', formatKey: this.opts.fmt, name: 'Original' }); p.video.main.push(newClip(this.media)); return p; },
  drawPreview() { const c = this.prevCanvas; if (!c || !c.isConnected || !VE.override) return; const f = VE.override.format; const ctx = c.getContext('2d'); const s = c.width / f.w; ctx.setTransform(s, 0, 0, s, 0, 0); VE.renderFrame(ctx, VE.t); if (this.tcEl) this.tcEl.textContent = fmtTime(VE.t) + ' / ' + fmtTime(VE.duration()); },
  async accept(edit) {
    VE.pause(); const p = this.draftP || this.draftProject(); VE.override = null;
    // keep history meaningful: start from the original, then apply the edit as an undoable step
    const orig = deepClone(p.video); p.video = newVideoState(); p.video.main.push(newClip(this.media));
    await Projects.put(p); await setProject(p);
    p.video = orig; commit('Auto Edit');
    this.state = 'pick'; this.result = null; this.draftP = null;
    toast('Auto Edit übernommen – Rückgängig jederzeit möglich.', 'success');
    if (edit !== null) showView('video');
    return p;
  },
};
