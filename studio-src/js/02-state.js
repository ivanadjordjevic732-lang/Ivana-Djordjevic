/* ═══════════════════════════════════════════════════════════════════════
   MODULE: STATE — constants, project model, factories, history, autosave
   ═══════════════════════════════════════════════════════════════════════ */
const BRAND_COLORS = [
  { n: 'Warmschwarz', v: '#17130F' }, { n: 'Espresso', v: '#2A221A' }, { n: 'Ivory', v: '#F8F5F0' }, { n: 'Creme', v: '#F1E9DB' },
  { n: 'Sand', v: '#D9CDB8' }, { n: 'Gold', v: '#B08D57' }, { n: 'Hellgold', v: '#D9C393' }, { n: 'Weiß', v: '#FFFFFF' },
];
const C = { black: '#17130F', espresso: '#2A221A', ivory: '#F8F5F0', cream: '#F1E9DB', sand: '#D9CDB8', gold: '#B08D57', lightgold: '#D9C393', white: '#FFFFFF' };
const FONTS = ['Cormorant Garamond', 'Playfair Display', 'Jost', 'Georgia', 'Helvetica Neue'];
const FONT_HEAD = 'Cormorant Garamond', FONT_ALT = 'Playfair Display', FONT_BODY = 'Jost';

const FORMATS = {
  post45: { label: 'Instagram Post 4:5', short: '4:5', w: 1080, h: 1350, icon: 'design' },
  square: { label: 'Instagram Quadrat', short: '1:1', w: 1080, h: 1080, icon: 'square' },
  story: { label: 'Instagram Story', short: '9:16', w: 1080, h: 1920, icon: 'phone', safe: 'story' },
  reel: { label: 'Instagram Reel', short: '9:16', w: 1080, h: 1920, icon: 'phone', safe: 'reel' },
  tiktok: { label: 'TikTok', short: '9:16', w: 1080, h: 1920, icon: 'phone', safe: 'reel' },
  short: { label: 'YouTube Short', short: '9:16', w: 1080, h: 1920, icon: 'phone', safe: 'reel' },
  youtube: { label: 'YouTube', short: '16:9', w: 1920, h: 1080, icon: 'monitor' },
  pin: { label: 'Pinterest Pin', short: '2:3', w: 1000, h: 1500, icon: 'pin' },
  lipost: { label: 'LinkedIn Post', short: '1:1', w: 1200, h: 1200, icon: 'square' },
  liportrait: { label: 'LinkedIn Hochformat', short: '4:5', w: 1080, h: 1350, icon: 'design' },
  present: { label: 'Präsentation', short: '16:9', w: 1920, h: 1080, icon: 'present' },
  custom: { label: 'Freies Format', short: 'frei', w: 1080, h: 1080, icon: 'resize' },
};
function fmtOf(p) { return p ? p.format : FORMATS.post45; }

const App = {
  project: null, view: 'start', sel: [], page: 0, vsel: null, preview: false,
  settings: { theme: 'system', safeZones: true, snap: true },
};

