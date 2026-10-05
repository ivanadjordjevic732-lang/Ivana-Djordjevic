/* ═══════════════════════════════════════════════════════════════════════
   MODULE: CAPTION ENGINE + CAPTION STUDIO
   Short meaning units (2–6 words), natural pauses, no dangling function
   words, subtle keyword emphasis, real word timing when available.
   ═══════════════════════════════════════════════════════════════════════ */
const CapEngine = {
  FUNC: new Set('der die das den dem des ein eine einen einem einer und oder aber mit zu zum zur in im an am auf für von vom bei aus nach über unter um als wie so dass ob wenn weil ich du er sie es wir ihr mein meine dein deine sein seine ihre unsere nicht noch auch nur schon sehr ganz the a an and or but to of in on at for with from my your our their his her its is are was i you we they this that'.split(' ')),
  EMPH: /^(wichtig|wichtigste|nie|niemals|immer|endlich|wirklich|echt|marke|marken|sichtbar|sichtbarkeit|vertrauen|gefühl|klarheit|ruhe|qualität|premium|luxus|liebe|mut|wirkung|erfolg|gründung|gegründet|kunden|kundinnen|geschichte|zeit|wachstum|idee|frei|freiheit|important|never|always|brand|trust|feeling|clarity|love|growth|idea|story)$/i,
  NEG: /^(nicht|nichts|kein|keine|keinen|keinem|keiner|nie|niemals|weder|not|no|never|dont|cant|wont|isnt|arent|doesnt|didnt)$/i,
  clean(w) { return String(w).toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); },
  emphIndex(words) {
    let best = -1, bs = 1.5;
    words.forEach((w, i) => { const c = this.clean(w.w || w); let s = 0; if (this.EMPH.test(c)) s += 3; if (/\d/.test(c) || /^(eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|hundert|tausend)$/.test(c)) s += 3; if (c.length >= 9 && !this.FUNC.has(c)) s += 1; if (s > bs) { bs = s; best = i; } });
    return best >= 0 ? [best] : [];
  },
  /** words: [{w,s,e}] (timeline seconds) → captions */
  segment(words, maxWords = 4, opts = {}) {
    const groups = []; let cur = [];
    const chars = g => g.reduce((n, w) => n + w.w.length + 1, 0);
    for (let i = 0; i < words.length; i++) {
      const w = words[i], next = words[i + 1];
      cur.push(w);
      const gap = next ? next.s - w.e : 9;
      const punct = /[.!?…]["“”»]?$/.test(w.w), comma = /[,;:–—]$/.test(w.w);
      const len = cur.length;
      let brk = !next || punct || gap > 0.42 || len >= maxWords || (comma && len >= 2) || chars(cur) > (opts.maxChars || 26);
      // never tear a negation from what it negates ("nicht | aufgeben") – allow one extra word
      if (brk && next && !punct && gap <= 0.42 && this.NEG.test(this.clean(w.w)) && len > 1) { cur.pop(); groups.push(cur); cur = [w]; continue; }
      if (brk && next && !punct && gap <= 0.42 && len > 1 && this.FUNC.has(this.clean(w.w))) { cur.pop(); groups.push(cur); cur = [w]; continue; }
      if (brk) { groups.push(cur); cur = []; }
    }
    if (cur.length) groups.push(cur);
    // merge single-word orphans into neighbour when very short
    const endsSentence = g => /[.!?…]["“”»]?$/.test(g[g.length - 1].w);
    for (let i = groups.length - 1; i >= 0; i--) {
      const g = groups[i]; if (g.length !== 1 || groups.length < 2) continue;
      const prev = groups[i - 1], next = groups[i + 1];
      if (prev && !endsSentence(prev) && prev.length < maxWords + 1 && g[0].s - prev[prev.length - 1].e < 0.35) { prev.push(...g); groups.splice(i, 1); }
      else if (next && !endsSentence(g) && next[0].s - g[0].e < (this.FUNC.has(this.clean(g[0].w)) ? 1.6 : 0.6)) {
        const merged = [...g, ...next];
        if (merged.length <= maxWords) { groups.splice(i, 2, merged); continue; }
        // rebalance: split near the middle, never after a function word or a negation
        let best = -1, bd = 99; const mid = merged.length / 2;
        for (let k = 2; k <= merged.length - 1; k++) { const c = this.clean(merged[k - 1].w); if (this.FUNC.has(c) || this.NEG.test(c)) continue; if (k > maxWords || merged.length - k > maxWords) continue; const d = Math.abs(k - mid); if (d < bd) { bd = d; best = k; } }
        if (best > 0) groups.splice(i, 2, merged.slice(0, best), merged.slice(best));
      }
    }
    return groups.map((g, i) => {
      const start = g[0].s; const nextStart = groups[i + 1] ? groups[i + 1][0].s : Infinity;
      const end = Math.min(nextStart, Math.max(g[g.length - 1].e + 0.12, start + 0.7));
      return { id: uid('cp'), start: round(start, 3), end: round(Math.max(end, start + 0.2), 3), text: g.map(w => w.w).join(' '), words: g.map(w => ({ w: w.w, s: round(w.s, 3), e: round(w.e, 3) })), emph: opts.emphasis === false ? [] : this.emphIndex(g) };
    });
  },
  /** Distribute script words over speech segments (or evenly) – an estimate, labelled as such. */
  alignScript(text, { start = 0, end = 10, speech = null } = {}) {
    const toks = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (!toks.length) return [];
    const weight = w => w.length + 2 + (/[.!?…]$/.test(w) ? 6 : /[,;:]$/.test(w) ? 3 : 0);
    const segs = speech && speech.length ? speech : [[start, end]];
    const total = segs.reduce((s, [a, b]) => s + (b - a), 0) || 1;
    const wsum = toks.reduce((s, w) => s + weight(w), 0);
    const out = []; let si = 0, t = segs[0][0];
    for (const w of toks) {
      let d = weight(w) / wsum * total;
      while (si < segs.length && t + d * 0.5 > segs[si][1]) { si++; if (si < segs.length) t = Math.max(t, segs[si][0]); }
      if (si >= segs.length) { si = segs.length - 1; }
      const s = t, e = Math.min(t + d, si < segs.length ? Math.max(segs[si][1], t + 0.15) : t + d);
      out.push({ w, s, e: Math.max(e, s + 0.12) }); t = e;
    }
    return out;
  },
};
/**
 * Face-/subject-free caption placement + automatic readability box.
 * Uses the per-frame subject track (face box or skin-tone region) and the
 * brightness of the caption band. Manually moved captions are left alone.
 */
function smartCaptionPlacement(p) {
  const v = p.video, lay = mainLayout(v.main); const res = { moved: 0, boxed: 0, checked: 0 };
  const base = capY(v.cap, null, 1); const half = 0.065;
  for (const c of v.captions) {
    if (c.manual) continue;
    const mid = (c.start + c.end) / 2; const L = lay.find(l => mid >= l.start && mid < l.end); if (!L) continue;
    const m = Media.get(L.clip.mediaId); const tr = m && m.analysis && m.analysis.track; if (!tr || !tr.length) continue;
    const st = L.clip.in + (mid - L.start) * L.clip.speed;
    let s = tr[0]; for (const x of tr) if (Math.abs(x.t - st) < Math.abs(s.t - st)) s = x;
    res.checked++;
    delete c.y; c.box = false;
    if (s.fy0 != null && s.fy1 != null) {
      const z = L.clip.zoom || 1; // digital zoom pushes the face away from the centre
      const top = 0.5 + (s.fy0 - 0.5) * z, bot = 0.5 + (s.fy1 - 0.5) * z;
      if (bot > base - half && top < base + half) {
        if (bot + 0.09 <= 0.8) c.y = round(bot + 0.08, 3);            // directly below the face, still above the app UI
        else if (top > 0.36) c.y = 0.2;                              // face sits low → captions to the upper third
        else c.box = true;                                           // no free area → keep position, add readability box
        if (c.y != null) res.moved++;
      }
    }
    const band = s.band; if (band != null && band > 0.6 && !c.box) c.box = true;
    if (c.box) res.boxed++;
  }
  return res;
}
/** Speech segments mapped from source media to timeline time (needs analysis). */
function timelineSpeech(p) {
  const out = [];
  for (const L of mainLayout(p.video.main)) {
    const c = L.clip; if (c.kind !== 'video' || c.muted) continue;
    const m = Media.get(c.mediaId); const sp = m && m.analysis && m.analysis.speech; if (!sp) continue;
    for (const [a, b] of sp) { const s = Math.max(a, c.in), e = Math.min(b, c.out); if (e > s) out.push([L.start + (s - c.in) / c.speed, L.start + (e - c.in) / c.speed]); }
  }
  return out.sort((a, b) => a[0] - b[0]);
}
/** Map transcript words (source time of a media) through the edit to timeline time. */
function mapWordsToTimeline(p, mediaId, words) {
  const out = [];
  for (const L of mainLayout(p.video.main)) {
    const c = L.clip; if (c.mediaId !== mediaId) continue;
    for (const w of words) { const mid = (w.s + w.e) / 2; if (mid >= c.in && mid <= c.out) out.push({ w: w.w, s: L.start + (Math.max(w.s, c.in) - c.in) / c.speed, e: L.start + (Math.min(w.e, c.out) - c.in) / c.speed }); }
  }
  return out.sort((a, b) => a.s - b.s);
}

/* ── Caption Studio view ─────────────────────────────────────────────── */
const CaptionsUI = {
  root: null, e: {}, src: 'script',
  mount(root) {
    this.root = root;
    const sc = h('div', { class: 'scroll', style: { flex: 1 } }); root.appendChild(sc);
    this.e.sc = sc;
    Bus.on('vframe', () => { if (App.view === 'captions') this.draw(); });
    Bus.on('project', () => { if (App.view === 'captions') this.show(); });
    Bus.on('restore', () => { if (App.view === 'captions') this.renderList(); });
    Bus.on('vplay', p => { if (this.e.playB) this.e.playB.innerHTML = icon(p ? 'pause' : 'play'); });
  },
  active() { return App.project && App.project.type === 'video'; },
  show() { VE.override = null; this.render(); },
  hide() { VE.pause(); },
  render() {
    const sc = clear(this.e.sc); const wrap = h('div', { class: 'ae-wrap' }); sc.appendChild(wrap);
    wrap.appendChild(h('div', { class: 'hero' }, h('div', null, h('div', { class: 'eyebrow' }, 'Caption Studio'), h('h1', { class: 'h1' }, 'Untertitel mit ', h('em', null, 'Gefühl'), ' für Timing.'), h('p', { class: 'lead' }, 'Kurze Sinneinheiten, natürliche Pausen, dezent betonte Schlüsselwörter.'))));
    if (!this.active()) {
      wrap.appendChild(emptyState('captions', 'Kein Video geöffnet', 'Öffne ein Video-Projekt oder lade ein Rohvideo in Auto Edit – dort werden Untertitel automatisch erzeugt.', h('div', { class: 'row wrap', style: { justifyContent: 'center' } }, btn('Auto Edit', () => showView('autoedit'), { cls: 'primary', icon: 'wand' }), btn('Neues Reel', () => createAndOpen({ type: 'video', formatKey: 'reel', name: 'Reel mit Untertiteln' }, 'captions'), { icon: 'plus' }))));
      wrap.appendChild(h('div', { style: { height: '20px' } })); wrap.appendChild(recentProjectsBlock(p => p.type === 'video', 'Videos', 'captions'));
      return;
    }
    preloadVideoProject(App.project);
    const p = App.project, v = p.video;
    const grid = h('div', { class: 'two-col' }); wrap.appendChild(grid);
    const left = h('div', { class: 'col', style: { gap: '14px' } }), right = h('div', { class: 'col', style: { gap: '10px', position: 'sticky', top: '10px', alignSelf: 'start' } });
    grid.append(left, right);
    // preview
    const f = p.format; const pw = Math.min(380, f.w / f.h * 560);
    const cw = h('div', { class: 'vcanvas-wrap', style: { width: pw + 'px', height: pw * f.h / f.w + 'px', margin: '0 auto', maxWidth: '100%' } });
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Caption-Vorschau' }); canvas.width = Math.min(f.w, pw * 2); canvas.height = canvas.width * f.h / f.w; cw.appendChild(canvas);
    this.e.canvas = canvas; this.bindDrag(canvas);
    this.e.playB = h('button', { class: 'play-btn', type: 'button', 'aria-label': 'Abspielen', html: icon('play'), onclick: () => VE.toggle() });
    this.e.tc = h('span', { class: 'tc' });
    right.append(cw, h('div', { class: 'vcontrols' }, ibtn('skipB', 'Anfang', () => VE.seek(0)), this.e.playB, this.e.tc), h('p', { class: 'tiny muted', style: { textAlign: 'center', margin: 0 } }, 'Tipp: Caption in der Vorschau ziehen, um sie einzeln zu verschieben.'));
    // source
    const srcCard = h('div', { class: 'card' }); left.appendChild(srcCard);
    srcCard.appendChild(h('h4', null, 'Text & Timing'));
    const tabs = h('div', { class: 'tabs', role: 'tablist' }); srcCard.appendChild(tabs);
    const sbody = h('div'); srcCard.appendChild(sbody);
    const setSrc = k => { this.src = k; $$('.tab', tabs).forEach(t => t.classList.toggle('on', t.dataset.k === k)); drawSrc(); };
    [['script', 'Skript einfügen'], ['auto', 'Automatisch transkribieren'], ['transcript', 'Vorhandenes Transkript']].forEach(([k, l]) => tabs.appendChild(h('button', { class: 'tab' + (this.src === k ? ' on' : ''), type: 'button', role: 'tab', dataset: { k }, onclick: () => setSrc(k) }, l)));
    const wordsPer = h('div'); let wp = v.cap.wordsPer || 4;
    if (wp > 4) wp = 4;
    const wpChips = chips([2, 3, 4].map(n => ({ v: n, l: n + ' Wörter' })), wp, n => { wp = n; v.cap.wordsPer = n; });
    wordsPer.append(h('div', { class: 'lbl', style: { margin: '12px 0 6px' } }, 'Wörter pro Caption'), wpChips);
    const drawSrc = () => {
      clear(sbody);
      if (this.src === 'script') {
        const ta = h('textarea', { class: 'textarea', placeholder: 'Füge hier dein Skript oder Transkript ein …', 'aria-label': 'Skript' }); ta.value = v._script || '';
        ta.addEventListener('input', () => v._script = ta.value);
        let align = true;
        const hasAudio = v.main.some(c => c.kind === 'video');
        sbody.append(ta, wordsPer, hasAudio ? toggle('An Sprechpausen ausrichten (Audioanalyse, lokal)', true, x => align = x) : null,
          h('p', { class: 'tiny muted' }, 'Ohne Transkription werden Wortzeiten geschätzt – anschließend kannst du jede Caption feinjustieren.'),
          btn('Untertitel erzeugen', async (ev) => { const b = ev.currentTarget; setBtnBusy(b, true); try { await this.fromScript(ta.value, wp, align && hasAudio); } finally { setBtnBusy(b, false); } }, { cls: 'primary', icon: 'captions' }));
      } else if (this.src === 'auto') {
        const lang = selectEl(STT_LANGS, AI.cfg.lang || 'auto', x => { AI.cfg.lang = x; AI.save(); }, { aria: 'Sprache' });
        const eng = selectEl(STT_ENGINES.map(e => ({ v: e.v, l: e.l })), AI.cfg.stt || 'local', x => { AI.cfg.stt = x; AI.save(); drawSrc(); }, { aria: 'Spracherkennung' });
        const info = STT_ENGINES.find(e => e.v === (AI.cfg.stt || 'local'));
        const prog = h('div', { class: 'small muted' });
        sbody.append(h('div', { class: 'grid2' }, field('Sprache', lang), field('Spracherkennung', eng)), h('div', { class: 'notice', style: { marginBottom: '10px' } }, iconEl(info.cloud ? 'cloud' : 'shield', 's'), h('span', null, info.note)), wordsPer, prog,
          btn('Transkribieren & Untertitel erzeugen', async (ev) => { const b = ev.currentTarget; setBtnBusy(b, true); try { const ok = await transcribeProject(p, s => prog.textContent = s); if (ok) { this.buildFromTranscript(wp); prog.textContent = 'Fertig – ' + v.captions.length + ' Untertitel.'; } } catch (e) { prog.textContent = ''; toast(friendlyError(e, 'Transkription'), 'error', { duration: 9000 }); } setBtnBusy(b, false); }, { cls: 'primary', icon: 'wave' }));
      } else {
        const tr = v.transcript;
        if (!tr || !tr.words || !tr.words.length) sbody.appendChild(h('p', { class: 'muted small' }, 'Noch kein Transkript vorhanden. Nutze „Automatisch transkribieren“ oder Auto Edit.'));
        else sbody.append(h('div', { class: 'ai-out', style: { maxHeight: '160px', overflow: 'auto', fontSize: '13px' } }, tr.text), h('div', { class: 'tiny muted', style: { margin: '6px 0' } }, `${tr.words.length} Wörter · ${tr.source}${tr.estimated ? ' · Wortzeiten geschätzt' : ''}`), wordsPer, btn('Untertitel aus Transkript erzeugen', () => this.buildFromTranscript(wp), { cls: 'primary', icon: 'captions' }));
      }
    };
    drawSrc();
    // style
    const stCard = h('div', { class: 'card' }); left.appendChild(stCard);
    stCard.appendChild(h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '10px' } }, h('h4', null, 'Stil'), btn('Stil auf alle anwenden', () => { v.captions.forEach(c => { delete c.style; delete c.size; }); commit('capstyle'); this.renderList(); requestVRender(); toast('Stil „' + CAPTION_STYLES[v.cap.style].l + '“ auf alle Captions angewendet', 'success'); }, { cls: 'sm', icon: 'check' })));
    const sg = h('div', { class: 'tile-grid three' });
    Object.entries(CAPTION_STYLES).forEach(([k, s]) => {
      const t = h('button', { class: 'tile' + (v.cap.style === k ? ' sel' : ''), type: 'button', style: { aspectRatio: '1.5', background: '#2A221A' }, 'aria-label': 'Stil ' + s.l, onclick: () => { v.cap.style = k; commit('capstyle'); this.render(); } });
      const c = makeCanvas(240, 160); const ctx = c.getContext('2d'); const g = ctx.createLinearGradient(0, 0, 0, 160); g.addColorStop(0, '#4a3d31'); g.addColorStop(1, '#2A221A'); ctx.fillStyle = g; ctx.fillRect(0, 0, 240, 160);
      drawCaption(ctx, { text: 'Marken, die wirken', start: 0, end: 9, emph: [2] }, { ...v.cap, style: k, animation: 'none', position: 'middle', size: 1 }, 1, 240, 160 * 1.3);
      t.append(c, h('span', { class: 'tl' }, s.l)); sg.appendChild(t);
    });
    stCard.appendChild(sg);
    stCard.append(h('div', { class: 'lbl', style: { margin: '14px 0 6px' } }, 'Position'), chips(CAPTION_POS, v.cap.position, x => { v.cap.position = x; commit('cappos'); requestVRender(); this.render(); }),
      h('div', { class: 'row wrap', style: { marginTop: '10px', gap: '8px' } }, btn('Gesichter & Motiv freihalten', async ev => { const b = ev.currentTarget; setBtnBusy(b, true); try { await this.placeSmart(true); } finally { setBtnBusy(b, false); } }, { cls: 'sm', icon: 'person', tip: 'Analysiert das Video und setzt Untertitel nie auf Gesichter' }),
        toggle('Lesbarkeits-Hintergrund für alle', !!v.cap.box, x => { v.cap.box = x; commit('capbox'); requestVRender(); })));
    if (v.cap.position === 'free') stCard.appendChild(slider('Vertikale Position', v.cap.y ?? 0.72, 0.05, 0.95, 0.01, x => { v.cap.y = x; requestVRender(); }, () => commit('cappos')));
    stCard.append(h('div', { class: 'lbl', style: { margin: '14px 0 6px' } }, 'Animation'), chips(CAPTION_ANIMS, v.cap.animation, x => { v.cap.animation = x; commit('capanim'); requestVRender(); }),
      h('div', { style: { height: '10px' } }), slider('Größe', v.cap.size || 1, 0.6, 1.6, 0.01, x => { v.cap.size = x; requestVRender(); }, () => commit('capsize'), { reset: 1 }),
      toggle('Aktives Wort dezent hervorheben', v.cap.highlight, x => { v.cap.highlight = x; commit('caphl'); requestVRender(); }), toggle('Schlüsselwörter betonen', v.cap.emphasis !== false, x => { v.cap.emphasis = x; commit('capem'); requestVRender(); }), toggle('Untertitel anzeigen', v.cap.show !== false, x => { v.cap.show = x; commit('capshow'); requestVRender(); }));
    // list
    const lc = h('div', { class: 'card' }); left.appendChild(lc); this.e.list = lc;
    this.renderList();
    this.draw();
  },
  renderList() {
    const lc = this.e.list; if (!lc || !this.active()) return; clear(lc);
    const v = App.project.video;
    lc.appendChild(h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '8px' } }, h('h4', null, `Captions (${v.captions.length})`), h('div', { class: 'row' }, btn('Neu am Playhead', () => { const c = { id: uid('cp'), start: VE.t, end: VE.t + 1.5, text: 'Neue Caption', emph: [] }; v.captions.push(c); v.captions.sort((a, b) => a.start - b.start); commit('capadd'); this.renderList(); requestVRender(); }, { cls: 'sm', icon: 'plus' }), v.captions.length ? btn('Alle löschen', async () => { if (await confirmDialog({ title: 'Alle Captions löschen?', text: 'Rückgängig ist möglich.', ok: 'Löschen', danger: true })) { v.captions = []; commit('capclear'); this.renderList(); requestVRender(); } }, { cls: 'sm danger' }) : null)));
    if (!v.captions.length) { lc.appendChild(h('p', { class: 'muted small' }, 'Noch keine Untertitel. Füge ein Skript ein oder lass das Video transkribieren.')); return; }
    const list = h('div', { class: 'col', style: { gap: '6px' } });
    v.captions.forEach((c, i) => {
      const row = h('div', { class: 'layer', style: { alignItems: 'center', flexWrap: 'wrap', padding: '6px 8px' } });
      const time = h('button', { class: 'chip', type: 'button', style: { minHeight: '30px', fontVariantNumeric: 'tabular-nums' }, 'aria-label': 'Zu dieser Caption springen', onclick: () => VE.seek(c.start + 0.01) }, fmtTime(c.start) + '–' + fmtTime(c.end));
      const inp = h('input', { class: 'input sm grow', value: c.text, 'aria-label': 'Caption ' + (i + 1), style: { minWidth: '140px' } });
      inp.addEventListener('focus', () => VE.seek(c.start + 0.01));
      inp.addEventListener('input', () => { c.text = inp.value; if (c.words && c.words.length !== inp.value.split(/\s+/).length) c.words = null; requestVRender(); });
      inp.addEventListener('change', () => { c.emph = CapEngine.emphIndex(c.text.split(/\s+/)); commit('captext'); });
      const nudge = (d) => { c.start = Math.max(0, c.start + d); c.end = Math.max(c.start + 0.15, c.end + d); if (c.words) c.words.forEach(w => { w.s += d; w.e += d; }); commit('captime'); this.renderList(); VE.seek(c.start + 0.01); };
      row.append(time, inp,
        ibtn('chevL', 'Früher (−0,1 s)', () => nudge(-0.1), { size: 's' }), ibtn('chevR', 'Später (+0,1 s)', () => nudge(0.1), { size: 's' }),
        ibtn('up', 'Höher positionieren', () => { c.manual = true; c.y = clamp((c.y ?? capY(v.cap, null, 1)) - 0.03, 0.05, 0.95); commit('capy'); requestVRender(); }, { size: 's' }),
        ibtn('down', 'Tiefer positionieren', () => { c.manual = true; c.y = clamp((c.y ?? capY(v.cap, null, 1)) + 0.03, 0.05, 0.95); commit('capy'); requestVRender(); }, { size: 's' }),
        ibtn('more', 'Mehr', ev => popMenu(ev.currentTarget, [
          { label: 'Start = Playhead', icon: 'clock', fn: () => { const d = c.end - c.start; c.start = VE.t; c.end = VE.t + d; commit('captime'); this.renderList(); } },
          { label: 'Ende = Playhead', icon: 'clock', fn: () => { if (VE.t > c.start) { c.end = VE.t; commit('captime'); this.renderList(); } } },
          { label: 'Mit nächster zusammenführen', icon: 'link', fn: () => { const n = v.captions[i + 1]; if (!n) return; c.text += ' ' + n.text; c.end = n.end; c.words = c.words && n.words ? c.words.concat(n.words) : null; v.captions.splice(i + 1, 1); commit('capmerge'); this.renderList(); } },
          { label: 'Position zurücksetzen', icon: 'undo', fn: () => { delete c.y; delete c.manual; commit('capy'); requestVRender(); } },
          '-', { label: 'Löschen', icon: 'trash', danger: true, fn: () => { v.captions.splice(i, 1); commit('capdel'); this.renderList(); requestVRender(); } }]), { size: 's' }));
      list.appendChild(row);
    });
    lc.appendChild(list);
  },
  /** Analyse subject positions (once per video) and place captions face-free. */
  async placeSmart(verbose) {
    const p = App.project; if (!p || !p.video.captions.length) { if (verbose) toast('Erzeuge zuerst Untertitel.', 'info'); return; }
    for (const id of new Set(p.video.main.filter(c => c.kind === 'video').map(c => c.mediaId))) await ensureSubjectTrack(id);
    const r = smartCaptionPlacement(p);
    commit('capsmart'); this.renderList && this.renderList(); requestVRender();
    if (verbose) toast(r.checked ? `${r.moved} Untertitel vom Gesicht weg verschoben · ${r.boxed} mit Lesbarkeits-Hintergrund` : 'Keine Bildanalyse möglich – Position bleibt im unteren Drittel.', 'success', { duration: 4500 });
  },
  async fromScript(text, wp, align) {
    const p = App.project, v = p.video; if (!text.trim()) { toast('Bitte zuerst ein Skript einfügen.', 'info'); return; }
    if (v.captions.length && !(await confirmDialog({ title: 'Untertitel ersetzen?', text: 'Vorhandene Untertitel werden ersetzt (rückgängig möglich).', ok: 'Ersetzen' }))) return;
    let speech = null;
    if (align) { const ok = await ensureSpeech(p); if (ok) speech = timelineSpeech(p); if (!speech || !speech.length) toast('Keine Sprache erkannt – Wortzeiten gleichmäßig verteilt.', 'info'); }
    const dur = VE.duration() || Math.max(3, text.split(/\s+/).length * 0.38);
    const words = CapEngine.alignScript(text, { start: speech && speech.length ? speech[0][0] : 0.2, end: speech && speech.length ? speech[speech.length - 1][1] : dur - 0.1, speech });
    v.captions = CapEngine.segment(words, wp, { emphasis: true }).map(c => ({ ...c, words: null }));
    v.transcript = v.transcript && !v.transcript.estimated ? v.transcript : { text, words: words.map(w => ({ ...w })), source: 'Skript', estimated: true, timeline: true };
    commit('captions'); await this.placeSmart(false); this.render(); VE.seek(0); toast(v.captions.length + ' Untertitel erzeugt · Gesichter freigehalten', 'success');
  },
  buildFromTranscript(wp) {
    const p = App.project, v = p.video, tr = v.transcript; if (!tr || !tr.words) return;
    const words = tr.timeline ? tr.words : mapWordsToTimeline(p, tr.mediaId, tr.words);
    v.captions = CapEngine.segment(words, wp, { emphasis: true });
    if (tr.estimated) v.captions.forEach(c => c.words = null);
    commit('captions'); this.render(); VE.seek(0); toast(v.captions.length + ' Untertitel erzeugt', 'success');
    this.placeSmart(false).then(() => this.render());
  },
  draw() {
    const c = this.e.canvas; if (!c || !this.active() || !c.isConnected) return;
    const f = App.project.format; const ctx = c.getContext('2d'); const s = c.width / f.w; ctx.setTransform(s, 0, 0, s, 0, 0);
    VE.renderFrame(ctx, VE.t);
    if (this.e.tc) this.e.tc.textContent = fmtTime(VE.t) + ' / ' + fmtTime(VE.duration());
  },
  bindDrag(c) {
    c.addEventListener('pointerdown', e => {
      const v = App.project.video, f = App.project.format; const cap = v.captions.find(x => VE.t >= x.start && VE.t < x.end); if (!cap) return;
      const r = c.getBoundingClientRect(); const k = f.h / r.height; const y0 = (e.clientY - r.top) * k; const cy = capY(v.cap, cap, f.h);
      if (Math.abs(y0 - cy) > f.h * 0.08) return;
      e.preventDefault(); c.setPointerCapture(e.pointerId);
      const mv = ev => { cap.y = clamp(((ev.clientY - r.top) * k) / f.h, 0.05, 0.95); cap.manual = true; requestVRender(); };
      const up = () => { c.removeEventListener('pointermove', mv); c.removeEventListener('pointerup', up); commit('capmove'); };
      c.addEventListener('pointermove', mv); c.addEventListener('pointerup', up);
    });
  },
};
