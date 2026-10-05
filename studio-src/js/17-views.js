/* ═══════════════════════════════════════════════════════════════════════
   MODULE: VIEWS — Dashboard, Media library, Templates, Brand Kit,
   shared pickers.
   ═══════════════════════════════════════════════════════════════════════ */
function recentProjectsBlock(filter, title = 'Letzte Projekte', view) {
  const wrap = h('div');
  const list = Projects.cache.filter(filter || (() => true));
  wrap.appendChild(h('div', { class: 'sec-h' }, h('h2', { class: 'h2' }, title), h('span', { class: 'small muted' }, list.length ? list.length + ' Projekt' + (list.length > 1 ? 'e' : '') : '')));
  if (!list.length) { wrap.appendChild(emptyState('folder', 'Noch keine Projekte', 'Alles, was du erstellst, wird automatisch lokal gespeichert und erscheint hier.')); return wrap; }
  const g = h('div', { class: 'proj-grid' });
  list.forEach(p => g.appendChild(projectCard(p, view)));
  wrap.appendChild(g); return wrap;
}
const TYPE_LABEL = { design: 'Design', video: 'Video', carousel: 'Karussell' };
function projectCard(p, view) {
  const open = () => Projects.open(p.id, view || (p.type === 'video' ? 'video' : 'design'));
  const card = h('div', { class: 'pcard', role: 'button', tabindex: '0', 'aria-label': `${p.name} öffnen`, onclick: open, onkeydown: e => { if (e.key === 'Enter') open(); } });
  const th = h('div', { class: 'pthumb' });
  if (p.thumb) th.appendChild(h('img', { src: p.thumb, alt: '', loading: 'lazy' })); else th.innerHTML = icon(p.type === 'video' ? 'video' : 'design', 'l');
  if (p.type === 'video' && p.duration) th.appendChild(h('span', { class: 'dur' }, fmtTime(p.duration, false)));
  const more = ibtn('more', 'Projektmenü', e => { e.stopPropagation(); popMenu(more, [
    { label: 'Öffnen', icon: 'chevR', fn: open }, { label: 'Duplizieren', icon: 'copy', fn: () => Projects.duplicate(p.id) },
    { label: 'Umbenennen', icon: 'pen', fn: async () => { const n = await promptDialog({ title: 'Projekt umbenennen', label: 'Name', value: p.name }); if (n) Projects.rename(p.id, n); } },
    '-', { label: 'Löschen', icon: 'trash', danger: true, fn: async () => { if (await confirmDialog({ title: 'Projekt löschen?', text: `„${p.name}“ wird endgültig gelöscht. Deine Medien in der Mediathek bleiben erhalten.`, ok: 'Löschen', danger: true })) { await Projects.remove(p.id); toast('Projekt gelöscht', 'success'); } } }]); });
  card.append(th, h('div', { class: 'pmeta' }, h('div', { class: 'grow' }, h('div', { class: 'pn' }, p.name), h('div', { class: 'ps' }, `${TYPE_LABEL[p.type] || p.type} · ${p.format.w}×${p.format.h}${p.pages > 1 ? ' · ' + p.pages + ' Seiten' : ''}`), h('div', { class: 'ps' }, 'Bearbeitet ' + fmtRel(p.updatedAt))), more));
  return card;
}
async function createAndOpen(opts, view) {
  const p = Projects.create(opts);
  if (opts.template) { const t = TEMPLATES.find(x => x.id === opts.template); if (t) p.pages = [buildTemplatePage(t, p.format)]; }
  if (opts.pagesCount) { while (p.pages.length < opts.pagesCount) p.pages.push(newPage('Seite ' + (p.pages.length + 1))); }
  await Projects.put(p); await Projects.list(); await setProject(p, view || (p.type === 'video' ? 'video' : 'design'));
  return p;
}
async function customFormatDialog(type = 'design') {
  const w = h('input', { class: 'input', type: 'number', value: 1080, min: 100, max: 4096, 'aria-label': 'Breite' }), hh = h('input', { class: 'input', type: 'number', value: 1080, min: 100, max: 4096, 'aria-label': 'Höhe' });
  const t = selectEl([{ v: 'design', l: 'Design' }, { v: 'video', l: 'Video' }], type, () => { });
  modal({ title: 'Freies Format', icon: 'resize', content: [h('div', { class: 'grid2' }, field('Breite (px)', w), field('Höhe (px)', hh)), field('Typ', t)], actions: [{ label: 'Abbrechen' }, { label: 'Erstellen', primary: true, onClick: () => createAndOpen({ type: t.value, formatKey: 'custom', w: clamp(+w.value, 100, 4096), h: clamp(+hh.value, 100, 4096), name: `Freies Format ${w.value}×${hh.value}` }) }] });
}

