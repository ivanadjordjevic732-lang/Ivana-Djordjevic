/* ═══════════════════════════════════════════════════════════════════════
   MODULE: VIDEO ENGINE — playback clock, element pool, audio graph
   (ducking, voice enhance, fades), frame compositor with transitions,
   B-roll, overlays, motion graphics, text and captions. Non-destructive.
   ═══════════════════════════════════════════════════════════════════════ */
let _actx = null;
function getAudioCtx() {
  if (!_actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; _actx = new AC({ latencyHint: 'interactive' }); }
  return _actx;
}
const TRANSITIONS = [{ v: 'none', l: 'Keine' }, { v: 'cross', l: 'Überblenden' }, { v: 'fade', l: 'Fade' }, { v: 'black', l: 'Dip to Black' }, { v: 'white', l: 'Dip to White' }, { v: 'zoom', l: 'Zoom' }, { v: 'slideL', l: 'Slide links' }, { v: 'slideR', l: 'Slide rechts' }];
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];

const VE = {
  t: 0, playing: false, els: new Map(), srcs: new Map(), override: null, exporting: false, frameNo: 0,
  pool: null,
  project() { return this.override || App.project; },
  video() { const p = this.project(); return p && p.video; },
  duration() { return videoDuration(this.project()); },
  /* ── Audio graph ──────────────────────────────────────────────────── */
  graph() {
    const ctx = getAudioCtx(); if (!ctx) return null;
    if (this.g) return this.g;
    const g = { ctx };
    g.master = ctx.createGain();
    g.limiter = ctx.createDynamicsCompressor(); Object.assign(g.limiter, {}); g.limiter.threshold.value = -2; g.limiter.knee.value = 0; g.limiter.ratio.value = 20; g.limiter.attack.value = 0.002; g.limiter.release.value = 0.12;
    g.master.connect(g.limiter); g.limiter.connect(ctx.destination);
    g.voiceIn = ctx.createGain(); g.music = ctx.createGain();
    g.music.connect(g.master);
    // voice enhance chain: highpass → mud cut → presence → compressor → makeup
    g.hp = ctx.createBiquadFilter(); g.hp.type = 'highpass'; g.hp.frequency.value = 85;
    g.mud = ctx.createBiquadFilter(); g.mud.type = 'peaking'; g.mud.frequency.value = 280; g.mud.Q.value = 1.1; g.mud.gain.value = -2.5;
    g.pres = ctx.createBiquadFilter(); g.pres.type = 'peaking'; g.pres.frequency.value = 3200; g.pres.Q.value = 0.9; g.pres.gain.value = 3;
    g.air = ctx.createBiquadFilter(); g.air.type = 'highshelf'; g.air.frequency.value = 9000; g.air.gain.value = 1.5;
    g.comp = ctx.createDynamicsCompressor(); g.comp.threshold.value = -24; g.comp.ratio.value = 3; g.comp.knee.value = 8; g.comp.attack.value = 0.006; g.comp.release.value = 0.2;
    g.makeup = ctx.createGain();
    g.hp.connect(g.mud); g.mud.connect(g.pres); g.pres.connect(g.air); g.air.connect(g.comp); g.comp.connect(g.makeup); g.makeup.connect(g.master);
    this.g = g; this.routeVoice();
    return g;
  },
  routeVoice() {
    const g = this.g; if (!g) return; const v = this.video();
    try { g.voiceIn.disconnect(); } catch (e) { }
    const enh = v && v.audio && v.audio.enhance;
    g.voiceIn.connect(enh ? g.hp : g.master);
    g.makeup.gain.value = enh ? clamp((v.audio.normGain || 1) * 1.15, 0.5, 4) : 1;
    g.voiceIn.gain.value = enh ? 1 : clamp(v && v.audio ? (v.audio.normGain || 1) : 1, 0.25, 4);
  },
  /* ── Element pool (one <video> per active/upcoming clip) ──────────── */
  poolEl() { if (!this.pool) { this.pool = h('div', { 'aria-hidden': 'true', style: { position: 'fixed', left: '-10px', top: '-10px', width: '2px', height: '2px', overflow: 'hidden', opacity: '0.01', pointerEvents: 'none' } }); document.body.appendChild(this.pool); } return this.pool; },
  getEl(key, mediaId, withAudio) {
    let r = this.els.get(key);
    if (r && r.mediaId === mediaId) return r;
    if (r) this.release(key);
    const v = document.createElement('video'); v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.muted = !withAudio; v.disableRemotePlayback = true;
    r = { v, mediaId, audio: withAudio };
    this.poolEl().appendChild(v);
    Media.url(mediaId).then(u => { if (this.els.get(key) === r) { v.src = u; v.load(); } }).catch(() => { });
    const rr = () => { if (!this.playing) requestVRender(); };
    v.addEventListener('seeked', rr); v.addEventListener('loadeddata', rr);
    if (withAudio) {
      const g = this.graph();
      if (g) { try { r.src = g.ctx.createMediaElementSource(v); r.gain = g.ctx.createGain(); r.gain.gain.value = 0; r.src.connect(r.gain); r.gain.connect(g.voiceIn); } catch (e) { v.muted = false; } }
    }
    this.els.set(key, r);
    return r;
  },
  release(key) {
    const r = this.els.get(key); if (!r) return;
    try { r.v.pause(); } catch (e) { }
    try { r.src && r.src.disconnect(); r.gain && r.gain.disconnect(); } catch (e) { }
    r.v.removeAttribute('src'); try { r.v.load(); } catch (e) { } r.v.remove();
    this.els.delete(key);
  },
  releaseAll() { for (const k of Array.from(this.els.keys())) this.release(k); this.stopAudio(); },
  /* ── Speech detection for ducking / gating ───────────────────────── */
  speechAt(mediaId, srcT) {
    const m = Media.get(mediaId); const sp = m && m.analysis && m.analysis.speech;
    if (!sp) return null;
    for (const [a, b] of sp) if (srcT >= a - 0.12 && srcT <= b + 0.15) return true;
    return false;
  },
  /* ── Sync media elements & gains with timeline time ───────────────── */
  sync(t, playing) {
    const v = this.video(); if (!v) return;
    const lay = mainLayout(v.main); const want = new Set();
    const g = this.g; const now = g ? g.ctx.currentTime : 0;
    let speech = false;
    for (const L of lay) {
      const c = L.clip; if (c.kind !== 'video') continue;
      if (t < L.start - 1.4 || t > L.end + 0.25) continue;
      want.add(c.id);
      const r = this.getEl(c.id, c.mediaId, true);
      const local = clamp(t - L.start, 0, L.dur), src = c.in + local * c.speed;
      const active = t >= L.start && t < L.end;
      const el = r.v;
      if (el.readyState >= 1) {
        if (active && playing) {
          if (el.playbackRate !== c.speed) { el.playbackRate = c.speed; try { el.preservesPitch = true; el.webkitPreservesPitch = true; } catch (e) { } }
          if (el.paused) el.play().catch(() => { });
          if (Math.abs(el.currentTime - src) > 0.3) el.currentTime = src;
        } else {
          if (!el.paused) el.pause();
          const target = active ? src : (t < L.start ? c.in : Math.max(c.in, c.out - 0.04));
          if (Math.abs(el.currentTime - target) > (playing ? 0.35 : 0.015) && !el.seeking) el.currentTime = target;
        }
      }
      // gain envelope
      if (r.gain && g) {
        let gain = 0;
        if (active && !c.muted) {
          gain = c.volume;
          if (c.aFadeIn) gain *= clamp(local / c.aFadeIn, 0, 1);
          if (c.aFadeOut) gain *= clamp((L.dur - local) / c.aFadeOut, 0, 1);
          if (L.td && local < L.td) gain *= local / L.td;
          const nxt = lay[L.idx + 1]; if (nxt && nxt.td && t > nxt.start) gain *= clamp((L.end - t) / nxt.td, 0, 1);
          const sp = this.speechAt(c.mediaId, src);
          if (sp !== false) speech = speech || gain > 0.05;
          if (v.audio.gate && sp === false) gain *= 0.3;
        }
        if (this.exporting || playing) r.gain.gain.setTargetAtTime(gain, now, 0.012); else r.gain.gain.value = gain;
      }
    }
    for (const it of v.items) {
      if ((it.track === 'broll' || it.track === 'overlay') && it.mediaId && Media.get(it.mediaId)?.kind === 'video') {
        if (t < it.start - 1.2 || t > it.start + it.dur + 0.2) continue;
        want.add(it.id);
        const r = this.getEl(it.id, it.mediaId, false); const el = r.v;
        const local = clamp(t - it.start, 0, it.dur), src = (it.in || 0) + local;
        const active = t >= it.start && t < it.start + it.dur;
        if (el.readyState >= 1) {
          if (active && playing) { if (el.paused) el.play().catch(() => { }); if (Math.abs(el.currentTime - src) > 0.3) el.currentTime = src; }
          else { if (!el.paused) el.pause(); const target = active ? src : (it.in || 0); if (Math.abs(el.currentTime - target) > (playing ? 0.35 : 0.015) && !el.seeking) el.currentTime = target; }
        }
      }
    }
    for (const k of Array.from(this.els.keys())) if (!want.has(k)) this.release(k);
    // audio items (music / voice): gains + ducking
    if (g) {
      for (const it of v.items) {
        if (it.track === 'voice' && t >= it.start && t < it.start + it.dur && !it.muted) speech = true;
      }
      const duck = v.audio.ducking && speech ? clamp(v.audio.duckLevel ?? 0.25, 0.05, 1) : 1;
      g.music.gain.setTargetAtTime(duck, now, speech ? 0.08 : 0.35);
      for (const [id, s] of this.srcs) {
        const it = v.items.find(x => x.id === id); if (!it) continue;
        const local = t - it.start; let gain = it.muted ? 0 : (it.volume ?? 1);
        if (local < 0 || local > it.dur) gain = 0;
        if (it.fadeIn) gain *= clamp(local / it.fadeIn, 0, 1);
        if (it.fadeOut) gain *= clamp((it.dur - local) / it.fadeOut, 0, 1);
        s.gain.gain.setTargetAtTime(gain, now, 0.02);
      }
    }
  },
  startAudio(t) {
    this.stopAudio(); const g = this.graph(); if (!g) return; const v = this.video();
    for (const it of v.items) {
      if (!(it.track === 'audio' || it.track === 'voice') || !it.mediaId) continue;
      if (it.start + it.dur <= t) continue;
      const buf = AudioCache.map.get(it.mediaId);
      if (!buf) { AudioCache.get(it.mediaId).then(() => { if (this.playing) this.startAudio(this.clock()); }).catch(() => { }); continue; }
      const src = g.ctx.createBufferSource(); src.buffer = buf;
      const gain = g.ctx.createGain(); gain.gain.value = 0;
      src.connect(gain); gain.connect(it.track === 'voice' ? g.voiceIn : g.music);
      const delayS = Math.max(0, it.start - t), off = (it.in || 0) + Math.max(0, t - it.start), dur = it.dur - Math.max(0, t - it.start);
      if (off >= buf.duration) continue;
      try { src.start(g.ctx.currentTime + delayS + 0.02, off, Math.max(0.01, Math.min(dur, buf.duration - off))); } catch (e) { continue; }
      this.srcs.set(it.id, { src, gain });
    }
  },
  stopAudio() { for (const s of this.srcs.values()) { try { s.src.stop(); } catch (e) { } try { s.gain.disconnect(); } catch (e) { } } this.srcs.clear(); },
  /* ── Transport ─────────────────────────────────────────────────────── */
  clock() {
    const ctx = _actx;
    if (ctx && ctx.state === 'running' && this.c0 != null) return this.t0 + (ctx.currentTime - this.c0);
    return this.t0 + (performance.now() - this.p0) / 1000;
  },
  async play() {
    if (this.playing || !this.video()) return;
    const ctx = getAudioCtx(); this.graph();
    if (ctx && ctx.state !== 'running') { try { await ctx.resume(); } catch (e) { } }
    const d = this.duration(); if (d <= 0) { toast('Füge zuerst Clips, Bilder oder Text zur Timeline hinzu.', 'info'); return; }
    if (this.t >= d - 0.05) this.t = 0;
    this.routeVoice();
    this.playing = true; this.t0 = this.t; this.p0 = performance.now(); this.c0 = ctx && ctx.state === 'running' ? ctx.currentTime : null;
    this.startAudio(this.t);
    Bus.emit('vplay', true);
    const loop = () => {
      if (!this.playing) return;
      let t = this.clock(); const dur = this.duration();
      if (t >= dur) { t = dur; this.t = t; if (this.exportHook) this.exportHook(Math.max(0, dur - 0.001)); this.pause(); Bus.emit('vend'); return; }
      this.t = t; this.frameNo++;
      this.sync(t, true);
      if (this.exportHook) this.exportHook(t);
      Bus.emit('vframe', t);
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  },
  pause() {
    if (!this.playing) return; this.playing = false; cancelAnimationFrame(this.raf);
    this.stopAudio();
    for (const r of this.els.values()) { try { r.v.pause(); } catch (e) { } }
    this.sync(this.t, false);
    Bus.emit('vplay', false); requestVRender();
  },
  toggle() { this.playing ? this.pause() : this.play(); },
  seek(t) {
    this.t = clamp(t, 0, Math.max(0, this.duration()));
    if (this.playing) { this.t0 = this.t; this.p0 = performance.now(); const ctx = _actx; this.c0 = ctx && ctx.state === 'running' ? ctx.currentTime : null; this.startAudio(this.t); }
    this.sync(this.t, this.playing);
    if (!this.playing) requestVRender();
    Bus.emit('vseek', this.t);
  },

  /* ── Compositor ───────────────────────────────────────────────────── */
  srcFor(kind, key, mediaId) {
    if (kind === 'image') return Media.imgSync(mediaId);
    const r = this.els.get(key);
    if (r && r.v.readyState >= 2) return r.v;
    return thumbImg(mediaId); // poster frame while loading
  },
  /** Render the frame at time t into ctx (ctx maps project px). */
  renderFrame(ctx, t, o = {}) {
    const p = o.project || this.project(); const v = p.video, f = p.format, W = f.w, H = f.h;
    ctx.fillStyle = v.bg || '#000'; ctx.fillRect(0, 0, W, H);
    const lay = mainLayout(v.main);
    const act = lay.filter(L => t >= L.start && t < L.end + (L === lay[lay.length - 1] ? 0.001 : 0));
    act.sort((a, b) => a.start - b.start);
    for (let i = 0; i < act.length; i++) {
      const L = act[i];
      const inTrans = L.td && t < L.start + L.td && i > 0;
      if (!inTrans) { this.drawClip(ctx, L, t, W, H, 1, o); continue; }
      const q = (t - L.start) / L.td, type = L.clip.trans.type;
      if (type === 'black' || type === 'white') {
        if (q < 0.5) { ctx.fillStyle = type === 'black' ? '#000' : '#fff'; ctx.globalAlpha = q * 2; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
        else { this.drawClip(ctx, L, t, W, H, 1, o); ctx.fillStyle = type === 'black' ? '#000' : '#fff'; ctx.globalAlpha = (1 - q) * 2; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      } else if (type === 'zoom') { ctx.save(); const s = 1.14 - 0.14 * easeOut(q); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2); this.drawClip(ctx, L, t, W, H, easeOut(q), o); ctx.restore(); }
      else if (type === 'slideL' || type === 'slideR') { ctx.save(); ctx.translate((type === 'slideL' ? 1 : -1) * (1 - easeInOut(q)) * W, 0); this.drawClip(ctx, L, t, W, H, 1, o); ctx.restore(); }
      else this.drawClip(ctx, L, t, W, H, type === 'fade' ? easeInOut(q) : q, o);
    }
    // B-roll, overlays, graphics, text in track order
    for (const tr of ['broll', 'overlay', 'graphics', 'text']) {
      for (const it of v.items) {
        if (it.track !== tr || it.hidden) continue;
        if (t < it.start || t >= it.start + it.dur) continue;
        const local = t - it.start;
        if (tr === 'broll') this.drawBroll(ctx, it, local, W, H, o);
        else if (tr === 'overlay' && it.el) {
          const src = Media.get(it.mediaId)?.kind === 'video' ? this.srcFor('video', it.id, it.mediaId) : null;
          drawElement(ctx, it.el, { source: src || undefined, anim: { kind: it.anim || 'fade', q: local / 0.35, out: (it.dur - local) / 0.3 } });
        } else if (tr === 'graphics' && it.el) drawElement(ctx, it.el, { progress: clamp(local / (it.drawDur || 0.8), 0, 1), t: local, alpha: clamp((it.dur - local) / 0.35, 0, 1) });
        else if (tr === 'text' && it.el) {
          const kind = it.anim || 'fade';
          if (kind === 'word') { const n = (it.el.text || '').split(/\s+/).length; const span = Math.min(it.dur * 0.6, n * 0.16); drawElement(ctx, it.el, { wordReveal: Math.ceil(clamp(local / span, 0, 1) * n), anim: { kind: 'none', q: 1, out: (it.dur - local) / 0.3 } }); }
          else drawElement(ctx, it.el, { anim: kind === 'none' ? { kind: 'none', q: 1, out: (it.dur - local) / 0.15 } : { kind, q: local / 0.45, out: (it.dur - local) / 0.3 } });
        }
      }
    }
    if (v.cap.show !== false) for (const c of v.captions) if (t >= c.start && t < c.end) drawCaption(ctx, c, v.cap, t, W, H);
    const d = videoDuration(p);
    if (v.fadeIn && t < v.fadeIn) { ctx.fillStyle = '#000'; ctx.globalAlpha = 1 - t / v.fadeIn; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (v.fadeOut && t > d - v.fadeOut) { ctx.fillStyle = '#000'; ctx.globalAlpha = clamp((t - (d - v.fadeOut)) / v.fadeOut, 0, 1); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  },
  clipZoom(c, local, L) {
    let z = c.zoom || 1;
    if (c.zoomTo) z = lerp(z, c.zoomTo, easeInOut(local / Math.max(0.01, L.dur)));
    return z;
  },
  reframeX(c, srcT) {
    const k = c.reframe; if (!k || !k.length) return null;
    if (srcT <= k[0].t) return k[0].x; if (srcT >= k[k.length - 1].t) return k[k.length - 1].x;
    for (let i = 1; i < k.length; i++) if (srcT < k[i].t) { const a = k[i - 1], b = k[i]; return lerp(a.x, b.x, easeInOut((srcT - a.t) / (b.t - a.t))); }
    return 0.5;
  },
  drawClip(ctx, L, t, W, H, alpha, o) {
    const c = L.clip; const local = clamp(t - L.start, 0, L.dur);
    const src = o.thumbsOnly ? (c.kind === 'image' ? Media.imgSync(c.mediaId) : thumbImg(c.mediaId)) : this.srcFor(c.kind, c.id, c.mediaId);
    ctx.save(); ctx.globalAlpha *= alpha;
    let a = 1; if (c.fadeIn) a *= clamp(local / c.fadeIn, 0, 1); if (c.fadeOut) a *= clamp((L.dur - local) / c.fadeOut, 0, 1);
    ctx.globalAlpha *= a;
    if (!src) { ctx.fillStyle = '#211B15'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(241,233,219,.5)'; ctx.font = `400 ${W * 0.03}px ${ff('Jost')}`; ctx.textAlign = 'center'; ctx.fillText(Media.get(c.mediaId) ? 'Lädt …' : 'Medium fehlt', W / 2, H / 2); ctx.restore(); return; }
    const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height;
    if (!sw || !sh) { ctx.restore(); return; }
    let z = this.clipZoom(c, local, L);
    if (c.kind === 'image' && c.kb) z *= 1 + 0.06 * (local / Math.max(0.01, L.dur));
    ctx.translate(W / 2 + (c.x || 0) * W, H / 2 + (c.y || 0) * H);
    if (c.rot) ctx.rotate(c.rot * Math.PI / 180);
    ctx.translate(-W / 2, -H / 2);
    const e = effAdj(c.look, c.adj, c.autoAdj);
    const gopt = { flipX: c.flipX, flipY: c.flipY, seed: (this.frameNo % 97) * 0.37, cacheKey: c.kind === 'image' ? c.mediaId : null };
    if (c.fit === 'fit') {
      const s = Math.min(W / sw, H / sh) * z; const dw = sw * s, dh = sh * s;
      drawGraded(ctx, src, { x: 0, y: 0, w: sw, h: sh }, (W - dw) / 2, (H - dh) / 2, dw, dh, e, gopt);
    } else {
      const srcT = c.in + local * c.speed;
      const rx = this.reframeX(c, srcT);
      let ox = 0;
      if (rx != null) { const sr = sw / sh, dr = W / H; if (sr > dr) { const cw = sh * dr / Math.max(1, z); const maxX = (sw - cw) / 2; ox = maxX > 0 ? clamp((rx * sw - sw / 2) / maxX, -1, 1) : 0; } }
      const { crop } = coverCrop(sw, sh, W, H, Math.max(1, z), ox, c.reframeY || 0);
      if (z < 1) { const s = z; ctx.translate(W * (1 - s) / 2, H * (1 - s) / 2); ctx.scale(s, s); }
      drawGraded(ctx, src, crop, 0, 0, W, H, e, gopt);
    }
    ctx.restore();
  },
  drawBroll(ctx, it, local, W, H, o) {
    const m = Media.get(it.mediaId); if (!m) return;
    const src = m.kind === 'image' ? Media.imgSync(it.mediaId) : (o.thumbsOnly ? thumbImg(it.mediaId) : this.srcFor('video', it.id, it.mediaId));
    if (!src) return;
    const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height; if (!sw) return;
    const fd = it.fade ?? 0.25;
    ctx.save(); ctx.globalAlpha *= clamp(Math.min(local / Math.max(0.01, fd), (it.dur - local) / Math.max(0.01, fd)), 0, 1);
    const z = it.kb !== false ? 1.02 + 0.06 * (local / it.dur) : 1;
    const { crop } = coverCrop(sw, sh, W, H, z, it.ox || 0, it.oy || 0);
    drawGraded(ctx, src, crop, 0, 0, W, H, effAdj(it.look || 'original', it.adj), { cacheKey: m.kind === 'image' ? it.mediaId : null, seed: this.frameNo * 0.37 });
    ctx.restore();
  },
  /** Render a still for thumbnails without seeking video elements. */
  async renderStill(ctx, p, t) {
    const ids = new Set(); p.video.main.forEach(c => ids.add(c.mediaId)); p.video.items.forEach(i => i.mediaId && ids.add(i.mediaId));
    await Promise.all(Array.from(ids).map(id => { const m = Media.get(id); return m && m.kind === 'image' ? Media.img(id).catch(() => null) : loadThumbImg(id); }));
    this.renderFrame(ctx, Math.min(t, Math.max(0, videoDuration(p) - 0.01)), { project: p, thumbsOnly: true });
  },
};
/* poster frames from library thumbnails */
const _thumbImgs = new Map();
function thumbImg(id) { const c = _thumbImgs.get(id); if (c && c.complete && c.naturalWidth) return c; loadThumbImg(id); return null; }
function loadThumbImg(id) {
  if (_thumbImgs.has(id)) { const i = _thumbImgs.get(id); return i.complete ? Promise.resolve(i) : new Promise(r => { i.onload = i.onerror = () => r(i); }); }
  const m = Media.get(id); if (!m || !m.thumb) return Promise.resolve(null);
  const i = new Image(); _thumbImgs.set(id, i);
  return new Promise(r => { i.onload = () => { requestVRender(); r(i); }; i.onerror = () => r(null); i.src = Media.thumbURL(m); });
}
let _vrq = false;
function requestVRender() { if (_vrq) return; _vrq = true; requestAnimationFrame(() => { _vrq = false; Bus.emit('vframe', VE.t); }); }
