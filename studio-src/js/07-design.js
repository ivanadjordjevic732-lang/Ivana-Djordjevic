/* ═══════════════════════════════════════════════════════════════════════
   MODULE: DESIGN EDITOR — canvas, selection, smart guides, text editing,
   tool panels, contextual inspector, layers and pages.
   ═══════════════════════════════════════════════════════════════════════ */
function insSec(title, ...kids) { const s = h('div', { class: 'ins-sec' }); if (title) s.appendChild(h('h5', null, title)); appendKids(s, kids); return s; }
function colorRow(value, onPick, opts = {}) {
  const row = h('div', { class: 'color-row', role: 'group', 'aria-label': opts.aria || 'Farbe' });
  const colors = Brand.colors();
  if (opts.allowNone) row.appendChild(h('button', { class: 'sw none' + (value === 'none' ? ' on' : ''), type: 'button', 'aria-label': 'Keine Farbe', 'data-tip': 'Keine', onclick: () => onPick('none') }));
  colors.forEach(c => row.appendChild(h('button', { class: 'sw' + (String(value).toUpperCase() === c.v.toUpperCase() ? ' on' : ''), type: 'button', style: { background: c.v }, 'aria-label': c.n, 'data-tip': c.n + ' ' + c.v, onclick: () => onPick(c.v) })));
  const pick = h('label', { class: 'colorpick', 'data-tip': 'Eigene Farbe' });
  pick.innerHTML = icon('plus', 's');
  const inp = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(value) ? value : '#B08D57', 'aria-label': 'Eigene Farbe wählen' });
  inp.addEventListener('input', () => onPick(inp.value.toUpperCase(), true));
  inp.addEventListener('change', () => onPick(inp.value.toUpperCase()));
  pick.appendChild(inp); row.appendChild(pick);
  return row;
}
const DESIGN_TOOLS = [
  { k: 'templates', l: 'Vorlagen', i: 'templates' }, { k: 'text', l: 'Text', i: 'text' }, { k: 'elements', l: 'Elemente', i: 'sparkle' },
  { k: 'shapes', l: 'Formen', i: 'shapes' }, { k: 'images', l: 'Bilder', i: 'image' }, { k: 'uploads', l: 'Uploads', i: 'upload' },
  { k: 'brand', l: 'Brand Kit', i: 'brand' }, { k: 'background', l: 'Hintergrund', i: 'bg' }, { k: 'layers', l: 'Ebenen', i: 'layers' },
];

