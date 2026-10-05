/* ═══════════════════════════════════════════════════════════════════════
   MODULE: VIDEO STUDIO UI — preview, transport, add-tools, inspector,
   clip operations (split/trim/speed/transform/looks/transitions/audio).
   ═══════════════════════════════════════════════════════════════════════ */
const VIDEO_TOOLS = [
  { k: 'media', l: 'Clips', i: 'video', fn: () => VideoUI.addMain() }, { k: 'broll', l: 'B-Roll', i: 'film', fn: () => VideoUI.addBroll() },
  { k: 'overlay', l: 'Overlay', i: 'layers', fn: () => VideoUI.addOverlay() }, { k: 'text', l: 'Text', i: 'text', fn: () => VideoUI.addText() },
  { k: 'graphics', l: 'Grafik', i: 'sparkle', fn: () => VideoUI.addGraphic() }, { k: 'music', l: 'Musik', i: 'music', fn: () => VideoUI.addMusic() },
  { k: 'voice', l: 'Voiceover', i: 'mic', fn: () => VideoUI.addVoice() }, { k: 'captions', l: 'Captions', i: 'captions', fn: () => showView('captions') },
  { k: 'auto', l: 'Auto Edit', i: 'wand', fn: () => showView('autoedit') }, { k: 'frame', l: 'Frame → Bild', i: 'image', fn: () => VideoUI.frameToImage() },
];
const VideoUI = {
  root: null, e: {}, selId: null,
  mount(root) {
    this.root = root;
    const ed = h('div', { class: 'veditor' });
    const rail = h('div', { class: 'toolrail', role: 'toolbar', 'aria-label': 'Video-Werkzeuge' });
    VIDEO_TOOLS.forEach(t => { const b = h('button', { class: 'tool-btn', type: 'button', 'aria-label': t.l, onclick: t.fn }); b.innerHTML = icon(t.i) + `<span>${t.l}</span>`; rail.appendChild(b); });
    const stage = h('div', { class: 'vstage' });
    const wrap = h('div', { class: 'vcanvas-wrap' }); const canvas = h('canvas', { role: 'img', 'aria-label': 'Videovorschau' }); const ov = h('div', { style: { position: 'absolute', inset: 0, pointerEvents: 'none' } });
    wrap.append(canvas, ov); stage.appendChild(wrap);
    const qbar = h('div', { class: 'vctx' });
    stage.appendChild(qbar);
    const tc = h('span', { class: 'tc', 'aria-live': 'off' }, '0:00.0 / 0:00.0');
    const playB = h('button', { class: 'play-btn', type: 'button', 'aria-label': 'Abspielen (Leertaste)', 'data-tip': 'Abspielen / Pause|Leertaste', onclick: () => VE.toggle(), html: icon('play') });
    const controls = h('div', { class: 'vcontrols' },
      ibtn('skipB', 'Zum Anfang', () => VE.seek(0)), ibtn('chevL', '1 Frame zurück', () => VE.seek(VE.t - 1 / 30), { cls: 'hide-m' }), playB, ibtn('chevR', '1 Frame vor', () => VE.seek(VE.t + 1 / 30), { cls: 'hide-m' }), tc,
      this.e && null, h('span', { class: 'grow hide-m' }),
      this.szBtn = ibtn('phone', 'Safe Zones (nur Orientierung)', () => { App.settings.safeZones = !App.settings.safeZones; saveSettings(); this.szBtn.classList.toggle('on', App.settings.safeZones); this.drawOverlay(); }, { cls: App.settings.safeZones ? 'on' : '' }),
      ibtn('expand', 'Vorschau-Modus', () => setPreview(true), { kbd: 'P' }),
      h('button', { class: 'ibtn insp-toggle', type: 'button', 'aria-label': 'Eigenschaften', 'data-tip': 'Eigenschaften', html: icon('settings'), onclick: () => { ed.classList.toggle('insp-open'); this.renderInspector(); } }),
    );
    const preview = h('div', { class: 'vpreview' }, stage, controls);
    const top = h('div', { class: 'vtop' }, rail, preview);
    const tl = h('div', { class: 'timeline', 'aria-label': 'Timeline' });
    const insp = h('aside', { class: 'inspector vinspector', 'aria-label': 'Eigenschaften' });
    const mbar = h('div', { class: 'mtoolbar', role: 'toolbar', 'aria-label': 'Werkzeuge' });
    const mb = (l, i, fn) => { const b = h('button', { class: 'tool-btn', type: 'button', 'aria-label': l, onclick: fn }); b.innerHTML = icon(i) + `<span>${l}</span>`; return b; };
    mbar.appendChild(mb('Menü', 'menu', () => openNavSheet()));
    mbar.appendChild(mb('Projekt', 'settings', () => { this.select(null); ed.classList.add('insp-open'); this.renderInspector(); }));
    VIDEO_TOOLS.forEach(t => mbar.appendChild(mb(t.l, t.i, t.fn)));
    mbar.appendChild(mb('Export', 'download', () => openExport()));
    ed.append(top, insp, tl, mbar);
    const empty = h('div', { style: { position: 'absolute', inset: 0, display: 'none', overflow: 'auto' } });
    root.append(ed, empty);
    Object.assign(this.e, { ed, rail, stage, wrap, canvas, ov, qbar, tc, playB, insp, tl, empty, mbar });
    Timeline.mount(tl);
    new ResizeObserver(() => { if (App.view === 'video') this.layout(); }).observe(stage);
    Bus.on('vframe', () => { if (App.view === 'video') this.draw(); });
    Bus.on('vplay', p => { this.e.playB.innerHTML = icon(p ? 'pause' : 'play'); this.e.playB.setAttribute('aria-label', p ? 'Pause' : 'Abspielen'); });
    Bus.on('project', () => { if (App.view === 'video') this.show(); });
    Bus.on('restore', () => { if (App.view === 'video') { if (this.selId && !findVItem(this.selId)) this.selId = null; this.refresh(); } });
    Bus.on('media', () => { if (App.view === 'video') { Timeline.render(); requestVRender(); } });
    this.bindPreview();
  },
  active() { return App.project && App.project.type === 'video'; },
  show() {
    document.body.classList.toggle('in-editor', this.active());
    this.e.ed.style.display = this.active() ? '' : 'none'; this.e.empty.style.display = this.active() ? 'none' : 'block';
    if (!this.active()) { this.renderEmpty(); return; }
    VE.override = null;
    preloadVideoProject(App.project);
    this.layout(); this.refresh(); setTimeout(() => Timeline.fit(), 30);
    const fi = App.project.video.fadeIn || 0;
    VE.seek(VE.t < fi ? fi + 0.05 : Math.min(VE.t, VE.duration()));
  },
  hide() { VE.pause(); },
  refresh() { Timeline.render(); this.renderInspector(); this.drawOverlay(); this.renderQuickBar(); requestVRender(); },
  renderEmpty() {
    const e = clear(this.e.empty); const wrap = h('div', { class: 'page' });
    wrap.appendChild(h('div', { class: 'hero' }, h('div', null, h('div', { class: 'eyebrow' }, 'Video Studio'), h('h1', { class: 'h1' }, 'Bewegtbild mit ', h('em', null, 'Haltung'), '.'), h('p', { class: 'lead' }, App.project ? 'Das geöffnete Projekt ist ein Design. Starte ein Video oder lass dein Rohvideo automatisch schneiden.' : 'Starte ein neues Video oder lass dein Rohvideo automatisch schneiden.'))));
    const g = h('div', { class: 'qa-grid' });
    const add = (l, s, i, fn) => { const b = h('button', { class: 'qa', type: 'button', onclick: fn }); b.innerHTML = `<span class="qi">${icon(i)}</span><div><b>${l}</b><span>${s}</span></div>`; g.appendChild(b); };
    add('Reel automatisch bearbeiten', 'Rohvideo hochladen', 'wand', () => showView('autoedit'));
    ['reel', 'tiktok', 'short', 'story', 'square', 'youtube'].forEach(k => add(FORMATS[k].label, FORMATS[k].w + ' × ' + FORMATS[k].h, FORMATS[k].icon, () => createAndOpen({ type: 'video', formatKey: k, name: FORMATS[k].label })));
    wrap.appendChild(g); wrap.appendChild(recentProjectsBlock(p => p.type === 'video', 'Letzte Videos'));
    e.appendChild(wrap);
  },
  layout() {
    if (!this.active()) return;
    const f = App.project.format, st = this.e.stage; const pad = isPhone() ? 8 : 20;
    const aw = Math.max(60, st.clientWidth - pad * 2), ah = Math.max(60, st.clientHeight - pad * 2);
    const s = Math.min(aw / f.w, ah / f.h); const w = Math.floor(f.w * s), hh = Math.floor(f.h * s);
    Object.assign(this.e.wrap.style, { width: w + 'px', height: hh + 'px' });
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const bw = Math.min(f.w, Math.round(w * dpr)); const bh = Math.round(bw * f.h / f.w);
    if (this.e.canvas.width !== bw || this.e.canvas.height !== bh) { this.e.canvas.width = bw; this.e.canvas.height = bh; }
    this.dispScale = s; this.drawOverlay(); this.draw();
  },
  draw() {
    if (!this.active() || App.view !== 'video') return;
    const c = this.e.canvas, ctx = c.getContext('2d'), f = VE.project().format; const s = c.width / f.w;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    VE.renderFrame(ctx, VE.t);
    const d = VE.duration(); this.e.tc.textContent = fmtTime(VE.t) + ' / ' + fmtTime(d);
  },
  drawOverlay() {
    const ov = clear(this.e.ov); if (!this.active() || !App.settings.safeZones) return;
    const f = App.project.format, s = this.dispScale || 1; const z = safeZoneRects(f); if (!z) return;
    const sz = h('div', { class: 'safezone' }); z.forEach(r => sz.appendChild(h('div', { class: 'sz', style: { left: r.x * s + 'px', top: r.y * s + 'px', width: r.w * s + 'px', height: r.h * s + 'px' } }, h('span', { class: 'szl' }, r.l)))); ov.appendChild(sz);
  },
  /* drag text / graphics / overlays / captions directly in the preview */
  bindPreview() {
    const c = this.e.canvas;
    c.addEventListener('pointerdown', e => {
      if (!this.active() || App.preview) return;
      const r = c.getBoundingClientRect(), f = App.project.format; const k = f.w / r.width;
      const px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k; const v = App.project.video, t = VE.t;
      let hit = null;
      for (const tr of ['text', 'graphics', 'overlay']) for (const it of v.items) if (it.track === tr && it.el && t >= it.start && t < it.start + it.dur) { const el = it.el; if (px >= el.x && px <= el.x + el.w && py >= el.y && py <= el.y + el.h) hit = { it, el }; }
      if (!hit && v.cap.show !== false) { const cap = v.captions.find(cc => t >= cc.start && t < cc.end); if (cap) { const cy = capY(v.cap, cap, f.h); if (Math.abs(py - cy) < f.h * 0.07) hit = { cap }; } }
      if (!hit) return;
      e.preventDefault(); c.setPointerCapture(e.pointerId);
      const id = hit.it ? hit.it.id : hit.cap.id; this.select(id);
      const x0 = px, y0 = py, ox = hit.el ? hit.el.x : 0, oy = hit.el ? hit.el.y : capY(v.cap, hit.cap, f.h);
      let moved = false;
      const mv = ev => { const nx = (ev.clientX - r.left) * k, ny = (ev.clientY - r.top) * k; if (Math.hypot(nx - x0, ny - y0) > 4) moved = true; if (!moved) return;
        if (hit.el) { hit.el.x = Math.round(ox + nx - x0); hit.el.y = Math.round(oy + ny - y0); const cx = hit.el.x + hit.el.w / 2; if (Math.abs(cx - f.w / 2) < f.w * 0.012) hit.el.x = Math.round(f.w / 2 - hit.el.w / 2); }
        else { hit.cap.y = clamp((oy + ny - y0) / f.h, 0.05, 0.95); hit.cap.manual = true; }
        requestVRender(); };
      const up = () => { c.removeEventListener('pointermove', mv); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up); if (moved) { commit('move'); this.renderInspector(); } };
      c.addEventListener('pointermove', mv); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    });
  },
  /* ── Selection & operations ───────────────────────────────────────── */
  select(id) {
    this.selId = id; App.vsel = id;
    $$('.tl-item', Timeline.tracks).forEach(el => el.classList.toggle('sel', el.dataset.id === id));
    this.renderInspector(); this.renderQuickBar();
  },
  renderQuickBar() {
    const q = clear(this.e.qbar);
    if (!this.selId || !isNarrow()) { q.style.display = 'none'; return; }
    q.style.display = 'flex';
    q.append(btn('Bearbeiten', () => this.openInspector(), { cls: 'sm primary', icon: 'pen' }), ibtn('scissors', 'Teilen', () => this.split()), ibtn('copy', 'Duplizieren', () => this.duplicate()), ibtn('trash', 'Löschen', () => this.remove()), ibtn('x', 'Auswahl aufheben', () => this.select(null)));
  },
  openInspector() { this.e.ed.classList.add('insp-open'); this.renderInspector(); },
  split() {
    const v = App.project?.video; if (!v) return; const t = VE.t; let it = findVItem(this.selId);
    if (!it) { const L = mainLayout(v.main).find(L => t > L.start && t < L.end); if (L) it = L.clip; }
    if (!it) { toast('Wähle einen Clip unter dem Playhead.', 'info'); return; }
    const tr = vItemTrack(it);
    if (tr === 'main') {
      const L = mainLayout(v.main).find(x => x.clip === it); if (!L || t <= L.start + 0.05 || t >= L.end - 0.05) { toast('Playhead muss innerhalb des Clips liegen.', 'info'); return; }
      const cut = it.in + (t - L.start) * it.speed; const b = deepClone(it); b.id = uid('cl'); b.in = it.kind === 'image' ? 0 : cut; if (it.kind === 'image') { b.out = it.out - (t - L.start); it.out = t - L.start; } else it.out = cut;
      b.trans = { type: 'none', dur: 0.5 }; it.fadeOut = 0; b.fadeIn = 0; it.aFadeOut = 0; b.aFadeIn = 0;
      v.main.splice(v.main.indexOf(it) + 1, 0, b);
    } else if (tr === 'captions') {
      if (t <= it.start || t >= it.end) { toast('Playhead muss innerhalb der Caption liegen.', 'info'); return; }
      const words = it.text.split(/\s+/); const k = Math.max(1, Math.round(words.length * (t - it.start) / (it.end - it.start)));
      const b = { ...deepClone(it), id: uid('cp'), start: t, text: words.slice(k).join(' ') || '…', words: it.words ? it.words.slice(k) : null, emph: [] };
      it.end = t; it.text = words.slice(0, k).join(' '); if (it.words) it.words = it.words.slice(0, k);
      v.captions.splice(v.captions.indexOf(it) + 1, 0, b);
    } else {
      if (t <= it.start + 0.05 || t >= it.start + it.dur - 0.05) { toast('Playhead muss innerhalb des Elements liegen.', 'info'); return; }
      const b = deepClone(it); b.id = uid('it'); const d1 = t - it.start; b.start = t; b.dur = it.dur - d1; b.in = (it.in || 0) + d1; it.dur = d1; if (b.el) b.el.id = uid('el');
      v.items.splice(v.items.indexOf(it) + 1, 0, b);
    }
    commit('split'); this.refresh(); toast('Geteilt', 'success', { duration: 1200 });
  },
  duplicate() {
    const v = App.project?.video; const it = findVItem(this.selId); if (!it) return;
    const tr = vItemTrack(it); const c = deepClone(it);
    if (tr === 'main') { c.id = uid('cl'); v.main.splice(v.main.indexOf(it) + 1, 0, c); }
    else if (tr === 'captions') { c.id = uid('cp'); const d = it.end - it.start; c.start = it.end; c.end = it.end + d; v.captions.splice(v.captions.indexOf(it) + 1, 0, c); }
    else { c.id = uid('it'); c.start = it.start + it.dur; if (c.el) c.el.id = uid('el'); v.items.push(c); }
    commit('duplicate'); this.select(c.id); this.refresh();
  },
  remove() {
    const v = App.project?.video; const it = findVItem(this.selId); if (!it) return;
    const tr = vItemTrack(it);
    if (tr === 'main') v.main = v.main.filter(x => x !== it); else if (tr === 'captions') v.captions = v.captions.filter(x => x !== it); else v.items = v.items.filter(x => x !== it);
    commit('delete'); this.selId = null; this.refresh(); VE.seek(Math.min(VE.t, VE.duration()));
  },
  reorder(dir) {
    const v = App.project?.video; const it = findVItem(this.selId); if (!it || vItemTrack(it) !== 'main') { toast('Wähle einen Clip in der VIDEO-Spur.', 'info'); return; }
    const i = v.main.indexOf(it), j = i + dir; if (j < 0 || j >= v.main.length) return;
    [v.main[i], v.main[j]] = [v.main[j], v.main[i]]; commit('reorder'); this.refresh();
  },
  onKey(e) {
    if (!this.active()) return false;
    const k = e.key, mod = e.metaKey || e.ctrlKey;
    if ((k === 'Delete' || k === 'Backspace') && this.selId) { this.remove(); return true; }
    if (mod && k.toLowerCase() === 'd' && this.selId) { this.duplicate(); return true; }
    if (!mod && k.toLowerCase() === 's') { this.split(); return true; }
    if (k === 'ArrowLeft') { VE.seek(VE.t - (e.shiftKey ? 1 : 1 / 30)); return true; }
    if (k === 'ArrowRight') { VE.seek(VE.t + (e.shiftKey ? 1 : 1 / 30)); return true; }
    if (k === 'Home') { VE.seek(0); return true; } if (k === 'End') { VE.seek(VE.duration()); return true; }
    if (k === 'Escape' && this.selId) { this.select(null); return true; }
    return false;
  },
  /* ── Add tools ────────────────────────────────────────────────────── */
  async addMain() {
    if (!this.active()) return;
    const sel = await pickMediaDialog({ kind: ['video', 'image'], multiple: true, title: 'Clips zur VIDEO-Spur hinzufügen' }); if (!sel.length) return;
    sel.forEach(m => App.project.video.main.push(newClip(m))); commit('add'); preloadVideoProject(App.project); this.refresh(); Timeline.fit();
    toast(sel.length + ' Clip(s) hinzugefügt', 'success');
  },
  async addBroll() {
    const [m] = await pickMediaDialog({ kind: ['image', 'video'], title: 'B-Roll wählen' }); if (!m) return;
    const it = newItem('broll', { mediaId: m.id, name: m.name, start: VE.t, dur: m.kind === 'video' ? Math.min(3, m.duration || 3) : 3, in: 0, fade: 0.25, kb: true, look: 'original' });
    App.project.video.items.push(it); commit('add'); this.select(it.id); this.refresh();
  },
  async addOverlay() {
    const [m] = await pickMediaDialog({ kind: ['image', 'video'], title: 'Overlay wählen' }); if (!m) return;
    const f = App.project.format; const el = mkImage(m, f.w, f.h); el.w = Math.round(f.w * 0.5); el.h = Math.round(el.w * (m.h / m.w)); el.x = Math.round((f.w - el.w) / 2); el.y = Math.round(f.h * 0.25); el.radius = 18;
    const it = newItem('overlay', { mediaId: m.id, name: m.name, start: VE.t, dur: 3, el, anim: 'fade', in: 0 });
    App.project.video.items.push(it); commit('add'); this.select(it.id); this.refresh();
  },
  addText(text) {
    const f = App.project.format; const el = mkText('headline', f.w, f.h, { text: text || 'Dein Gedanke.', color: C.ivory, size: Math.round(f.w * 0.075) });
    el.shadow.on = true; el.shadow.opacity = 0.4; el.h = textMetrics(el).h; el.y = Math.round(f.h * 0.22);
    const it = newItem('text', { start: VE.t, dur: 3, el, anim: 'slideUp', name: 'Text' });
    App.project.video.items.push(it); commit('add'); this.select(it.id); this.refresh();
    if (isNarrow()) this.openInspector();
  },
  addGraphic() {
    const g = h('div', { class: 'tile-grid three' });
    const m = modal({ title: 'Motion Graphic einfügen', icon: 'sparkle', cls: 'wide', content: [h('p', { class: 'muted small', style: { marginTop: 0 } }, 'Grafiken zeichnen sich elegant ins Bild. Weniger ist mehr.'), g] });
    Object.entries(GRAPHICS).forEach(([k, d]) => { const t = h('button', { class: 'tile sq', type: 'button', 'aria-label': d.label, 'data-tip': d.label, style: { background: '#2A221A' }, onclick: () => { m.close(); this.insertGraphic(k); } }); const el = mkGraphic(k, 90, 90); t.appendChild(graphicThumbOn(k, 90, k === 'paper' || k === 'note' || k === 'polaroid' ? '#E8DFD0' : '#2A221A')); g.appendChild(t); });
  },
  insertGraphic(k, opts = {}) {
    const f = App.project.format; const el = mkGraphic(k, f.w, f.h, { color: GRAPHICS[k].color || C.lightgold });
    if (k === 'paper') { el.w = f.w; el.h = f.h; el.x = 0; el.y = 0; }
    Object.assign(el, opts.el || {});
    const it = newItem('graphics', { start: opts.start ?? VE.t, dur: opts.dur ?? 2.5, el, drawDur: 0.8, name: GRAPHICS[k].label, auto: !!opts.auto });
    App.project.video.items.push(it); if (!opts.silent) { commit('add'); this.select(it.id); this.refresh(); }
    return it;
  },
  async addMusic() {
    const [m] = await pickMediaDialog({ kind: ['audio'], title: 'Musik wählen' }); if (!m) return;
    const v = App.project.video; const vd = VE.duration() || m.duration || 10;
    const it = newItem('audio', { mediaId: m.id, name: m.name, start: 0, dur: Math.min(m.duration || vd, vd || m.duration), in: 0, volume: 0.5, fadeIn: 1, fadeOut: 2, muted: false });
    v.items.push(it); v.audio.ducking = true; commit('add'); AudioCache.get(m.id).catch(e => toast(friendlyError(e, 'Audio'), 'error')); this.select(it.id); this.refresh();
    toast('Musik hinzugefügt · Ducking aktiv: Musik wird leiser, wenn gesprochen wird.', 'success', { duration: 4200 });
  },
  addVoice() {
    const body = h('div');
    const m = modal({ title: 'Voiceover', icon: 'mic', content: body });
    body.append(h('p', { class: 'muted', style: { marginTop: 0 } }, 'Nimm direkt auf (die Timeline läuft dabei mit) oder lade eine Audiodatei hoch. Aufnahmen bleiben lokal.'),
      h('div', { class: 'row wrap' }, btn('Aufnahme starten', () => { m.close(); this.recordVoice(); }, { cls: 'primary', icon: 'record' }), btn('Datei hochladen', async () => { m.close(); const files = await pickFiles('audio/*', false); const [a] = await Media.import(files); if (a) this.placeVoice(a); }, { icon: 'upload' }), btn('Aus Mediathek', async () => { m.close(); const [a] = await pickMediaDialog({ kind: ['audio'], title: 'Voiceover wählen' }); if (a) this.placeVoice(a); }, { cls: 'ghost' })));
  },
  placeVoice(a) {
    const it = newItem('voice', { mediaId: a.id, name: a.name, start: VE.t, dur: a.duration || 5, in: 0, volume: 1, fadeIn: 0.05, fadeOut: 0.1 });
    App.project.video.items.push(it); commit('add'); AudioCache.get(a.id).catch(() => { }); this.select(it.id); this.refresh();
  },
  async recordVoice() {
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast('Aufnahme wird von diesem Browser nicht unterstützt. Lade stattdessen eine Audiodatei hoch.', 'error'); return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch (e) { toast(friendlyError(e), 'error'); return; }
    const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); const chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const startT = VE.t; const t0 = Date.now();
    const timer = h('div', { class: 'serif', style: { fontSize: '44px', textAlign: 'center', margin: '10px 0' } }, '0:00');
    const iv = setInterval(() => timer.textContent = fmtTime((Date.now() - t0) / 1000, false), 250);
    let muteOrig = true;
    const m = modal({ title: 'Aufnahme läuft', icon: 'mic', closable: false, content: [h('div', { class: 'row', style: { justifyContent: 'center', gap: '10px', color: 'var(--danger)' } }, h('span', { html: icon('record') }), h('span', null, 'Mikrofon aktiv')), timer, toggle('Originalton während der Aufnahme stumm', true, v => muteOrig = v)],
      actions: [{ label: 'Stopp & einfügen', primary: true, icon: 'stop', onClick: () => rec.stop() }] });
    rec.onstop = async () => {
      clearInterval(iv); stream.getTracks().forEach(t => t.stop()); VE.pause(); if (VE.g) VE.g.voiceIn.gain.value = 1; m.close();
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
      const file = new File([blob], 'Voiceover ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + (blob.type.includes('mp4') ? '.m4a' : '.webm'), { type: blob.type });
      const [a] = await Media.import([file]); if (a) { a.duration = a.duration || (Date.now() - t0) / 1000; VE.seek(startT); this.placeVoice(a); }
    };
    rec.start(250);
    if (VE.duration() > 0) { await VE.play(); if (muteOrig && VE.g) VE.g.voiceIn.gain.value = 0; }
  },
  async frameToImage() {
    if (!this.active()) return;
    const f = App.project.format; const c = makeCanvas(f.w, f.h); const ctx = c.getContext('2d');
    VE.renderFrame(ctx, VE.t);
    try { const blob = await canvasToBlob(c, 'image/jpeg', 0.92); const m = await Media.addGenerated(blob, 'Frame ' + fmtTime(VE.t).replace(':', '-') + '.jpg', ['behind-the-scenes']); toast('Frame als Bild in der Mediathek gespeichert.', 'success', { action: { label: 'Als Cover-Design', fn: () => createCoverFromImage(m) } }); }
    catch (e) { toast(friendlyError(e, 'Frame speichern'), 'error'); }
  },
  openTransition(c) { this.openInspector(); setTimeout(() => { const s = $('#v-trans', this.e.insp); s && s.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60); },

  /* ── Inspector ────────────────────────────────────────────────────── */
  renderInspector() {
    if (!this.active()) return;
    const ins = clear(this.e.insp); ins.appendChild(h('div', { class: 'sheet-handle' }));
    const it = findVItem(this.selId);
    const close = h('button', { class: 'ibtn insp-toggle', type: 'button', 'aria-label': 'Schließen', html: icon('x'), onclick: () => this.e.ed.classList.remove('insp-open') });
    if (!it) { this.iProject(ins, close); return; }
    const tr = vItemTrack(it);
    const titles = { main: it.kind === 'image' ? 'Bild-Clip' : 'Video-Clip', broll: 'B-Roll', overlay: 'Overlay', graphics: 'Motion Graphic', text: 'Text', captions: 'Caption', audio: 'Musik', voice: 'Voiceover' };
    ins.appendChild(h('div', { class: 'ins-title' }, h('h4', null, titles[tr]), ibtn('scissors', 'Teilen', () => this.split(), { size: 's' }), ibtn('copy', 'Duplizieren', () => this.duplicate(), { size: 's' }), ibtn('trash', 'Löschen', () => this.remove(), { size: 's' }), close));
    ({ main: this.iClip, broll: this.iBroll, overlay: this.iOverlay, graphics: this.iGraphic, text: this.iText, captions: this.iCaption, audio: this.iAudio, voice: this.iAudio })[tr].call(this, ins, it);
  },
  lv(fn) { return v => { fn(v); requestVRender(); }; },
  cm(label = 'edit') { return () => { commit(label); Timeline.render(); }; },
  timing(ins, it) {
    const st = h('input', { class: 'input sm', type: 'number', step: 0.1, min: 0, value: round(it.start, 2), 'aria-label': 'Start (s)' });
    const du = h('input', { class: 'input sm', type: 'number', step: 0.1, min: 0.1, value: round(it.dur, 2), 'aria-label': 'Dauer (s)' });
    st.addEventListener('change', () => { it.start = Math.max(0, +st.value); commit('time'); Timeline.render(); requestVRender(); });
    du.addEventListener('change', () => { it.dur = Math.max(0.1, +du.value); commit('time'); Timeline.render(); requestVRender(); });
    ins.appendChild(insSec('Zeit', h('div', { class: 'grid2' }, field('Start (s)', st), field('Dauer (s)', du)), h('div', { class: 'row' }, btn('Start = Playhead', () => { it.start = VE.t; commit('time'); this.refresh(); }, { cls: 'sm' }), btn('Ende = Playhead', () => { if (VE.t > it.start) { it.dur = VE.t - it.start; commit('time'); this.refresh(); } }, { cls: 'sm' }))));
  },
  iClip(ins, c) {
    const m = Media.get(c.mediaId);
    if (c.kind === 'image') {
      const d = h('input', { class: 'input', type: 'number', step: 0.1, min: 0.2, value: round(c.out - c.in, 2), 'aria-label': 'Dauer' });
      d.addEventListener('change', () => { c.in = 0; c.out = Math.max(0.2, +d.value); commit('dur'); this.refresh(); });
      ins.appendChild(insSec('Dauer', field('Sekunden', d), toggle('Sanfte Kamerafahrt (Ken Burns)', !!c.kb, v => { c.kb = v; commit('kb'); requestVRender(); })));
    } else {
      const inI = h('input', { class: 'input sm', type: 'number', step: 0.05, min: 0, value: round(c.in, 2), 'aria-label': 'Anfang (s)' });
      const outI = h('input', { class: 'input sm', type: 'number', step: 0.05, min: 0, value: round(c.out, 2), 'aria-label': 'Ende (s)' });
      inI.addEventListener('change', () => { c.in = clamp(+inI.value, 0, c.out - 0.1); commit('trim'); this.refresh(); });
      outI.addEventListener('change', () => { c.out = clamp(+outI.value, c.in + 0.1, m?.duration || 1e6); commit('trim'); this.refresh(); });
      const L = mainLayout(App.project.video.main).find(x => x.clip === c);
      ins.appendChild(insSec('Schneiden', h('div', { class: 'grid2' }, field('Anfang in Quelle (s)', inI), field('Ende in Quelle (s)', outI)),
        h('div', { class: 'row wrap' }, btn('Anfang hier kürzen', () => { if (!L || VE.t <= L.start || VE.t >= L.end) return toast('Playhead in den Clip setzen.', 'info'); c.in = c.in + (VE.t - L.start) * c.speed; commit('trim'); this.refresh(); VE.seek(L.start); }, { cls: 'sm', icon: 'chevL' }), btn('Ende hier kürzen', () => { if (!L || VE.t <= L.start || VE.t >= L.end) return toast('Playhead in den Clip setzen.', 'info'); c.out = c.in + (VE.t - L.start) * c.speed; commit('trim'); this.refresh(); }, { cls: 'sm', icon: 'chevR' })),
        h('div', { class: 'tiny muted', style: { marginTop: '8px' } }, 'Original bleibt unverändert · Quelle ' + fmtTime(m?.duration || 0))));
      ins.appendChild(insSec('Geschwindigkeit', chips(SPEEDS.map(s => ({ v: s, l: String(s).replace('.', ',') + '×' })), c.speed, v => { c.speed = v; commit('speed'); this.refresh(); })));
      const a = insSec('Audio');
      a.append(toggle('Stumm', c.muted, v => { c.muted = v; commit('mute'); Timeline.render(); requestVRender(); }),
        slider('Lautstärke %', Math.round(c.volume * 100), 0, 200, 1, this.lv(v => c.volume = v / 100), this.cm('vol')),
        slider('Audio Fade In (s)', c.aFadeIn || 0, 0, 3, 0.1, this.lv(v => c.aFadeIn = v), this.cm('afade')),
        slider('Audio Fade Out (s)', c.aFadeOut || 0, 0, 3, 0.1, this.lv(v => c.aFadeOut = v), this.cm('afade')));
      ins.appendChild(a);
    }
    ins.appendChild(insSec('Video-Fade', slider('Fade In (s)', c.fadeIn || 0, 0, 3, 0.1, this.lv(v => c.fadeIn = v), this.cm('fade')), slider('Fade Out (s)', c.fadeOut || 0, 0, 3, 0.1, this.lv(v => c.fadeOut = v), this.cm('fade'))));
    const tf = insSec('Transformieren');
    tf.append(seg([{ v: 'fill', l: 'Füllen' }, { v: 'fit', l: 'Einpassen' }], c.fit, v => { c.fit = v; commit('fit'); requestVRender(); }), h('div', { style: { height: '8px' } }),
      slider('Zoom', c.zoom || 1, 0.5, 3, 0.01, this.lv(v => c.zoom = v), this.cm('zoom'), { reset: 1 }),
      slider('X-Position', c.x || 0, -0.5, 0.5, 0.005, this.lv(v => c.x = v), this.cm('x'), { reset: 0 }),
      slider('Y-Position', c.y || 0, -0.5, 0.5, 0.005, this.lv(v => c.y = v), this.cm('y'), { reset: 0 }),
      slider('Rotation', c.rot || 0, -180, 180, 1, this.lv(v => c.rot = v), this.cm('rot'), { reset: 0 }),
      h('div', { class: 'row' }, ibtn('flipH', 'Horizontal spiegeln', () => { c.flipX = !c.flipX; commit('flip'); requestVRender(); this.renderInspector(); }, { cls: 'bordered' + (c.flipX ? ' on' : '') }), ibtn('flipV', 'Vertikal spiegeln', () => { c.flipY = !c.flipY; commit('flip'); requestVRender(); this.renderInspector(); }, { cls: 'bordered' + (c.flipY ? ' on' : '') })),
      toggle('Langsamer Push-in (Zoom-Fahrt)', !!c.zoomTo, v => { c.zoomTo = v ? (c.zoom || 1) * 1.06 : null; commit('push'); requestVRender(); }));
    if (c.reframe) tf.appendChild(toggle('Auto-Reframing (Motiv folgen)', !c.reframeOff, v => { if (v) { c.reframe = c._reframe || c.reframe; c.reframeOff = false; } else { c._reframe = c.reframe; c.reframeOff = true; c.reframe = []; } commit('reframe'); requestVRender(); }));
    else if (c._reframe) tf.appendChild(toggle('Auto-Reframing (Motiv folgen)', false, v => { if (v) { c.reframe = c._reframe; c.reframeOff = false; commit('reframe'); requestVRender(); this.renderInspector(); } }));
    ins.appendChild(tf);
    const L = mainLayout(App.project.video.main).find(x => x.clip === c);
    if (L && L.idx > 0) {
      const ts = insSec('Übergang (in diesen Clip)'); ts.id = 'v-trans';
      ts.append(chips(TRANSITIONS, c.trans.type, v => { c.trans.type = v; commit('trans'); this.refresh(); }), h('div', { style: { height: '8px' } }), slider('Dauer (s)', c.trans.dur, 0.1, 2, 0.05, this.lv(v => c.trans.dur = v), this.cm('trans')),
        btn('Auf alle Übergänge anwenden', () => { App.project.video.main.forEach((x, i) => { if (i) x.trans = { ...c.trans }; }); commit('trans'); this.refresh(); toast('Übergang auf alle Clips angewendet', 'success'); }, { cls: 'sm ghost' }));
      ins.appendChild(ts);
    }
    this.lookSection(ins, c, true);
  },
  lookSection(ins, c, isClip) {
    const s = insSec('Look');
    s.appendChild(chips(VIDEO_LOOKS.map(k => ({ v: k, l: LOOKS[k].l })), c.look || 'original', v => { c.look = v; commit('look'); requestVRender(); }));
    s.appendChild(h('div', { style: { height: '10px' } }));
    c.adj = c.adj || {};
    ['brightness', 'contrast', 'saturation', 'warmth', 'highlights', 'shadows', 'vignette', 'grain'].forEach(k => { const d = ADJ_KEYS.find(a => a.k === k); s.appendChild(slider(d.l, c.adj[k] || 0, d.min ?? -100, 100, 1, this.lv(v => c.adj[k] = v), this.cm('adj'), { reset: 0 })); });
    if (isClip && (c.autoAdj || c._autoAdj)) s.appendChild(toggle('Automatische Farbkorrektur', !!c.autoAdj, v => { if (v) { c.autoAdj = c._autoAdj; } else { c._autoAdj = c.autoAdj; c.autoAdj = null; } commit('autocolor'); requestVRender(); }));
    if (isClip) s.appendChild(btn('Look auf alle Clips anwenden', () => { App.project.video.main.forEach(x => { x.look = c.look; x.adj = deepClone(c.adj); }); commit('look'); requestVRender(); toast('Look auf alle Clips angewendet', 'success'); }, { cls: 'sm ghost block' }));
    ins.appendChild(s);
  },
  iBroll(ins, it) {
    const m = Media.get(it.mediaId);
    ins.appendChild(insSec('Medium', h('div', { class: 'row' }, m && m.thumb ? h('img', { src: Media.thumbURL(m), alt: '', style: { width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px' } }) : null, h('div', { class: 'grow small' }, m ? m.name : 'Medium fehlt')),
      h('div', { style: { height: '8px' } }), btn('Ersetzen', async () => { const [n] = await pickMediaDialog({ kind: ['image', 'video'], title: 'B-Roll ersetzen' }); if (n) { it.mediaId = n.id; it.name = n.name; commit('replace'); this.refresh(); } }, { cls: 'sm', icon: 'image' }),
      it.alts && it.alts.length ? h('div', { style: { marginTop: '10px' } }, h('div', { class: 'lbl', style: { marginBottom: '6px' } }, 'Alternativen (Smart Match)'), (() => { const r = h('div', { class: 'alt-row' }); it.alts.map(Media.get.bind(Media)).filter(Boolean).forEach(a => { const im = h('img', { src: Media.thumbURL(a), alt: a.name, class: a.id === it.mediaId ? 'on' : '', role: 'button', tabindex: '0' }); im.onclick = () => { it.mediaId = a.id; it.name = a.name; commit('alt'); this.refresh(); }; r.appendChild(im); }); return r; })()) : null));
    this.timing(ins, it);
    ins.appendChild(insSec('Darstellung', slider('Ein-/Ausblenden (s)', it.fade ?? 0.25, 0, 1.5, 0.05, this.lv(v => it.fade = v), this.cm()), toggle('Sanfte Kamerafahrt', it.kb !== false, v => { it.kb = v; commit('kb'); requestVRender(); }),
      slider('Bildausschnitt X', it.ox || 0, -1, 1, 0.01, this.lv(v => it.ox = v), this.cm(), { reset: 0 }), slider('Bildausschnitt Y', it.oy || 0, -1, 1, 0.01, this.lv(v => it.oy = v), this.cm(), { reset: 0 }),
      toggle('Ausgeblendet', !!it.hidden, v => { it.hidden = v; commit('hide'); this.refresh(); })));
    this.lookSection(ins, it, false);
  },
  elTransform(ins, it) {
    const el = it.el; const f = App.project.format;
    ins.appendChild(insSec('Position & Größe',
      slider('Größe %', Math.round(el.w / (it._w0 || (it._w0 = el.w)) * 100), 10, 400, 1, this.lv(v => { const cx = el.x + el.w / 2, cy = el.y + el.h / 2; const k = v / 100 * it._w0 / el.w; el.w = Math.round(el.w * k); if (el.type === 'text') { el.size = Math.max(6, Math.round(el.size * k)); el.h = textMetrics(el).h; } else el.h = Math.round(el.h * k); el.x = Math.round(cx - el.w / 2); el.y = Math.round(cy - el.h / 2); }), this.cm('size')),
      slider('X', el.x, -f.w * 0.5, f.w, 1, this.lv(v => el.x = v), this.cm('x')), slider('Y', el.y, -f.h * 0.5, f.h, 1, this.lv(v => el.y = v), this.cm('y')),
      slider('Rotation', el.rot || 0, -180, 180, 1, this.lv(v => el.rot = v), this.cm('rot'), { reset: 0 }), slider('Deckkraft %', Math.round((el.opacity ?? 1) * 100), 0, 100, 1, this.lv(v => el.opacity = v / 100), this.cm('op')),
      h('div', { class: 'row' }, btn('Horizontal zentrieren', () => { el.x = Math.round((f.w - el.w) / 2); commit('center'); requestVRender(); }, { cls: 'sm' }), btn('Vertikal', () => { el.y = Math.round((f.h - el.h) / 2); commit('center'); requestVRender(); }, { cls: 'sm' }))));
  },
  iOverlay(ins, it) {
    this.timing(ins, it); this.elTransform(ins, it);
    ins.appendChild(insSec('Stil', slider('Eckenrundung', it.el.radius || 0, 0, 400, 1, this.lv(v => it.el.radius = v), this.cm()), field('Animation', selectEl([{ v: 'fade', l: 'Fade' }, { v: 'slideUp', l: 'Slide Up' }, { v: 'pop', l: 'Pop' }, { v: 'scale', l: 'Scale' }, { v: 'none', l: 'Keine' }], it.anim || 'fade', v => { it.anim = v; commit('anim'); })), btn('Ersetzen', async () => { const [n] = await pickMediaDialog({ kind: ['image', 'video'], title: 'Overlay ersetzen' }); if (n) { it.mediaId = n.id; it.el.mediaId = n.id; it.name = n.name; commit('replace'); this.refresh(); } }, { cls: 'sm', icon: 'image' })));
  },
  iGraphic(ins, it) {
    const el = it.el;
    ins.appendChild(insSec('Grafik', field('Typ', selectEl(Object.entries(GRAPHICS).map(([k, d]) => ({ v: k, l: d.label })), el.kind, v => { el.kind = v; it.name = GRAPHICS[v].label; commit('kind'); this.refresh(); })), colorRow(el.color, (c, l) => { el.color = c; requestVRender(); if (!l) commit('color'); }), h('div', { style: { height: '8px' } }),
      slider('Strichstärke', el.strokeW || 3, 0.5, 14, 0.5, this.lv(v => el.strokeW = v), this.cm()), slider('Zeichendauer (s)', it.drawDur || 0.8, 0.1, 3, 0.05, this.lv(v => it.drawDur = v), this.cm()),
      el.kind === 'numbers' ? seg([1, 2, 3].map(n => ({ v: n, l: '0' + n })), el.index || 1, v => { el.index = v; commit('idx'); requestVRender(); }) : null,
      ['speech', 'thought', 'note', 'polaroid', 'label'].includes(el.kind) ? (() => { const t = h('input', { class: 'input', value: el.label || '', placeholder: 'Beschriftung', 'aria-label': 'Beschriftung' }); t.oninput = () => { el.label = t.value; requestVRender(); }; t.onchange = () => commit('label'); return field('Beschriftung', t); })() : null));
    this.timing(ins, it); this.elTransform(ins, it);
  },
  iText(ins, it) {
    const el = it.el;
    const ta = h('textarea', { class: 'textarea', style: { minHeight: '70px' }, 'aria-label': 'Text' }); ta.value = el.text;
    ta.addEventListener('input', () => { el.text = ta.value; el.h = textMetrics(el).h; requestVRender(); }); ta.addEventListener('change', () => { commit('text'); Timeline.render(); });
    ins.appendChild(insSec('Text', ta, h('div', { style: { height: '8px' } }), field('Schrift', selectEl(FONTS, el.font, v => { el.font = v; ensureFont(el).then(requestVRender); commit('font'); })),
      h('div', { class: 'row wrap', style: { gap: '6px' } }, seg([{ v: 'left', icon: 'tAlignL', aria: 'Links' }, { v: 'center', icon: 'tAlignC', aria: 'Mitte' }, { v: 'right', icon: 'tAlignR', aria: 'Rechts' }], el.align, v => { el.align = v; commit('align'); requestVRender(); }),
        h('button', { class: 'ibtn bordered' + (el.italic ? ' on' : ''), type: 'button', style: { fontStyle: 'italic', fontFamily: 'Georgia' }, 'aria-label': 'Kursiv', onclick: () => { el.italic = !el.italic; ensureFont(el).then(requestVRender); commit('i'); this.renderInspector(); } }, 'I'),
        h('button', { class: 'ibtn bordered' + (el.transform === 'upper' ? ' on' : ''), type: 'button', style: { fontSize: '11px' }, 'aria-label': 'Großbuchstaben', onclick: () => { el.transform = el.transform === 'upper' ? 'none' : 'upper'; commit('tt'); requestVRender(); this.renderInspector(); } }, 'AA')),
      h('div', { style: { height: '8px' } }), slider('Schriftgröße', el.size, 10, 400, 1, this.lv(v => { el.size = v; el.h = textMetrics(el).h; }), this.cm('size')),
      slider('Buchstabenabstand', el.ls || 0, -0.5, 1, 0.01, this.lv(v => el.ls = v), this.cm('ls')),
      colorRow(el.color, (c, l) => { el.color = c; requestVRender(); if (!l) commit('color'); }), h('div', { style: { height: '6px' } }),
      toggle('Schatten', el.shadow.on, v => { el.shadow.on = v; commit('sh'); requestVRender(); }), toggle('Hintergrund-Box', el.bg.on, v => { el.bg.on = v; el.bg.radius = 24; el.bg.color = C.black; el.bg.opacity = 0.75; commit('bg'); requestVRender(); })));
    ins.appendChild(insSec('Animation', chips([{ v: 'none', l: 'Keine' }, { v: 'fade', l: 'Fade' }, { v: 'slideUp', l: 'Slide Up' }, { v: 'pop', l: 'Pop' }, { v: 'scale', l: 'Scale' }, { v: 'word', l: 'Wortweise' }], it.anim || 'fade', v => { it.anim = v; commit('anim'); VE.seek(it.start); })));
    this.timing(ins, it); this.elTransform(ins, it);
  },
  iCaption(ins, c) {
    const ta = h('textarea', { class: 'textarea', style: { minHeight: '60px' }, 'aria-label': 'Caption-Text' }); ta.value = c.text;
    ta.addEventListener('input', () => { c.text = ta.value; c.words = null; requestVRender(); }); ta.addEventListener('change', () => { commit('cap'); Timeline.render(); });
    const st = h('input', { class: 'input sm', type: 'number', step: 0.05, value: round(c.start, 2), 'aria-label': 'Start' }), en = h('input', { class: 'input sm', type: 'number', step: 0.05, value: round(c.end, 2), 'aria-label': 'Ende' });
    st.onchange = () => { c.start = Math.max(0, +st.value); commit('cap'); Timeline.render(); }; en.onchange = () => { c.end = Math.max(c.start + 0.1, +en.value); commit('cap'); Timeline.render(); };
    ins.appendChild(insSec('Caption', ta, h('div', { class: 'grid2', style: { marginTop: '8px' } }, field('Start', st), field('Ende', en)),
      field('Stil (nur diese Caption)', selectEl([{ v: '', l: 'Wie alle' }, ...Object.entries(CAPTION_STYLES).map(([k, s]) => ({ v: k, l: s.l }))], c.style || '', v => { c.style = v || undefined; commit('cap'); requestVRender(); })),
      slider('Vertikale Position', round((c.y ?? capY(App.project.video.cap, null, 1)), 2), 0.05, 0.95, 0.01, this.lv(v => { c.y = v; c.manual = true; }), this.cm('cap')), toggle('Lesbarkeits-Hintergrund', !!c.box, x => { c.box = x; commit('cap'); requestVRender(); }),
      h('div', { class: 'row wrap' }, btn('Position zurücksetzen', () => { delete c.y; delete c.manual; commit('cap'); requestVRender(); this.renderInspector(); }, { cls: 'sm' }), btn('Alle im Caption Studio', () => showView('captions'), { cls: 'sm ghost', icon: 'captions' }))));
  },
  iAudio(ins, it) {
    const m = Media.get(it.mediaId);
    ins.appendChild(insSec('Datei', h('div', { class: 'small' }, m ? m.name : 'Datei fehlt'), m && m.moods && m.moods.length ? h('div', { class: 'tiny muted' }, 'Stimmung: ' + m.moods.join(', ')) : null));
    ins.appendChild(insSec('Lautstärke', toggle('Stumm', !!it.muted, v => { it.muted = v; commit('mute'); }), slider('Lautstärke %', Math.round((it.volume ?? 1) * 100), 0, 200, 1, this.lv(v => it.volume = v / 100), this.cm('vol')),
      slider('Fade In (s)', it.fadeIn || 0, 0, 6, 0.1, this.lv(v => it.fadeIn = v), this.cm('fade')), slider('Fade Out (s)', it.fadeOut || 0, 0, 6, 0.1, this.lv(v => it.fadeOut = v), this.cm('fade'))));
    const inI = h('input', { class: 'input sm', type: 'number', step: 0.1, min: 0, value: round(it.in || 0, 2), 'aria-label': 'Startzeit in der Datei' });
    inI.onchange = () => { it.in = clamp(+inI.value, 0, Math.max(0, (m?.duration || 1e6) - 0.1)); commit('in'); Timeline.render(); };
    ins.appendChild(insSec('Startzeit in der Datei', inI));
    this.timing(ins, it);
    if (it.track === 'audio') ins.appendChild(insSec('Ducking', toggle('Musik leiser, wenn gesprochen wird', App.project.video.audio.ducking, v => { App.project.video.audio.ducking = v; commit('duck'); this.renderInspector(); }), App.project.video.audio.ducking ? slider('Musik während Sprache %', Math.round(App.project.video.audio.duckLevel * 100), 5, 100, 1, v => App.project.video.audio.duckLevel = v / 100, this.cm('duck')) : null));
  },
  iProject(ins, close) {
    const p = App.project, v = p.video, f = p.format;
    ins.appendChild(h('div', { class: 'ins-title' }, h('h4', null, 'Video-Projekt'), close));
    ins.appendChild(insSec('Format', h('div', { class: 'small muted', style: { marginBottom: '8px' } }, `${f.label || ''} · ${f.w} × ${f.h} · ${fmtTime(VE.duration())}`),
      chips([{ v: 'reel', l: '9:16' }, { v: 'liportrait', l: '4:5' }, { v: 'square', l: '1:1' }, { v: 'youtube', l: '16:9' }], ({ '1080x1920': 'reel', '1080x1350': 'liportrait', '1080x1080': 'square', '1920x1080': 'youtube' })[f.w + 'x' + f.h], k => { const nf = FORMATS[k]; Object.assign(p.format, { key: k, label: nf.label, w: nf.w, h: nf.h, safe: nf.safe || null }); commit('format'); this.layout(); this.refresh(); })));
    ins.appendChild(insSec('Hintergrund', colorRow(v.bg, (c, l) => { v.bg = c; requestVRender(); if (!l) commit('bg'); })));
    ins.appendChild(insSec('Video', slider('Fade In am Anfang (s)', v.fadeIn || 0, 0, 3, 0.1, this.lv(x => v.fadeIn = x), this.cm('fade')), slider('Fade Out am Ende (s)', v.fadeOut || 0, 0, 3, 0.1, this.lv(x => v.fadeOut = x), this.cm('fade')),
      field('Look für alle Clips', selectEl([{ v: '', l: '– wählen –' }, ...VIDEO_LOOKS.map(k => ({ v: k, l: LOOKS[k].l }))], '', k => { if (!k) return; v.main.forEach(c => c.look = k); commit('look'); requestVRender(); toast('Look „' + LOOKS[k].l + '“ auf alle Clips angewendet', 'success'); }))));
    const au = insSec('Audio');
    au.append(toggle('Stimme verbessern', v.audio.enhance, async on => { v.audio.enhance = on; if (on) await ensureLoudness(p); VE.routeVoice(); commit('enhance'); this.renderInspector(); }, { tip: 'Hochpass, Präsenz-EQ, Kompressor und Lautheits-Normalisierung' }),
      h('p', { class: 'tiny muted', style: { margin: '-2px 0 8px' } }, 'Filtert Rumpeln, macht die Stimme präsenter, gleicht Lautstärkespitzen aus und normalisiert die Lautheit.'),
      toggle('Rauschen in Sprechpausen absenken', v.audio.gate, async on => { if (on) { const ok = await ensureSpeech(p); if (!ok) { toast('Keine auswertbare Tonspur gefunden.', 'error'); return; } } v.audio.gate = on; commit('gate'); this.renderInspector(); }),
      toggle('Audio Ducking (Musik unter Sprache)', v.audio.ducking, on => { v.audio.ducking = on; commit('duck'); if (on) ensureSpeech(p); this.renderInspector(); }),
      v.audio.ducking ? slider('Musik während Sprache %', Math.round(v.audio.duckLevel * 100), 5, 100, 1, x => v.audio.duckLevel = x / 100, this.cm('duck')) : null);
    ins.appendChild(au);
    ins.appendChild(insSec('Untertitel', toggle('Untertitel anzeigen', v.cap.show !== false, on => { v.cap.show = on; commit('capshow'); requestVRender(); }), btn('Caption Studio öffnen', () => showView('captions'), { cls: 'sm block', icon: 'captions' })));
    if (v.autoEdit) {
      const ae = v.autoEdit;
      ins.appendChild(insSec('Auto Edit', h('div', { class: 'small', style: { lineHeight: 1.6 } }, (ae.summary || []).map(s => h('div', null, '· ' + s))), h('div', { style: { height: '8px' } }),
        btn('Automatische Änderungen entfernen', async () => { if (await confirmDialog({ title: 'Original wiederherstellen?', text: 'Schnitt, B-Roll, Grafiken und Untertitel aus Auto Edit werden entfernt. Deine Originaldatei war nie verändert. (Rückgängig möglich.)', ok: 'Wiederherstellen' })) { revertAutoEdit(p); commit('revert'); this.refresh(); } }, { cls: 'sm danger block', icon: 'undo' })));
    }
    ins.appendChild(insSec('Weiterverwenden', h('div', { class: 'col' }, btn('Aus Video Karussell erstellen', () => videoToCarousel(p), { cls: 'sm block', icon: 'carousel' }), btn('Content Repurpose …', () => repurposeHub(p), { cls: 'sm block', icon: 'repurpose' }))));
    ins.appendChild(insSec('Export', btn('Video exportieren …', () => openExport(), { cls: 'primary block', icon: 'download' })));
  },
};
function graphicThumbOn(kind, size, bg) {
  const c = makeCanvas(size * 2, size * 2); const ctx = c.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); ctx.scale(2, 2);
  const g = GRAPHICS[kind]; const el = mkGraphic(kind, size, size, { color: kind === 'paper' || kind === 'note' || kind === 'polaroid' ? (g.color || C.cream) : C.lightgold }); el.w = Math.min(size * 0.8, size * 0.8 * (g.ar || 1)); el.h = el.w / (g.ar || 1); if (el.h > size * 0.8) { el.h = size * 0.8; el.w = el.h * (g.ar || 1); } el.x = (size - el.w) / 2; el.y = (size - el.h) / 2; el.id = 'th' + kind; el.strokeW = Math.max(1.5, el.strokeW * 0.8);
  drawElement(ctx, el); c.style.width = size + 'px'; c.style.height = size + 'px'; return c;
}
function preloadVideoProject(p) {
  if (!p || !p.video) return;
  p.video.main.forEach(c => { if (c.kind === 'image') Media.img(c.mediaId); else loadThumbImg(c.mediaId); });
  p.video.items.forEach(i => { if (!i.mediaId) return; const m = Media.get(i.mediaId); if (!m) return; if (m.kind === 'image') Media.img(i.mediaId); else if (m.kind === 'audio') AudioCache.get(i.mediaId).catch(() => { }); else loadThumbImg(i.mediaId); });
  const fonts = new Set(); p.video.items.forEach(i => i.el && i.el.type === 'text' && fonts.add(fontStr(i.el, 40))); Object.values(CAPTION_STYLES).forEach(s => fonts.add(`${s.italic ? 'italic ' : ''}${s.weight} 40px "${s.font}"`));
  if (document.fonts) fonts.forEach(f => document.fonts.load(f).then(requestVRender).catch(() => { }));
}
