/* ═══════════════════════════════════════════════════════════════════════
   MODULE: AI — clean separation of capabilities:
   · Language Model (Claude, optional, user's own key)
   · Vision Analysis (Claude vision, optional, explicit consent)
   · Speech-to-Text (local Whisper in the browser, or OpenAI Whisper)
   Nothing is faked: without a connection the UI says so.
   ═══════════════════════════════════════════════════════════════════════ */
const AI_MODELS = [{ v: 'claude-opus-5-5', l: 'Claude Opus 5.5 – beste Qualität' }, { v: 'claude-sonnet-5-5', l: 'Claude Sonnet 5.5 – schnell & günstig' }, { v: 'claude-haiku-4-5', l: 'Claude Haiku 4.5 – am schnellsten' }];
const STT_LANGS = [{ v: 'auto', l: 'Automatisch erkennen', iso: '' }, { v: 'german', l: 'Deutsch', iso: 'de' }, { v: 'english', l: 'Englisch', iso: 'en' }, { v: 'serbian', l: 'Serbisch', iso: 'sr' }, { v: 'croatian', l: 'Kroatisch', iso: 'hr' }, { v: 'french', l: 'Französisch', iso: 'fr' }, { v: 'spanish', l: 'Spanisch', iso: 'es' }, { v: 'italian', l: 'Italienisch', iso: 'it' }];
const STT_ENGINES = [
  { v: 'local', l: 'Lokal im Browser (Whisper)', note: 'Läuft vollständig auf deinem Gerät. Beim ersten Mal lädt der Browser das Sprachmodell einmalig (ca. 80–250 MB) von Hugging Face. Dein Audio verlässt das Gerät nicht.' },
  { v: 'openai', l: 'OpenAI Whisper (Cloud)', cloud: true, note: 'Nur die Tonspur (16 kHz Mono, nicht das Video) wird zur Transkription an OpenAI übertragen. Erfordert deinen eigenen OpenAI-API-Schlüssel.' },
];
const WHISPER_MODELS = [{ v: 'onnx-community/whisper-tiny_timestamped', l: 'Schnell (tiny)' }, { v: 'onnx-community/whisper-base_timestamped', l: 'Ausgewogen (base)' }, { v: 'onnx-community/whisper-small_timestamped', l: 'Genau (small, groß)' }];
const MINDEA_VOICE = 'Mindéa ist ein Premium-Studio für Markenfilme und visuelle Markenpräsenz (Quiet Luxury). Markenclaim: „Marken, die wirken, bevor sie erklären.“ Ton: ruhig, warm, klar, hochwertig, persönlich, weiblich, nie marktschreierisch, keine Superlative, keine Emoji-Flut. Sprache: Deutsch (Du-Form), sofern nicht anders verlangt.';

