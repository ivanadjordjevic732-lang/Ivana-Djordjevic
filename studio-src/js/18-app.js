/* ═══════════════════════════════════════════════════════════════════════
   MODULE: APP SHELL — navigation, top bar, theme, command bar (⌘K),
   shortcuts, preview mode, init & error safety.
   ═══════════════════════════════════════════════════════════════════════ */
const NAV = [
  { k: 'start', l: 'Start', i: 'home' }, { k: 'design', l: 'Design', i: 'design' }, { k: 'video', l: 'Video', i: 'video' },
  { k: 'autoedit', l: 'Auto Edit', i: 'wand' }, { k: 'captions', l: 'Captions', i: 'captions' }, { k: 'carousel', l: 'Karussell', i: 'carousel' },
  { k: 'media', l: 'Medien', i: 'media', sep: true }, { k: 'templates', l: 'Vorlagen', i: 'templates' }, { k: 'brand', l: 'Brand Kit', i: 'brand' }, { k: 'ai', l: 'KI Studio', i: 'ai' },
];
const Views = {};
function buildNav() {
  const nav = clear($('#nav'));
  NAV.forEach(n => { if (n.sep) nav.appendChild(h('div', { class: 'nav-sep' })); const b = h('button', { class: 'nav-btn', type: 'button', dataset: { view: n.k }, 'aria-label': n.l, onclick: () => showView(n.k) }); b.innerHTML = icon(n.i) + `<span>${n.l}</span>`; nav.appendChild(b); });
  const bn = clear($('#bottomnav'));
  [NAV[0], NAV[1], NAV[2], NAV[3], { k: 'more', l: 'Mehr', i: 'menu' }].forEach(n => { const b = h('button', { class: 'nav-btn', type: 'button', dataset: { view: n.k }, 'aria-label': n.l, onclick: () => n.k === 'more' ? openNavSheet() : showView(n.k) }); b.innerHTML = icon(n.i) + `<span>${n.l}</span>`; bn.appendChild(b); });
  $$('[data-go]').forEach(b => b.addEventListener('click', () => showView(b.dataset.go)));
}
function openNavSheet() {
  const g = h('div', { class: 'tile-grid three' });
  const m = modal({ title: 'Mindéa Creative Studio', content: [g, h('div', { class: 'hr' }), h('div', { class: 'row wrap' }, btn('Suchen', () => { m.close(); openCommandBar(); }, { cls: 'sm', icon: 'search' }), themeSeg(), App.project ? btn('Exportieren', () => { m.close(); openExport(); }, { cls: 'sm primary', icon: 'download' }) : null)] });
  NAV.forEach(n => { const b = h('button', { class: 'tile', type: 'button', style: { flexDirection: 'column', gap: '6px', padding: '14px 6px', minHeight: '84px', background: App.view === n.k ? 'var(--accent-soft)' : '' }, onclick: () => { m.close(); showView(n.k); } }); b.innerHTML = `<span style="color:var(--accent)">${icon(n.i)}</span><span style="font-size:12px">${n.l}</span>`; g.appendChild(b); });
}
function themeSeg() { return seg([{ v: 'light', icon: 'sun', aria: 'Hell', tip: 'Hell' }, { v: 'dark', icon: 'moon', aria: 'Dunkel', tip: 'Dunkel' }, { v: 'system', icon: 'monitor', aria: 'System', tip: 'System' }], App.settings.theme, v => setTheme(v)); }
function setTheme(t) {
  App.settings.theme = t; saveSettings();
  if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('mcs-theme', t); } catch (e) { }
  setTimeout(() => { if (App.view === 'video') Timeline.drawRuler(); }, 50);
}
function saveSettings() { DB.kvSet('settings', App.settings).catch(() => { }); }
async function loadSettings() { const s = await DB.kvGet('settings', null); if (s) Object.assign(App.settings, s); setTheme(App.settings.theme || 'system'); }