/* ── Factories ───────────────────────────────────────────────────────── */
function newPage(name = 'Seite 1', bg = C.ivory) { return { id: uid('pg'), name, bg: { type: 'color', color: bg, color2: C.cream, angle: 160, mediaId: null, look: 'original', adj: {}, dim: 0 }, elements: [] }; }
const TEXT_ROLES = {
  headline: { label: 'Überschrift', font: FONT_HEAD, size: 0.085, weight: 500, lh: 1.05, ls: 0, text: 'Marken, die wirken,\nbevor sie erklären.' },
  subheadline: { label: 'Unterüberschrift', font: FONT_BODY, size: 0.03, weight: 400, lh: 1.25, ls: 0.22, upper: true, text: 'Mindéa Studio' },
  body: { label: 'Fließtext', font: FONT_BODY, size: 0.032, weight: 300, lh: 1.5, ls: 0, text: 'Ruhige, hochwertige Inhalte, die deiner Marke Raum geben – klar, warm und mit Haltung.' },
  quote: { label: 'Zitat', font: FONT_HEAD, size: 0.066, weight: 400, italic: true, lh: 1.15, ls: 0, text: '„Sichtbarkeit beginnt dort, wo Klarheit entsteht.“' },
  cta: { label: 'CTA', font: FONT_BODY, size: 0.026, weight: 500, lh: 1.2, ls: 0.24, upper: true, text: 'Jetzt Termin sichern', bg: true },
  wordmark: { label: 'Mindéa Wortmarke', font: FONT_HEAD, size: 0.05, weight: 600, lh: 1, ls: 0.32, upper: true, text: 'MINDÉA' },
  badge: { label: 'Badge', font: FONT_BODY, size: 0.022, weight: 500, lh: 1, ls: 0.2, upper: true, text: 'NEU' },
  number: { label: 'Zahl', font: FONT_HEAD, size: 0.22, weight: 400, lh: 1, ls: 0, text: '01' },
};
function mkText(role, W, H, o = {}) {
  const r = TEXT_ROLES[role] || TEXT_ROLES.body;
  const base = Math.min(W, H * 0.8);
  const size = Math.round((o.size || r.size * base * (W > H ? 0.75 : 1)));
  const w = o.w || Math.round(W * (role === 'cta' || role === 'badge' || role === 'wordmark' ? 0.6 : 0.8));
  const el = Object.assign({
    id: uid('el'), type: 'text', role, name: r.label, text: r.text,
    x: Math.round((W - w) / 2), y: Math.round(H * 0.4), w, h: size * 1.3, rot: 0, opacity: 1,
    font: r.font, size, weight: r.weight, italic: !!r.italic, transform: r.upper ? 'upper' : 'none', color: C.black,
    align: 'center', ls: r.ls, lh: r.lh, underline: false, strike: false,
    shadow: { on: false, color: '#000000', blur: 18, x: 0, y: 6, opacity: 0.35 },
    stroke: { on: false, color: C.black, w: 2 },
    bg: { on: !!r.bg, color: C.black, radius: 999, opacity: 1, pad: 0.9 },
    locked: false, hidden: false,
  }, o);
  if (role === 'cta' && !o.color) el.color = C.ivory;
  delete el.size_; return el;
}
const SHAPES = {
  rect: { label: 'Rechteck', icon: 'square' }, circle: { label: 'Kreis', icon: 'circle' }, line: { label: 'Linie', icon: 'line' },
  frame: { label: 'Rahmen', icon: 'frame' }, roundrect: { label: 'Abgerundet', icon: 'rounded' }, arrow: { label: 'Pfeil', icon: 'arrow' },
  chevron: { label: 'Chevron', icon: 'chevron' }, divider: { label: 'Divider', icon: 'divider' }, badge: { label: 'Badge', icon: 'badge' },
  callout: { label: 'Callout', icon: 'callout' },
};
function mkShape(shape, W, H, o = {}) {
  const s = Math.min(W, H);
  const dims = { rect: [0.4, 0.4], circle: [0.32, 0.32], line: [0.5, 0.01], frame: [0.7, 0.7], roundrect: [0.45, 0.32], arrow: [0.32, 0.06], chevron: [0.07, 0.1], divider: [0.5, 0.03], badge: [0.3, 0.07], callout: [0.5, 0.26] }[shape] || [0.3, 0.3];
  const w = Math.round(dims[0] * s), hh = Math.max(4, Math.round(dims[1] * s));
  const stroked = ['line', 'frame', 'arrow', 'chevron', 'divider'].includes(shape);
  return Object.assign({
    id: uid('el'), type: 'shape', shape, name: SHAPES[shape]?.label || (shape === 'scrim' ? 'Verlauf (Kontrast)' : 'Form'),
    x: Math.round((W - w) / 2), y: Math.round((H - hh) / 2), w, h: hh, rot: 0, opacity: 1,
    fill: stroked ? 'none' : (shape === 'badge' ? C.black : C.sand), stroke: stroked ? C.gold : 'none', strokeW: shape === 'frame' ? 3 : 3,
    radius: shape === 'roundrect' ? 36 : shape === 'callout' ? 22 : 0, text: shape === 'badge' ? 'NEU' : shape === 'callout' ? 'Notiz' : '', textColor: C.ivory,
    locked: false, hidden: false,
  }, o);
}
function mkImage(m, W, H, o = {}) {
  const ar = m && m.w && m.h ? m.w / m.h : 1;
  let w = W * 0.7, h = w / ar;
  if (h > H * 0.7) { h = H * 0.7; w = h * ar; }
  return Object.assign({
    id: uid('el'), type: 'image', name: m?.name ? m.name.replace(/\.[a-z0-9]+$/i, '') : 'Bild', mediaId: m ? m.id : null,
    x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w: Math.round(w), h: Math.round(h), rot: 0, opacity: 1,
    fit: 'fill', zoom: 1, ox: 0, oy: 0, flipX: false, flipY: false, radius: 0, look: 'original', adj: {},
    locked: false, hidden: false, alts: null,
  }, o);
}
function mkGraphic(kind, W, H, o = {}) {
  const g = GRAPHICS[kind] || GRAPHICS.sparkle;
  const s = Math.min(W, H) * (g.scale || 0.28);
  const w = Math.round(s * (g.ar || 1)), hh = Math.round(s);
  return Object.assign({
    id: uid('el'), type: 'graphic', kind, name: g.label,
    x: Math.round((W - w) / 2), y: Math.round((H - hh) / 2), w, h: hh, rot: 0, opacity: 1,
    color: g.color || C.gold, color2: C.cream, strokeW: g.sw || 3, index: 1, label: g.defLabel || '',
    locked: false, hidden: false,
  }, o);
}
function newVideoState() {
  return {
    main: [], items: [], captions: [],
    cap: { style: 'mindea', position: 'safe', y: 0.72, animation: 'fade', highlight: true, emphasis: true, size: 1, show: true, wordsPer: 4 },
    bg: C.black, fadeIn: 0, fadeOut: 0,
    audio: { ducking: true, duckLevel: 0.25, enhance: false, gate: false, normGain: 1 },
    transcript: null, autoEdit: null,
  };
}
function newClip(m, o = {}) {
  const isImg = m.kind === 'image';
  return Object.assign({
    id: uid('cl'), mediaId: m.id, kind: isImg ? 'image' : 'video', name: m.name,
    in: 0, out: isImg ? 4 : (m.duration || 5), speed: 1, volume: 1, muted: false,
    fit: 'fill', zoom: 1, x: 0, y: 0, rot: 0, flipX: false, flipY: false,
    look: 'original', adj: {}, fadeIn: 0, fadeOut: 0, aFadeIn: 0, aFadeOut: 0,
    trans: { type: 'none', dur: 0.5 }, zoomTo: null, reframe: null, auto: false,
  }, o);
}
function newItem(track, o = {}) {
  return Object.assign({ id: uid('it'), track, start: 0, dur: 3, name: '' }, o);
}