const AI = {
  cfg: { anthropicKey: '', model: 'claude-opus-5-5', openaiKey: '', stt: 'local', lang: 'auto', whisperModel: 'onnx-community/whisper-base_timestamped', cloudConsent: false, visionConsent: false },
  async load() { const d = await DB.kvGet('ai', null); if (d) Object.assign(this.cfg, d); },
  save() { return DB.kvSet('ai', this.cfg).catch(e => toast(friendlyError(e), 'error')); },
  connected() { return !!(this.cfg.anthropicKey && this.cfg.anthropicKey.length > 20); },
  requireConnection() { if (this.connected()) return true; toast('KI-Verbindung erforderlich – richte sie im KI Studio ein.', 'error', { action: { label: 'Einrichten', fn: () => showView('ai') } }); return false; },
  /** Claude Messages API (raw fetch – single-file app, no bundler). */
  async claude({ system, prompt, images, maxTokens = 2500, effort = 'low' }) {
    if (!this.connected()) throw new Error('KI-Verbindung erforderlich');
    const model = this.cfg.model || 'claude-opus-5-5';
    const content = images && images.length ? [...images.map(im => ({ type: 'image', source: { type: 'base64', media_type: im.type, data: im.data } })), { type: 'text', text: prompt }] : prompt;
    const body = { model, max_tokens: maxTokens, system: system || MINDEA_VOICE, messages: [{ role: 'user', content }] };
    const headers = { 'content-type': 'application/json', 'x-api-key': this.cfg.anthropicKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    if (!model.includes('haiku')) { body.output_config = { effort }; body.fallbacks = 'default'; headers['anthropic-beta'] = 'server-side-fallback-2026-07-01'; }
    let r;
    try { r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body) }); }
    catch (e) { throw new Error('Keine Verbindung zur KI möglich. Prüfe deine Internetverbindung.'); }
    if (!r.ok) {
      let msg = ''; try { const j = await r.json(); msg = j.error && j.error.message || ''; } catch (e) { }
      if (r.status === 401) throw new Error('API-Schlüssel ungültig. Bitte im KI Studio prüfen.');
      if (r.status === 403) throw new Error('Zugriff verweigert – der API-Schlüssel hat keine Berechtigung für dieses Modell.');
      if (r.status === 429) throw new Error('Limit erreicht – bitte einen Moment warten und erneut versuchen.');
      if (r.status === 529 || r.status >= 500) throw new Error('Die KI ist gerade überlastet. Bitte gleich nochmal versuchen.');
      throw new Error('KI-Anfrage fehlgeschlagen' + (msg ? ': ' + msg.slice(0, 140) : ` (${r.status})`));
    }
    const d = await r.json();
    if (d.stop_reason === 'refusal') throw new Error('Die KI hat diese Anfrage abgelehnt. Formuliere sie bitte anders.');
    const text = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!text) throw new Error('Die KI hat keine Antwort geliefert.');
    return text;
  },
  async json(prompt, opts = {}) {
    const text = await this.claude({ ...opts, prompt: prompt + '\n\nAntworte ausschließlich mit gültigem JSON ohne Markdown-Codeblock.', system: (opts.system || MINDEA_VOICE) });
    const s = text.replace(/```json|```/g, '');
    const a = Math.min(...['{', '['].map(c => { const i = s.indexOf(c); return i < 0 ? Infinity : i; }));
    const b = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
    if (!isFinite(a) || b < a) throw new Error('Die KI-Antwort konnte nicht gelesen werden. Bitte erneut versuchen.');
    try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { throw new Error('Die KI-Antwort konnte nicht gelesen werden. Bitte erneut versuchen.'); }
  },
  async test() { const t = await this.claude({ prompt: 'Antworte nur mit: OK', maxTokens: 20, effort: 'low' }); return /ok/i.test(t); },
  /* ── consent ───────────────────────────────────────────────────────── */
  async consent(kind) {
    const key = kind === 'vision' ? 'visionConsent' : 'cloudConsent';
    if (this.cfg[key]) return true;
    const text = kind === 'vision'
      ? 'Für die Bildanalyse werden verkleinerte Vorschaubilder (max. 512 px) der ausgewählten Medien an Anthropic (Claude) übertragen, um Inhalte zu erkennen und Tags zu erzeugen. Deine Originaldateien bleiben lokal. Fortfahren?'
      : 'Für diese Funktion wird Text bzw. die Tonspur an den gewählten KI-Dienst übertragen. Deine Originaldateien bleiben lokal. Fortfahren?';
    const ok = await confirmDialog({ title: 'Daten an KI-Dienst übertragen?', text, ok: 'Einverstanden' });
    if (ok) { this.cfg[key] = true; this.save(); }
    return ok;
  },
  /* ── Vision tagging ────────────────────────────────────────────────── */
  async tagImages(ids, onProgress) {
    if (!this.requireConnection()) return 0;
    if (!(await this.consent('vision'))) return 0;
    let done = 0;
    const vocab = Object.keys(TAGS).join(', ');
    for (const id of ids) {
      const m = Media.get(id); if (!m || (m.kind !== 'image' && m.kind !== 'video')) continue;
      onProgress && onProgress(done, ids.length, m.name);
      try {
        const src = m.kind === 'image' ? await Media.img(id) : await loadThumbImg(id);
        if (!src) continue;
        const s = Math.min(1, 512 / Math.max(src.naturalWidth, src.naturalHeight)); const c = makeCanvas(src.naturalWidth * s, src.naturalHeight * s); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
        const data = c.toDataURL('image/jpeg', 0.82).split(',')[1];
        const r = await this.claude({ system: 'Du bist ein präziser Bildanalyst für eine Content-Mediathek. Antworte nur mit JSON.', prompt: `Analysiere das Bild. Wähle passende Tags NUR aus diesem Vokabular: ${vocab}. Optional bis zu 3 weitere kurze englische Tags. Antworte als JSON: {"tags": [..max 8..], "description": "ein kurzer deutscher Satz", "subject_x": 0-1 horizontale Position des Hauptmotivs, "text_space": "top"|"middle"|"bottom"|"none" (wo freie ruhige Fläche für Text ist)}`, images: [{ type: 'image/jpeg', data }], maxTokens: 400 })
          .then(t => { const a = t.indexOf('{'), b = t.lastIndexOf('}'); return JSON.parse(t.slice(a, b + 1)); });
        const tags = (r.tags || []).map(t => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 10);
        const an = Object.assign({}, m.analysis || {}, { subjectX: typeof r.subject_x === 'number' ? r.subject_x : undefined, textSpace: r.text_space });
        await Media.update(id, { aiTags: tags, desc: r.description || '', analysis: an });
        done++;
      } catch (e) { toast(friendlyError(e, m.name), 'error'); if (/Schlüssel|Limit|Verbindung/.test(e.message)) break; }
    }
    onProgress && onProgress(done, ids.length, '');
    return done;
  },
};