/* ── Dashboard ───────────────────────────────────────────────────────── */
const QUICK = [
  { l: 'Reel automatisch bearbeiten', s: 'Auto Edit', i: 'wand', fn: () => showView('autoedit') },
  { l: 'Instagram Reel', s: '1080 × 1920', i: 'phone', fn: () => createAndOpen({ type: 'video', formatKey: 'reel', name: 'Instagram Reel' }) },
  { l: 'Instagram Post', s: '1080 × 1350', i: 'design', fn: () => createAndOpen({ type: 'design', formatKey: 'post45', name: 'Instagram Post' }) },
  { l: 'Story', s: '1080 × 1920', i: 'phone', fn: () => createAndOpen({ type: 'design', formatKey: 'story', name: 'Story' }) },
  { l: 'Karussell automatisch erstellen', s: 'Smart Carousel', i: 'carousel', fn: () => showView('carousel') },
  { l: 'Reel Cover', s: '1080 × 1920', i: 'image', fn: () => createAndOpen({ type: 'design', formatKey: 'reel', name: 'Reel Cover', template: 'reel-cover' }) },
  { l: 'Markenfilm', s: 'Video 9:16 mit Abspann', i: 'film', fn: () => createBrandFilm() },
  { l: 'YouTube Short', s: '1080 × 1920', i: 'video', fn: () => createAndOpen({ type: 'video', formatKey: 'short', name: 'YouTube Short' }) },
  { l: 'TikTok Video', s: '1080 × 1920', i: 'video', fn: () => createAndOpen({ type: 'video', formatKey: 'tiktok', name: 'TikTok Video' }) },
  { l: 'Pinterest Pin', s: '1000 × 1500', i: 'pin', fn: () => createAndOpen({ type: 'design', formatKey: 'pin', name: 'Pinterest Pin' }) },
  { l: 'Präsentation', s: '1920 × 1080', i: 'present', fn: () => createAndOpen({ type: 'design', formatKey: 'present', name: 'Präsentation', pagesCount: 3 }) },
  { l: 'Freies Format', s: 'Eigene Maße', i: 'resize', fn: () => customFormatDialog() },
];
async function createBrandFilm() {
  const p = Projects.create({ type: 'video', formatKey: 'reel', name: 'Markenfilm' });
  const f = p.format; const t = mkText('wordmark', f.w, f.h, { text: 'MINDÉA', color: C.ivory, size: Math.round(f.w * 0.08) }); t.h = textMetrics(t).h; t.y = Math.round(f.h * 0.44);
  const tg = mkText('quote', f.w, f.h, { text: Brand.data.tagline, color: C.sand, size: Math.round(f.w * 0.04) }); tg.h = textMetrics(tg).h; tg.y = Math.round(f.h * 0.53);
  p.video.items.push(newItem('text', { start: 0, dur: 3.5, el: t, anim: 'fade', name: 'Abspann – Wortmarke' }), newItem('text', { start: 0.6, dur: 2.9, el: tg, anim: 'slideUp', name: 'Abspann – Claim' }));
  p.video.fadeOut = 0.8;
  await Projects.put(p); await setProject(p, 'video');
  toast('Füge über „Clips“ deine Aufnahmen hinzu – der Abspann lässt sich ans Ende verschieben.', 'info', { duration: 5000 });
}
const StartUI = {
  mount(root) { this.sc = h('div', { class: 'scroll', style: { flex: 1 } }); root.appendChild(this.sc); Bus.on('projects', () => { if (App.view === 'start') this.render(); }); },
  async show() { await Projects.list(); this.render(); },
  render() {
    const sc = clear(this.sc); const w = h('div', { class: 'page' }); sc.appendChild(w);
    const hr = new Date().getHours(); const greet = hr < 11 ? 'Guten Morgen' : hr < 18 ? 'Schön, dass du da bist' : 'Guten Abend';
    w.appendChild(h('div', { class: 'hero' }, h('div', null, h('div', { class: 'eyebrow' }, greet + ' · ' + new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })), h('h1', { class: 'h1' }, 'Was möchtest du heute ', h('em', null, 'erstellen'), '?')),
      h('div', { class: 'row wrap' }, btn('Smart Creator', () => smartCreator(), { cls: 'primary', icon: 'wand' }), btn('Suchen', () => openCommandBar(), { cls: 'ghost', icon: 'search', tip: 'Befehle & Projekte|' + MOD + '+K' }))));
    const deco = '<svg class="fdeco" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1"><circle cx="100" cy="100" r="80"/><circle cx="100" cy="100" r="55"/><path d="M20 100h160M100 20v160"/></svg>';
    const f1 = h('button', { class: 'feature dark', type: 'button', onclick: () => showView('autoedit') }); f1.innerHTML = `<div><span class="badge" style="background:rgba(217,195,147,.15);color:#D9C393">${icon('wand', 's')} Auto Edit</span><div class="ft">Rohvideo hochladen.<br><em style="color:#D9C393">Fast fertig</em> zurückbekommen.</div><div class="muted small">Pausen, Untertitel, Zooms, B-Roll, Farbe, Ton.</div></div>${deco}`;
    const f2 = h('button', { class: 'feature', type: 'button', onclick: () => showView('carousel') }); f2.innerHTML = `<div><span class="badge">${icon('carousel', 's')} Smart Carousel</span><div class="ft">Text rein – Karussell mit <em style="color:var(--accent)">deinen</em> Bildern raus.</div><div class="muted small">Kernaussagen, Layout, Bildauswahl, CTA.</div></div>${deco}`;
    w.appendChild(h('div', { class: 'feature-row' }, f1, f2));
    const g = h('div', { class: 'qa-grid' });
    QUICK.forEach(q => { const b = h('button', { class: 'qa', type: 'button', onclick: q.fn }); b.innerHTML = `<span class="qi">${icon(q.i)}</span><div><b>${escapeHtml(q.l)}</b><span>${escapeHtml(q.s)}</span></div>`; g.appendChild(b); });
    w.appendChild(g);
    w.appendChild(recentProjectsBlock());
    const foot = h('div', { class: 'row wrap small muted', style: { marginTop: '28px', gap: '14px' } }, h('span', { class: 'row', html: icon('shield', 's') + ' Alles bleibt lokal in diesem Browser' }));
    storageEstimate().then(e => { if (e && e.usage != null) foot.appendChild(h('span', null, `Belegt: ${fmtBytes(e.usage)}${e.quota ? ' von ca. ' + fmtBytes(e.quota) : ''}`)); });
    w.appendChild(foot);
  },
};