/* ── Project lifecycle ───────────────────────────────────────────────── */
const Projects = {
  cache: [],
  async list() {
    try { this.cache = (await DB.all('projects')).map(p => ({ id: p.id, name: p.name, type: p.type, format: p.format, createdAt: p.createdAt, updatedAt: p.updatedAt, thumb: p.thumb, duration: p.type === 'video' ? videoDuration(p) : 0, pages: (p.pages || []).length })); }
    catch (e) { toast(friendlyError(e, 'Projekte laden'), 'error'); this.cache = []; }
    this.cache.sort((a, b) => b.updatedAt - a.updatedAt);
    return this.cache;
  },
  create({ type = 'design', formatKey = 'post45', w, h, name, pages, video } = {}) {
    const f = Object.assign({ key: formatKey }, FORMATS[formatKey] || FORMATS.post45);
    if (w && h) { f.w = Math.round(w); f.h = Math.round(h); }
    const now = Date.now();
    const p = {
      id: uid('pr'), name: name || (type === 'video' ? 'Neues Video' : type === 'carousel' ? 'Neues Karussell' : 'Neues Design'),
      type, createdAt: now, updatedAt: now, format: { key: f.key, label: f.label, w: f.w, h: f.h, safe: f.safe || null },
      pages: pages || (type === 'video' ? [] : [newPage('Seite 1')]),
      video: type === 'video' ? (video || newVideoState()) : null, thumb: null, v: 1,
    };
    return p;
  },
  async open(id, view) {
    const p = await DB.get('projects', id);
    if (!p) { toast('Projekt nicht gefunden.', 'error'); return; }
    await setProject(p, view);
  },
  async duplicate(id) {
    const p = await DB.get('projects', id); if (!p) return;
    const c = deepClone(p); c.id = uid('pr'); c.name = p.name + ' (Kopie)'; c.createdAt = c.updatedAt = Date.now();
    await this.put(c); await this.list(); Bus.emit('projects');
    toast('Projekt dupliziert.', 'success');
  },
  async rename(id, name) {
    const p = id === App.project?.id ? App.project : await DB.get('projects', id); if (!p) return;
    p.name = name; p.updatedAt = Date.now(); await this.put(p);
    if (App.project && App.project.id === id) { App.project.name = name; updateTopbar(); }
    await this.list(); Bus.emit('projects');
  },
  async remove(id) {
    await DB.del('projects', id);
    if (App.project && App.project.id === id) { App.project = null; History.reset(); updateTopbar(); Bus.emit('project'); }
    await this.list(); Bus.emit('projects');
  },
  async put(p) {
    try { await DB.put('projects', p); return true; }
    catch (e) { setSaveStatus('error'); toast(friendlyError(e, 'Speichern'), 'error', { duration: 9000 }); return false; }
  },
};
function videoDuration(p) {
  if (!p || !p.video) return 0;
  const lay = mainLayout(p.video.main);
  let d = lay.length ? lay[lay.length - 1].end : 0;
  for (const it of p.video.items) d = Math.max(d, it.start + it.dur);
  for (const c of p.video.captions) d = Math.max(d, c.end);
  return d;
}
/** Sequential (magnetic) layout of the main track, including overlapping transitions. */
function mainLayout(main) {
  const out = []; let t = 0;
  for (let i = 0; i < main.length; i++) {
    const c = main[i];
    const dur = Math.max(0.05, (c.out - c.in) / (c.speed || 1));
    let td = 0;
    if (i > 0 && c.trans && c.trans.type !== 'none') td = Math.min(c.trans.dur, dur / 2, out[i - 1].dur / 2);
    const start = Math.max(0, t - td);
    out.push({ clip: c, idx: i, start, end: start + dur, dur, td });
    t = start + dur;
  }
  return out;
}