/* ── Speech-to-text ──────────────────────────────────────────────────── */
const WHISPER_WORKER_SRC = `
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';
env.allowLocalModels = false;
let asr = null, cur = null;
self.onmessage = async (e) => {
  const { audio, language, model } = e.data;
  try {
    if (!asr || cur !== model) {
      asr = await pipeline('automatic-speech-recognition', model, { progress_callback: (p) => self.postMessage({ type: 'progress', p }) });
      cur = model;
    }
    self.postMessage({ type: 'status', s: 'transcribing' });
    const opts = { chunk_length_s: 30, stride_length_s: 5, return_timestamps: 'word' };
    if (language && language !== 'auto') { opts.language = language; opts.task = 'transcribe'; }
    let out;
    try { out = await asr(audio, opts); out.granularity = 'word'; }
    catch (err) { opts.return_timestamps = true; out = await asr(audio, opts); out.granularity = 'segment'; }
    self.postMessage({ type: 'done', out: { text: out.text, chunks: out.chunks, granularity: out.granularity } });
  } catch (err) { self.postMessage({ type: 'error', message: String((err && err.message) || err) }); }
};`;
let _whisperWorker = null;
function whisperWorker() {
  if (_whisperWorker) return _whisperWorker;
  const url = URL.createObjectURL(new Blob([WHISPER_WORKER_SRC], { type: 'text/javascript' }));
  _whisperWorker = new Worker(url, { type: 'module' });
  return _whisperWorker;
}
/** Decode a media file's audio to 16 kHz mono Float32Array. */
async function audio16k(mediaId) {
  let buf;
  try { buf = await AudioCache.get(mediaId); } catch (e) { throw new Error('Die Tonspur konnte nicht gelesen werden. Tipp: Video als MP4 (H.264/AAC) exportieren.'); }
  const len = Math.ceil(buf.duration * 16000);
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const oc = new OAC(1, len, 16000);
  const src = oc.createBufferSource(); src.buffer = buf; src.connect(oc.destination); src.start();
  const out = await oc.startRendering();
  return out.getChannelData(0).slice();
}
function encodeWav16(f32, rate = 16000) {
  const b = new ArrayBuffer(44 + f32.length * 2), v = new DataView(b);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + f32.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, f32.length * 2, true);
  for (let i = 0; i < f32.length; i++) v.setInt16(44 + i * 2, clamp(f32[i], -1, 1) * 0x7FFF, true);
  return new Blob([b], { type: 'audio/wav' });
}
/** Words from segment-level chunks (estimated inside each real segment). */
function wordsFromSegments(chunks) {
  const out = [];
  for (const c of chunks || []) {
    const [s, e] = c.timestamp || [0, 0]; const ws = String(c.text || '').trim().split(/\s+/).filter(Boolean); if (!ws.length) continue;
    const tot = ws.reduce((n, w) => n + w.length + 1, 0); let t = s; const span = Math.max(0.1, (e ?? s + ws.length * 0.35) - s);
    for (const w of ws) { const d = (w.length + 1) / tot * span; out.push({ w, s: t, e: t + d }); t += d; }
  }
  return out;
}
const Transcriber = {
  /** → {words:[{w,s,e}], text, source, estimated} in media source time */
  async run(mediaId, { lang = 'auto', onProgress = () => { } } = {}) {
    const eng = AI.cfg.stt || 'local';
    onProgress('Tonspur wird vorbereitet …');
    const pcm = await audio16k(mediaId);
    if (eng === 'openai') return this.openai(pcm, lang, onProgress);
    return this.local(pcm, lang, onProgress);
  },
  local(pcm, lang, onProgress) {
    return new Promise((res, rej) => {
      let w;
      try { w = whisperWorker(); } catch (e) { rej(new Error('Lokale Spracherkennung wird von diesem Browser nicht unterstützt (Module Worker). Nutze einen aktuellen Browser oder OpenAI Whisper.')); return; }
      const files = {};
      const onMsg = e => {
        const d = e.data;
        if (d.type === 'progress') {
          const p = d.p || {};
          if (p.status === 'progress' && p.file) { files[p.file] = { l: p.loaded || 0, t: p.total || 0 }; const L = Object.values(files).reduce((a, f) => a + f.l, 0), T = Object.values(files).reduce((a, f) => a + f.t, 0); onProgress(`Sprachmodell wird geladen (einmalig) … ${T ? Math.round(L / T * 100) + ' %' : ''} · ${fmtBytes(L)}`); }
          else if (p.status === 'ready') onProgress('Sprachmodell bereit');
        } else if (d.type === 'status') onProgress('Sprache wird transkribiert … (läuft lokal, kann einige Minuten dauern)');
        else if (d.type === 'done') {
          w.removeEventListener('message', onMsg);
          const o = d.out; let words, est = false;
          if (o.granularity === 'word') words = (o.chunks || []).map(c => ({ w: String(c.text).trim(), s: c.timestamp[0], e: c.timestamp[1] ?? c.timestamp[0] + 0.3 })).filter(x => x.w);
          else { words = wordsFromSegments(o.chunks); est = true; }
          res({ words, text: String(o.text || '').trim(), source: 'Whisper lokal', estimated: est });
        } else if (d.type === 'error') {
          w.removeEventListener('message', onMsg);
          rej(new Error(/fetch|network|Failed/i.test(d.message) ? 'Das Sprachmodell konnte nicht geladen werden (Internetverbindung für den einmaligen Download nötig).' : 'Lokale Transkription fehlgeschlagen: ' + d.message.slice(0, 120)));
        }
      };
      w.addEventListener('message', onMsg);
      w.addEventListener('error', () => rej(new Error('Lokale Spracherkennung konnte nicht gestartet werden. Prüfe die Internetverbindung (einmaliger Modell-Download) oder nutze OpenAI Whisper.')), { once: true });
      w.postMessage({ audio: pcm, language: lang, model: AI.cfg.whisperModel || WHISPER_MODELS[1].v }, [pcm.buffer]);
    });
  },
  async openai(pcm, lang, onProgress) {
    if (!AI.cfg.openaiKey) throw new Error('Für OpenAI Whisper fehlt der API-Schlüssel (KI Studio › Verbindungen).');
    if (!(await AI.consent('cloud'))) throw new Error('Übertragung abgebrochen.');
    const wav = encodeWav16(pcm);
    if (wav.size > 24.5 * 1024 * 1024) throw new Error('Die Tonspur ist für OpenAI Whisper zu lang (max. ca. 13 Minuten). Kürze das Video oder nutze die lokale Erkennung.');
    onProgress('Tonspur wird an OpenAI Whisper gesendet …');
    const fd = new FormData(); fd.append('file', wav, 'audio.wav'); fd.append('model', 'whisper-1'); fd.append('response_format', 'verbose_json'); fd.append('timestamp_granularities[]', 'word'); fd.append('timestamp_granularities[]', 'segment');
    const iso = (STT_LANGS.find(l => l.v === lang) || {}).iso; if (iso) fd.append('language', iso);
    let r; try { r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + AI.cfg.openaiKey }, body: fd }); } catch (e) { throw new Error('Keine Verbindung zu OpenAI möglich.'); }
    if (!r.ok) throw new Error(r.status === 401 ? 'OpenAI-Schlüssel ungültig.' : 'OpenAI-Transkription fehlgeschlagen (' + r.status + ').');
    const d = await r.json();
    let words = (d.words || []).map(w => ({ w: w.word, s: w.start, e: w.end }));
    // restore punctuation from segment text where possible
    if (words.length && d.text) { const toks = d.text.trim().split(/\s+/); if (Math.abs(toks.length - words.length) <= 2) words = words.map((w, i) => ({ ...w, w: toks[i] || w.w })); }
    if (!words.length) words = wordsFromSegments((d.segments || []).map(s => ({ text: s.text, timestamp: [s.start, s.end] })));
    return { words, text: d.text || '', source: 'OpenAI Whisper', estimated: !(d.words && d.words.length), lang: d.language };
  },
};