/* ── Media library ───────────────────────────────────────────────────── */
const MediaUI = {
  tab: 'all', q: '', tag: '', sel: new Set(),
  mount(root) {
    this.root = root; this.sc = h('div', { class: 'scroll', style: { flex: 1 } }); root.appendChild(this.sc);
    Bus.on('media', () => { if (App.view === 'media') this.renderGrid(); });
    root.addEventListener('dragover', e => { if (App.view === 'media') e.preventDefault(); });
    root.addEventListener('drop', async e => { e.preventDefault(); await Media.import(e.dataTransfer.files, this.tab === 'brand' ? {} : {}); });
  },
  show() { this.render(); },
  render() {
    const sc = clear(this.sc); const w = h('div', { class: 'page' }); sc.appendChild(w);
    w.appendChild(h('div', { class: 'hero' }, h('div', null, h('div', { class: 'eyebrow' }, 'Medienbibliothek'), h('h1', { class: 'h1' }, 'Deine Bilder. ', h('em', null, 'Dein'), ' Material.'), h('p', { class: 'lead' }, 'Einmal importiert, dauerhaft lokal katalogisiert. Mindéa greift nur auf Dateien zu, die du hier freigibst – nie auf deine komplette Fotobibliothek.')),
      h('div', { class: 'row wrap' }, btn('Hochladen', async () => { await Media.import(await pickFiles('image/*,video/*,audio/*', true)); }, { cls: 'primary', icon: 'upload' }), btn('Ordner freigeben', () => this.importFolder(), { icon: 'folder', tip: 'Alle Medien eines Ordners importieren; Ordnernamen werden zu Tags' }))));
    const tabs = h('div', { class: 'tabs', role: 'tablist' });
    [['all', 'Alle'], ['image', 'Bilder'], ['video', 'Videos'], ['audio', 'Audio'], ['brand', 'Brand Assets'], ['fav', 'Favoriten']].forEach(([k, l]) => tabs.appendChild(h('button', { class: 'tab' + (this.tab === k ? ' on' : ''), role: 'tab', type: 'button', 'aria-selected': this.tab === k, onclick: () => { this.tab = k; this.render(); } }, l)));
    w.appendChild(tabs);
    const search = h('input', { class: 'input', placeholder: 'Suchen nach Name oder Tag …', value: this.q, 'aria-label': 'Medien suchen', style: { maxWidth: '360px' } });
    search.addEventListener('input', debounce(() => { this.q = search.value.trim().toLowerCase(); this.renderGrid(); }, 150));
    const counts = new Map(); Media.list.forEach(m => [...(m.tags || []), ...(m.aiTags || [])].forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
    const topTags = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 14);
    const tagRow = h('div', { class: 'chips', style: { margin: '10px 0 16px' } }, topTags.map(([t, n]) => chip(tagLabel(t) + ' · ' + n, this.tag === t, () => { this.tag = this.tag === t ? '' : t; this.render(); })));
    const untagged = Media.list.filter(m => m.kind !== 'audio' && !(m.tags || []).length && !(m.aiTags || []).length).length;
    w.append(h('div', { class: 'row wrap', style: { justifyContent: 'space-between' } }, search, untagged ? btn(AI.connected() ? `${untagged} ungetaggte Medien per KI analysieren` : `${untagged} Medien ohne Tags`, () => AI.connected() ? this.aiTag(Media.list.filter(m => m.kind !== 'audio' && !(m.tags || []).length && !(m.aiTags || []).length).map(m => m.id)) : toast('Tagge Medien manuell (auswählen › Tags) oder verbinde die KI für automatische Bildanalyse.', 'info', { duration: 6000 }), { cls: 'sm ghost', icon: 'ai' }) : null), topTags.length ? tagRow : h('div', { style: { height: '14px' } }));
    this.gridBox = h('div'); w.appendChild(this.gridBox);
    this.renderGrid();
  },
  items() {
    let l = Media.list;
    if (this.tab === 'fav') l = l.filter(m => m.favorite); else if (this.tab === 'brand') l = l.filter(m => m.brandRole); else if (this.tab !== 'all') l = l.filter(m => m.kind === this.tab);
    if (this.tag) l = l.filter(m => (m.tags || []).includes(this.tag) || (m.aiTags || []).includes(this.tag));
    if (this.q) l = l.filter(m => (m.name + ' ' + (m.desc || '') + ' ' + [...(m.tags || []), ...(m.aiTags || []), ...(m.moods || [])].map(t => t + ' ' + tagLabel(t)).join(' ')).toLowerCase().includes(this.q));
    return l;
  },
  renderGrid() {
    if (!this.gridBox) return; const box = clear(this.gridBox); const items = this.items();
    this.sel = new Set(Array.from(this.sel).filter(id => Media.get(id)));
    if (!items.length) { box.appendChild(emptyState('media', Media.list.length ? 'Keine Treffer' : 'Deine Mediathek ist leer', Media.list.length ? 'Ändere Suche oder Filter.' : 'Lade Bilder, Videos und Musik hoch oder gib einen Ordner frei. Tipp: Dateinamen wie „laptop-workspace.jpg“ werden automatisch zu Tags.', Media.list.length ? null : btn('Medien hochladen', async () => { await Media.import(await pickFiles('image/*,video/*,audio/*', true)); }, { cls: 'primary', icon: 'upload' }))); return; }
    const g = h('div', { class: 'media-grid' });
    items.forEach(m => {
      const card = h('div', { class: 'mcard' + (this.sel.has(m.id) ? ' sel' : ''), role: 'button', tabindex: '0', 'aria-label': m.name });
      const chk = h('button', { class: 'check', type: 'button', 'aria-label': 'Auswählen', 'aria-pressed': this.sel.has(m.id), html: icon('check', 's'), onclick: e => { e.stopPropagation(); this.sel.has(m.id) ? this.sel.delete(m.id) : this.sel.add(m.id); card.classList.toggle('sel'); this.renderBatch(); } });
      const fav = h('button', { class: 'favb' + (m.favorite ? ' on' : ''), type: 'button', 'aria-label': m.favorite ? 'Favorit entfernen' : 'Als Favorit markieren', html: icon(m.favorite ? 'heartF' : 'heart', 's'), onclick: e => { e.stopPropagation(); Media.update(m.id, { favorite: !m.favorite }); } });
      const th = h('div', { class: 'mth' });
      if (m.thumb) th.appendChild(h('img', { src: Media.thumbURL(m), alt: '', loading: 'lazy' })); else th.innerHTML = icon(m.kind === 'audio' ? 'music' : 'file', 'l');
      if (m.duration) th.appendChild(h('span', { class: 'dur' }, (m.kind === 'video' ? '▶ ' : '♪ ') + fmtTime(m.duration, false)));
      const tags = [...(m.tags || []), ...(m.aiTags || [])].slice(0, 3);
      card.append(chk, fav, th, h('div', { class: 'mi' }, h('div', { class: 'mn' }, m.name), h('div', { class: 'mt' }, (m.kind === 'audio' ? (m.moods || []) : tags).map(t => h('span', null, tagLabel(t))), m.brandRole ? h('span', null, BRAND_ASSETS.find(a => a.k === m.brandRole)?.l) : null)));
      card.addEventListener('click', () => { if (this.sel.size) { chk.click(); return; } this.detail(m); });
      card.addEventListener('keydown', e => { if (e.key === 'Enter') this.detail(m); if (e.key === ' ') { e.preventDefault(); chk.click(); } });
      g.appendChild(card);
    });
    box.appendChild(g);
    this.batch = h('div'); box.appendChild(this.batch); this.renderBatch();
  },
  renderBatch() {
    const b = clear(this.batch); if (!this.sel.size) return;
    const ids = Array.from(this.sel);
    b.appendChild(h('div', { class: 'batchbar' }, h('span', { style: { marginRight: '6px' } }, ids.length + ' ausgewählt'),
      btn('Tags', () => this.batchTags(ids), { cls: 'sm', icon: 'tag' }), btn('Favorit', () => { ids.forEach(id => Media.update(id, { favorite: true })); }, { cls: 'sm', icon: 'heart' }),
      btn(AI.connected() ? 'KI-Analyse' : 'KI (Verbindung nötig)', () => this.aiTag(ids), { cls: 'sm', icon: 'ai' }),
      btn('Löschen', async () => { if (await confirmDialog({ title: ids.length + ' Medien löschen?', text: 'Die Dateien werden aus der lokalen Mediathek entfernt. Projekte, die sie nutzen, zeigen dann einen Platzhalter.', ok: 'Löschen', danger: true })) { for (const id of ids) await Media.remove(id); this.sel.clear(); toast('Gelöscht', 'success'); } }, { cls: 'sm' }),
      h('span', { class: 'grow' }), btn('Alle', () => { this.items().forEach(m => this.sel.add(m.id)); this.renderGrid(); }, { cls: 'sm' }), btn('Abwählen', () => { this.sel.clear(); this.renderGrid(); }, { cls: 'sm' })));
  },
  async aiTag(ids) {
    if (!AI.requireConnection()) return;
    const prog = h('div', { class: 'progress', style: { height: '6px' } }, h('div', { style: { width: '0%' } })); const lbl = h('div', { class: 'small muted', style: { marginTop: '8px' } }, 'Starte …');
    const m = modal({ title: 'KI-Bildanalyse', icon: 'ai', content: [h('p', { class: 'muted', style: { marginTop: 0 } }, 'Erkennt Inhalte (z. B. Portrait, Laptop, Schmuck) und freie Textflächen für Smart Matching.'), prog, lbl] });
    const n = await AI.tagImages(ids, (d, t, name) => { prog.firstChild.style.width = (t ? d / t * 100 : 0) + '%'; lbl.textContent = name ? `${d} / ${t} · ${name}` : `${d} von ${t} analysiert`; });
    setTimeout(() => m.close(), 600); if (n) toast(n + ' Medien analysiert und getaggt', 'success');
  },
  async importFolder() {
    if ('showDirectoryPicker' in window) {
      try {
        const dir = await window.showDirectoryPicker({ id: 'mindea-media' }); const files = [];
        const walk = async (d, path) => { for await (const [name, hnd] of d.entries()) { if (hnd.kind === 'file') { const f = await hnd.getFile(); if (Media.kindOf(f)) { Object.defineProperty(f, 'webkitRelativePath', { value: path + '/' + name }); files.push(f); } } else if (files.length < 2000) await walk(hnd, path + '/' + name); } };
        await walk(dir, dir.name);
        if (!files.length) { toast('Keine unterstützten Medien im Ordner gefunden.', 'info'); return; }
        if (files.length > 150 && !(await confirmDialog({ title: files.length + ' Dateien importieren?', text: 'Große Mengen können eine Weile dauern und Speicher belegen. Bilder werden auf max. 2560 px verkleinert.', ok: 'Importieren' }))) return;
        await Media.import(files); return;
      } catch (e) { if (e.name === 'AbortError') return; }
    }
    const files = await pickFiles('image/*,video/*,audio/*', true, { folder: true });
    if (files.length) await Media.import(files.filter(f => Media.kindOf(f)));
  },
  async batchTags(ids) {
    const sel = new Set(); const box = h('div', { class: 'chips' });
    const draw = () => { clear(box); Object.keys(TAGS).forEach(t => box.appendChild(chip(TAGS[t], sel.has(t), () => { sel.has(t) ? sel.delete(t) : sel.add(t); draw(); }))); };
    draw();
    const custom = h('input', { class: 'input', placeholder: 'Eigene Tags, mit Komma getrennt', 'aria-label': 'Eigene Tags' });
    modal({ title: `Tags für ${ids.length} Medien`, icon: 'tag', cls: 'wide', content: [box, h('div', { style: { height: '12px' } }), custom], actions: [{ label: 'Abbrechen' }, { label: 'Tags hinzufügen', primary: true, onClick: async () => {
      const add = [...sel, ...custom.value.split(',').map(x => x.trim().toLowerCase()).filter(Boolean)];
      for (const id of ids) { const m = Media.get(id); await Media.update(id, { tags: Array.from(new Set([...(m.tags || []), ...add])) }); }
      toast('Tags gespeichert', 'success');
    } }] });
  },
  detail(m) {
    const body = h('div', { class: 'two-col' });
    const pv = h('div', { style: { background: 'var(--surface3)', borderRadius: '14px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '220px' } });
    Media.url(m.id).then(u => { if (m.kind === 'image') pv.appendChild(h('img', { src: u, alt: m.name, style: { maxWidth: '100%', maxHeight: '420px', display: 'block' } })); else if (m.kind === 'video') pv.appendChild(h('video', { src: u, controls: true, playsinline: true, style: { maxWidth: '100%', maxHeight: '420px' } })); else pv.appendChild(h('audio', { src: u, controls: true, style: { width: '90%' } })); }).catch(() => pv.appendChild(h('p', { class: 'muted' }, 'Datei nicht verfügbar')));
    const name = h('input', { class: 'input', value: m.name, 'aria-label': 'Dateiname' }); name.onchange = () => Media.update(m.id, { name: name.value.trim() || m.name });
    const tagBox = h('div', { class: 'chips' });
    const drawTags = () => { clear(tagBox); (m.tags || []).forEach(t => tagBox.appendChild(h('span', { class: 'tagchip' }, tagLabel(t), h('button', { type: 'button', 'aria-label': 'Tag entfernen', html: icon('x', 's'), onclick: () => { Media.update(m.id, { tags: m.tags.filter(x => x !== t) }); drawTags(); } })))); (m.aiTags || []).forEach(t => tagBox.appendChild(h('span', { class: 'tagchip ai', title: 'KI-Tag' }, tagLabel(t), h('button', { type: 'button', 'aria-label': 'KI-Tag entfernen', html: icon('x', 's'), onclick: () => { Media.update(m.id, { aiTags: m.aiTags.filter(x => x !== t) }); drawTags(); } })))); };
    drawTags();
    const addTag = h('input', { class: 'input sm', placeholder: 'Tag hinzufügen + Enter', list: 'tag-suggest', 'aria-label': 'Tag hinzufügen' });
    const dl = h('datalist', { id: 'tag-suggest' }, Object.entries(TAGS).map(([k, l]) => h('option', { value: k }, l)));
    addTag.addEventListener('keydown', e => { if (e.key === 'Enter' && addTag.value.trim()) { const t = addTag.value.trim().toLowerCase(); Media.update(m.id, { tags: Array.from(new Set([...(m.tags || []), t])) }); addTag.value = ''; drawTags(); } });
    const a = m.analysis || {};
    const info = h('div', { class: 'small muted', style: { lineHeight: 1.7 } }, `${m.kind === 'image' ? 'Bild' : m.kind === 'video' ? 'Video' : 'Audio'} · ${m.w ? m.w + '×' + m.h + ' · ' : ''}${m.duration ? fmtTime(m.duration) + ' · ' : ''}${fmtBytes(m.size || 0)}`,
      a.lum != null ? h('div', null, `Helligkeit ${Math.round(a.lum * 100)} % · Wärme ${a.warmth > 0.03 ? 'warm' : a.warmth < -0.03 ? 'kühl' : 'neutral'} · Schärfe ${Math.round((a.sharp || 0) * 100)} % · Ruhige Fläche ${Math.round((a.calm || 0) * 100)} %`) : null,
      a.palette ? h('div', { class: 'row', style: { gap: '4px', marginTop: '4px' } }, a.palette.map(c => h('span', { class: 'sw', style: { width: '18px', height: '18px', background: c }, title: c }))) : null,
      a.speech ? h('div', null, `${a.speech.length} Sprechpassagen erkannt`) : null, m.desc ? h('div', { style: { color: 'var(--text2)', marginTop: '4px' } }, '„' + m.desc + '“') : null);
    const right = h('div', null, field('Name', name), h('div', { class: 'lbl', style: { marginBottom: '6px' } }, 'Tags'), tagBox, h('div', { style: { height: '8px' } }), addTag, dl,
      m.kind === 'audio' ? h('div', null, h('div', { class: 'lbl', style: { margin: '12px 0 6px' } }, 'Stimmung (für Auto Music)'), (() => { const box = h('div', { class: 'chips' }); const d = () => { clear(box); MOODS.forEach(x => box.appendChild(chip(x, (m.moods || []).includes(x), () => { const s = new Set(m.moods || []); s.has(x) ? s.delete(x) : s.add(x); Media.update(m.id, { moods: Array.from(s) }); d(); }))); }; d(); return box; })()) : null,
      m.kind === 'image' ? field('Brand-Asset-Rolle', selectEl([{ v: '', l: 'Keine' }, ...BRAND_ASSETS.map(x => ({ v: x.k, l: x.l }))], m.brandRole || '', async v => { await Media.update(m.id, { brandRole: v || null }); if (v) { Brand.data.assets[v] = m.id; await Brand.save(); } })) : null,
      h('div', { style: { height: '10px' } }), info);
    body.append(pv, right);
    const dm = modal({ title: m.name, cls: 'wide', content: body, actions: [
      { label: 'Löschen', cls: 'danger', icon: 'trash', onClick: async () => { if (await confirmDialog({ title: 'Medium löschen?', text: 'Die Datei wird aus der lokalen Mediathek entfernt.', ok: 'Löschen', danger: true })) { await Media.remove(m.id); return true; } return false; } },
      m.kind !== 'audio' && AI.connected() ? { label: 'KI-Analyse', icon: 'ai', onClick: () => this.aiTag([m.id]) } : null,
      { label: 'Verwenden', primary: true, icon: 'plus', onClick: () => useMedia(m) }].filter(Boolean) });
  },
};
/** Put a media item into the currently open project (or a new one). */
async function useMedia(m) {
  const p = App.project;
  if (m.kind === 'image' && p && p.type !== 'video') { showView('design'); Design.addImage(m); return; }
  if (p && p.type === 'video') {
    showView('video');
    if (m.kind === 'audio') { const it = newItem('audio', { mediaId: m.id, name: m.name, start: 0, dur: Math.min(m.duration || 10, VE.duration() || m.duration || 10), volume: 0.5, fadeIn: 1, fadeOut: 2 }); p.video.items.push(it); AudioCache.get(m.id).catch(() => { }); }
    else p.video.main.push(newClip(m));
    commit('add'); VideoUI.refresh(); return;
  }
  if (m.kind === 'video') { const np = Projects.create({ type: 'video', formatKey: 'reel', name: m.name.replace(/\.[a-z0-9]+$/i, '') }); np.video.main.push(newClip(m)); await Projects.put(np); await setProject(np, 'video'); return; }
  if (m.kind === 'image') { const np = Projects.create({ type: 'design', formatKey: 'post45', name: 'Design mit ' + m.name.replace(/\.[a-z0-9]+$/i, '') }); const pg = np.pages[0]; pg.bg = Object.assign(pg.bg, { type: 'image', mediaId: m.id }); await Projects.put(np); await setProject(np, 'design'); return; }
  toast('Öffne ein Video-Projekt, um Audio zu verwenden.', 'info');
}
/** Shared media picker. */
function pickMediaDialog({ kind = ['image'], multiple = false, title = 'Medium wählen' } = {}) {
  kind = Array.isArray(kind) ? kind : [kind];
  return new Promise(res => {
    const sel = []; let q = '';
    const grid = h('div', { class: 'media-grid', style: { maxHeight: '52vh', overflow: 'auto', padding: '2px' } });
    const draw = () => {
      clear(grid);
      const items = Media.list.filter(m => kind.includes(m.kind)).filter(m => !q || (m.name + ' ' + [...(m.tags || []), ...(m.aiTags || [])].map(t => t + ' ' + tagLabel(t)).join(' ')).toLowerCase().includes(q));
      if (!items.length) { grid.appendChild(h('p', { class: 'muted', style: { gridColumn: '1/-1' } }, 'Keine passenden Medien. Lade neue hoch.')); return; }
      items.forEach(m => {
        const c = h('div', { class: 'mcard' + (sel.includes(m) ? ' sel' : ''), role: 'button', tabindex: '0', 'aria-label': m.name }, multiple ? h('div', { class: 'check', html: icon('check', 's') }) : null, h('div', { class: 'mth' }, m.thumb ? h('img', { src: Media.thumbURL(m), alt: '', loading: 'lazy' }) : h('span', { html: icon('music', 'l') }), m.duration ? h('span', { class: 'dur' }, fmtTime(m.duration, false)) : null), h('div', { class: 'mi' }, h('div', { class: 'mn' }, m.name)));
        const pick = () => { if (!multiple) { done([m]); return; } const i = sel.indexOf(m); i >= 0 ? sel.splice(i, 1) : sel.push(m); c.classList.toggle('sel'); };
        c.addEventListener('click', pick); c.addEventListener('keydown', e => e.key === 'Enter' && pick());
        grid.appendChild(c);
      });
    };
    const search = h('input', { class: 'input sm', placeholder: 'Suchen …', 'aria-label': 'Suchen', style: { maxWidth: '260px' } }); search.oninput = () => { q = search.value.trim().toLowerCase(); draw(); };
    const accept = kind.map(k => k + '/*').join(',');
    const up = btn('Hochladen', async () => { const added = await Media.import(await pickFiles(accept, multiple)); const ok = added.filter(m => kind.includes(m.kind)); if (!multiple && ok[0]) { done([ok[0]]); return; } if (multiple && !sel.length && ok.length) { done(ok); return; } ok.forEach(m => sel.push(m)); draw(); }, { cls: 'sm', icon: 'upload' });
    let resolved = false; const done = v => { if (resolved) return; resolved = true; res(v); m.close(); };
    const m = modal({ title, cls: 'wide', content: [h('div', { class: 'row', style: { marginBottom: '12px', justifyContent: 'space-between' } }, search, up), grid], actions: multiple ? [{ label: 'Abbrechen' }, { label: 'Hinzufügen', primary: true, onClick: () => { done(sel.slice()); } }] : [], onClose: () => { if (!resolved) { resolved = true; res([]); } } });
    draw();
  });
}

/* ── Templates view ──────────────────────────────────────────────────── */
const TemplatesUI = {
  fmt: 'post45', cat: '',
  mount(root) { this.sc = h('div', { class: 'scroll', style: { flex: 1 } }); root.appendChild(this.sc); },
  show() { this.render(); },
  render() {
    const sc = clear(this.sc); const w = h('div', { class: 'page' }); sc.appendChild(w);
    w.appendChild(h('div', { class: 'hero' }, h('div', null, h('div', { class: 'eyebrow' }, 'Mindéa Vorlagen'), h('h1', { class: 'h1' }, 'Ruhige Layouts. ', h('em', null, 'Sofort'), ' einsatzbereit.'), h('p', { class: 'lead' }, 'Jede Vorlage passt sich an jedes Format an und füllt Bildplätze mit passenden Motiven aus deiner Mediathek.'))));
    const f = FORMATS[this.fmt];
    w.appendChild(h('div', { class: 'row wrap', style: { marginBottom: '14px', justifyContent: 'space-between' } }, chips(['post45', 'square', 'story', 'pin', 'present'].map(k => ({ v: k, l: FORMATS[k].label })), this.fmt, v => { this.fmt = v; this.render(); }), chips([{ v: '', l: 'Alle' }, ...[...new Set(TEMPLATES.map(t => t.cat))].map(c => ({ v: c, l: c }))], this.cat, v => { this.cat = v; this.render(); })));
    const g = h('div', { class: 'proj-grid' });
    TEMPLATES.filter(t => !this.cat || t.cat === this.cat).forEach(t => {
      const card = h('div', { class: 'pcard', role: 'button', tabindex: '0', 'aria-label': 'Vorlage ' + t.name });
      const th = h('div', { class: 'pthumb', style: { aspectRatio: f.w + '/' + f.h } }); const c = templateThumb(t, f, 220); c.style.width = '100%'; c.style.height = '100%'; th.appendChild(c);
      const useIt = async () => {
        if (App.project && App.project.type !== 'video' && App.project.format.w === f.w && App.project.format.h === f.h) {
          const choice = await new Promise(r => modal({ title: t.name, content: h('p', { class: 'muted' }, 'Als neues Projekt starten oder als Seite zum geöffneten Design hinzufügen?'), actions: [{ label: 'Zum Design hinzufügen', value: 'add', onClick: () => r('add') }, { label: 'Neues Projekt', primary: true, onClick: () => r('new') }], onClose: () => r(null) }));
          if (choice === 'add') { App.project.pages.push(buildTemplatePage(t, App.project.format)); App.page = App.project.pages.length - 1; commit('template'); showView('design'); return; }
          if (choice !== 'new') return;
        }
        createAndOpen({ type: 'design', formatKey: this.fmt, name: t.name, template: t.id });
      };
      card.addEventListener('click', useIt); card.addEventListener('keydown', e => e.key === 'Enter' && useIt());
      card.append(th, h('div', { class: 'pmeta' }, h('div', null, h('div', { class: 'pn' }, t.name), h('div', { class: 'ps' }, t.cat))));
      g.appendChild(card);
    });
    w.appendChild(g);
  },
};

/* ── Brand Kit view ──────────────────────────────────────────────────── */
const BrandUI = {
  mount(root) { this.sc = h('div', { class: 'scroll', style: { flex: 1 } }); root.appendChild(this.sc); Bus.on('media', () => { if (App.view === 'brand') this.render(); }); },
  show() { this.render(); },
  render() {
    const sc = clear(this.sc); const w = h('div', { class: 'page' }); sc.appendChild(w); const d = Brand.data;
    w.appendChild(h('div', { class: 'hero' }, h('div', null, h('div', { class: 'eyebrow' }, 'Mindéa Brand Kit'), h('h1', { class: 'h1' }, 'Konsistent. ', h('em', null, 'Ruhig'), '. Wiedererkennbar.'), h('p', { class: 'lead' }, 'Farben, Schriften und Assets deiner Marke – überall im Studio mit einem Klick verfügbar.'))));
    // colors
    w.appendChild(h('div', { class: 'sec-h' }, h('h2', { class: 'h2' }, 'Markenfarben'), h('div', { class: 'row' }, btn('Farbe hinzufügen', () => { d.colors.push({ n: 'Neue Farbe', v: '#B08D57' }); Brand.save(); this.render(); }, { cls: 'sm', icon: 'plus' }), btn('Zurücksetzen', async () => { if (await confirmDialog({ title: 'Markenfarben zurücksetzen?', text: 'Die 8 Mindéa-Standardfarben werden wiederhergestellt.', ok: 'Zurücksetzen' })) { d.colors = BRAND_COLORS.map(c => ({ ...c })); Brand.save(); this.render(); } }, { cls: 'sm ghost' }))));
    const cg = h('div', { class: 'bk-grid' });
    d.colors.forEach((c, i) => {
      const inp = h('input', { type: 'color', value: c.v, 'aria-label': 'Farbe ' + c.n, style: { position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' } });
      inp.onchange = () => { c.v = inp.value.toUpperCase(); Brand.save(); this.render(); };
      const nm = h('input', { class: 'input sm', value: c.n, 'aria-label': 'Farbname', style: { border: 0, padding: '0', minHeight: '24px', fontWeight: 500 } }); nm.onchange = () => { c.n = nm.value; Brand.save(); };
      cg.appendChild(h('div', { class: 'bk-color' }, h('div', { class: 'bc', style: { background: c.v } }, inp), h('div', { class: 'bm' }, nm, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', null, c.v), h('div', { class: 'row', style: { gap: 0 } }, ibtn('copy', 'HEX kopieren', () => copyText(c.v), { size: 's' }), d.colors.length > 2 ? ibtn('trash', 'Entfernen', () => { d.colors.splice(i, 1); Brand.save(); this.render(); }, { size: 's' }) : null)))));
    });
    w.appendChild(cg);
    // fonts
    w.appendChild(h('div', { class: 'sec-h', style: { marginTop: '32px' } }, h('h2', { class: 'h2' }, 'Markenschriften')));
    const fg = h('div', { class: 'grid3' });
    [['head', 'Headline'], ['alt', 'Alternative'], ['body', 'Body']].forEach(([k, l]) => fg.appendChild(h('div', { class: 'bk-font' }, h('div', { class: 'lbl' }, l), h('div', { class: 'sample', style: { fontFamily: `'${d.fonts[k]}'` } }, 'Aa Mindéa'), selectEl(FONTS, d.fonts[k], v => { d.fonts[k] = v; Brand.save(); this.render(); }, { aria: 'Schrift ' + l }))));
    w.appendChild(fg);
    // identity
    const hd = h('input', { class: 'input', value: d.handle, 'aria-label': 'Handle oder Website' }); hd.onchange = () => { d.handle = hd.value.trim(); Brand.save(); _tplThumbCache.clear(); };
    const tl = h('input', { class: 'input', value: d.tagline, 'aria-label': 'Claim' }); tl.onchange = () => { d.tagline = tl.value.trim(); Brand.save(); _tplThumbCache.clear(); };
    w.appendChild(h('div', { class: 'grid2', style: { marginTop: '24px' } }, field('Handle / Website (in Vorlagen)', hd), field('Claim', tl)));
    // assets
    w.appendChild(h('div', { class: 'sec-h', style: { marginTop: '24px' } }, h('h2', { class: 'h2' }, 'Markenassets'), h('span', { class: 'small muted' }, 'PNG mit Transparenz empfohlen')));
    const ag = h('div', { class: 'bk-grid' });
    BRAND_ASSETS.forEach(a => {
      const m = Brand.assetMedia(a.k);
      const upload = async () => { const [f] = await pickFiles('image/*', false); if (!f) return; const [nm] = await Media.import([f], { brandRole: a.k, keepAlpha: true, tags: ['logo'] }); if (nm) { d.assets[a.k] = nm.id; await Brand.save(); this.render(); } };
      ag.appendChild(h('div', { class: 'bk-asset' }, h('div', { class: 'ba' }, m ? h('img', { src: Media.thumbURL(m), alt: a.l }) : h('button', { class: 'btn sm', type: 'button', onclick: upload, html: icon('upload', 's') + ' Hochladen' })), h('div', { class: 'bm' }, h('b', { class: 'grow small', style: { fontWeight: 500 } }, a.l), m ? ibtn('rotate', 'Ersetzen', upload, { size: 's' }) : null, m ? ibtn('trash', 'Entfernen', async () => { delete d.assets[a.k]; await Media.update(m.id, { brandRole: null }); await Brand.save(); this.render(); }, { size: 's' }) : null)));
    });
    w.appendChild(ag);
    // styles
    w.appendChild(h('div', { class: 'sec-h', style: { marginTop: '32px' } }, h('h2', { class: 'h2' }, 'Markenstile'), h('span', { class: 'small muted' }, App.project && App.project.type !== 'video' ? 'Klick wendet den Stil auf die aktuelle Seite an' : 'Öffne ein Design, um Stile anzuwenden')));
    const sg = h('div', { class: 'bk-grid' });
    Object.entries(BRAND_STYLES).forEach(([k, s]) => {
      const card = h('button', { class: 'style-card', type: 'button', onclick: () => { if (!App.project || App.project.type === 'video') { toast('Öffne zuerst ein Design.', 'info'); return; } applyBrandStyle(curPage(), k); commit('style'); showView('design'); toast('Stil „' + s.l + '“ angewendet', 'success'); } });
      card.appendChild(h('div', { class: 'sp', style: { background: s.bg2 ? `linear-gradient(165deg, ${s.bg}, ${s.bg2})` : s.bg, color: s.text } }, h('div', { style: `font-family:'${s.head}';font-size:26px;line-height:1;${s.italic ? 'font-style:italic;' : ''}${s.headWeight ? 'font-weight:' + s.headWeight : ''}` }, 'Klarheit wirkt.'), h('div', { style: { height: '2px', width: '32px', background: s.accent, margin: '6px 0' } }), h('div', { style: `font-family:'${s.body}';font-size:11px;opacity:.8` }, s.head + ' · ' + s.body)));
      card.appendChild(h('div', { class: 'sm' }, s.l)); sg.appendChild(card);
    });
    w.appendChild(sg);
  },
};