function buildTopbar() {
  const a = clear($('#tb-actions'));
  a.append(
    App.ui.undo = ibtn('undo', 'Rückgängig', () => History.undo(), { kbd: MOD + '+Z' }),
    App.ui.redo = ibtn('redo', 'Wiederholen', () => History.redo(), { kbd: MOD + '+⇧+Z' }),
    h('span', { class: 'hide-m', style: { width: '1px', height: '22px', background: 'var(--line)', margin: '0 4px' } }),
    (() => { const b = ibtn('search', 'Suchen & Befehle', () => openCommandBar(), { kbd: MOD + '+K' }); b.classList.add('hide-m'); return b; })(),
    App.ui.theme = ibtn('sun', 'Darstellung: Hell / Dunkel / System', () => popMenu(App.ui.theme, [{ label: 'Hell' + (App.settings.theme === 'light' ? ' ✓' : ''), icon: 'sun', fn: () => setTheme('light') }, { label: 'Dunkel' + (App.settings.theme === 'dark' ? ' ✓' : ''), icon: 'moon', fn: () => setTheme('dark') }, { label: 'System' + (App.settings.theme === 'system' ? ' ✓' : ''), icon: 'monitor', fn: () => setTheme('system') }])),
    App.ui.preview = (() => { const b = ibtn('eye', 'Vorschau-Modus', () => setPreview(true), { kbd: 'P' }); b.classList.add('hide-m'); return b; })(),
    App.ui.export = btn('Exportieren', () => openExport(), { cls: 'primary sm', icon: 'download' }),
  );
  const pn = $('#proj-name');
  pn.addEventListener('change', () => { const v = pn.value.trim(); if (App.project && v) { App.project.name = v; commit('rename'); Projects.list(); } else updateTopbar(); });
  pn.addEventListener('keydown', e => { if (e.key === 'Enter') pn.blur(); });
}
App.ui = {};
function updateTopbar() {
  const p = App.project; const pn = $('#proj-name'), vl = $('#view-label');
  const showName = p && ['design', 'video', 'captions'].includes(App.view) && ((App.view === 'design') === (p.type !== 'video') || App.view === 'captions');
  pn.style.display = showName ? '' : 'none'; vl.style.display = showName ? 'none' : '';
  if (p && document.activeElement !== pn) pn.value = p.name;
  vl.textContent = (NAV.find(n => n.k === App.view) || {}).l || '';
  if (App.ui.export) App.ui.export.style.display = showName ? '' : 'none';
  if (App.ui.preview) App.ui.preview.style.display = showName && App.view !== 'captions' ? '' : 'none';
  $('#save-status').style.display = p ? '' : 'none';
  updateUndoButtons();
}
function updateUndoButtons() { if (!App.ui.undo) return; App.ui.undo.disabled = !History.canUndo(); App.ui.redo.disabled = !History.canRedo(); }
function showView(name) {
  if (!Views[name]) return;
  const prev = App.view;
  if (prev !== name && Views[prev] && Views[prev].hide) Views[prev].hide();
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  App.view = name;
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  document.body.classList.toggle('in-editor', (name === 'design' && Design.active()) || (name === 'video' && VideoUI.active()));
  if (App.preview && name !== 'design' && name !== 'video') setPreview(false);
  updateTopbar();
  try { Views[name].show(); } catch (e) { console.error(e); toast(friendlyError(e), 'error'); }
  DB.kvSet('lastView', name).catch(() => { });
}
function setPreview(on) {
  App.preview = on; document.body.classList.toggle('preview-mode', on);
  if (on) { Design.select && App.view === 'design' && Design.endTextEdit(); toast('Vorschau-Modus · Esc zum Beenden', 'info', { duration: 1800 }); }
  setTimeout(() => { if (App.view === 'design') Design.layout(); if (App.view === 'video') VideoUI.layout(); }, 30);
}
$('#exit-preview') && $('#exit-preview').addEventListener('click', () => setPreview(false));