async function setProject(p, view) {
  if (App.project && App.project.id !== p.id) await saveNow();
  // migrate/normalize
  if (p.type === 'video' && !p.video) p.video = newVideoState();
  if (p.video) { const d = newVideoState(); p.video.cap = Object.assign(d.cap, p.video.cap || {}); p.video.audio = Object.assign(d.audio, p.video.audio || {}); p.video.items = p.video.items || []; p.video.captions = p.video.captions || []; }
  p.pages = p.pages || [];
  App.project = p; App.sel = []; App.page = 0; App.vsel = null;
  History.reset();
  try { await DB.kvSet('lastProject', p.id); } catch (e) { }
  updateTopbar();
  Bus.emit('project');
  if (view) showView(view);
}

/* ── History (Undo/Redo, 100 steps) ──────────────────────────────────── */
const History = {
  stack: [], idx: -1, max: 100,
  snap() { const p = App.project; if (!p) return null; const { thumb, ...rest } = p; return JSON.stringify(rest); },
  reset() { this.stack = []; this.idx = -1; const s = this.snap(); if (s) { this.stack.push(s); this.idx = 0; } updateUndoButtons(); },
  commit(label) {
    if (!App.project) return;
    const s = this.snap();
    if (this.stack[this.idx] === s) return;
    this.stack = this.stack.slice(0, this.idx + 1);
    this.stack.push(s);
    if (this.stack.length > this.max) this.stack.shift();
    this.idx = this.stack.length - 1;
    App.project.updatedAt = Date.now();
    scheduleSave();
    updateUndoButtons();
    Bus.emit('commit', label);
  },
  canUndo() { return this.idx > 0; }, canRedo() { return this.idx < this.stack.length - 1; },
  undo() { if (!this.canUndo()) return; this.idx--; this.apply(); toast('Rückgängig', 'info', { duration: 1100 }); },
  redo() { if (!this.canRedo()) return; this.idx++; this.apply(); toast('Wiederholt', 'info', { duration: 1100 }); },
  apply() {
    const thumb = App.project.thumb;
    App.project = JSON.parse(this.stack[this.idx]); App.project.thumb = thumb; App.project.updatedAt = Date.now();
    App.sel = App.sel.filter(id => findEl(id)); if (App.page >= App.project.pages.length) App.page = Math.max(0, App.project.pages.length - 1);
    scheduleSave(); updateUndoButtons(); updateTopbar(); Bus.emit('restore');
  },
};
/** Commit a change: everything that mutates App.project calls this once the gesture ends. */
function commit(label) { History.commit(label); }