const Design = {
  root: null, e: {}, zoom: 'fit', scale: 0.4, tool: 'text', editingId: null, cropId: null, drag: null, clip: null, lastTap: null,
  mount(root) {
    this.root = root;
    const ed = h('div', { class: 'editor', id: 'design-editor' });
    const rail = h('div', { class: 'toolrail', role: 'toolbar', 'aria-label': 'Design-Werkzeuge' });
    DESIGN_TOOLS.forEach(t => { const b = h('button', { class: 'tool-btn', type: 'button', 'data-tool': t.k, 'aria-label': t.l, onclick: () => this.setTool(this.tool === t.k && !ed.classList.contains('panel-closed') ? null : t.k) }); b.innerHTML = icon(t.i) + `<span>${t.l}</span>`; rail.appendChild(b); });
    const panel = h('aside', { class: 'toolpanel', 'aria-label': 'Werkzeugpanel' }, h('div', { class: 'sheet-handle' }),
      h('div', { class: 'tp-h' }, h('h4', { id: 'dp-title' }), ibtn('x', 'Panel schließen', () => this.setTool(null))), h('div', { class: 'tp-b', id: 'dp-body' }));
    const stage = h('div', { class: 'stage', id: 'd-stage' });
    const inner = h('div', { class: 'stage-inner', id: 'd-inner' });
    const holder = h('div', { class: 'canvas-holder', id: 'd-holder' });
    const canvas = h('canvas', { id: 'd-canvas', role: 'img', 'aria-label': 'Design-Arbeitsfläche' });
    holder.appendChild(canvas);
    const overlay = h('div', { id: 'd-overlay', style: { position: 'absolute', inset: '0', pointerEvents: 'none' } });
    inner.append(holder, overlay); stage.appendChild(inner);
    const qbar = h('div', { class: 'vctx', id: 'd-qbar' });
    const bar = h('div', { class: 'stage-bar' });
    const stagewrap = h('div', { class: 'stagewrap', style: { gridColumn: '3', gridRow: '1' } }, stage, qbar, bar);
    const insp = h('aside', { class: 'inspector', id: 'd-insp', style: { gridColumn: '4', gridRow: '1/3' }, 'aria-label': 'Eigenschaften' });
    const pages = h('div', { class: 'pages', id: 'd-pages', 'aria-label': 'Seiten' });
    const mbar = h('div', { class: 'mtoolbar', role: 'toolbar', 'aria-label': 'Werkzeuge' });
    const mb = (k, l, i, fn) => { const b = h('button', { class: 'tool-btn', type: 'button', 'data-mtool': k, 'aria-label': l, onclick: fn }); b.innerHTML = icon(i) + `<span>${l}</span>`; return b; };
    mbar.appendChild(mb('menu', 'Menü', 'menu', () => openNavSheet()));
    DESIGN_TOOLS.forEach(t => mbar.appendChild(mb(t.k, t.l, t.i, () => this.setTool(this.tool === t.k && !ed.classList.contains('panel-closed') ? null : t.k))));
    ed.append(rail, panel, stagewrap, insp, pages, mbar);
    const empty = h('div', { id: 'd-empty', style: { position: 'absolute', inset: 0, display: 'none', overflow: 'auto' } });
    root.append(ed, empty);
    Object.assign(this.e, { ed, rail, panel, stage, inner, holder, canvas, overlay, insp, pages, bar, qbar, empty, mbar });
    this.buildStageBar();
    this.bindStage();
    new ResizeObserver(() => { if (App.view === 'design') this.layout(); }).observe(stage);
    RenderHooks.push(() => { if (App.view === 'design') this.render(); });
    Bus.on('project', () => { if (App.view === 'design') this.show(); });
    Bus.on('restore', () => { if (App.view === 'design') { this.layout(); this.refreshAll(); } });
    Bus.on('commit', () => { if (App.view === 'design') this.schedulePages(); });
    Bus.on('media', () => { if (App.view === 'design' && ['images', 'uploads', 'brand', 'background'].includes(this.tool)) this.renderPanel(); });
    this.setTool(isPhone() ? null : 'templates', true);
  },
  active() { return App.project && App.project.type !== 'video'; },
  show() {
    document.body.classList.toggle('in-editor', this.active());
    this.e.ed.style.display = this.active() ? '' : 'none';
    this.e.empty.style.display = this.active() ? 'none' : 'block';
    if (!this.active()) { this.renderEmpty(); return; }
    if (App.page >= App.project.pages.length) App.page = 0;
    this.cropId = null; this.editingId = null;
    preloadPageMedia(App.project.pages).then(() => requestRender());
    this.layout(); this.refreshAll();
  },
  hide() { this.endTextEdit(); },
  refreshAll() { this.renderPanel(); this.renderInspector(); this.renderPages(); this.renderOverlay(); requestRender(); },
  renderEmpty() {
    const e = clear(this.e.empty);
    const wrap = h('div', { class: 'page' });
    wrap.appendChild(h('div', { class: 'hero' }, h('div', null, h('div', { class: 'eyebrow' }, 'Design Studio'), h('h1', { class: 'h1' }, 'Gestalte mit ', h('em', null, 'Ruhe'), '.'), h('p', { class: 'lead' }, App.project && App.project.type === 'video' ? 'Das geöffnete Projekt ist ein Video. Öffne es im Video Studio oder starte ein neues Design.' : 'Wähle ein Format oder öffne ein bestehendes Projekt.'))));
    const grid = h('div', { class: 'qa-grid' });
    ['post45', 'square', 'story', 'pin', 'liportrait', 'present', 'custom'].forEach(k => {
      const f = FORMATS[k];
      const b = h('button', { class: 'qa', type: 'button', onclick: () => k === 'custom' ? customFormatDialog('design') : createAndOpen({ type: 'design', formatKey: k, name: f.label }) });
      b.innerHTML = `<span class="qi">${icon(f.icon)}</span><div><b>${escapeHtml(f.label)}</b><span>${f.w} × ${f.h}</span></div>`; grid.appendChild(b);
    });
    wrap.appendChild(grid);
    if (App.project && App.project.type === 'video') wrap.appendChild(btn('Video im Video Studio öffnen', () => showView('video'), { cls: 'primary', icon: 'video' }));
    wrap.appendChild(h('div', { class: 'hr' }));
    wrap.appendChild(recentProjectsBlock(p => p.type !== 'video', 'Letzte Designs'));
    e.appendChild(wrap);
  },
  buildStageBar() {
    const b = this.e.bar;
    this.e.zoomLbl = h('span', { class: 'zoomlbl', 'aria-live': 'polite' }, '100%');
    b.append(
      ibtn('zoomOut', 'Verkleinern', () => this.setZoom(this.scale / 1.2), { size: 's' }), this.e.zoomLbl,
      ibtn('zoomIn', 'Vergrößern', () => this.setZoom(this.scale * 1.2), { size: 's' }),
      btn('Einpassen', () => this.setZoom('fit'), { cls: 'sm ghost' }),
      h('span', { class: 'grow' }),
      this.e.szBtn = ibtn('phone', 'Safe Zones anzeigen (nur Orientierung, wird nicht exportiert)', () => { App.settings.safeZones = !App.settings.safeZones; saveSettings(); this.e.szBtn.classList.toggle('on', App.settings.safeZones); this.renderOverlay(); }, { size: 's', cls: App.settings.safeZones ? 'on' : '' }),
      this.e.snapBtn = ibtn('magnet', 'Smart Guides & Einrasten', () => { App.settings.snap = !App.settings.snap; saveSettings(); this.e.snapBtn.classList.toggle('on', App.settings.snap); }, { size: 's', cls: App.settings.snap ? 'on' : '' }),
      ibtn('resize', 'Magic Resize – in anderes Format übertragen', () => magicResizeDialog(), { size: 's' }),
      ibtn('expand', 'Vorschau-Modus', () => setPreview(true), { size: 's', kbd: 'P' }),
      h('button', { class: 'ibtn insp-toggle', type: 'button', 'aria-label': 'Eigenschaften ein/aus', 'data-tip': 'Eigenschaften', onclick: () => this.e.ed.classList.toggle('insp-open'), html: icon('settings', 's') }),
    );
  },
  setTool(k, silent) {
    this.tool = k;
    this.e.ed.classList.toggle('panel-closed', !k);
    $$('.tool-btn', this.e.ed).forEach(b => b.classList.toggle('on', (b.dataset.tool || b.dataset.mtool) === k));
    if (k && isPhone()) this.e.ed.classList.remove('insp-open');
    if (!silent) { this.renderPanel(); setTimeout(() => this.layout(), 0); }
  },
  /* ── Geometry ─────────────────────────────────────────────────────── */
  layout() {
    if (!this.active()) return;
    const f = App.project.format, st = this.e.stage;
    const pad = isPhone() ? 18 : 48;
    const aw = Math.max(80, st.clientWidth - pad * 2), ah = Math.max(80, st.clientHeight - pad * 2);
    const fit = Math.min(aw / f.w, ah / f.h);
    this.scale = this.zoom === 'fit' ? fit : this.zoom;
    const cw = f.w * this.scale, ch = f.h * this.scale;
    const iw = Math.max(st.clientWidth, cw + pad * 2), ih = Math.max(st.clientHeight, ch + pad * 2);
    Object.assign(this.e.inner.style, { width: iw + 'px', height: ih + 'px' });
    const left = (iw - cw) / 2, top = (ih - ch) / 2;
    Object.assign(this.e.holder.style, { left: left + 'px', top: top + 'px', width: cw + 'px', height: ch + 'px' });
    this.off = { left, top };
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const bw = Math.round(Math.min(cw * dpr, 4096)), bh = Math.round(Math.min(ch * dpr, 4096 * f.h / f.w));
    if (this.e.canvas.width !== bw || this.e.canvas.height !== bh) { this.e.canvas.width = bw; this.e.canvas.height = bh; }
    this.e.zoomLbl.textContent = Math.round(this.scale * 100) + '%';
    this.render(); this.renderOverlay();
  },
  setZoom(z) { this.zoom = z === 'fit' ? 'fit' : clamp(z, 0.05, 4); this.layout(); },
  toProj(cx, cy) { const r = this.e.holder.getBoundingClientRect(); return { x: (cx - r.left) / this.scale, y: (cy - r.top) / this.scale }; },
  render() {
    if (!this.active()) return;
    const c = this.e.canvas, ctx = c.getContext('2d'), f = App.project.format, pg = curPage(); if (!pg) return;
    const s = c.width / f.w;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    renderPage(ctx, pg, f.w, f.h, { skip: this.editingId ? new Set([this.editingId]) : null });
    if (this.cropId) this.renderOverlay();
  },
  /* ── Selection overlay ────────────────────────────────────────────── */
  renderOverlay() {
    if (!this.active()) return;
    const ov = clear(this.e.overlay), s = this.scale, o = this.off || { left: 0, top: 0 };
    const f = App.project.format;
    if (App.settings.safeZones && !App.preview) {
      const zones = safeZoneRects(f);
      if (zones) {
        const sz = h('div', { class: 'safezone', style: { left: o.left + 'px', top: o.top + 'px', width: f.w * s + 'px', height: f.h * s + 'px', right: 'auto', bottom: 'auto' } });
        zones.forEach(z => sz.appendChild(h('div', { class: 'sz', style: { left: z.x * s + 'px', top: z.y * s + 'px', width: z.w * s + 'px', height: z.h * s + 'px' } }, h('span', { class: 'szl' }, z.l))));
        ov.appendChild(sz);
      }
    }
    const els = selEls();
    els.forEach(el => {
      const box = h('div', { class: 'selbox' + (el.locked ? ' locked' : ''), style: { left: o.left + el.x * s + 'px', top: o.top + el.y * s + 'px', width: el.w * s + 'px', height: el.h * s + 'px', transform: `rotate(${el.rot || 0}deg)` } });
      if (els.length === 1 && !el.locked && this.editingId !== el.id) {
        const dirs = el.type === 'text' ? ['nw', 'ne', 'sw', 'se', 'e', 'w'] : (el.type === 'shape' && ['line', 'divider', 'arrow'].includes(el.shape) ? ['e', 'w'] : ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w']);
        dirs.forEach(d => box.appendChild(h('div', { class: 'hd ' + d, dataset: { h: d } })));
        box.appendChild(h('div', { class: 'rotline' })); box.appendChild(h('div', { class: 'hd rot', dataset: { h: 'rot' }, 'aria-label': 'Drehen' }));
      }
      if (el.locked) box.appendChild(h('span', { class: 'lockbadge' }, 'Fixiert'));
      ov.appendChild(box);
    });
    if (this.cropId) { const el = findEl(this.cropId); if (el) ov.appendChild(h('div', { class: 'croppad', style: { left: o.left + el.x * s + 'px', top: o.top + el.y * s + 'px', width: el.w * s + 'px', height: el.h * s + 'px', transform: `rotate(${el.rot || 0}deg)` } })); }
    (this.guides || []).forEach(g => ov.appendChild(h('div', { class: 'guide ' + g.d, style: g.d === 'v' ? { left: o.left + g.v * s + 'px', top: o.top + 'px', height: f.h * s + 'px', bottom: 'auto' } : { top: o.top + g.v * s + 'px', left: o.left + 'px', width: f.w * s + 'px', right: 'auto' } })));
    this.renderQuickBar();
  },
  renderQuickBar() {
    const q = clear(this.e.qbar); const els = selEls();
    if (!els.length || !isNarrow() || this.editingId) { q.style.display = 'none'; return; }
    q.style.display = 'flex';
    q.append(btn('Bearbeiten', () => { this.setTool(null); this.e.ed.classList.add('insp-open'); this.renderInspector(); }, { cls: 'sm primary', icon: 'pen' }),
      ibtn('copy', 'Duplizieren', () => this.duplicate()), ibtn('front', 'Nach vorne', () => this.arrange('up')), ibtn('trash', 'Löschen', () => this.remove()));
    if (els.length === 1 && els[0].type === 'text') q.insertBefore(btn('Text', () => this.startTextEdit(els[0]), { cls: 'sm', icon: 'type' }), q.children[1]);
  },
  select(ids, keepInspector) {
    App.sel = ids.filter(Boolean);
    if (this.cropId && !App.sel.includes(this.cropId)) this.cropId = null;
    this.renderOverlay();
    if (!keepInspector) this.renderInspector();
    if (this.tool === 'layers') this.renderPanel();
  },
  /* ── Pointer interaction ──────────────────────────────────────────── */
  hitTest(p) {
    const pg = curPage(); if (!pg) return null;
    const tol = 8 / this.scale;
    for (let i = pg.elements.length - 1; i >= 0; i--) {
      const el = pg.elements[i]; if (el.hidden) continue;
      const cx = el.x + el.w / 2, cy = el.y + el.h / 2, a = -(el.rot || 0) * Math.PI / 180;
      const dx = p.x - cx, dy = p.y - cy; const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(lx) <= el.w / 2 + tol && Math.abs(ly) <= el.h / 2 + tol) return el;
    }
    return null;
  },
  bindStage() {
    const st = this.e.stage;
    st.addEventListener('pointerdown', e => this.onDown(e));
    st.addEventListener('pointermove', e => this.onMove(e));
    st.addEventListener('pointerup', e => this.onUp(e));
    st.addEventListener('pointercancel', e => this.onUp(e));
    st.addEventListener('dblclick', e => { const el = this.hitTest(this.toProj(e.clientX, e.clientY)); if (el && el.type === 'text' && !el.locked) this.startTextEdit(el); else if (el && el.type === 'image' && !el.locked) this.toggleCrop(el); });
    st.addEventListener('wheel', e => {
      if (this.cropId && !e.ctrlKey) { const el = findEl(this.cropId); if (el) { e.preventDefault(); el.zoom = clamp((el.zoom || 1) * (e.deltaY < 0 ? 1.05 : 0.95), 1, 5); requestRender(); this.commitSoon(); } return; }
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.setZoom(this.scale * (e.deltaY < 0 ? 1.08 : 0.92)); }
    }, { passive: false });
    st.addEventListener('contextmenu', e => {
      const el = this.hitTest(this.toProj(e.clientX, e.clientY)); if (!el) return; e.preventDefault();
      if (!App.sel.includes(el.id)) this.select([el.id]);
      const a = h('div', { style: { position: 'fixed', left: e.clientX + 'px', top: e.clientY + 'px', width: '1px', height: '1px' } }); document.body.appendChild(a);
      popMenu(a, this.contextItems()); setTimeout(() => a.remove(), 50);
    });
    // drag & drop files onto the canvas
    st.addEventListener('dragover', e => { e.preventDefault(); });
    st.addEventListener('drop', async e => {
      e.preventDefault(); if (!this.active()) return;
      const files = Array.from(e.dataTransfer.files || []); if (!files.length) return;
      const added = await Media.import(files);
      added.filter(m => m.kind === 'image').forEach(m => this.addImage(m));
    });
    // pinch zoom (touch)
    this.touches = new Map();
  },
  onDown(e) {
    if (!this.active() || App.preview) return;
    if (e.target.closest('.textedit')) return;
    this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.touches.size === 2) { const [a, b] = Array.from(this.touches.values()); this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: this.scale }; this.drag = null; return; }
    if (this.editingId) this.endTextEdit();
    const p = this.toProj(e.clientX, e.clientY);
    const hd = e.target.closest('.hd');
    const one = selEls().length === 1 ? selEls()[0] : null;
    if (hd && one) {
      e.preventDefault(); this.e.stage.setPointerCapture(e.pointerId);
      this.drag = { mode: hd.dataset.h === 'rot' ? 'rot' : 'resize', dir: hd.dataset.h, el: one, start: p, el0: deepClone(one), shift: e.shiftKey };
      return;
    }
    const hit = this.hitTest(p);
    if (this.cropId) {
      const ce = findEl(this.cropId);
      if (hit && ce && hit.id === ce.id) { this.e.stage.setPointerCapture(e.pointerId); this.drag = { mode: 'crop', el: ce, start: p, el0: deepClone(ce) }; return; }
      this.cropId = null;
    }
    if (!hit) { this.select([]); this.drag = { mode: 'none' }; return; }
    // double-tap to edit text on touch
    const now = Date.now();
    if (e.pointerType !== 'mouse' && this.lastTap && this.lastTap.id === hit.id && now - this.lastTap.t < 330) { this.lastTap = null; if (hit.type === 'text' && !hit.locked) { this.startTextEdit(hit); return; } if (hit.type === 'image' && !hit.locked) { this.toggleCrop(hit); return; } }
    this.lastTap = { id: hit.id, t: now };
    if (e.shiftKey) { this.select(App.sel.includes(hit.id) ? App.sel.filter(i => i !== hit.id) : [...App.sel, hit.id]); }
    else if (!App.sel.includes(hit.id)) this.select([hit.id]);
    const movable = selEls().filter(x => !x.locked);
    if (!movable.length) { this.drag = { mode: 'none' }; return; }
    this.e.stage.setPointerCapture(e.pointerId);
    this.drag = { mode: 'move', start: p, items: movable.map(x => ({ el: x, x: x.x, y: x.y })), moved: false };
  },
  onMove(e) {
    if (this.touches.has(e.pointerId)) this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinch && this.touches.size === 2) { const [a, b] = Array.from(this.touches.values()); const d = Math.hypot(a.x - b.x, a.y - b.y); this.setZoom(this.pinch.s * d / this.pinch.d); return; }
    const d = this.drag; if (!d || d.mode === 'none') return;
    const p = this.toProj(e.clientX, e.clientY);
    const dx = p.x - d.start.x, dy = p.y - d.start.y;
    if (d.mode === 'move') {
      if (!d.moved && Math.hypot(dx, dy) * this.scale < 3) return;
      d.moved = true;
      let ox = dx, oy = dy; this.guides = [];
      if (App.settings.snap && !e.altKey) { const sn = this.snap(d.items, dx, dy); ox = sn.dx; oy = sn.dy; this.guides = sn.guides; }
      d.items.forEach(it => { it.el.x = Math.round(it.x + ox); it.el.y = Math.round(it.y + oy); });
      requestRender(); this.renderOverlay();
    } else if (d.mode === 'resize') this.doResize(d, p, e.shiftKey);
    else if (d.mode === 'rot') {
      const el = d.el, cx = el.x + el.w / 2, cy = el.y + el.h / 2;
      let a = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90;
      if (e.shiftKey) a = Math.round(a / 15) * 15; else for (const s of [0, 45, 90, 135, 180, -45, -90, -135, -180, 270]) if (Math.abs(a - s) < 3.5) a = s;
      el.rot = Math.round(((a + 540) % 360) - 180); requestRender(); this.renderOverlay();
    } else if (d.mode === 'crop') {
      const el = d.el; const img = Media.imgSync(el.mediaId); if (!img) return;
      const { crop } = coverCrop(img.naturalWidth, img.naturalHeight, el.w, el.h, el.zoom || 1, 0, 0, 'fill');
      const maxX = (img.naturalWidth - crop.w) / 2 || 1, maxY = (img.naturalHeight - crop.h) / 2 || 1;
      const k = crop.w / el.w;
      el.ox = clamp(d.el0.ox - dx * k / maxX, -1, 1); el.oy = clamp(d.el0.oy - dy * k / maxY, -1, 1);
      requestRender();
    }
  },
  onUp(e) {
    this.touches.delete(e.pointerId); if (this.touches.size < 2) this.pinch = null;
    const d = this.drag; this.drag = null;
    if (this.guides && this.guides.length) { this.guides = []; this.renderOverlay(); }
    if (!d || d.mode === 'none') return;
    if (d.mode === 'move' && !d.moved) return;
    commit(d.mode); this.renderOverlay(); this.renderInspector();
  },
  snap(items, dx, dy) {
    const f = App.project.format, thr = 7 / this.scale;
    const bb = items.reduce((b, it) => { const x = it.x + dx, y = it.y + dy, w = it.el.w, hh = it.el.h; return { l: Math.min(b.l, x), t: Math.min(b.t, y), r: Math.max(b.r, x + w), b: Math.max(b.b, y + hh) }; }, { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity });
    const ids = new Set(items.map(i => i.el.id));
    const xs = [0, f.w / 2, f.w], ys = [0, f.h / 2, f.h];
    for (const el of curPage().elements) { if (ids.has(el.id) || el.hidden) continue; xs.push(el.x, el.x + el.w / 2, el.x + el.w); ys.push(el.y, el.y + el.h / 2, el.y + el.h); }
    const cand = (vals, lines) => { let best = null; for (const v of vals) for (const L of lines) { const dd = L - v; if (Math.abs(dd) < thr && (!best || Math.abs(dd) < Math.abs(best.d))) best = { d: dd, L }; } return best; };
    const sx = cand([bb.l, (bb.l + bb.r) / 2, bb.r], xs), sy = cand([bb.t, (bb.t + bb.b) / 2, bb.b], ys);
    const guides = []; if (sx) guides.push({ d: 'v', v: sx.L }); if (sy) guides.push({ d: 'h', v: sy.L });
    return { dx: dx + (sx ? sx.d : 0), dy: dy + (sy ? sy.d : 0), guides };
  },
  doResize(d, p, shift) {
    const el = d.el, e0 = d.el0, a = (e0.rot || 0) * Math.PI / 180;
    const wx = p.x - d.start.x, wy = p.y - d.start.y;
    const lx = wx * Math.cos(-a) - wy * Math.sin(-a), ly = wx * Math.sin(-a) + wy * Math.cos(-a);
    const dir = d.dir; const sx = dir.includes('e') ? 1 : dir.includes('w') ? -1 : 0, sy = dir.includes('s') ? 1 : dir.includes('n') ? -1 : 0;
    let nw = e0.w + sx * lx, nh = e0.h + sy * ly;
    const corner = sx && sy;
    const keep = corner && (el.type === 'image' || el.type === 'graphic' || el.type === 'text' || (el.type === 'shape' && el.shape === 'circle')) ? !shift : (corner && shift);
    if (keep) { const k = Math.max(nw / e0.w, nh / e0.h); nw = e0.w * k; nh = e0.h * k; }
    nw = Math.max(12, nw); nh = Math.max(el.type === 'shape' ? 2 : 12, nh);
    if (el.type === 'text') {
      if (corner) { const k = nw / e0.w; el.size = Math.max(6, Math.round(e0.size * k)); }
      nh = textMetrics(Object.assign({}, el, { w: nw })).h;
    }
    const dw = nw - e0.w, dh = nh - e0.h;
    const shx = sx * dw / 2, shy = (el.type === 'text' ? (sy ? sy * dh / 2 : 0) : sy * dh / 2);
    const cx = e0.x + e0.w / 2 + shx * Math.cos(a) - shy * Math.sin(a), cy = e0.y + e0.h / 2 + shx * Math.sin(a) + shy * Math.cos(a);
    el.w = Math.round(nw); el.h = Math.round(nh); el.x = Math.round(cx - nw / 2); el.y = Math.round(cy - nh / 2);
    requestRender(); this.renderOverlay();
  },
  commitSoon: debounce(() => commit('edit'), 400),
  toggleCrop(el) { this.cropId = this.cropId === el.id ? null : el.id; if (this.cropId && el.fit === 'fit') { el.fit = 'fill'; commit('fit'); } this.renderOverlay(); this.renderInspector(); if (this.cropId) toast('Zuschneiden: Bild ziehen zum Verschieben, Zoom im Panel oder per Mausrad. Esc zum Beenden.', 'info', { duration: 4200 }); },
  /* ── Inline text editing ──────────────────────────────────────────── */
  startTextEdit(el) {
    this.endTextEdit();
    if (!App.sel.includes(el.id)) App.sel = [el.id];
    this.editingId = el.id;
    const s = this.scale, o = this.off;
    const m = textMetrics(el);
    const ta = h('textarea', { class: 'textedit', spellcheck: 'true', 'aria-label': 'Text bearbeiten' });
    ta.value = el.text;
    Object.assign(ta.style, {
      left: o.left + el.x * s + 'px', top: o.top + el.y * s + 'px', width: el.w * s + 'px', minHeight: el.h * s + 'px',
      font: fontStr(el, el.size * s), lineHeight: (el.lh || 1.2), color: el.color, textAlign: el.align, letterSpacing: m.ls * s + 'px',
      textTransform: el.transform === 'upper' ? 'uppercase' : el.transform === 'lower' ? 'lowercase' : 'none',
      transform: `rotate(${el.rot || 0}deg)`, padding: `${(el.h - m.lines.length * m.lh) / 2 * s}px ${m.pad * s}px`,
      background: el.bg && el.bg.on ? rgba(el.bg.color, el.bg.opacity ?? 1) : 'transparent', borderRadius: el.bg && el.bg.on ? Math.min(el.bg.radius, el.h / 2) * s + 'px' : '0',
    });
    const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
    ta.addEventListener('input', () => { el.text = ta.value; fit(); });
    ta.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); this.endTextEdit(); } e.stopPropagation(); });
    ta.addEventListener('blur', () => setTimeout(() => this.endTextEdit(), 0));
    this.e.inner.appendChild(ta); this.textArea = ta;
    requestRender(); this.renderOverlay();
    setTimeout(() => { ta.focus(); ta.select(); fit(); }, 10);
  },
  endTextEdit() {
    if (!this.editingId) return;
    const ta = this.textArea; this.textArea = null; this.editingId = null;
    if (ta) ta.remove();
    commit('text'); requestRender(); this.renderOverlay(); this.renderInspector(); this.renderPanel();
  },
  /* ── Element operations ───────────────────────────────────────────── */
  addElement(el, opts = {}) {
    if (!this.active()) { toast('Bitte zuerst ein Design öffnen.', 'error'); return; }
    const pg = curPage(); pg.elements.push(el);
    if (el.type === 'text') el.h = textMetrics(el).h;
    commit('add'); this.select([el.id]);
    if (isPhone() && !opts.keepPanel) this.setTool(null);
    requestRender(); if (this.tool === 'layers') this.renderPanel();
    return el;
  },
  addText(role, o = {}) { const f = App.project.format; const el = mkText(role, f.w, f.h, o); el.y = Math.round(f.h / 2 - el.h / 2); this.addElement(el); return el; },
  addImage(m, o = {}) { const f = App.project.format; return this.addElement(mkImage(m, f.w, f.h, o)); },
  remove() {
    const ids = App.sel.filter(id => { const e = findEl(id); return e && !e.locked; }); if (!ids.length) { if (App.sel.length) toast('Fixierte Elemente zuerst entsperren.', 'info'); return; }
    curPage().elements = curPage().elements.filter(e => !ids.includes(e.id)); commit('delete'); this.select([]); requestRender(); this.renderPanel();
  },
  duplicate() {
    const els = selEls(); if (!els.length) return; const pg = curPage(); const ids = [];
    els.forEach(el => { const c = deepClone(el); c.id = uid('el'); c.x += 24; c.y += 24; c.locked = false; c.name = el.name; pg.elements.splice(pg.elements.indexOf(el) + 1, 0, c); ids.push(c.id); });
    commit('duplicate'); this.select(ids); requestRender(); this.renderPanel();
  },
  arrange(where) {
    const pg = curPage(); const els = selEls(); if (!els.length) return;
    for (const el of (where === 'up' || where === 'top' ? els.slice().reverse() : els)) {
      const i = pg.elements.indexOf(el); pg.elements.splice(i, 1);
      const j = where === 'top' ? pg.elements.length : where === 'bottom' ? 0 : where === 'up' ? Math.min(pg.elements.length, i + 1) : Math.max(0, i - 1);
      pg.elements.splice(j, 0, el);
    }
    commit('arrange'); requestRender(); this.renderPanel();
  },
  align(where) {
    const f = App.project.format; const els = selEls().filter(e => !e.locked); if (!els.length) return;
    els.forEach(el => {
      if (where === 'left') el.x = Math.round(f.w * 0.06); if (where === 'hcenter') el.x = Math.round((f.w - el.w) / 2); if (where === 'right') el.x = Math.round(f.w * 0.94 - el.w);
      if (where === 'top') el.y = Math.round(f.h * 0.06); if (where === 'vcenter') el.y = Math.round((f.h - el.h) / 2); if (where === 'bottom') el.y = Math.round(f.h * 0.94 - el.h);
    });
    commit('align'); requestRender(); this.renderOverlay();
  },
  setLock(v) { selEls().forEach(e => e.locked = v); commit('lock'); this.renderOverlay(); this.renderInspector(); this.renderPanel(); },
  copy() { const els = selEls(); if (els.length) { this.clip = deepClone(els); toast(els.length + ' Element(e) kopiert', 'info', { duration: 1200 }); } },
  paste() { if (!this.clip || !this.active()) return; const pg = curPage(); const ids = []; this.clip.forEach(c => { const n = deepClone(c); n.id = uid('el'); n.x += 30; n.y += 30; pg.elements.push(n); ids.push(n.id); }); commit('paste'); this.select(ids); requestRender(); },
  nudge(dx, dy) { const els = selEls().filter(e => !e.locked); if (!els.length) return; els.forEach(e => { e.x += dx; e.y += dy; }); requestRender(); this.renderOverlay(); this.commitSoon(); },
  contextItems() {
    const one = selEls()[0];
    return [
      { label: 'Duplizieren', icon: 'copy', fn: () => this.duplicate() }, { label: 'Kopieren', icon: 'copy', fn: () => this.copy() },
      '-', { label: 'Ganz nach vorne', icon: 'front', fn: () => this.arrange('top') }, { label: 'Nach vorne', icon: 'up', fn: () => this.arrange('up') },
      { label: 'Nach hinten', icon: 'down', fn: () => this.arrange('down') }, { label: 'Ganz nach hinten', icon: 'back', fn: () => this.arrange('bottom') },
      '-', one && one.locked ? { label: 'Entsperren', icon: 'unlock', fn: () => this.setLock(false) } : { label: 'Fixieren', icon: 'lock', fn: () => this.setLock(true) },
      { label: 'Löschen', icon: 'trash', danger: true, fn: () => this.remove() },
    ];
  },
  onKey(e) {
    if (!this.active() || this.editingId) return false;
    const k = e.key, mod = e.metaKey || e.ctrlKey;
    if ((k === 'Delete' || k === 'Backspace') && App.sel.length) { this.remove(); return true; }
    if (mod && k.toLowerCase() === 'd') { this.duplicate(); return true; }
    if (mod && k.toLowerCase() === 'c' && App.sel.length) { this.copy(); return true; }
    if (mod && k.toLowerCase() === 'v' && this.clip) { this.paste(); return true; }
    if (k === 'Escape') { if (this.cropId) { this.cropId = null; this.renderOverlay(); this.renderInspector(); return true; } if (App.sel.length) { this.select([]); return true; } return false; }
    if (k === 'Enter' && App.sel.length === 1 && selEls()[0].type === 'text') { this.startTextEdit(selEls()[0]); return true; }
    const st = e.shiftKey ? 10 : 1;
    if (k === 'ArrowLeft' && App.sel.length) { this.nudge(-st, 0); return true; } if (k === 'ArrowRight' && App.sel.length) { this.nudge(st, 0); return true; }
    if (k === 'ArrowUp' && App.sel.length) { this.nudge(0, -st); return true; } if (k === 'ArrowDown' && App.sel.length) { this.nudge(0, st); return true; }
    return false;
  },

  /* ── Tool panels ──────────────────────────────────────────────────── */
  renderPanel() {
    if (!this.active() || !this.tool) return;
    const body = clear($('#dp-body')), t = DESIGN_TOOLS.find(x => x.k === this.tool);
    $('#dp-title').textContent = t ? t.l : '';
    const fn = { templates: 'pTemplates', text: 'pText', elements: 'pElements', shapes: 'pShapes', images: 'pImages', uploads: 'pUploads', brand: 'pBrand', background: 'pBackground', layers: 'pLayers' }[this.tool];
    if (fn) this[fn](body);
  },
  pTemplates(b) {
    const f = App.project.format;
    b.appendChild(h('p', { class: 'small muted', style: { margin: '0 0 10px' } }, 'Vorlagen passen sich automatisch an das Format ' + f.w + ' × ' + f.h + ' an. Klick ersetzt die aktuelle Seite, ⊕ fügt eine neue Seite hinzu.'));
    const cats = [...new Set(TEMPLATES.map(t => t.cat))];
    cats.forEach(cat => {
      b.appendChild(h('div', { class: 'lbl', style: { margin: '12px 0 8px' } }, cat));
      const g = h('div', { class: 'tile-grid' });
      TEMPLATES.filter(t => t.cat === cat).forEach(t => {
        const tile = h('div', { class: 'tile', style: { aspectRatio: f.w + '/' + f.h }, role: 'button', tabindex: '0', 'aria-label': 'Vorlage ' + t.name, 'data-tip': t.name });
        tile.appendChild(templateThumb(t, f, 150));
        tile.appendChild(h('span', { class: 'tl' }, t.name));
        const add = h('button', { class: 'ibtn', type: 'button', style: { position: 'absolute', top: '4px', right: '4px', width: '30px', height: '30px', background: 'rgba(255,255,255,.88)', color: '#17130F' }, 'aria-label': 'Als neue Seite hinzufügen', 'data-tip': 'Als neue Seite', html: icon('plus', 's'), onclick: ev => { ev.stopPropagation(); this.applyTemplate(t, true); } });
        tile.appendChild(add);
        tile.addEventListener('click', () => this.applyTemplate(t, false));
        tile.addEventListener('keydown', ev => { if (ev.key === 'Enter') this.applyTemplate(t, false); });
        g.appendChild(tile);
      });
      b.appendChild(g);
    });
  },
  async applyTemplate(t, asNew) {
    const f = App.project.format;
    const pg = buildTemplatePage(t, f);
    if (asNew) { App.project.pages.splice(App.page + 1, 0, pg); App.page++; }
    else {
      const cur = curPage();
      if (cur.elements.length && !(await confirmDialog({ title: 'Seite ersetzen?', text: 'Die Vorlage ersetzt den Inhalt der aktuellen Seite. Du kannst das jederzeit rückgängig machen.', ok: 'Ersetzen' }))) return;
      pg.id = cur.id; pg.name = cur.name; App.project.pages[App.page] = pg;
    }
    commit('template'); App.sel = []; this.refreshAll();
    if (isPhone()) this.setTool(null);
  },
  pText(b) {
    b.appendChild(btn('Textfeld hinzufügen', () => this.addText('body'), { cls: 'primary block', icon: 'plus' }));
    b.appendChild(h('div', { style: { height: '12px' } }));
    const roles = [['headline', 'Überschrift', `font-family:'Cormorant Garamond';font-size:30px;font-weight:500;line-height:1`], ['subheadline', 'UNTERÜBERSCHRIFT', `font-family:Jost;font-size:12px;letter-spacing:.24em;font-weight:500`], ['body', 'Fließtext für ruhige, klare Aussagen.', `font-family:Jost;font-size:14px;font-weight:300`], ['quote', '„Zitat“', `font-family:'Cormorant Garamond';font-style:italic;font-size:24px`], ['cta', 'CTA-BUTTON', `font-family:Jost;font-size:11px;letter-spacing:.22em;background:#17130F;color:#F8F5F0;padding:8px 14px;border-radius:30px;display:inline-block`], ['wordmark', 'MINDÉA', `font-family:'Cormorant Garamond';font-size:24px;letter-spacing:.32em;font-weight:600`], ['number', '01', `font-family:'Cormorant Garamond';font-size:40px;line-height:1`]];
    roles.forEach(([r, txt, css]) => b.appendChild(h('button', { class: 'addtext', type: 'button', onclick: () => this.addText(r), 'aria-label': TEXT_ROLES[r].label + ' hinzufügen' }, h('div', { class: 'lbl', style: { marginBottom: '6px' } }, TEXT_ROLES[r].label), h('div', { style: css }, txt))));
    b.appendChild(h('div', { class: 'lbl', style: { margin: '16px 0 8px' } }, 'Schriftkombinationen'));
    [['Editorial', FONT_HEAD, FONT_BODY], ['Klassisch', FONT_ALT, FONT_BODY], ['Modern', FONT_BODY, FONT_HEAD]].forEach(([n, a, c]) => {
      b.appendChild(h('button', { class: 'addtext', type: 'button', onclick: () => { const f = App.project.format; const t1 = mkText('headline', f.w, f.h, { font: a, text: 'Klarheit wirkt.' }); t1.y = Math.round(f.h * 0.38); const t2 = mkText('body', f.w, f.h, { font: c, text: 'Eine ruhige Ergänzung, die Raum lässt.' }); t1.h = textMetrics(t1).h; t2.y = t1.y + t1.h + Math.round(f.h * 0.03); curPage().elements.push(t1, t2); t2.h = textMetrics(t2).h; commit('add'); this.select([t1.id, t2.id]); requestRender(); } },
        h('div', { style: `font-family:'${a}';font-size:22px;line-height:1.1` }, 'Klarheit wirkt.'), h('div', { style: `font-family:'${c}';font-size:12px;color:var(--muted);margin-top:4px` }, n + ' · ' + a + ' + ' + c)));
    });
  },
  pElements(b) {
    b.appendChild(h('p', { class: 'small muted', style: { margin: '0 0 6px' } }, 'Hochwertige Linien, Marker und Icons – im Video automatisch animiert.'));
    Object.entries(G_CATS).forEach(([cat, l]) => {
      b.appendChild(h('div', { class: 'lbl', style: { margin: '14px 0 8px' } }, l));
      const g = h('div', { class: 'tile-grid three' });
      Object.entries(GRAPHICS).filter(([, d]) => d.cat === cat).forEach(([k, d]) => {
        const tile = h('button', { class: 'tile sq', type: 'button', 'aria-label': d.label, 'data-tip': d.label, onclick: () => { const f = App.project.format; this.addElement(mkGraphic(k, f.w, f.h)); } });
        tile.appendChild(graphicThumb(k, 90)); g.appendChild(tile);
      });
      b.appendChild(g);
    });
  },
  pShapes(b) {
    const g = h('div', { class: 'tile-grid three' });
    Object.entries(SHAPES).forEach(([k, s]) => {
      const t = h('button', { class: 'tile sq', type: 'button', 'aria-label': s.label, 'data-tip': s.label, onclick: () => { const f = App.project.format; this.addElement(mkShape(k, f.w, f.h)); } });
      const c = makeCanvas(90, 90); const ctx = c.getContext('2d'); const el = mkShape(k, 90, 90); el.x = (90 - el.w) / 2; el.y = (90 - el.h) / 2; el.strokeW = 2; drawElement(ctx, el); t.appendChild(c);
      g.appendChild(t);
    });
    b.appendChild(g);
  },
  pImages(b) {
    const imgs = Media.byKind('image');
    b.append(h('div', { class: 'row', style: { marginBottom: '10px' } }, btn('Hochladen', () => this.uploadImages(), { cls: 'primary', icon: 'upload' }), btn('Mediathek', () => showView('media'), { cls: 'ghost' })));
    if (!imgs.length) { b.appendChild(emptyState('image', 'Noch keine Bilder', 'Lade eigene Bilder hoch – sie bleiben lokal in deinem Browser.')); return; }
    const search = h('input', { class: 'input sm', placeholder: 'Suchen (z. B. laptop, portrait) …', 'aria-label': 'Bilder suchen', style: { marginBottom: '10px' } });
    const g = h('div', { class: 'tile-grid' });
    const draw = () => {
      clear(g); const q = search.value.trim().toLowerCase();
      imgs.filter(m => !q || (m.name + ' ' + [...m.tags, ...m.aiTags].map(t => t + ' ' + tagLabel(t)).join(' ')).toLowerCase().includes(q)).slice(0, 120).forEach(m => {
        const t = h('button', { class: 'tile', type: 'button', style: { aspectRatio: '1' }, 'aria-label': 'Bild hinzufügen: ' + m.name, onclick: () => this.addImage(m) });
        t.appendChild(h('img', { src: Media.thumbURL(m), alt: '', loading: 'lazy' })); if (m.favorite) t.appendChild(h('span', { class: 'fav', html: icon('heartF', 's') }));
        g.appendChild(t);
      });
    };
    search.addEventListener('input', draw); draw(); b.append(search, g);
  },
  async uploadImages() { const files = await pickFiles('image/*', true); const added = await Media.import(files); added.filter(m => m.kind === 'image').forEach((m, i) => { if (i === 0) this.addImage(m); }); if (added.length > 1) toast('Weitere Bilder findest du im Panel „Bilder“.', 'info'); },
  pUploads(b) {
    b.append(h('div', { class: 'drop', style: { padding: '24px 14px' } }, iconEl('upload', 'l'), h('div', null, 'Bilder & Videos hierher ziehen'), btn('Dateien wählen', async () => { await Media.import(await pickFiles('image/*,video/*,audio/*', true)); }, { cls: 'primary', icon: 'plus' }), h('div', { class: 'tiny muted' }, 'Lokal gespeichert · nichts wird hochgeladen')));
    const recent = Media.list.slice(0, 30);
    if (recent.length) {
      b.appendChild(h('div', { class: 'lbl', style: { margin: '16px 0 8px' } }, 'Zuletzt hochgeladen'));
      const g = h('div', { class: 'tile-grid' });
      recent.forEach(m => {
        const t = h('button', { class: 'tile', type: 'button', style: { aspectRatio: '1' }, 'aria-label': m.name, onclick: () => { if (m.kind === 'image') this.addImage(m); else if (m.kind === 'video') toast('Videos bearbeitest du im Video Studio. Tipp: Ein Standbild erhältst du dort per „Frame als Bild“.', 'info', { duration: 5000 }); else toast('Audio kannst du im Video Studio verwenden.', 'info'); } });
        if (m.thumb) t.appendChild(h('img', { src: Media.thumbURL(m), alt: '', loading: 'lazy' })); else t.innerHTML = icon(m.kind === 'audio' ? 'music' : 'file', 'l');
        if (m.kind !== 'image') t.appendChild(h('span', { class: 'kind', html: icon(m.kind === 'video' ? 'video' : 'music', 's') + (m.duration ? fmtTime(m.duration, false) : '') }));
        g.appendChild(t);
      });
      b.appendChild(g);
    }
    const dz = b.querySelector('.drop');
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); }); dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', async e => { e.preventDefault(); dz.classList.remove('over'); await Media.import(e.dataTransfer.files); });
  },
  pBrand(b) {
    b.appendChild(h('div', { class: 'lbl', style: { marginBottom: '8px' } }, 'Markenfarben'));
    b.appendChild(h('p', { class: 'tiny muted', style: { margin: '0 0 8px' } }, 'Klick färbt die Auswahl ein (Text, Form, Grafik) – ohne Auswahl den Hintergrund.'));
    b.appendChild(colorRow('', c => { const els = selEls(); if (!els.length) { curPage().bg.type = curPage().bg.type === 'image' ? 'image' : 'color'; curPage().bg.color = c; } else els.forEach(el => { if (el.type === 'text') el.color = c; else if (el.type === 'shape') { if (el.fill !== 'none') el.fill = c; else el.stroke = c; } else if (el.type === 'graphic') el.color = c; }); commit('color'); requestRender(); this.renderInspector(); }));
    b.appendChild(h('div', { class: 'lbl', style: { margin: '18px 0 8px' } }, 'Markenstile – Ein Klick'));
    const g = h('div', { class: 'tile-grid' });
    Object.entries(BRAND_STYLES).forEach(([k, s]) => {
      const card = h('button', { class: 'style-card', type: 'button', onclick: () => { applyBrandStyle(curPage(), k); commit('style'); requestRender(); this.renderInspector(); toast('Stil „' + s.l + '“ angewendet', 'success'); } });
      card.appendChild(h('div', { class: 'sp', style: { background: s.bg, color: s.text } }, h('div', { style: `font-family:'${s.head}';font-size:20px;line-height:1` }, 'Aa'), h('div', { style: { height: '2px', width: '28px', background: s.accent } })));
      card.appendChild(h('div', { class: 'sm' }, s.l)); g.appendChild(card);
    });
    b.appendChild(g);
    b.appendChild(h('div', { class: 'lbl', style: { margin: '18px 0 8px' } }, 'Markenassets'));
    const ag = h('div', { class: 'tile-grid three' });
    let any = false;
    BRAND_ASSETS.forEach(a => {
      const m = Brand.assetMedia(a.k); if (!m) return; any = true;
      const t = h('button', { class: 'tile sq', type: 'button', 'aria-label': a.l, 'data-tip': a.l + ' einfügen', onclick: () => { const f = App.project.format; const el = mkImage(m, f.w, f.h, { fit: 'fit', name: a.l }); const s = Math.min(f.w, f.h) * (a.k === 'watermark' ? 0.18 : 0.3); const ar = m.w / m.h; el.w = Math.round(ar >= 1 ? s : s * ar); el.h = Math.round(ar >= 1 ? s / ar : s); el.x = Math.round((f.w - el.w) / 2); el.y = Math.round(a.k === 'watermark' ? f.h - el.h - f.h * 0.05 : (f.h - el.h) / 2); if (a.k === 'watermark') el.opacity = 0.6; this.addElement(el); } });
      t.appendChild(h('img', { src: Media.thumbURL(m), alt: '', style: { objectFit: 'contain', padding: '8px' } })); ag.appendChild(t);
    });
    if (any) b.appendChild(ag); else b.appendChild(h('p', { class: 'small muted' }, 'Noch keine Assets. Lade Logo, Icon oder Wasserzeichen im Brand Kit hoch.'));
    b.appendChild(btn('Brand Kit öffnen', () => showView('brand'), { cls: 'ghost block', icon: 'brand' }));
  },
  pBackground(b) {
    const pg = curPage(), bg = pg.bg;
    b.appendChild(h('div', { class: 'lbl', style: { marginBottom: '8px' } }, 'Farbe'));
    b.appendChild(colorRow(bg.type === 'color' ? bg.color : '', (c, live) => { bg.type = 'color'; bg.color = c; requestRender(); if (!live) { commit('bg'); this.renderPanel(); } }));
    b.appendChild(h('div', { class: 'lbl', style: { margin: '16px 0 8px' } }, 'Verlauf'));
    const gg = h('div', { class: 'tile-grid three' });
    [[C.ivory, C.cream], [C.cream, C.sand], [C.black, C.espresso], [C.espresso, C.gold], [C.ivory, C.lightgold], [C.sand, C.gold]].forEach(([a, c2]) => {
      gg.appendChild(h('button', { class: 'tile sq', type: 'button', 'aria-label': 'Verlauf', style: { background: `linear-gradient(160deg, ${a}, ${c2})` }, onclick: () => { Object.assign(bg, { type: 'gradient', color: a, color2: c2, angle: 160 }); commit('bg'); requestRender(); this.renderPanel(); } }));
    });
    b.appendChild(gg);
    if (bg.type === 'gradient') b.appendChild(h('div', { style: { marginTop: '10px' } }, slider('Winkel', bg.angle || 160, 0, 360, 1, v => { bg.angle = v; requestRender(); }, () => commit('bg'))));
    b.appendChild(h('div', { class: 'lbl', style: { margin: '16px 0 8px' } }, 'Bild als Hintergrund'));
    const imgs = Media.byKind('image').slice(0, 30);
    if (!imgs.length) b.appendChild(h('p', { class: 'small muted' }, 'Lade Bilder in die Mediathek, um sie als Hintergrund zu nutzen.'));
    const ig = h('div', { class: 'tile-grid three' });
    imgs.forEach(m => ig.appendChild(h('button', { class: 'tile sq' + (bg.mediaId === m.id && bg.type === 'image' ? ' sel' : ''), type: 'button', 'aria-label': 'Hintergrundbild ' + m.name, onclick: () => { bg.type = 'image'; bg.mediaId = m.id; commit('bg'); requestRender(); this.renderPanel(); } }, h('img', { src: Media.thumbURL(m), alt: '', loading: 'lazy' }))));
    b.appendChild(ig);
    if (bg.type === 'image') {
      b.append(h('div', { style: { height: '12px' } }), field('Look', selectEl(IMAGE_LOOKS.map(k => ({ v: k, l: LOOKS[k].l })), bg.look || 'original', v => { bg.look = v; commit('bg'); requestRender(); })),
        slider('Abdunkeln', bg.dim || 0, 0, 80, 1, v => { bg.dim = v; requestRender(); }, () => commit('bg')),
        slider('Zoom', bg.zoom || 1, 1, 3, 0.01, v => { bg.zoom = v; requestRender(); }, () => commit('bg')),
        slider('Position X', bg.ox || 0, -1, 1, 0.01, v => { bg.ox = v; requestRender(); }, () => commit('bg')),
        slider('Position Y', bg.oy || 0, -1, 1, 0.01, v => { bg.oy = v; requestRender(); }, () => commit('bg')),
        btn('Bild entfernen', () => { bg.type = 'color'; bg.mediaId = null; commit('bg'); requestRender(); this.renderPanel(); }, { cls: 'sm danger' }));
    }
  },
  pLayers(b) {
    const pg = curPage(); const list = h('div', { role: 'list', 'aria-label': 'Ebenen (oben = vorne)' });
    if (!pg.elements.length) { b.appendChild(emptyState('layers', 'Keine Ebenen', 'Füge Text, Bilder oder Formen hinzu.')); return; }
    b.appendChild(h('p', { class: 'tiny muted', style: { margin: '0 0 8px' } }, 'Oben = vorne. Ziehen zum Sortieren, Doppelklick zum Umbenennen.'));
    const els = pg.elements.slice().reverse();
    els.forEach(el => {
      const row = h('div', { class: 'layer' + (App.sel.includes(el.id) ? ' on' : ''), role: 'listitem', dataset: { id: el.id } });
      const grip = h('span', { class: 'grip', html: icon('drag', 's'), 'aria-hidden': 'true' });
      const ic = h('span', { class: 'lic', html: icon({ text: 'type', image: 'image', shape: 'shapes', graphic: 'sparkle' }[el.type] || 'square', 's') });
      const name = h('span', { class: 'lname' }, el.type === 'text' ? (el.name !== TEXT_ROLES[el.role]?.label ? el.name : (el.text || '').slice(0, 40)) : el.name);
      name.addEventListener('dblclick', async () => { const n = await promptDialog({ title: 'Ebene umbenennen', label: 'Name', value: el.name }); if (n) { el.name = n; commit('rename'); this.renderPanel(); } });
      const vis = ibtn(el.hidden ? 'eyeOff' : 'eye', el.hidden ? 'Einblenden' : 'Ausblenden', ev => { ev.stopPropagation(); el.hidden = !el.hidden; commit('vis'); requestRender(); this.renderPanel(); }, { size: 's' });
      const lk = ibtn(el.locked ? 'lock' : 'unlock', el.locked ? 'Entsperren' : 'Fixieren', ev => { ev.stopPropagation(); el.locked = !el.locked; commit('lock'); this.renderPanel(); this.renderOverlay(); }, { size: 's', cls: el.locked ? 'on' : '' });
      const more = ibtn('more', 'Mehr', ev => { ev.stopPropagation(); this.select([el.id]); popMenu(more, [{ label: 'Umbenennen', icon: 'pen', fn: () => name.dispatchEvent(new Event('dblclick')) }, { label: 'Duplizieren', icon: 'copy', fn: () => this.duplicate() }, { label: 'Löschen', icon: 'trash', danger: true, fn: () => { el.locked = false; this.remove(); } }]); }, { size: 's' });
      row.append(grip, ic, name, vis, lk, more);
      row.addEventListener('click', ev => { if (ev.shiftKey) this.select(App.sel.includes(el.id) ? App.sel.filter(i => i !== el.id) : [...App.sel, el.id]); else this.select([el.id]); });
      // drag & drop sort (pointer-based → works with touch)
      grip.addEventListener('pointerdown', ev => {
        ev.preventDefault(); row.classList.add('dragging'); grip.setPointerCapture(ev.pointerId);
        let target = null, after = false;
        const mv = e2 => { $$('.layer', list).forEach(r => r.classList.remove('dropabove', 'dropbelow')); const over = document.elementFromPoint(e2.clientX, e2.clientY)?.closest('.layer'); if (over && over !== row) { const r = over.getBoundingClientRect(); after = e2.clientY > r.top + r.height / 2; over.classList.add(after ? 'dropbelow' : 'dropabove'); target = over; } else target = null; };
        const up = () => {
          grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up); row.classList.remove('dragging');
          if (target) {
            const tid = target.dataset.id; const arr = pg.elements; const from = arr.indexOf(el); arr.splice(from, 1);
            let ti = arr.findIndex(x => x.id === tid); // list is reversed: "below" in UI = lower index
            arr.splice(after ? ti : ti + 1, 0, el); commit('reorder'); requestRender();
          }
          this.renderPanel();
        };
        grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
      });
      list.appendChild(row);
    });
    b.appendChild(list);
  },

  /* ── Inspector ────────────────────────────────────────────────────── */
  renderInspector() {
    if (!this.active()) return;
    const ins = clear(this.e.insp); ins.appendChild(h('div', { class: 'sheet-handle' }));
    const els = selEls();
    const closeBtn = h('button', { class: 'ibtn insp-toggle', type: 'button', 'aria-label': 'Schließen', html: icon('x'), onclick: () => this.e.ed.classList.remove('insp-open') });
    if (!els.length) { this.iPage(ins, closeBtn); return; }
    if (els.length > 1) { ins.appendChild(h('div', { class: 'ins-title' }, h('h4', null, els.length + ' Elemente'), closeBtn)); this.iArrange(ins, true); return; }
    const el = els[0];
    ins.appendChild(h('div', { class: 'ins-title' }, h('h4', null, { text: 'Text', image: 'Bild', shape: 'Form', graphic: 'Grafik' }[el.type]), closeBtn));
    if (el.locked) ins.appendChild(insSec(null, h('div', { class: 'notice' }, iconEl('lock', 's'), h('span', null, 'Element ist fixiert.')), btn('Entsperren', () => this.setLock(false), { cls: 'sm', icon: 'unlock' })));
    ({ text: this.iText, image: this.iImage, shape: this.iShape, graphic: this.iGraphic })[el.type].call(this, ins, el);
    this.iArrange(ins, false, el);
  },
  live(el, k, v) { el[k] = v; requestRender(); this.renderOverlay(); },
  iPage(ins, closeBtn) {
    const p = App.project, pg = curPage(), f = p.format;
    ins.appendChild(h('div', { class: 'ins-title' }, h('h4', null, 'Seite'), closeBtn));
    const nameIn = h('input', { class: 'input', value: pg.name, 'aria-label': 'Seitenname' }); nameIn.addEventListener('change', () => { pg.name = nameIn.value.trim() || pg.name; commit('page'); this.renderPages(); });
    ins.appendChild(insSec('Seite', field('Name', nameIn), h('div', { class: 'small muted' }, `${f.label || 'Format'} · ${f.w} × ${f.h} px`)));
    ins.appendChild(insSec('Format', btn('Magic Resize …', () => magicResizeDialog(), { cls: 'block', icon: 'resize' }), h('p', { class: 'tiny muted', style: { margin: '8px 0 0' } }, 'Überträgt das Design als Kopie in ein anderes Format und ordnet die Elemente proportional an.')));
    if (pg.bg.type === 'image' && pg.bg.alts && pg.bg.alts.length) {
      const ar = h('div', { class: 'alt-row', style: { flexWrap: 'wrap', gap: '6px' } });
      pg.bg.alts.map(id => Media.get(id)).filter(Boolean).forEach(am => { const im = h('img', { src: Media.thumbURL(am), alt: am.name, class: am.id === pg.bg.mediaId ? 'on' : '', style: { width: '52px', height: '52px' }, tabindex: '0', role: 'button', 'aria-label': 'Alternative: ' + am.name }); im.addEventListener('click', () => { pg.bg.mediaId = am.id; commit('alt'); Media.img(am.id).then(() => requestRender()); this.renderInspector(); }); ar.appendChild(im); });
      ins.appendChild(insSec('Alternative Hintergrundbilder (Smart Match)', ar));
    }
    ins.appendChild(insSec('Hintergrund', colorRow(pg.bg.type === 'color' ? pg.bg.color : '', (c, live) => { pg.bg.type = 'color'; pg.bg.color = c; requestRender(); if (!live) commit('bg'); }), h('div', { style: { height: '8px' } }), btn('Mehr Optionen', () => this.setTool('background'), { cls: 'sm ghost' })));
    ins.appendChild(insSec('Markenstil', (() => { const g = h('div', { class: 'chips' }); Object.entries(BRAND_STYLES).forEach(([k, s]) => g.appendChild(chip(s.l, false, () => { applyBrandStyle(pg, k); commit('style'); requestRender(); }))); return g; })()));
    ins.appendChild(insSec('Export', btn('Exportieren …', () => openExport(), { cls: 'primary block', icon: 'download' })));
  },
  iText(ins, el) {
    const ta = h('textarea', { class: 'textarea', style: { minHeight: '74px' }, 'aria-label': 'Textinhalt' }); ta.value = el.text;
    ta.addEventListener('input', () => { el.text = ta.value; requestRender(); this.renderOverlay(); }); ta.addEventListener('change', () => commit('text'));
    ins.appendChild(insSec('Inhalt', ta));
    const fontSel = selectEl(FONTS, el.font, v => { el.font = v; ensureFont(el).then(() => requestRender()); commit('font'); this.renderOverlay(); }, { aria: 'Schriftart' });
    const weights = selectEl([{ v: '300', l: 'Light' }, { v: '400', l: 'Regular' }, { v: '500', l: 'Medium' }, { v: '600', l: 'Semibold' }, { v: '700', l: 'Bold' }], String(el.weight), v => { el.weight = +v; ensureFont(el).then(() => requestRender()); commit('weight'); }, { aria: 'Schriftstärke' });
    const st = h('div', { class: 'row wrap', style: { gap: '4px', marginTop: '8px' } });
    const tg = (ic, tip, key, val, alt) => { const on = el[key] === val; const b = ibtn(ic, tip, () => { el[key] = el[key] === val ? alt : val; commit(key); requestRender(); this.renderOverlay(); this.renderInspector(); }, { cls: 'bordered' + (on ? ' on' : ''), size: 's' }); b.setAttribute('aria-pressed', on); return b; };
    const italic = h('button', { class: 'ibtn bordered' + (el.italic ? ' on' : ''), type: 'button', 'aria-label': 'Kursiv', 'data-tip': 'Kursiv', style: { fontStyle: 'italic', fontFamily: 'Georgia' }, onclick: () => { el.italic = !el.italic; ensureFont(el).then(() => requestRender()); commit('italic'); this.renderInspector(); } }, 'I');
    const under = h('button', { class: 'ibtn bordered' + (el.underline ? ' on' : ''), type: 'button', 'aria-label': 'Unterstreichen', 'data-tip': 'Unterstreichen', style: { textDecoration: 'underline' }, onclick: () => { el.underline = !el.underline; commit('u'); requestRender(); this.renderInspector(); } }, 'U');
    const strike = h('button', { class: 'ibtn bordered' + (el.strike ? ' on' : ''), type: 'button', 'aria-label': 'Durchstreichen', 'data-tip': 'Durchstreichen', style: { textDecoration: 'line-through' }, onclick: () => { el.strike = !el.strike; commit('s'); requestRender(); this.renderInspector(); } }, 'S');
    const upper = h('button', { class: 'ibtn bordered' + (el.transform === 'upper' ? ' on' : ''), type: 'button', 'aria-label': 'Großbuchstaben', 'data-tip': 'GROSSBUCHSTABEN', style: { fontSize: '11px' }, onclick: () => { el.transform = el.transform === 'upper' ? 'none' : 'upper'; commit('tt'); requestRender(); this.renderOverlay(); this.renderInspector(); } }, 'AA');
    const lower = h('button', { class: 'ibtn bordered' + (el.transform === 'lower' ? ' on' : ''), type: 'button', 'aria-label': 'Kleinbuchstaben', 'data-tip': 'kleinbuchstaben', style: { fontSize: '11px' }, onclick: () => { el.transform = el.transform === 'lower' ? 'none' : 'lower'; commit('tt'); requestRender(); this.renderOverlay(); this.renderInspector(); } }, 'aa');
    st.append(italic, under, strike, upper, lower);
    ins.appendChild(insSec('Schrift', field('Schriftart', fontSel), h('div', { class: 'grid2' }, field('Stärke', weights), field('Größe', (() => { const n = h('input', { class: 'input', type: 'number', min: 6, max: 900, value: el.size, 'aria-label': 'Schriftgröße' }); n.addEventListener('change', () => { el.size = clamp(+n.value || el.size, 6, 900); commit('size'); requestRender(); this.renderOverlay(); }); return n; })())), st,
      h('div', { style: { height: '10px' } }),
      seg([{ v: 'left', icon: 'tAlignL', aria: 'Linksbündig' }, { v: 'center', icon: 'tAlignC', aria: 'Zentriert' }, { v: 'right', icon: 'tAlignR', aria: 'Rechtsbündig' }], el.align, v => { el.align = v; commit('align'); requestRender(); }),
      h('div', { style: { height: '10px' } }),
      slider('Buchstabenabstand', el.ls || 0, -0.5, 1, 0.01, v => this.live(el, 'ls', v), () => commit('ls'), { reset: 0 }),
      slider('Zeilenhöhe', el.lh || 1.2, 0.7, 2.5, 0.01, v => this.live(el, 'lh', v), () => commit('lh')),
    ));
    ins.appendChild(insSec('Farbe', colorRow(el.color, (c, live) => { el.color = c; requestRender(); if (!live) { commit('color'); this.renderInspector(); } })));
    const fx = insSec('Effekte');
    fx.appendChild(toggle('Schatten', el.shadow.on, v => { el.shadow.on = v; commit('shadow'); requestRender(); this.renderInspector(); }));
    if (el.shadow.on) fx.append(slider('Weichheit', el.shadow.blur, 0, 80, 1, v => { el.shadow.blur = v; requestRender(); }, () => commit('shadow')), slider('Versatz Y', el.shadow.y, -40, 40, 1, v => { el.shadow.y = v; requestRender(); }, () => commit('shadow')), slider('Deckkraft', el.shadow.opacity ?? 0.35, 0, 1, 0.01, v => { el.shadow.opacity = v; requestRender(); }, () => commit('shadow')), colorRow(el.shadow.color, (c, l) => { el.shadow.color = c; requestRender(); if (!l) commit('shadow'); }));
    fx.appendChild(toggle('Kontur', el.stroke.on, v => { el.stroke.on = v; commit('stroke'); requestRender(); this.renderInspector(); }));
    if (el.stroke.on) fx.append(slider('Konturstärke', el.stroke.w, 0.5, 20, 0.5, v => { el.stroke.w = v; requestRender(); }, () => commit('stroke')), colorRow(el.stroke.color, (c, l) => { el.stroke.color = c; requestRender(); if (!l) commit('stroke'); }));
    fx.appendChild(toggle('Hintergrund', el.bg.on, v => { el.bg.on = v; commit('tbg'); requestRender(); this.renderOverlay(); this.renderInspector(); }));
    if (el.bg.on) fx.append(colorRow(el.bg.color, (c, l) => { el.bg.color = c; requestRender(); if (!l) commit('tbg'); }), slider('Rundung', Math.min(el.bg.radius, 300), 0, 300, 1, v => { el.bg.radius = v; requestRender(); }, () => commit('tbg')), slider('Transparenz', 1 - (el.bg.opacity ?? 1), 0, 1, 0.01, v => { el.bg.opacity = 1 - v; requestRender(); }, () => commit('tbg')), slider('Innenabstand', el.bg.pad ?? 0.9, 0.2, 2.5, 0.05, v => { el.bg.pad = v; requestRender(); this.renderOverlay(); }, () => commit('tbg')));
    ins.appendChild(fx);
  },
  iShape(ins, el) {
    const isLine = ['line', 'arrow', 'chevron', 'divider', 'frame'].includes(el.shape);
    if (!isLine) ins.appendChild(insSec('Füllfarbe', colorRow(el.fill, (c, l) => { el.fill = c; requestRender(); if (!l) { commit('fill'); this.renderInspector(); } }, { allowNone: true })));
    ins.appendChild(insSec('Kontur', colorRow(el.stroke, (c, l) => { el.stroke = c; requestRender(); if (!l) { commit('stroke'); this.renderInspector(); } }, { allowNone: !isLine }), h('div', { style: { height: '8px' } }), slider('Konturstärke', el.strokeW, 0, 40, 0.5, v => this.live(el, 'strokeW', v), () => commit('sw'))));
    if (['rect', 'roundrect', 'frame', 'callout'].includes(el.shape)) ins.appendChild(insSec('Rundung', slider('Ecken', el.radius || 0, 0, Math.round(Math.min(el.w, el.h) / 2), 1, v => { el.radius = v; if (el.shape === 'rect' && v > 0) el.shape = 'roundrect'; requestRender(); }, () => commit('radius'))));
    if (el.shape === 'badge' || el.shape === 'callout') { const t = h('input', { class: 'input', value: el.text || '', 'aria-label': 'Text' }); t.addEventListener('input', () => { el.text = t.value; requestRender(); }); t.addEventListener('change', () => commit('text')); ins.appendChild(insSec('Text', t, h('div', { style: { height: '8px' } }), colorRow(el.textColor, (c, l) => { el.textColor = c; requestRender(); if (!l) commit('tc'); }))); }
  },
  iGraphic(ins, el) {
    const g = GRAPHICS[el.kind];
    ins.appendChild(insSec('Grafik', field('Typ', selectEl(Object.entries(GRAPHICS).map(([k, d]) => ({ v: k, l: d.label })), el.kind, v => { el.kind = v; el.name = GRAPHICS[v].label; commit('kind'); requestRender(); this.renderInspector(); }))));
    ins.appendChild(insSec('Farbe', colorRow(el.color, (c, l) => { el.color = c; requestRender(); if (!l) commit('color'); })));
    if (!g.fill && !g.text || g.sw) ins.appendChild(insSec('Linie', slider('Strichstärke', el.strokeW || 3, 0.5, 14, 0.5, v => this.live(el, 'strokeW', v), () => commit('sw'))));
    if (el.kind === 'numbers') ins.appendChild(insSec('Aktive Zahl', seg([1, 2, 3].map(n => ({ v: n, l: '0' + n })), el.index || 1, v => { el.index = v; commit('idx'); requestRender(); })));
    if (['speech', 'thought', 'note', 'polaroid', 'label'].includes(el.kind)) { const t = h('input', { class: 'input', value: el.label || '', placeholder: 'Beschriftung (optional)', 'aria-label': 'Beschriftung' }); t.addEventListener('input', () => { el.label = t.value; requestRender(); }); t.addEventListener('change', () => commit('label')); ins.appendChild(insSec('Beschriftung', t)); }
  },
  iImage(ins, el) {
    const m = Media.get(el.mediaId);
    const crop = insSec('Bild');
    crop.append(h('div', { class: 'row wrap', style: { gap: '6px', marginBottom: '10px' } },
      btn(this.cropId === el.id ? 'Fertig' : 'Zuschneiden', () => this.toggleCrop(el), { cls: 'sm' + (this.cropId === el.id ? ' primary' : ''), icon: 'crop' }),
      btn('Ersetzen', async () => { const [nm] = await pickMediaDialog({ kind: 'image', title: 'Bild ersetzen' }); if (nm) { el.mediaId = nm.id; el.name = nm.name; commit('replace'); requestRender(); this.renderInspector(); } }, { cls: 'sm', icon: 'image' }),
      btn('Als Hintergrund', () => { const pg = curPage(); Object.assign(pg.bg, { type: 'image', mediaId: el.mediaId, look: el.look, adj: deepClone(el.adj || {}) }); pg.elements = pg.elements.filter(x => x !== el); commit('asbg'); this.select([]); requestRender(); }, { cls: 'sm', icon: 'bg' })),
      seg([{ v: 'fill', l: 'Füllen' }, { v: 'fit', l: 'Einpassen' }], el.fit, v => { el.fit = v; commit('fit'); requestRender(); }),
      h('div', { style: { height: '8px' } }),
      slider('Zoom', el.zoom || 1, el.fit === 'fit' ? 0.2 : 1, 5, 0.01, v => this.live(el, 'zoom', v), () => commit('zoom'), { reset: 1 }),
      slider('Position X', el.ox || 0, -1, 1, 0.01, v => this.live(el, 'ox', v), () => commit('ox'), { reset: 0 }),
      slider('Position Y', el.oy || 0, -1, 1, 0.01, v => this.live(el, 'oy', v), () => commit('oy'), { reset: 0 }),
      slider('Eckenrundung', el.radius || 0, 0, Math.round(Math.min(el.w, el.h) / 2), 1, v => this.live(el, 'radius', v), () => commit('radius')),
      h('div', { class: 'row', style: { gap: '6px', marginTop: '6px' } }, ibtn('flipH', 'Horizontal spiegeln', () => { el.flipX = !el.flipX; commit('flip'); requestRender(); this.renderInspector(); }, { cls: 'bordered' + (el.flipX ? ' on' : '') }), ibtn('flipV', 'Vertikal spiegeln', () => { el.flipY = !el.flipY; commit('flip'); requestRender(); this.renderInspector(); }, { cls: 'bordered' + (el.flipY ? ' on' : '') })));
    ins.appendChild(crop);
    if (el.alts && el.alts.length) {
      const ar = h('div', { class: 'alt-row', style: { flexWrap: 'wrap', gap: '6px' } });
      el.alts.map(id => Media.get(id)).filter(Boolean).forEach(am => { const im = h('img', { src: Media.thumbURL(am), alt: am.name, class: am.id === el.mediaId ? 'on' : '', style: { width: '52px', height: '52px' }, tabindex: '0', role: 'button', 'aria-label': 'Alternative: ' + am.name }); im.addEventListener('click', () => { el.mediaId = am.id; el.name = am.name; commit('alt'); requestRender(); this.renderInspector(); }); ar.appendChild(im); });
      ins.appendChild(insSec('Alternative Bilder (Smart Match)', ar));
    }
    const lk = insSec('Look');
    const lg = h('div', { class: 'tile-grid three' });
    IMAGE_LOOKS.forEach(k => {
      const t = h('button', { class: 'tile sq' + (el.look === k ? ' sel' : ''), type: 'button', 'aria-label': 'Look ' + LOOKS[k].l, 'data-tip': LOOKS[k].l, onclick: () => { el.look = k; commit('look'); requestRender(); this.renderInspector(); } });
      const img = Media.imgSync(el.mediaId);
      if (img) { const c = makeCanvas(84, 84); const cx = c.getContext('2d'); const { crop: cr } = coverCrop(img.naturalWidth, img.naturalHeight, 84, 84); drawGraded(cx, img, cr, 0, 0, 84, 84, effAdj(k, {}), { cacheKey: el.mediaId + 'lk' }); t.appendChild(c); }
      t.appendChild(h('span', { class: 'tl' }, LOOKS[k].l)); lg.appendChild(t);
    });
    lk.appendChild(lg); ins.appendChild(lk);
    const adj = insSec('Anpassen');
    el.adj = el.adj || {};
    ['brightness', 'contrast', 'saturation', 'warmth', 'highlights', 'shadows', 'sharpness'].forEach(k => { const d = ADJ_KEYS.find(a => a.k === k); adj.appendChild(slider(d.l, el.adj[k] || 0, d.min ?? -100, 100, 1, v => { el.adj[k] = v; requestRender(); }, () => commit('adj'), { reset: 0 })); });
    ins.appendChild(adj);
    if (m) ins.appendChild(insSec('Datei', h('div', { class: 'small muted' }, m.name + ' · ' + (m.w || '?') + '×' + (m.h || '?'))));
  },
  iArrange(ins, multi, el) {
    const s = insSec('Position');
    s.append(h('div', { class: 'row', style: { gap: '4px', flexWrap: 'wrap', marginBottom: '10px' } },
      ibtn('alignL', 'Links', () => this.align('left'), { cls: 'bordered', size: 's' }), ibtn('alignC', 'Horizontal zentriert', () => this.align('hcenter'), { cls: 'bordered', size: 's' }), ibtn('alignR', 'Rechts', () => this.align('right'), { cls: 'bordered', size: 's' }),
      ibtn('alignT', 'Oben', () => this.align('top'), { cls: 'bordered', size: 's' }), ibtn('alignM', 'Vertikal zentriert', () => this.align('vcenter'), { cls: 'bordered', size: 's' }), ibtn('alignB', 'Unten', () => this.align('bottom'), { cls: 'bordered', size: 's' })));
    if (!multi && el) {
      const num = (lbl, key, min, max) => { const n = h('input', { class: 'input sm', type: 'number', value: Math.round(el[key]), min, max, 'aria-label': lbl }); n.addEventListener('change', () => { el[key] = +n.value; if (key === 'w' && el.type === 'text') el.h = textMetrics(el).h; commit(key); requestRender(); this.renderOverlay(); }); return field(lbl, n); };
      s.append(h('div', { class: 'grid2' }, num('X', 'x'), num('Y', 'y'), num('Breite', 'w', 4), el.type === 'text' ? h('div') : num('Höhe', 'h', 2)),
        slider('Rotation', el.rot || 0, -180, 180, 1, v => this.live(el, 'rot', v), () => commit('rot'), { reset: 0 }),
        slider('Deckkraft', Math.round((el.opacity ?? 1) * 100), 0, 100, 1, v => this.live(el, 'opacity', v / 100), () => commit('opacity')));
    }
    ins.appendChild(s);
    const one = !multi && el;
    ins.appendChild(insSec('Anordnen', h('div', { class: 'row wrap', style: { gap: '4px' } },
      ibtn('front', 'Ganz nach vorne', () => this.arrange('top'), { cls: 'bordered', size: 's' }), ibtn('up', 'Nach vorne', () => this.arrange('up'), { cls: 'bordered', size: 's' }),
      ibtn('down', 'Nach hinten', () => this.arrange('down'), { cls: 'bordered', size: 's' }), ibtn('back', 'Ganz nach hinten', () => this.arrange('bottom'), { cls: 'bordered', size: 's' }),
      ibtn(one && el.locked ? 'unlock' : 'lock', one && el.locked ? 'Entsperren' : 'Fixieren', () => this.setLock(!(one && el.locked)), { cls: 'bordered', size: 's' }),
      ibtn('copy', 'Duplizieren', () => this.duplicate(), { cls: 'bordered', size: 's', kbd: MOD + '+D' }), ibtn('trash', 'Löschen', () => this.remove(), { cls: 'bordered', size: 's', kbd: 'Entf' }))));
  },

  /* ── Pages strip ──────────────────────────────────────────────────── */
  schedulePages: debounce(function () { Design.renderPages(); }, 500),
  renderPages() {
    if (!this.active()) return;
    const box = clear(this.e.pages), p = App.project, f = p.format;
    const th = isPhone() ? 52 : 70, tw = Math.round(th * f.w / f.h);
    p.pages.forEach((pg, i) => {
      const d = h('div', { class: 'pg' + (i === App.page ? ' on' : ''), role: 'button', tabindex: '0', 'aria-label': `Seite ${i + 1}: ${pg.name}` });
      const c = renderPageToCanvas(pg, f, tw * 2); c.style.width = tw + 'px'; c.style.height = th + 'px';
      d.append(c, h('span', null, (i + 1) + ' · ' + pg.name));
      d.addEventListener('click', () => { if (App.page !== i) { this.endTextEdit(); App.page = i; App.sel = []; this.refreshAll(); } });
      d.addEventListener('dblclick', async () => { const n = await promptDialog({ title: 'Seite umbenennen', label: 'Name', value: pg.name }); if (n) { pg.name = n; commit('page'); this.renderPages(); } });
      d.addEventListener('keydown', e => { if (e.key === 'Enter') d.click(); });
      const more = h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Seitenoptionen', style: { position: 'absolute', top: '-6px', right: '-8px', width: '26px', height: '26px', background: 'var(--surface)', boxShadow: 'var(--shadow-1)' }, html: icon('more', 's') });
      more.addEventListener('click', ev => { ev.stopPropagation(); popMenu(more, [
        { label: 'Umbenennen', icon: 'pen', fn: () => d.dispatchEvent(new Event('dblclick')) }, { label: 'Duplizieren', icon: 'copy', fn: () => this.pageOp('dup', i) },
        { label: 'Nach links', icon: 'chevL', fn: () => this.pageOp('left', i) }, { label: 'Nach rechts', icon: 'chevR', fn: () => this.pageOp('right', i) },
        '-', { label: 'Löschen', icon: 'trash', danger: true, fn: () => this.pageOp('del', i) }]); });
      d.appendChild(more); box.appendChild(d);
    });
    box.appendChild(h('button', { class: 'pg-add', type: 'button', 'aria-label': 'Seite hinzufügen', 'data-tip': 'Seite hinzufügen', html: icon('plus'), style: { height: th + 'px' }, onclick: () => this.pageOp('add') }));
  },
  async pageOp(op, i) {
    const p = App.project;
    if (op === 'add') { const pg = newPage('Seite ' + (p.pages.length + 1), curPage() ? curPage().bg.color : C.ivory); p.pages.splice(App.page + 1, 0, pg); App.page++; }
    if (op === 'dup') { const c = deepClone(p.pages[i]); c.id = uid('pg'); c.name = p.pages[i].name + ' Kopie'; c.elements.forEach(e => e.id = uid('el')); p.pages.splice(i + 1, 0, c); App.page = i + 1; }
    if (op === 'left' && i > 0) { [p.pages[i - 1], p.pages[i]] = [p.pages[i], p.pages[i - 1]]; App.page = i - 1; }
    if (op === 'right' && i < p.pages.length - 1) { [p.pages[i + 1], p.pages[i]] = [p.pages[i], p.pages[i + 1]]; App.page = i + 1; }
    if (op === 'del') {
      if (p.pages.length === 1) { toast('Ein Design braucht mindestens eine Seite.', 'info'); return; }
      if (!(await confirmDialog({ title: 'Seite löschen?', text: `„${p.pages[i].name}“ wird entfernt. Rückgängig ist möglich.`, ok: 'Löschen', danger: true }))) return;
      p.pages.splice(i, 1); App.page = Math.min(App.page, p.pages.length - 1);
    }
    App.sel = []; commit('pages'); this.refreshAll();
  },
};