/* ── KI Studio view ──────────────────────────────────────────────────── */
const AI_TOOLS = [
  { k: 'magic', l: 'Magic Design', d: 'Thema eingeben – Mindéa baut ein fertiges, editierbares Design.', i: 'wand' },
  { k: 'caption', l: 'Caption Writer', d: 'Hook, Haupttext, CTA und Hashtags für Instagram.', i: 'pen' },
  { k: 'hooks', l: 'Hook Generator', d: 'Erste Sätze, die zum Stehenbleiben bringen.', i: 'sparkle' },
  { k: 'script', l: 'Reel Script', d: 'Szenen, Voiceover und Text-Overlays für dein Reel.', i: 'video' },
  { k: 'carousel', l: 'Carousel Generator', d: 'Aus einem Thema oder Text ein fertiges Karussell.', i: 'carousel' },
  { k: 'repurpose', l: 'Content Repurpose', d: 'Ein Inhalt – Reel, Karussell, Story, Quote, Pin, Caption.', i: 'repurpose' },
  { k: 'rewrite', l: 'Brand Rewrite', d: 'Text in die ruhige Mindéa-Stimme übertragen.', i: 'brand' },
  { k: 'shorten', l: 'Kürzen', d: 'Auf das Wesentliche reduzieren.', i: 'minus' },
  { k: 'expand', l: 'Erweitern', d: 'Gedanken ausführen, ohne aufzublähen.', i: 'plus' },
  { k: 'cta', l: 'CTA verbessern', d: 'Klare, freundliche Handlungsaufforderungen.', i: 'arrow' },
  { k: 'headlines', l: 'Headlines', d: 'Varianten für Überschriften und Cover.', i: 'type' },
  { k: 'ideas', l: 'Content Ideas', d: 'Ideen mit Format, Hook und Ziel.', i: 'bulb' },
];
const AIUI = {
  root: null, tool: 'caption', out: null,
  mount(root) { this.root = root; this.sc = h('div', { class: 'scroll', style: { flex: 1 } }); root.appendChild(this.sc); },
  show() { this.render(); },
  render() {
    const sc = clear(this.sc); const w = h('div', { class: 'page' }); sc.appendChild(w);
    w.appendChild(h('div', { class: 'hero' }, h('div', null, h('div', { class: 'eyebrow' }, 'KI Studio'), h('h1', { class: 'h1' }, 'Gedanken in ', h('em', null, 'Content'), ' verwandeln.'), h('p', { class: 'lead' }, 'Texte, Skripte, Karussells und Designs – in der ruhigen Mindéa-Stimme. KI ist optional und nutzt deinen eigenen Schlüssel.')),
      h('div', { class: 'conn' + (AI.connected() ? ' on' : '') }, h('span', { class: 'dot' }), AI.connected() ? 'KI verbunden · ' + (AI_MODELS.find(m => m.v === AI.cfg.model)?.l.split(' –')[0] || AI.cfg.model) : 'KI-Verbindung erforderlich')));
    w.appendChild(this.connCard());
    w.appendChild(h('div', { class: 'sec-h', style: { marginTop: '26px' } }, h('h2', { class: 'h2' }, 'Werkzeuge'), btn('Smart Creator', () => smartCreator(), { cls: 'ghost', icon: 'wand' })));
    const g = h('div', { class: 'ai-grid' });
    AI_TOOLS.forEach(t => { const b = h('button', { class: 'ai-tool' + (t.k === this.tool ? ' on' : ''), type: 'button', onclick: () => { this.tool = t.k; this.out = null; this.render(); setTimeout(() => $('#ai-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); } }); b.innerHTML = `<span class="qi" style="color:var(--accent)">${icon(t.i)}</span><b>${t.l}</b><span>${t.d}</span>${AI.connected() ? '' : '<span class="badge warn" style="align-self:flex-start">KI-Verbindung erforderlich</span>'}`; g.appendChild(b); });
    w.appendChild(g);
    w.appendChild(this.form());
  },
  connCard() {
    const c = h('div', { class: 'card', style: { marginTop: '8px' } });
    const key = h('input', { class: 'input', type: 'password', value: AI.cfg.anthropicKey, placeholder: 'sk-ant-…', autocomplete: 'off', 'aria-label': 'Anthropic API-Schlüssel' });
    const okey = h('input', { class: 'input', type: 'password', value: AI.cfg.openaiKey, placeholder: 'sk-… (optional, nur für Whisper Cloud)', autocomplete: 'off', 'aria-label': 'OpenAI API-Schlüssel' });
    const status = h('span', { class: 'small muted' });
    const legacy = (() => { try { return localStorage.getItem('mindea_api_key') || ''; } catch (e) { return ''; } })();
    c.append(h('div', { class: 'row', style: { justifyContent: 'space-between', flexWrap: 'wrap' } }, h('h4', null, 'Verbindungen'), h('span', { class: 'badge', html: icon('shield', 's') + ' Local First' })),
      h('p', { class: 'small muted', style: { marginTop: '4px' } }, 'Ohne Verbindung funktionieren alle Editor-, Schnitt-, Untertitel- und Export-Funktionen vollständig lokal. Schlüssel werden nur in diesem Browser gespeichert und ausschließlich an den jeweiligen Anbieter gesendet.'),
      h('div', { class: 'two-col' },
        h('div', null, field('Anthropic API-Schlüssel (Claude: Texte, Bildanalyse)', key), legacy && !AI.cfg.anthropicKey ? btn('Schlüssel aus dem Mindéa Workspace übernehmen', () => { key.value = legacy; }, { cls: 'sm ghost', icon: 'key' }) : null,
          field('Modell', selectEl(AI_MODELS, AI.cfg.model, v => { AI.cfg.model = v; AI.save(); })),
          h('div', { class: 'row wrap' }, btn('Speichern & testen', async (ev) => { const b = ev.currentTarget; AI.cfg.anthropicKey = key.value.trim(); await AI.save(); if (!AI.connected()) { status.textContent = 'Schlüssel entfernt – KI deaktiviert.'; this.render(); return; } setBtnBusy(b, true); status.textContent = 'Teste Verbindung …'; try { await AI.test(); toast('KI verbunden.', 'success'); this.render(); } catch (e) { status.textContent = friendlyError(e); setBtnBusy(b, false); } }, { cls: 'primary', icon: 'check' }), AI.cfg.anthropicKey ? btn('Trennen', async () => { AI.cfg.anthropicKey = ''; AI.cfg.cloudConsent = AI.cfg.visionConsent = false; await AI.save(); this.render(); }, { cls: 'ghost danger' }) : null), status),
        h('div', null, field('Spracherkennung (Transkription)', selectEl(STT_ENGINES.map(e => ({ v: e.v, l: e.l })), AI.cfg.stt, v => { AI.cfg.stt = v; AI.save(); this.render(); })),
          AI.cfg.stt === 'local' ? field('Lokales Modell', selectEl(WHISPER_MODELS, AI.cfg.whisperModel, v => { AI.cfg.whisperModel = v; AI.save(); })) : field('OpenAI API-Schlüssel', okey),
          AI.cfg.stt === 'openai' ? btn('Speichern', async () => { AI.cfg.openaiKey = okey.value.trim(); await AI.save(); toast('Gespeichert', 'success'); }, { cls: 'sm' }) : null,
          h('div', { class: 'notice', style: { marginTop: '8px' } }, iconEl(STT_ENGINES.find(e => e.v === AI.cfg.stt).cloud ? 'cloud' : 'shield', 's'), h('span', null, STT_ENGINES.find(e => e.v === AI.cfg.stt).note)))));
    if (AI.cfg.cloudConsent || AI.cfg.visionConsent) c.appendChild(h('div', { class: 'row', style: { marginTop: '10px' } }, h('span', { class: 'tiny muted' }, 'Erteilte Einwilligungen: ' + [AI.cfg.cloudConsent && 'Text/Audio', AI.cfg.visionConsent && 'Bildanalyse'].filter(Boolean).join(', ')), btn('Widerrufen', () => { AI.cfg.cloudConsent = AI.cfg.visionConsent = false; AI.save(); this.render(); }, { cls: 'sm ghost' })));
    return c;
  },
  form() {
    const t = AI_TOOLS.find(x => x.k === this.tool); const card = h('div', { class: 'card', id: 'ai-form', style: { marginTop: '16px' } });
    card.appendChild(h('h4', null, t.l)); card.appendChild(h('p', { class: 'small muted', style: { marginTop: '2px' } }, t.d));
    const F = {}; const inp = (k, l, ph, area) => { const e = area ? h('textarea', { class: 'textarea', placeholder: ph, 'aria-label': l }) : h('input', { class: 'input', placeholder: ph, 'aria-label': l }); F[k] = e; return field(l, e); };
    const sel = (k, l, opts, v) => { const e = selectEl(opts, v, () => { }); F[k] = e; return field(l, e); };
    const tr = App.project && App.project.video && App.project.video.transcript ? App.project.video.transcript.text : '';
    const body = h('div');
    if (this.tool === 'magic') body.append(inp('topic', 'Thema', 'z. B. Warum leise Marken lauter wirken'), h('div', { class: 'grid2' }, sel('fmt', 'Format', Object.entries(FORMATS).filter(([k]) => k !== 'custom').map(([k, f]) => ({ v: k, l: f.label })), 'post45'), sel('style', 'Stil', Object.entries(BRAND_STYLES).map(([k, s]) => ({ v: k, l: s.l })), 'signature')));
    else if (this.tool === 'caption') body.append(inp('topic', 'Thema', 'z. B. Mein Weg zur Gründung von Mindéa'), h('div', { class: 'grid2' }, inp('goal', 'Ziel', 'z. B. Vertrauen aufbauen, Anfragen'), inp('aud', 'Zielgruppe', 'z. B. Coaches & Gründerinnen'), sel('tone', 'Ton', ['ruhig & persönlich', 'klar & fachlich', 'emotional', 'inspirierend', 'direkt'], 'ruhig & persönlich'), inp('cta', 'CTA', 'z. B. Schreib mir „Marke“'), sel('len', 'Länge', ['kurz', 'mittel', 'lang'], 'mittel'), sel('tags', 'Hashtags', ['ja', 'nein'], 'ja')));
    else if (this.tool === 'hooks') body.append(inp('topic', 'Thema', 'z. B. Warum Stockfotos deine Marke austauschbar machen'), sel('n', 'Anzahl', ['5', '10', '15'], '10'));
    else if (this.tool === 'script') body.append(inp('topic', 'Thema', 'z. B. Behind the Scenes eines Markenfilms'), h('div', { class: 'grid2' }, sel('dur', 'Dauer', ['15 s', '30 s', '60 s', '90 s'], '30 s'), sel('tone', 'Ton', ['ruhig & persönlich', 'klar & fachlich', 'emotional', 'cinematic'], 'ruhig & persönlich')));
    else if (this.tool === 'carousel') { body.append(inp('text', 'Thema oder Text', 'Thema eingeben oder längeren Text einfügen …', true)); F.text.value = tr; }
    else if (this.tool === 'repurpose') { body.append(inp('text', 'Ausgangsinhalt (Text, Skript, Transkript)', 'Füge hier deinen Inhalt ein …', true)); F.text.value = tr; }
    else if (this.tool === 'ideas') body.append(inp('topic', 'Bereich / Thema', 'z. B. Markenfilme für Coaches'), sel('n', 'Anzahl', ['5', '10', '20'], '10'));
    else body.append(inp('text', 'Text', 'Füge hier deinen Text ein …', true));
    card.appendChild(body);
    const outBox = h('div', { style: { marginTop: '14px' } });
    const go = btn(AI.connected() ? 'Erstellen' : 'KI-Verbindung erforderlich', async () => {
      if (!AI.connected()) { $('#ai-form')?.parentElement?.querySelector('.card input')?.focus(); toast('Bitte oben deinen Anthropic-Schlüssel eintragen.', 'info'); return; }
      const val = k => F[k] ? F[k].value.trim() : '';
      if ((F.topic && !val('topic')) || (F.text && !val('text'))) { toast('Bitte zuerst Thema bzw. Text eingeben.', 'info'); return; }
      if (!(await AI.consent('cloud'))) return;
      setBtnBusy(go, true); clear(outBox).appendChild(h('div', { class: 'row' }, h('div', { class: 'spinner' }), h('span', { class: 'muted' }, 'Die KI schreibt …')));
      try { await this.run(val, outBox); } catch (e) { clear(outBox).appendChild(h('div', { class: 'notice warn' }, iconEl('warn', 's'), h('span', null, friendlyError(e)))); }
      setBtnBusy(go, false);
    }, { cls: 'primary', icon: 'ai' });
    card.append(h('div', { style: { height: '6px' } }), go, outBox);
    return card;
  },
  blocks(outBox, list) {
    clear(outBox); const o = h('div', { class: 'ai-out' });
    list.forEach(([title, text]) => { if (!text) return; const b = h('div', { class: 'blk' }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h6', null, title), ibtn('copy', 'Kopieren', () => copyText(text), { size: 's' })), h('div', null, text)); o.appendChild(b); });
    outBox.appendChild(o);
    const all = list.filter(x => x[1]).map(([t, x]) => x).join('\n\n');
    outBox.appendChild(h('div', { class: 'row wrap', style: { marginTop: '10px' } }, btn('Alles kopieren', () => copyText(all), { cls: 'sm', icon: 'copy' }), App.project && App.project.type !== 'video' ? btn('Als Text ins Design', () => { showView('design'); setTimeout(() => Design.addText('body', { text: list[0][1] }), 50); }, { cls: 'sm', icon: 'text' }) : null));
  },
  async run(val, outBox) {
    const k = this.tool;
    if (k === 'caption') {
      const r = await AI.json(`Schreibe eine Instagram-Caption. Thema: ${val('topic')}. Ziel: ${val('goal') || 'Vertrauen'}. Zielgruppe: ${val('aud') || 'Selbstständige'}. Ton: ${val('tone')}. CTA: ${val('cta') || 'passend wählen'}. Länge: ${val('len')}. ${val('tags') === 'ja' ? 'Mit 8–12 passenden, nicht generischen Hashtags.' : 'Ohne Hashtags.'} JSON: {"hook": "...", "body": "...", "cta": "...", "hashtags": ["#..."]}`, { maxTokens: 1500 });
      this.blocks(outBox, [['Hook', r.hook], ['Haupttext', r.body], ['CTA', r.cta], ['Hashtags', (r.hashtags || []).join(' ')]]);
    } else if (k === 'hooks') {
      const r = await AI.json(`Erzeuge ${val('n')} Hooks (erste Sätze für Reels/Posts) zum Thema: ${val('topic')}. Abwechslungsreich (Frage, Aussage, Zahl, Widerspruch), max. 12 Wörter, Mindéa-Ton. JSON: {"hooks": ["..."]}`, { maxTokens: 1200 });
      this.blocks(outBox, [['Hooks', (r.hooks || []).map((x, i) => (i + 1) + '. ' + x).join('\n')]]);
    } else if (k === 'script') {
      const r = await AI.json(`Schreibe ein Reel-Skript (${val('dur')}) zum Thema: ${val('topic')}. Ton: ${val('tone')}. JSON: {"hook": "...", "scenes": [{"time": "0–3 s", "visual": "...", "voiceover": "...", "overlay": "max 6 Wörter"}], "cta": "...", "caption": "..."}`, { maxTokens: 2500 });
      const scenes = (r.scenes || []).map(s => `${s.time}\nBild: ${s.visual}\nVoiceover: ${s.voiceover}\nText: ${s.overlay}`).join('\n\n');
      this.blocks(outBox, [['Hook', r.hook], ['Szenen', scenes], ['CTA', r.cta], ['Caption', r.caption]]);
      const vo = [r.hook, ...(r.scenes || []).map(s => s.voiceover), r.cta].filter(Boolean).join(' ');
      outBox.appendChild(h('div', { class: 'row wrap', style: { marginTop: '8px' } }, btn('Voiceover als Untertitel-Skript übernehmen', () => { if (!App.project || App.project.type !== 'video') { toast('Öffne zuerst ein Video-Projekt.', 'info'); return; } App.project.video._script = vo; CaptionsUI.src = 'script'; showView('captions'); }, { cls: 'sm', icon: 'captions' })));
    } else if (k === 'carousel') { CarouselUI.prefill = { text: val('text'), useAI: true }; showView('carousel'); }
    else if (k === 'repurpose') {
      const r = await AI.json(`Repurpose diesen Inhalt für Mindéa in mehrere Formate:\n"""${val('text').slice(0, 12000)}"""\nJSON: {"reel_hook": "...", "reel_script": "...", "instagram_caption": "...", "carousel": ["Slide 1 …", "..."], "story_frames": ["..."], "quote": "max 18 Wörter", "pin_title": "...", "pin_description": "..."}`, { maxTokens: 3000 });
      this.blocks(outBox, [['Reel Hook', r.reel_hook], ['Reel Skript', r.reel_script], ['Instagram Caption', r.instagram_caption], ['Karussell', (r.carousel || []).join('\n')], ['Story', (r.story_frames || []).join('\n')], ['Quote', r.quote], ['Pinterest', [r.pin_title, r.pin_description].filter(Boolean).join('\n')]]);
      outBox.appendChild(h('div', { class: 'row wrap', style: { marginTop: '8px' } }, btn('Karussell bauen', () => { CarouselUI.prefill = { text: val('text'), useAI: true }; showView('carousel'); }, { cls: 'sm', icon: 'carousel' }), r.quote ? btn('Quote Post bauen', () => buildQuotePost(r.quote), { cls: 'sm', icon: 'quote' }) : null));
    } else if (k === 'magic') {
      const r = await AI.json(`Entwirf einen Social-Media-Post zum Thema „${val('topic')}“ im Format ${FORMATS[val('fmt')].label}. Wähle die passendste Vorlage aus: ${TEMPLATES.filter(t => t.id !== 'blank').map(t => t.id + ' (' + t.name + ')').join(', ')}. JSON: {"template": "id", "headline": "max 9 Wörter", "subheadline": "max 4 Wörter", "body": "max 30 Wörter", "cta": "max 5 Wörter", "image_tags": ["tags aus: ${Object.keys(TAGS).join(', ')}"]}`, { maxTokens: 900 });
      await createFromWizard({ fmt: val('fmt'), style: val('style'), tpl: TEMPLATES.find(t => t.id === r.template) ? r.template : 'founder-quote', headline: r.headline, body: r.body, cta: r.cta, what: val('topic'), media: Media.rank(new Map((r.image_tags || []).map(t => [String(t).toLowerCase(), 1])), { aspect: 0.8 }).filter(x => x.rel > 0).slice(0, 3).map(x => x.m.id) });
    } else if (k === 'ideas') {
      const r = await AI.json(`Erzeuge ${val('n')} Content-Ideen für Instagram zum Bereich: ${val('topic')}. JSON: {"ideas": [{"title": "...", "format": "Reel|Karussell|Story|Post", "hook": "...", "goal": "..."}]}`, { maxTokens: 2500 });
      this.blocks(outBox, [['Ideen', (r.ideas || []).map((x, i) => `${i + 1}. ${x.title} (${x.format})\n   Hook: ${x.hook}\n   Ziel: ${x.goal}`).join('\n\n')]]);
    } else {
      const task = { rewrite: 'Schreibe diesen Text in der Mindéa-Markenstimme neu (ruhig, warm, klar, hochwertig). Inhalt beibehalten.', shorten: 'Kürze diesen Text auf etwa die Hälfte. Kernaussage behalten, Mindéa-Ton.', expand: 'Erweitere diesen Text behutsam (ca. 1,5-fache Länge) mit konkreten Gedanken, ohne Floskeln, Mindéa-Ton.', cta: 'Formuliere 6 bessere, freundliche und klare Call-to-Actions zu diesem Text, jeweils eine Zeile.', headlines: 'Erzeuge 10 Headlines/Cover-Titel (max. 8 Wörter) zu diesem Text, jeweils eine Zeile.' }[k];
      const t = await AI.claude({ prompt: `${task}\nGib nur das Ergebnis aus, ohne Einleitung.\n\nText:\n"""${val('text').slice(0, 12000)}"""`, maxTokens: 2500 });
      this.blocks(outBox, [[AI_TOOLS.find(x => x.k === k).l, t]]);
    }
  },
};
function copyText(t) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Kopiert', 'success', { duration: 1400 })).catch(() => { const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Kopiert', 'success'); } catch (e) { toast('Kopieren nicht möglich', 'error'); } ta.remove(); }); }