/* ── Autosave ────────────────────────────────────────────────────────── */
let _saveTimer = null, _thumbTimer = null, _saving = false;
function setSaveStatus(state) {
  const el = $('#save-status'); if (!el) return;
  el.classList.toggle('saving', state === 'saving'); el.classList.toggle('error', state === 'error');
  el.querySelector('.txt').textContent = state === 'saving' ? 'Speichert …' : state === 'error' ? 'Nicht gespeichert' : 'Gespeichert · lokal';
  el.title = state === 'error' ? 'Speichern fehlgeschlagen – siehe Meldung' : 'Alle Daten bleiben lokal in diesem Browser';
}
function scheduleSave() {
  setSaveStatus('saving');
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(saveNow, 700);
  clearTimeout(_thumbTimer);
  _thumbTimer = setTimeout(() => updateThumb().then(() => saveNow(true)), 2500);
}
async function saveNow(silent) {
  clearTimeout(_saveTimer);
  const p = App.project; if (!p) return;
  if (_saving) { _saveTimer = setTimeout(saveNow, 300); return; }
  _saving = true;
  const ok = await Projects.put(p);
  _saving = false;
  if (ok) { setSaveStatus('saved'); if (!silent) Bus.emit('saved'); }
}
async function updateThumb() {
  const p = App.project; if (!p) return;
  try { p.thumb = await makeProjectThumb(p, 360); } catch (e) { /* thumbnails are optional */ }
}

/* ── Element lookup helpers ──────────────────────────────────────────── */
function curPage() { const p = App.project; return p && p.pages[App.page]; }
function findEl(id) { const pg = curPage(); return pg ? pg.elements.find(e => e.id === id) : null; }
function selEls() { return App.sel.map(findEl).filter(Boolean); }
function findVItem(id) {
  const v = App.project && App.project.video; if (!v || !id) return null;
  return v.main.find(c => c.id === id) || v.items.find(i => i.id === id) || v.captions.find(c => c.id === id) || null;
}
function vItemTrack(it) { if (!it) return null; if (it.track) return it.track; if ('text' in it && 'start' in it && 'end' in it) return 'captions'; return 'main'; }