/* ── Command bar (⌘K) ────────────────────────────────────────────────── */
function commandList() {
  const L = [
    { g: 'Erstellen', l: 'Text hinzufügen', k: 'text überschrift', i: 'text', fn: () => { if (App.project && App.project.type !== 'video') { showView('design'); Design.addText('headline'); } else if (App.project && App.project.type === 'video') { showView('video'); VideoUI.addText(); } else createAndOpen({ type: 'design', formatKey: 'post45' }).then(() => Design.addText('headline')); } },
    { g: 'Erstellen', l: 'Reel erstellen', k: 'video instagram 9:16 neu', i: 'phone', fn: () => createAndOpen({ type: 'video', formatKey: 'reel', name: 'Instagram Reel' }) },
    { g: 'Erstellen', l: 'Auto Edit – Video automatisch bearbeiten', k: 'automatisch schnitt rohvideo', i: 'wand', fn: () => showView('autoedit') },
    { g: 'Erstellen', l: 'Karussell erstellen', k: 'carousel slides smart', i: 'carousel', fn: () => showView('carousel') },
    { g: 'Erstellen', l: 'Smart Creator', k: 'assistent wizard', i: 'wand', fn: () => smartCreator() },
    { g: 'Erstellen', l: 'Neuer Instagram Post (4:5)', k: 'design post', i: 'design', fn: () => createAndOpen({ type: 'design', formatKey: 'post45', name: 'Instagram Post' }) },
    { g: 'Erstellen', l: 'Neue Story (9:16)', k: 'design story', i: 'phone', fn: () => createAndOpen({ type: 'design', formatKey: 'story', name: 'Story' }) },
    { g: 'Erstellen', l: 'Neue Präsentation (16:9)', k: 'slides deck', i: 'present', fn: () => createAndOpen({ type: 'design', formatKey: 'present', name: 'Präsentation', pagesCount: 3 }) },
    { g: 'Projekt', l: 'Exportieren', k: 'export download png jpg mp4', i: 'download', fn: () => openExport() },
    { g: 'Projekt', l: 'Untertitel / Caption Studio', k: 'captions untertitel', i: 'captions', fn: () => showView('captions') },
    { g: 'Projekt', l: 'Magic Resize', k: 'format größe ändern', i: 'resize', fn: () => magicResizeDialog() },
    { g: 'Projekt', l: 'Karussell als Reel animieren', k: 'carousel reel video', i: 'video', fn: () => carouselToReel(App.project) },
    { g: 'Projekt', l: 'Vorschau-Modus', k: 'preview präsentieren', i: 'eye', fn: () => setPreview(true) },
    { g: 'Projekt', l: 'Rückgängig', k: 'undo', i: 'undo', fn: () => History.undo() }, { g: 'Projekt', l: 'Wiederholen', k: 'redo', i: 'redo', fn: () => History.redo() },
    { g: 'Navigation', l: 'Brand Kit', k: 'farben schriften logo', i: 'brand', fn: () => showView('brand') },
    { g: 'Navigation', l: 'Medien hochladen', k: 'upload import mediathek', i: 'upload', fn: async () => { showView('media'); await Media.import(await pickFiles('image/*,video/*,audio/*', true)); } },
    { g: 'Navigation', l: 'Vorlagen', k: 'templates', i: 'templates', fn: () => showView('templates') },
    { g: 'Navigation', l: 'KI Studio', k: 'ai caption hook script', i: 'ai', fn: () => showView('ai') },
    { g: 'Navigation', l: 'Start', k: 'dashboard home', i: 'home', fn: () => showView('start') },
    { g: 'Darstellung', l: 'Hell', k: 'theme light', i: 'sun', fn: () => setTheme('light') }, { g: 'Darstellung', l: 'Dunkel', k: 'theme dark', i: 'moon', fn: () => setTheme('dark') }, { g: 'Darstellung', l: 'System', k: 'theme auto', i: 'monitor', fn: () => setTheme('system') },
  ];
  Projects.cache.slice(0, 40).forEach(p => L.push({ g: 'Projekt öffnen', l: p.name, k: 'öffnen ' + (TYPE_LABEL[p.type] || '') + ' ' + fmtRel(p.updatedAt), i: p.type === 'video' ? 'video' : 'design', fn: () => Projects.open(p.id, p.type === 'video' ? 'video' : 'design'), sub: fmtRel(p.updatedAt) }));
  return L;
}
function openCommandBar() {
  if ($('.cmdk')) return;
  const all = commandList(); let idx = 0, list = all;
  const inp = h('input', { placeholder: 'Befehl oder Projekt suchen …', 'aria-label': 'Befehl suchen', autocomplete: 'off' });
  const box = h('div', { class: 'cmdk-list', role: 'listbox' });
  const ov = h('div', { class: 'cmdk', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Befehlsleiste' }, h('div', { class: 'cmdk-box' }, h('div', { class: 'cmdk-in' }, iconEl('search'), inp, h('span', { class: 'kbd' }, 'Esc')), box));
  const close = () => ov.remove();
  const run = it => { close(); setTimeout(() => it.fn(), 10); };
  const draw = () => {
    clear(box); let g = '';
    if (!list.length) box.appendChild(h('div', { class: 'cmdk-grp' }, 'Keine Treffer'));
    list.slice(0, 60).forEach((it, i) => { if (it.g !== g) { g = it.g; box.appendChild(h('div', { class: 'cmdk-grp' }, g)); } const b = h('button', { class: 'cmdk-item' + (i === idx ? ' on' : ''), type: 'button', role: 'option', 'aria-selected': i === idx, onclick: () => run(it), onmousemove: () => { if (idx !== i) { idx = i; draw(); } } }); b.innerHTML = icon(it.i, 's') + `<span>${escapeHtml(it.l)}</span>` + (it.sub ? `<span class="ck">${escapeHtml(it.sub)}</span>` : ''); box.appendChild(b); });
    box.querySelector('.cmdk-item.on')?.scrollIntoView({ block: 'nearest' });
  };
  inp.addEventListener('input', () => { const q = inp.value.trim().toLowerCase().normalize('NFC'); list = !q ? all : all.filter(it => (it.l + ' ' + it.k + ' ' + it.g).toLowerCase().includes(q) || q.split(' ').every(w => (it.l + ' ' + it.k).toLowerCase().includes(w))); idx = 0; draw(); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(list.length - 1, idx + 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (list[idx]) run(list[idx]); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  ov.addEventListener('pointerdown', e => { if (e.target === ov) close(); });
  document.body.appendChild(ov); draw(); setTimeout(() => inp.focus(), 20);
}

/* ── Global shortcuts ────────────────────────────────────────────────── */
function isTyping(e) { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
document.addEventListener('keydown', e => {
  const mod = e.metaKey || e.ctrlKey, k = e.key;
  if (mod && k.toLowerCase() === 'k') { e.preventDefault(); openCommandBar(); return; }
  if (mod && k.toLowerCase() === 's') { e.preventDefault(); saveNow().then(() => toast('Gespeichert · lokal', 'success', { duration: 1200 })); return; }
  if (k === 'Escape') {
    if ($('.menu')) { $$('.menu').forEach(m => m.remove()); return; }
    const top = ModalStack[ModalStack.length - 1]; if (top) { if (top.closable) top.close(); return; }
    if (App.preview) { setPreview(false); return; }
  }
  if (ModalStack.length || $('.cmdk')) return;
  if (isTyping(e)) return;
  if (mod && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? History.redo() : History.undo(); return; }
  if (mod && k.toLowerCase() === 'y') { e.preventDefault(); History.redo(); return; }
  if (k === ' ' && ['video', 'captions'].includes(App.view) || (k === ' ' && App.view === 'autoedit' && VE.override)) { e.preventDefault(); VE.toggle(); return; }
  if (!mod && k.toLowerCase() === 'p' && (App.view === 'design' || App.view === 'video') && App.project) { setPreview(!App.preview); return; }
  const v = Views[App.view];
  if (v && v.onKey && v.onKey(e)) e.preventDefault();
});

/* ── Error safety: never show stack traces to the user ───────────────── */
let _lastErr = 0;
function reportError(e) { console.error(e); if (Date.now() - _lastErr < 4000) return; _lastErr = Date.now(); toast(friendlyError(e && (e.reason || e.error || e)), 'error'); }
window.addEventListener('error', e => { if (e.message && /ResizeObserver/.test(e.message)) return; reportError(e.error || e.message); });
window.addEventListener('unhandledrejection', e => reportError(e.reason));

/* ── Init ────────────────────────────────────────────────────────────── */
async function init() {
  buildNav(); buildTopbar();
  let dbOk = true;
  try { await DB.open(); } catch (e) { dbOk = false; }
  await Promise.all([Brand.load(), AI.load(), loadSettings(), Media.load()].map(p => p.catch(() => { })));
  Object.assign(Views, { start: StartUI, design: Design, video: VideoUI, autoedit: AutoEditUI, captions: CaptionsUI, carousel: CarouselUI, media: MediaUI, templates: TemplatesUI, brand: BrandUI, ai: AIUI });
  StartUI.mount($('#view-start')); Design.mount($('#view-design')); VideoUI.mount($('#view-video')); AutoEditUI.mount($('#view-autoedit')); CaptionsUI.mount($('#view-captions'));
  CarouselUI.mount($('#view-carousel')); MediaUI.mount($('#view-media')); TemplatesUI.mount($('#view-templates')); BrandUI.mount($('#view-brand')); AIUI.mount($('#view-ai'));
  requestPersistentStorage();
  await Projects.list();
  const last = await DB.kvGet('lastProject', null);
  if (last) { const p = await DB.get('projects', last).catch(() => null); if (p) await setProject(p); }
  showView('start');
  if (!dbOk) toast('Lokaler Speicher ist nicht verfügbar (z. B. privater Modus). Änderungen können nicht gespeichert werden.', 'error', { duration: 12000 });
  if (document.fonts) Promise.all(['500 40px "Cormorant Garamond"', 'italic 500 40px "Cormorant Garamond"', '600 40px "Cormorant Garamond"', '400 40px "Jost"', '300 40px "Jost"', '500 40px "Jost"', '700 40px "Jost"', '500 40px "Playfair Display"', 'italic 500 40px "Playfair Display"'].map(f => document.fonts.load(f).catch(() => { }))).then(() => { _tplThumbCache.clear(); requestRender(); requestVRender(); if (App.view === 'templates') TemplatesUI.render(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(true); });
  window.addEventListener('pagehide', () => saveNow(true));
  window.addEventListener('beforeunload', () => { saveNow(true); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (App.view === 'video') Timeline.drawRuler(); });
}
init();