/* helpers shared by panels */
function emptyState(ic, title, text, action) {
  const d = h('div', { class: 'empty' }, h('div', { class: 'ei', html: icon(ic, 'l') }), h('h4', null, title), h('p', null, text));
  if (action) d.appendChild(action); return d;
}
function graphicThumb(kind, size) {
  const c = makeCanvas(size * 2, size * 2); const ctx = c.getContext('2d'); ctx.scale(2, 2);
  const g = GRAPHICS[kind]; const el = mkGraphic(kind, size, size); el.w = Math.min(size * 0.86, size * 0.86 * (g.ar || 1)); el.h = el.w / (g.ar || 1); if (el.h > size * 0.86) { el.h = size * 0.86; el.w = el.h * (g.ar || 1); } el.x = (size - el.w) / 2; el.y = (size - el.h) / 2; el.id = 'thumb' + kind;
  if (kind === 'paper' || kind === 'note' || kind === 'polaroid') { ctx.fillStyle = '#E8DFD0'; ctx.fillRect(0, 0, size, size); }
  el.strokeW = Math.max(1.5, el.strokeW * 0.8);
  drawElement(ctx, el); c.style.width = size + 'px'; c.style.height = size + 'px'; return c;
}
const _fontLoaded = new Set();
function ensureFont(el) {
  const k = fontStr(el, 40); if (_fontLoaded.has(k) || !document.fonts || !document.fonts.load) return Promise.resolve();
  return document.fonts.load(k).then(() => { _fontLoaded.add(k); }).catch(() => { });
}
