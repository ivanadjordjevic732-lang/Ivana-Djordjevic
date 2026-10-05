/* ═══════════════════════════════════════════════════════════════════════
   MODULE: TIMELINE — 8 tracks, scrubbing, playhead, zoom, select, move,
   trim, split, duplicate, delete, reorder. Mouse + touch.
   ═══════════════════════════════════════════════════════════════════════ */
const TRACKS = [
  { k: 'main', l: 'VIDEO', i: 'video' }, { k: 'broll', l: 'B-ROLL', i: 'film' }, { k: 'overlay', l: 'OVERLAY', i: 'layers' },
  { k: 'graphics', l: 'MOTION', i: 'sparkle' }, { k: 'text', l: 'TEXT', i: 'text' }, { k: 'captions', l: 'CAPTIONS', i: 'captions' },
  { k: 'audio', l: 'AUDIO', i: 'music' }, { k: 'voice', l: 'VOICE', i: 'mic' },
];
const Timeline = {
  root: null, pps: 60, snapOn: true,
  mount(root) {
    this.root = root;
    const bar = h('div', { class: 'tl-bar', role: 'toolbar', 'aria-label': 'Timeline-Werkzeuge' });
    const body = h('div', { class: 'tl-body' });
    const labels = h('div', { class: 'tl-labels' }); const li = h('div', { class: 'tl-labels-inner' }); labels.appendChild(li);
    const scroll = h('div', { class: 'tl-scroll' }); const content = h('div', { class: 'tl-content' });
    const ruler = h('div', { class: 'tl-ruler', 'aria-label': 'Zeitleiste – klicken oder ziehen zum Springen' }); const rc = h('canvas'); ruler.appendChild(rc);
    const tracks = h('div', { class: 'tl-tracks' });
    const ph = h('div', { class: 'tl-playhead' }); const snapLine = h('div', { class: 'tl-snap', style: { display: 'none' } });
    content.append(ruler, tracks, ph, snapLine); scroll.appendChild(content); body.append(labels, scroll);
    const rz = h('div', { class: 'tl-resize', 'aria-hidden': 'true' });
    root.append(rz, bar, body);
    Object.assign(this, { bar, body, labels, li, scroll, content, ruler, rc, tracks, ph, snapLine });
    li.appendChild(h('div', { class: 'tl-label ruler' }));
    TRACKS.forEach(t => li.appendChild(h('div', { class: 'tl-label', title: t.l }, h('span', { html: icon(t.i, 's') }), h('span', { class: 'ln' }, t.l))));
    scroll.addEventListener('scroll', () => { li.style.transform = `translateY(${-scroll.scrollTop}px)`; this.drawRuler(); });
    this.buildBar();
    // scrubbing on ruler / playhead
    ruler.addEventListener('pointerdown', e => { e.preventDefault(); ruler.setPointerCapture(e.pointerId); const mv = ev => VE.seek(this.xToT(ev.clientX)); mv(e); const up = () => { ruler.removeEventListener('pointermove', mv); ruler.removeEventListener('pointerup', up); }; ruler.addEventListener('pointermove', mv); ruler.addEventListener('pointerup', up); });
    tracks.addEventListener('pointerdown', e => { if (e.target === tracks || e.target.classList.contains('tl-track')) { VideoUI.select(null); if (e.pointerType === 'mouse') VE.seek(this.xToT(e.clientX)); } });
    tracks.addEventListener('click', e => { if ((e.target === tracks || e.target.classList.contains('tl-track')) && e.pointerType !== 'mouse') VE.seek(this.xToT(e.clientX)); });
    scroll.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.setZoom(this.pps * (e.deltaY < 0 ? 1.12 : 0.89), e.clientX); } }, { passive: false });
    // resize timeline height
    rz.addEventListener('pointerdown', e => { e.preventDefault(); rz.setPointerCapture(e.pointerId); const y0 = e.clientY, h0 = root.offsetHeight; const mv = ev => { const nh = clamp(h0 - (ev.clientY - y0), 150, innerHeight * 0.7); root.style.setProperty(isPhone() ? '--tl-h-m' : '--tl-h', nh + 'px'); }; const up = () => { rz.removeEventListener('pointermove', mv); rz.removeEventListener('pointerup', up); VideoUI.layout(); }; rz.addEventListener('pointermove', mv); rz.addEventListener('pointerup', up); });
    new ResizeObserver(() => this.drawRuler()).observe(scroll);
    Bus.on('vframe', t => this.updatePlayhead(t)); Bus.on('vseek', t => this.updatePlayhead(t));
  },
  buildBar() {
    const b = this.bar; clear(b);
    b.append(
      ibtn('scissors', 'Teilen am Playhead', () => VideoUI.split(), { kbd: 'S' }),
      ibtn('copy', 'Duplizieren', () => VideoUI.duplicate(), { kbd: MOD + '+D' }),
      ibtn('trash', 'Löschen', () => VideoUI.remove(), { kbd: 'Entf' }),
      h('span', { class: 'sep' }),
      ibtn('chevL', 'Clip nach links verschieben (Reihenfolge)', () => VideoUI.reorder(-1)), ibtn('chevR', 'Clip nach rechts verschieben (Reihenfolge)', () => VideoUI.reorder(1)),
      h('span', { class: 'sep' }),
      this.snapBtn = ibtn('magnet', 'Einrasten', () => { this.snapOn = !this.snapOn; this.snapBtn.classList.toggle('on', this.snapOn); }, { cls: 'on' }),
      ibtn('zoomOut', 'Timeline verkleinern', () => this.setZoom(this.pps / 1.4)), ibtn('zoomIn', 'Timeline vergrößern', () => this.setZoom(this.pps * 1.4)),
      btn('Ganzes Video', () => this.fit(), { cls: 'sm ghost' }),
    );
  },
  setZoom(pps, anchorX) {
    const old = this.pps; this.pps = clamp(pps, 8, 600);
    const r = this.scroll.getBoundingClientRect(); const ax = anchorX != null ? anchorX - r.left : r.width / 2;
    const tAt = (this.scroll.scrollLeft + ax) / old;
    this.render(); this.scroll.scrollLeft = tAt * this.pps - ax;
  },
  fit() { const d = Math.max(3, VE.duration()); this.pps = clamp((this.scroll.clientWidth - 30) / d, 8, 600); this.render(); this.scroll.scrollLeft = 0; },
  xToT(cx) { const r = this.scroll.getBoundingClientRect(); return Math.max(0, (cx - r.left + this.scroll.scrollLeft) / this.pps); },
  drawRuler() {
    const c = this.rc, w = this.scroll.clientWidth, dpr = Math.min(2, devicePixelRatio || 1);
    if (!w) return;
    c.width = w * dpr; c.height = 26 * dpr; c.style.width = w + 'px'; c.style.left = this.scroll.scrollLeft + 'px';
    const ctx = c.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, 26);
    const cs = getComputedStyle(document.documentElement);
    ctx.strokeStyle = cs.getPropertyValue('--line2'); ctx.fillStyle = cs.getPropertyValue('--muted'); ctx.font = '10px ' + ff('Jost');
    const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60]; const step = steps.find(s => s * this.pps >= 60) || 60;
    const t0 = this.scroll.scrollLeft / this.pps, t1 = t0 + w / this.pps;
    for (let t = Math.floor(t0 / step) * step; t <= t1; t += step) {
      const x = (t - t0) * this.pps; ctx.beginPath(); ctx.moveTo(x + 0.5, 14); ctx.lineTo(x + 0.5, 26); ctx.stroke(); ctx.fillText(fmtTime(t, step < 1), x + 3, 11);
      for (let k = 1; k < 4; k++) { const xx = x + k * step / 4 * this.pps; ctx.beginPath(); ctx.moveTo(xx + 0.5, 21); ctx.lineTo(xx + 0.5, 26); ctx.stroke(); }
    }
  },
  updatePlayhead(t) {
    this.ph.style.left = (t * this.pps) + 'px';
    if (VE.playing) { const x = t * this.pps, sl = this.scroll.scrollLeft, w = this.scroll.clientWidth; if (x > sl + w - 40 || x < sl) this.scroll.scrollLeft = x - 60; }
  },
  /* ── Render items ─────────────────────────────────────────────────── */
  render() {
    const v = VE.video(); const tr = clear(this.tracks); if (!v) return;
    const dur = Math.max(VE.duration() + 8, this.scroll.clientWidth / this.pps);
    this.content.style.width = dur * this.pps + 'px';
    const rows = {}; TRACKS.forEach(t => { rows[t.k] = h('div', { class: 'tl-track' + (t.k === 'main' ? ' main' : ''), dataset: { track: t.k } }); tr.appendChild(rows[t.k]); });
    const lay = mainLayout(v.main);
    lay.forEach(L => {
      const c = L.clip, m = Media.get(c.mediaId);
      const it = this.itemEl(c.id, 'main', L.start, L.dur, (c.kind === 'image' ? '' : (c.speed !== 1 ? c.speed + '× · ' : '')) + (c.name || m?.name || 'Clip'), c.kind === 'image' ? 'image' : 'video');
      if (m && m.thumb) it.style.backgroundImage = `url(${Media.thumbURL(m)})`;
      if (c.muted) it.appendChild(h('span', { html: icon('mute', 's'), style: { position: 'relative', zIndex: 1, marginLeft: 'auto' } }));
      rows.main.appendChild(it);
      if (L.idx > 0) { const tb = h('button', { class: 'tl-trans', type: 'button', style: { left: (L.start + L.td / 2) * this.pps + 'px', opacity: c.trans.type === 'none' ? .45 : 1 }, 'aria-label': 'Übergang: ' + (TRANSITIONS.find(x => x.v === c.trans.type)?.l), 'data-tip': 'Übergang: ' + (TRANSITIONS.find(x => x.v === c.trans.type)?.l), html: icon('transition', 's') }); tb.addEventListener('click', ev => { ev.stopPropagation(); VideoUI.select(c.id); VideoUI.openTransition(c); }); rows.main.appendChild(tb); }
    });
    v.items.forEach(i => {
      if (!rows[i.track]) return;
      const m = i.mediaId ? Media.get(i.mediaId) : null;
      const label = i.track === 'text' ? (i.el?.text || 'Text') : i.track === 'graphics' ? (GRAPHICS[i.el?.kind]?.label || 'Grafik') : (i.name || m?.name || i.track);
      const el = this.itemEl(i.id, i.track, i.start, i.dur, label, i.track);
      if ((i.track === 'broll') && m && m.thumb) el.style.backgroundImage = `url(${Media.thumbURL(m)})`;
      if ((i.track === 'audio' || i.track === 'voice') && i.mediaId) this.wave(el, i);
      if (i.hidden) el.classList.add('disabled');
      rows[i.track].appendChild(el);
    });
    v.captions.forEach(c => rows.captions.appendChild(this.itemEl(c.id, 'captions', c.start, c.end - c.start, c.text, 'caption')));
    // overlapping items on one track are stacked in lanes so nothing hides
    Object.entries(rows).forEach(([k, row]) => {
      if (k === 'main') return;
      const els = $$('.tl-item', row).map(el => ({ el, s: parseFloat(el.style.left), e: parseFloat(el.style.left) + parseFloat(el.style.width) })).sort((a, b) => a.s - b.s);
      const lanes = []; els.forEach(o => { let l = lanes.findIndex(end => end <= o.s + 1); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = o.e; o.l = l; });
      if (lanes.length > 1) { const n = Math.min(lanes.length, 3); els.forEach(o => { const l = Math.min(o.l, n - 1); o.el.style.top = `calc(2px + ${l} * (100% - 4px) / ${n})`; o.el.style.bottom = 'auto'; o.el.style.height = `calc((100% - 4px) / ${n} - 1px)`; o.el.style.fontSize = '9px'; }); }
    });
    this.updatePlayhead(VE.t); this.drawRuler();
  },
  /** Update positions of existing item elements (keeps pointer capture during drags). */
  refreshPositions() {
    const v = VE.video(); if (!v) return;
    const pos = new Map();
    mainLayout(v.main).forEach(L => pos.set(L.clip.id, [L.start, L.dur]));
    v.items.forEach(i => pos.set(i.id, [i.start, i.dur]));
    v.captions.forEach(c => pos.set(c.id, [c.start, c.end - c.start]));
    $$('.tl-item', this.tracks).forEach(el => { const p = pos.get(el.dataset.id); if (!p) return; if (!el.style.transform) el.style.left = p[0] * this.pps + 'px'; el.style.width = Math.max(6, p[1] * this.pps - 2) + 'px'; });
    $$('.tl-trans', this.tracks).forEach(b => b.style.display = 'none');
  },
  wave(el, it) {
    const draw = () => {
      const pk = AudioCache.peaks(it.mediaId, 600); if (!pk) return;
      const buf = AudioCache.map.get(it.mediaId); const c = h('canvas', { class: 'wave' }); const w = Math.max(10, it.dur * this.pps), hh = 30; c.width = Math.min(4000, w); c.height = hh;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff';
      for (let x = 0; x < c.width; x++) { const st = (it.in || 0) + (x / c.width) * it.dur; const idx = Math.floor(st / buf.duration * pk.length); const a = pk[idx] || 0; const hh2 = Math.max(1, a * hh * 0.9); ctx.fillRect(x, (hh - hh2) / 2, 1, hh2); }
      el.insertBefore(c, el.firstChild);
    };
    if (AudioCache.map.has(it.mediaId)) draw(); else AudioCache.get(it.mediaId).then(() => { if (el.isConnected) draw(); }).catch(() => { });
  },
  itemEl(id, track, start, dur, label, cls) {
    const el = h('div', { class: 'tl-item ' + cls + (VideoUI.selId === id ? ' sel' : ''), role: 'button', tabindex: '0', 'aria-label': `${label} – ${fmtTime(start)} bis ${fmtTime(start + dur)}`, dataset: { id, track }, style: { left: start * this.pps + 'px', width: Math.max(6, dur * this.pps - 2) + 'px' } });
    el.appendChild(h('span', { class: 'tn' }, label));
    el.appendChild(h('span', { class: 'th l', dataset: { edge: 'l' } })); el.appendChild(h('span', { class: 'th r', dataset: { edge: 'r' } }));
    el.addEventListener('pointerdown', e => this.onItemDown(e, el, id, track));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); VideoUI.select(id); } });
    el.addEventListener('dblclick', () => { VideoUI.select(id); VideoUI.openInspector(); });
    return el;
  },
  onItemDown(e, el, id, track) {
    e.stopPropagation();
    const wasSel = VideoUI.selId === id;
    if (!wasSel) { VideoUI.select(id); if (e.pointerType !== 'mouse') return; } // touch: first tap selects, then drag
    const edge = e.target.dataset.edge;
    const it = findVItem(id); if (!it) return;
    e.preventDefault(); el.setPointerCapture(e.pointerId);
    const x0 = e.clientX, v = VE.video();
    const orig = deepClone(it); let moved = false;
    const lay = mainLayout(v.main);
    const snapPts = () => { const pts = [0, VE.t]; lay.forEach(L => { pts.push(L.start, L.end); }); v.items.forEach(i => { if (i.id !== id) pts.push(i.start, i.start + i.dur); }); return pts; };
    const pts = snapPts();
    const snap = (t) => { if (!this.snapOn) return t; const thr = 8 / this.pps; let best = t, bd = thr; for (const p of pts) { const d = Math.abs(p - t); if (d < bd) { bd = d; best = p; } } this.snapLine.style.display = best !== t ? 'block' : 'none'; this.snapLine.style.left = best * this.pps + 'px'; return best; };
    const mv = ev => {
      const dt = (ev.clientX - x0) / this.pps; if (!moved && Math.abs(ev.clientX - x0) < 3) return; moved = true;
      if (track === 'main') {
        const c = it; const m = Media.get(c.mediaId); const maxOut = c.kind === 'image' ? 3600 : (m?.duration || c.out);
        if (edge === 'l') { c.in = clamp(orig.in + dt * c.speed, 0, orig.out - 0.1); if (c.kind === 'image') { c.out = orig.out - (c.in - orig.in); c.in = 0; c.out = Math.max(0.2, c.out); } }
        else if (edge === 'r') { c.out = clamp(orig.out + dt * c.speed, orig.in + 0.1, maxOut); }
        else { // reorder by drag
          const L = lay.find(x => x.clip.id === id); const center = L.start + L.dur / 2 + dt;
          let idx = 0; for (const o of lay) if (o.clip.id !== id && o.start + o.dur / 2 < center) idx++;
          const cur = v.main.indexOf(c); if (idx !== cur) { v.main.splice(cur, 1); v.main.splice(idx, 0, c); }
          el.style.transform = `translateX(${(ev.clientX - x0)}px)`; el.style.zIndex = 5; el.style.opacity = .85;
          VE.seek(VE.t); return;
        }
      } else if (track === 'captions') {
        const d = orig.end - orig.start;
        if (edge === 'l') it.start = clamp(snap(orig.start + dt), 0, orig.end - 0.15);
        else if (edge === 'r') it.end = Math.max(orig.start + 0.15, snap(orig.end + dt));
        else { it.start = Math.max(0, snap(orig.start + dt)); it.end = it.start + d; }
      } else {
        const m = it.mediaId ? Media.get(it.mediaId) : null; const maxD = m && m.kind !== 'image' && m.duration ? m.duration - (it.in || 0) : 3600;
        if (edge === 'l') { const ns = clamp(snap(orig.start + dt), 0, orig.start + orig.dur - 0.15); const dd = ns - orig.start; if (m && m.kind !== 'image') { const nin = (orig.in || 0) + dd; if (nin < 0) return; it.in = nin; } it.start = ns; it.dur = orig.dur - dd; }
        else if (edge === 'r') it.dur = clamp(snap(orig.start + orig.dur + dt) - orig.start, 0.15, maxD);
        else it.start = Math.max(0, snap(orig.start + dt));
      }
      this.refreshPositions(); VE.seek(VE.t);
    };
    const up = () => {
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      this.snapLine.style.display = 'none';
      if (moved) { commit('timeline'); this.render(); VideoUI.renderInspector(); VE.seek(VE.t); }
    };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  },
};
