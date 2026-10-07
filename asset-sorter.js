/* ═══════════════════════════════════════════════════════════════════════
   MINDÉA ASSET SORTER — KI-Materialassistent für Kundenprojekte
   ───────────────────────────────────────────────────────────────────────
   Eigenständiges Modul. Nutzt aus index.html nur lesend:
     lsGet(), convos, apiKey, showToast(), openMod()
   Kundenmaterial bleibt lokal (IndexedDB) und wird NICHT mit Supabase
   synchronisiert, nicht in die Bibliothek oder das JSON-Backup geschrieben.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

// ─── KONSTANTEN ──────────────────────────────────────────────────────────
const CATS = ['PORTRAITS','PRODUKTE','DETAILS','ARBEITSPLATZ','RÄUME','VERPACKUNG','LOGO','BRAND ELEMENTS','LIFESTYLE','BEHIND THE SCENES','KUNDENREFERENZEN','MOOD / ATMOSPHÄRE','VIDEOS','VOICEOVER','SONSTIGES'];
const SPECIAL_CATS = ['DUPLIKATE','SCHWACHE QUALITÄT','NICHT VERWENDBAR'];
const STATUSES = ['TOP ASSET','GUT VERWENDBAR','NUR ERGÄNZEND','SCHWACH','NICHT VERWENDBAR'];
const UNCHECKED = 'NICHT BEURTEILBAR';
const SCENES = ['HOOK','INTRO','PROBLEM','BRAND STORY','PRODUKTDETAIL','EMOTIONALER MOMENT','TRANSITION','HERO SHOT','CTA','ENDCARD'];
const TOOLS = ['Veo','Runway','Pika','Krea'];
const PIPE = ['NEU','ANALYSE LÄUFT','ANALYSIERT','VERWENDBAR','FEHLT NOCH MATERIAL','BEREIT FÜR PRODUKTION'];
const NONE = '__none';
const PKG = {
  bp: {name:'Brand Presence', minUsable:8},
  bs: {name:'Brand Story',    minUsable:12},
  bi: {name:'Brand Impact',   minUsable:16},
};
const PKG_ALIAS = {presence:'bp', story:'bs', impact:'bi', bp:'bp', bs:'bs', bi:'bi'};
const PROJ_STATUS = {offen:'Offen', arbeit:'In Arbeit', feedback:'Feedback', final:'Final'};
// Modelle: Standard ist Claude Opus 5.5 (präzise). Haiku 4.5 als günstige Option.
const MODELS = {
  'claude-opus-5-5': {label:'Präzise · Claude Opus 5.5', inP:4, outP:20},
  'claude-haiku-4-5': {label:'Günstig · Claude Haiku 4.5', inP:1, outP:5},
};
const AI_BATCH = 6;          // Bilder pro KI-Anfrage
const MAX_ORIGINAL = 400e6;  // Originale > 400 MB werden nicht lokal gespeichert
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Prüfungen, die nur visuell (KI) beurteilt werden können
const AI_CHECKS = [
  ['beschnitt','Beschnitt'],['perspektive','Perspektive'],['hauttoene','Hauttöne'],['farbstimmung','Farbstimmung'],
  ['logo_sichtbarkeit','Logo-Sichtbarkeit'],['lesbarkeit','Lesbarkeit'],['professionalitaet','Professionalität'],
  ['premium','Premium-Wirkung'],['ki_artefakte','KI-Artefakte'],['haende','Hände'],['gesichter','Gesichter'],
  ['materialien','Materialien'],['schrift','Schrift'],['logo_korrekt','Logo korrekt'],['inkonsistenzen','Optische Inkonsistenzen'],
];
const NA_TXT = 'Nicht zuverlässig beurteilbar';

// Dateinamen-Schlüsselwörter → Kategorie (lokal, kostenlos)
const KEYWORDS = {
  'PORTRAITS': ['portrait','portraet','portrat','headshot','gruenderin','grunderin','gruender','founder','selfie','team','kopf','person','ich','about','mich'],
  'DETAILS': ['detail','details','makro','macro','closeup','close','nah','nahaufnahme','textur','texture','struktur'],
  'PRODUKTE': ['produkt','produkte','product','products','packshot','artikel','kollektion','collection','ring','ringe','kette','armband','ohrring','ohrringe','schmuck','jewelry','jewellery','kerze','flasche','bottle','shop'],
  'ARBEITSPLATZ': ['arbeitsplatz','workspace','desk','schreibtisch','atelier','werkstatt','workshop','office','buero','buro','arbeit','working','prozess','process','making','herstellung'],
  'RÄUME': ['raum','raeume','room','rooms','interior','innen','praxis','laden','store','salon','location','haus','aussen','gebaeude','studio'],
  'VERPACKUNG': ['verpackung','packaging','box','karton','unboxing','paket','tuete','geschenk','giftbox'],
  'LOGO': ['logo','logos','signet','wortmarke','bildmarke','favicon','icon'],
  'BRAND ELEMENTS': ['brand','branding','ci','cd','styleguide','farben','colors','colours','palette','font','fonts','schrift','pattern','muster','grafik','graphic','flyer','visitenkarte','banner','briefpapier'],
  'LIFESTYLE': ['lifestyle','outfit','getragen','tragen','worn','wearing','model','anwendung','benutzung','using','alltag','braut','bride','hochzeit','wedding'],
  'BEHIND THE SCENES': ['bts','behind','backstage','makingof','kulissen'],
  'KUNDENREFERENZEN': ['kunde','kundin','kunden','review','reviews','bewertung','testimonial','testimonials','feedback','referenz','referenzen','rezension'],
  'MOOD / ATMOSPHÄRE': ['mood','moodboard','atmosphaere','atmosphare','stimmung','inspiration','inspo','natur','nature','sunset','himmel','sky'],
  'VOICEOVER': ['voice','voiceover','vo','sprach','sprachaufnahme','sprachmemo','stimme','aufnahme','memo','narration','sprechertext'],
};
const MUSIC_WORDS = ['musik','music','song','track','beat','soundtrack'];
// Typische Bildschirmauflösungen (Screenshots)
const SCREEN_DIMS = new Set(['750x1334','828x1792','1125x2436','1242x2688','1170x2532','1179x2556','1284x2778','1290x2796','1206x2622','1320x2868','1080x2340','1080x2400','1440x3200','1440x3120','1536x2048','1620x2160','1640x2360','1668x2224','1668x2388','2048x2732','1920x1080','2560x1440','2880x1800','2560x1600','3024x1964','3456x2234','1440x900','1366x768','3840x2160']);
const AI_META = /c2pa|trainedAlgorithmicMedia|compositeWithTrainedAlgorithmicMedia|Midjourney|DALL[·\-\s]?E|Adobe Firefly|Stable Diffusion|ComfyUI|Imagen|Leonardo\.ai|Ideogram|NovelAI|invokeai/i;

// ─── UTILS ───────────────────────────────────────────────────────────────
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;
const uid = () => 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').trim();
const fmtBytes = b => b > 1e9 ? (b/1e9).toFixed(1)+' GB' : b > 1e6 ? (b/1e6).toFixed(1)+' MB' : Math.max(1, Math.round(b/1e3))+' KB';
const fmtDur = s => !isFinite(s) ? '–' : s < 60 ? s.toFixed(1)+' s' : Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0')+' min';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const toast = m => { try { if (typeof showToast === 'function') showToast(m); } catch (e) {} };
const lsRead = (k, fb) => { try { if (typeof lsGet === 'function') return lsGet(k, fb); const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fb; } catch (e) { return fb; } };
const getKey = () => { try { return (typeof apiKey !== 'undefined' && apiKey) || localStorage.getItem('mindea_api_key') || ''; } catch (e) { return ''; } };
const prefGet = (k, fb) => { try { const v = localStorage.getItem('mindea-as-' + k); return v === null ? fb : v; } catch (e) { return fb; } };
const prefSet = (k, v) => { try { localStorage.setItem('mindea-as-' + k, v); } catch (e) {} };
const extOf = n => (String(n).split('.').pop() || '').toLowerCase();
const median = arr => { if (!arr.length) return 0; const s = [...arr].sort((a,b)=>a-b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m-1]+s[m])/2; };
const popc = [0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4];
function hamming(a, b) { if (!a || !b || a.length !== b.length) return 99; let d = 0; for (let i = 0; i < a.length; i++) d += popc[parseInt(a[i],16) ^ parseInt(b[i],16)]; return d; }

// ─── INDEXEDDB ───────────────────────────────────────────────────────────
// Stores: assets (Metadaten+Analyse), blobs (Original+Thumbnail), meta (Board, Kontext, Report je Projekt)
const DB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const rq = indexedDB.open('mindea-asset-sorter', 1);
      rq.onupgradeneeded = () => {
        const d = rq.result;
        if (!d.objectStoreNames.contains('assets')) d.createObjectStore('assets', {keyPath:'id'}).createIndex('projectId', 'projectId');
        if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs', {keyPath:'id'});
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', {keyPath:'key'});
      };
      rq.onsuccess = () => { this.db = rq.result; res(this.db); };
      rq.onerror = () => rej(rq.error);
    });
  },
  async run(store, mode, fn) {
    const d = await this.open();
    return new Promise((res, rej) => {
      const tx = d.transaction(store, mode); const st = tx.objectStore(store);
      let out; const r = fn(st); if (r) r.onsuccess = () => { out = r.result; };
      tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
    });
  },
  get(store, key) { return this.run(store, 'readonly', st => st.get(key)); },
  put(store, val) { return this.run(store, 'readwrite', st => st.put(val)); },
  del(store, key) { return this.run(store, 'readwrite', st => st.delete(key)); },
  byProject(pid) { return this.run('assets', 'readonly', st => st.index('projectId').getAll(pid)); },
  all(store) { return this.run(store, 'readonly', st => st.getAll()); },
  async putMany(store, vals) { const d = await this.open(); return new Promise((res, rej) => { const tx = d.transaction(store, 'readwrite'); const st = tx.objectStore(store); vals.forEach(v => st.put(v)); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); },
};

// ─── ZUSTAND ─────────────────────────────────────────────────────────────
const S = {
  root: null, projectId: null, assets: [], ctx: {}, board: null, report: null,
  tab: 'overview', query: '', filters: {}, showSimilar: false, selectMode: false, selected: new Set(),
  busy: null, progress: null, urls: new Map(), groups: [], gaps: null, sheetId: null,
  tool: prefGet('tool', 'Veo'), model: prefGet('model', 'claude-opus-5-5'),
};
if (!MODELS[S.model]) S.model = 'claude-opus-5-5';

// ─── PROJEKTE (bestehende Mindéa-Daten, keine zweite Kundendatenbank) ────
function projects() { const p = lsRead('mindea-projekte', []); return Array.isArray(p) ? p : []; }
function currentProject() { return S.projectId === NONE ? null : projects().find(p => String(p.id) === String(S.projectId)) || null; }
function pkgCode(p) {
  const c = PKG_ALIAS[(p && p.pkg) || ''];
  if (c) return c;
  const b = p && briefingFor(p); return (b && PKG_ALIAS[b.pkg]) || PKG_ALIAS[(S.ctx && S.ctx.pkg) || ''] || null;
}
function briefingFor(p) { if (!p) return null; const n = norm(p.name); return (lsRead('mindea-briefings', []) || []).find(b => norm(b.name) === n) || null; }
function scriptFor(p, code) {
  // Letztes generiertes Skript im passenden Paket-Modul (Brand Presence/Story/Impact), das den Projektnamen erwähnt
  if (!p || !code) return '';
  let list = [];
  try { list = (typeof convos !== 'undefined' && convos && convos[code]) || lsRead('mindea-convos', {})[code] || []; } catch (e) {}
  const n = norm(p.name).split(/[·,\-–]/)[0].trim();
  if (!n) return '';
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].role === 'user' && norm(list[i].content).includes(n)) {
      const a = list.slice(i + 1).find(m => m.role === 'assistant');
      if (a && a.content && !String(a.content).startsWith('[')) return String(a.content);
    }
  }
  return '';
}
function firstName(p, b) {
  const raw = (b && b.name) || (p && p.name) || '';
  const w = raw.split(/[·,\-–|/]/)[0].trim().split(/\s+/)[0];
  return w || '';
}
function projectContext() {
  const p = currentProject(); const code = pkgCode(p); const b = briefingFor(p); const c = S.ctx || {};
  const detected = scriptFor(p, code);
  const script = c.skript || detected;
  let vo = c.voiceover || '';
  if (!vo && script) { const m = script.match(/voice[\s-]?over[^\n]*\n?([\s\S]{0,1200})/i); if (m) vo = m[1].trim(); }
  return {
    project: p, code, pkgName: code ? PKG[code].name : '', status: p ? (PROJ_STATUS[p.status] || p.status || '') : '',
    briefing: b, script, scriptSource: c.skript ? 'manuell' : detected ? 'Mindéa-Modul' : '',
    voiceover: vo, marke: c.marke || '', ziel: c.ziel || (b && b.beschreibung) || '', branche: c.branche || (b && b.branche) || '',
    wirkung: c.wirkung || (b && b.gefuehl) || '', story: c.story || '', stil: c.stil || '', szenen: c.szenen || '',
    zielgruppe: (b && b.zielgruppe) || '', firstName: firstName(p, b),
  };
}
function contextText(maxScript) {
  const k = projectContext();
  if (!k.project) return 'Kein Kundenprojekt ausgewählt. Bewerte allgemein für einen hochwertigen Markenfilm.';
  const L = ['PROJEKT: ' + k.project.name, 'PAKET: ' + (k.pkgName || 'unbekannt'), 'PROJEKTSTATUS: ' + (k.status || '–')];
  if (k.marke) L.push('MARKE: ' + k.marke);
  if (k.branche) L.push('BRANCHE: ' + k.branche);
  if (k.zielgruppe) L.push('ZIELGRUPPE: ' + k.zielgruppe);
  if (k.ziel) L.push('ZIEL / BRIEFING: ' + k.ziel);
  if (k.wirkung) L.push('GEWÜNSCHTE WIRKUNG: ' + k.wirkung);
  if (k.stil) L.push('MARKENSTIL: ' + k.stil);
  if (k.story) L.push('STORY: ' + k.story);
  if (k.szenen) L.push('BESTEHENDE SZENEN: ' + k.szenen);
  if (k.voiceover) L.push('VOICEOVER: ' + k.voiceover.slice(0, 1200));
  if (k.script) L.push('BESTEHENDES SKRIPT (Auszug): ' + k.script.slice(0, maxScript || 3500));
  return L.join('\n');
}

// ─── LOKALE ANALYSE ──────────────────────────────────────────────────────
function kindOf(file) {
  const t = file.type || ''; const e = extOf(file.name);
  if (t.startsWith('video/') || ['mp4','mov','m4v','webm','avi','mkv','3gp'].includes(e)) return 'video';
  if (t.startsWith('audio/') || ['mp3','m4a','wav','aac','ogg','oga','flac','aif','aiff','caf','opus','amr'].includes(e)) return 'audio';
  if (e === 'svg' || t === 'image/svg+xml') return 'graphic';
  if (t.startsWith('image/') || ['jpg','jpeg','png','webp','heic','heif','gif','avif','tif','tiff','bmp'].includes(e)) return 'image';
  if (['pdf','ai','eps','psd','indd'].includes(e)) return 'document';
  return 'other';
}
function tokens(name) { return norm(name.replace(/\.[^.]+$/, '')).split(/[^a-z0-9]+/).filter(Boolean); }

async function sha256(file) {
  // Voller Hash bis 64 MB, darüber Stichproben-Hash (Anfang+Ende+Größe) — schnell und speicherschonend
  const partial = file.size > 64e6;
  let buf;
  if (partial) {
    const a = await file.slice(0, 4e6).arrayBuffer(); const b = await file.slice(file.size - 4e6).arrayBuffer();
    const sz = new TextEncoder().encode(String(file.size));
    buf = new Uint8Array(a.byteLength + b.byteLength + sz.length); buf.set(new Uint8Array(a), 0); buf.set(new Uint8Array(b), a.byteLength); buf.set(sz, a.byteLength + b.byteLength);
  } else buf = new Uint8Array(await file.arrayBuffer());
  if (window.crypto && crypto.subtle) {
    const h = await crypto.subtle.digest('SHA-256', buf);
    return {hash: [...new Uint8Array(h)].map(x => x.toString(16).padStart(2,'0')).join(''), partial};
  }
  let h1 = 0x811c9dc5; for (let i = 0; i < buf.length; i += (buf.length > 4e6 ? 7 : 1)) { h1 ^= buf[i]; h1 = Math.imul(h1, 16777619); }
  return {hash: 'fnv' + (h1 >>> 0).toString(16) + '-' + file.size, partial: true};
}

async function readMeta(file) {
  const out = {};
  try {
    const buf = await file.slice(0, 262144).arrayBuffer(); const v = new DataView(buf); const len = buf.byteLength;
    const str = (o, n) => { let s = ''; for (let i = 0; i < n && o + i < len; i++) s += String.fromCharCode(v.getUint8(o + i)); return s; };
    if (len > 4 && v.getUint16(0) === 0xFFD8) {
      let off = 2;
      while (off < len - 4) {
        const mk = v.getUint16(off); if ((mk & 0xFF00) !== 0xFF00) break;
        const sz = v.getUint16(off + 2);
        if (mk === 0xFFE1 && str(off + 4, 4) === 'Exif') parseTiff(v, off + 10, len, out);
        if (mk === 0xFFDA) break;
        off += 2 + sz;
      }
    } else if (len > 8 && v.getUint32(0) === 0x89504E47) {
      let off = 8; out.png = {};
      while (off < len - 12) {
        const n = v.getUint32(off); const type = str(off + 4, 4);
        if (type === 'tEXt' || type === 'iTXt') { const t = str(off + 8, Math.min(n, 2000)); const kw = t.split('\0')[0]; out.png[kw] = t.slice(kw.length + 1, kw.length + 300); if (/^(parameters|prompt|workflow|Dream|sd-metadata)$/i.test(kw)) out.aiHint = 'PNG-Metadaten (' + kw + ')'; }
        if (type === 'IHDR') { out.pngColorType = v.getUint8(off + 8 + 9); }
        if (type === 'IDAT' || type === 'IEND') break;
        off += 12 + n;
      }
    }
    let txt = '';
    try { txt = new TextDecoder('iso-8859-1').decode(buf); } catch (e) {}
    const m = txt.match(AI_META); if (m && !out.aiHint) out.aiHint = m[0];
    if (/<x:xmpmeta/.test(txt)) out.xmp = true;
  } catch (e) {}
  return out;
}
function parseTiff(v, t, len, out) {
  try {
    const le = v.getUint16(t) === 0x4949; const g16 = o => v.getUint16(o, le); const g32 = o => v.getUint32(o, le);
    const readAscii = (o, n) => { let s = ''; for (let i = 0; i < n - 1 && o + i < len; i++) { const c = v.getUint8(o + i); if (!c) break; s += String.fromCharCode(c); } return s.trim(); };
    const ifd = (o, cb) => { if (o <= 0 || o + 2 > len) return; const n = g16(o); for (let i = 0; i < n; i++) { const e = o + 2 + i * 12; if (e + 12 > len) return; cb(g16(e), g16(e + 2), g32(e + 4), e + 8); } };
    const val = (type, count, vo) => {
      if (type === 2) return readAscii(count <= 4 ? vo : t + g32(vo), count);
      if (type === 3) return g16(vo);
      if (type === 4) return g32(vo);
      if (type === 5 || type === 10) { const o = t + g32(vo); if (o + 8 > len) return null; const d = g32(o + 4); return d ? g32(o) / d : null; }
      return null;
    };
    let exifPtr = 0;
    ifd(t + g32(t + 4), (tag, type, count, vo) => {
      if (tag === 0x010F) out.make = val(type, count, vo);
      else if (tag === 0x0110) out.model = val(type, count, vo);
      else if (tag === 0x0112) out.orientation = val(type, count, vo);
      else if (tag === 0x0131) out.software = val(type, count, vo);
      else if (tag === 0x8769) exifPtr = val(type, count, vo);
    });
    if (exifPtr) ifd(t + exifPtr, (tag, type, count, vo) => {
      if (tag === 0x9003) out.date = val(type, count, vo);
      else if (tag === 0x829A) out.exposure = val(type, count, vo);
      else if (tag === 0x829D) out.fnumber = val(type, count, vo);
      else if (tag === 0x8827) out.iso = val(type, count, vo);
      else if (tag === 0x920A) out.focal = val(type, count, vo);
    });
    if (out.software && AI_META.test(out.software)) out.aiHint = 'Software: ' + out.software;
  } catch (e) {}
}
function exifTime(d) { if (!d) return null; const m = String(d).match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/); return m ? Date.UTC(+m[1], m[2]-1, +m[3], +m[4], +m[5], +m[6]) : null; }

function loadImg(url) {
  return new Promise((res, rej) => {
    const img = new Image(); img.decoding = 'async';
    const t = setTimeout(() => rej(new Error('timeout')), 30000);
    img.onload = () => { clearTimeout(t); res(img); }; img.onerror = () => { clearTimeout(t); rej(new Error('decode')); };
    img.src = url;
  });
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function toBlob(c, type, q) { return new Promise(res => { try { c.toBlob(b => res(b), type || 'image/jpeg', q || 0.82); } catch (e) { res(null); } }); }
function makeThumb(src, w, h, transparent) {
  const s = Math.min(1, 640 / Math.max(w, h)); const c = canvas(w * s, h * s); const x = c.getContext('2d');
  if (transparent) { x.fillStyle = '#fbf7f0'; x.fillRect(0, 0, c.width, c.height); }
  x.drawImage(src, 0, 0, c.width, c.height); return toBlob(c, 'image/jpeg', 0.82);
}
function grayOf(d, n) { const g = new Uint8ClampedArray(n); for (let i = 0, j = 0; i < n; i++, j += 4) g[i] = (d[j] * 299 + d[j+1] * 587 + d[j+2] * 114) / 1000; return g; }

// Schärfe: Laplace-Varianz in 4×4 Kacheln. Bewertet die schärfste Zone — gewollte Unschärfe (Bokeh) wird nicht bestraft.
function sharpness(g, w, h) {
  const tiles = []; const tw = Math.floor(w / 4), th = Math.floor(h / 4);
  if (tw < 8 || th < 8) return {max:0, med:0, ratio:1};
  for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
    let s = 0, s2 = 0, n = 0;
    for (let y = ty * th + 1; y < (ty + 1) * th - 1; y += 1) for (let x = tx * tw + 1; x < (tx + 1) * tw - 1; x += 1) {
      const i = y * w + x; const l = g[i-1] + g[i+1] + g[i-w] + g[i+w] - 4 * g[i]; s += l; s2 += l * l; n++;
    }
    tiles.push(n ? s2 / n - (s / n) ** 2 : 0);
  }
  const sorted = [...tiles].sort((a, b) => b - a); const max = (sorted[0] + sorted[1]) / 2; const med = median(tiles);
  return {max: r1(max), med: r1(med), ratio: r1(max / Math.max(1, med))};
}
function exposure(g) {
  let s = 0, s2 = 0, hi = 0, lo = 0; const n = g.length;
  for (let i = 0; i < n; i++) { const v = g[i]; s += v; s2 += v * v; if (v >= 250) hi++; if (v <= 5) lo++; }
  const mean = s / n; return {mean: r1(mean), std: r1(Math.sqrt(Math.max(0, s2 / n - mean * mean))), clipHi: r1(hi / n * 100), clipLo: r1(lo / n * 100)};
}
// Rauschschätzung nach Immerkær (1996) auf einem Ausschnitt in Originalauflösung
function noiseSigma(g, w, h) {
  let s = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    s += Math.abs(g[i-w-1] - 2*g[i-w] + g[i-w+1] - 2*g[i-1] + 4*g[i] - 2*g[i+1] + g[i+w-1] - 2*g[i+w] + g[i+w+1]);
  }
  return r1(s * Math.sqrt(Math.PI / 2) / (6 * (w - 2) * (h - 2)));
}
// JPEG-Blockartefakte: Kantensprünge an 8-Pixel-Grenzen vs. innerhalb der Blöcke
function blockiness(g, w, h) {
  let bd = 0, bn = 0, id = 0, inn = 0;
  for (let y = 0; y < h; y++) for (let x = 1; x < w; x++) { const d = Math.abs(g[y*w+x] - g[y*w+x-1]); if (x % 8 === 0) { bd += d; bn++; } else { id += d; inn++; } }
  for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.abs(g[y*w+x] - g[(y-1)*w+x]); if (y % 8 === 0) { bd += d; bn++; } else { id += d; inn++; } }
  return r1((bd / Math.max(1, bn)) / Math.max(2, id / Math.max(1, inn)));  // Untergrenze: sehr weiche Motive nicht als Blockartefakte werten
}
function colorStats(d, n) {
  let r = 0, g = 0, b = 0, sat = 0, skin = 0, alpha = 0, flat = 0; const uniq = new Set(); const hist = new Map();
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const R = d[j], G = d[j+1], B = d[j+2], A = d[j+3];
    if (A < 250) alpha++;
    if (A < 20) continue;
    r += R; g += G; b += B;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B); sat += mx ? (mx - mn) / mx : 0;
    const Y = 0.299*R + 0.587*G + 0.114*B, Cb = 128 - 0.1687*R - 0.3313*G + 0.5*B, Cr = 128 + 0.5*R - 0.4187*G - 0.0813*B;
    if (Y > 40 && Cb > 77 && Cb < 127 && Cr > 133 && Cr < 173) skin++;
    const q = (R >> 4) << 8 | (G >> 4) << 4 | (B >> 4); uniq.add(q); hist.set(q, (hist.get(q) || 0) + 1);
    if (i > 0 && Math.abs(R - d[j-4]) + Math.abs(G - d[j-3]) + Math.abs(B - d[j-2]) < 3) flat++;
  }
  const m = Math.max(1, n - 0);
  const palette = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([q]) => '#' + [(q >> 8) & 15, (q >> 4) & 15, q & 15].map(c => (c * 17).toString(16).padStart(2, '0')).join(''));
  r /= m; g /= m; b /= m;
  return {r: Math.round(r), g: Math.round(g), b: Math.round(b), warmth: r1((r - b) / 255 * 100), sat: r1(sat / m * 100), skin: r1(skin / m * 100), alpha: r1(alpha / n * 100), uniq: uniq.size, flat: r1(flat / m * 100), palette};
}
function dhash(src) {
  const c = canvas(9, 8); const x = c.getContext('2d'); x.drawImage(src, 0, 0, 9, 8);
  const d = x.getImageData(0, 0, 9, 8).data; let bits = '';
  for (let y = 0; y < 8; y++) for (let i = 0; i < 8; i++) { const a = (y*9+i)*4, b = (y*9+i+1)*4; bits += (d[a]*3+d[a+1]*6+d[a+2]) > (d[b]*3+d[b+1]*6+d[b+2]) ? '1' : '0'; }
  let hex = ''; for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16); return hex;
}

// Pixelanalyse eines Bild- oder Video-Frames
function pixelMetrics(src, w, h, opts) {
  const m = {};
  const s = Math.min(1, 1024 / Math.max(w, h)); const c = canvas(w * s, h * s); const x = c.getContext('2d', {willReadFrequently: true});
  x.drawImage(src, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data; const n = c.width * c.height; const g = grayOf(d, n);
  m.sharp = sharpness(g, c.width, c.height); m.expo = exposure(g); m.color = colorStats(d, n);
  m.dhash = dhash(src);
  // Ausschnitt in Originalauflösung (Mitte, am 8er-Raster) für Rauschen und Kompression
  if (opts && opts.native) {
    const cw = Math.min(512, w - (w % 8)), ch = Math.min(512, h - (h % 8));
    if (cw >= 64 && ch >= 64) {
      const sx = Math.floor((w - cw) / 2 / 8) * 8, sy = Math.floor((h - ch) / 2 / 8) * 8; const c2 = canvas(cw, ch); const x2 = c2.getContext('2d', {willReadFrequently: true});
      x2.drawImage(src, sx, sy, cw, ch, 0, 0, cw, ch);
      const g2 = grayOf(x2.getImageData(0, 0, cw, ch).data, cw * ch);
      m.noise = noiseSigma(g2, cw, ch); if (opts.jpeg) m.block = blockiness(g2, cw, ch);
      m.sharpNative = sharpness(g2, cw, ch).max;
    }
  }
  return m;
}

function chk(k, l, s, v, n) { return {k, l, s, v: v || '', n: n || ''}; }
function imageChecks(a) {
  const C = []; const m = a.metrics || {}; const L = Math.max(a.w || 0, a.h || 0);
  if (a.kind === 'graphic') C.push(chk('aufloesung','Auflösung','ok','Vektor','Skalierbar ohne Qualitätsverlust'));
  else C.push(chk('aufloesung','Auflösung', L >= 2400 ? 'ok' : L >= 1600 ? 'warn' : 'bad', a.w + '×' + a.h,
    L >= 3000 ? 'Reicht für 4K-Bewegung (Zoom/Push-In)' : L >= 2400 ? 'Gut für Full HD inkl. leichtem Zoom' : L >= 1600 ? 'Knapp — wenig Spielraum für Zoom/Crop' : 'Zu klein für Full-HD-Film'));
  if (m.sharp) {
    const v = m.sharp.max; const st = v >= 120 ? 'ok' : v >= 45 ? 'warn' : 'bad';
    C.push(chk('schaerfe','Schärfe', st, Math.round(v), (st === 'ok' ? 'Schärfste Bildzone ist klar' : st === 'warn' ? 'Leicht weich — bei Nahaufnahmen prüfen' : 'Unscharf / verwackelt') + (m.sharp.ratio > 6 && st !== 'bad' ? ' · Freistellung (Bokeh) erkannt' : '') + ' · lokale Messung'));
  }
  if (m.expo && !a.isGraphicLike) {
    const e = m.expo; let st = 'ok', n = 'Ausgewogene Belichtung';
    if (e.clipHi > 12 || e.mean > 222) { st = 'bad'; n = 'Überbelichtet — ' + e.clipHi + '% ausgefressene Lichter'; }
    else if (e.clipLo > 30 || e.mean < 38) { st = 'bad'; n = 'Unterbelichtet — ' + e.clipLo + '% abgesoffene Schatten'; }
    else if (e.clipHi > 4 || e.mean > 200) { st = 'warn'; n = 'Helle Bereiche teils ausgefressen (' + e.clipHi + '%)'; }
    else if (e.clipLo > 14 || e.mean < 60) { st = 'warn'; n = 'Eher dunkel (' + e.clipLo + '% sehr dunkle Pixel)'; }
    if (st === 'ok' && e.std < 32) { st = 'warn'; n = 'Flacher Kontrast'; }
    C.push(chk('belichtung','Belichtung', st, 'Ø ' + Math.round(e.mean), n));
  }
  if (m.noise != null && !a.isGraphicLike) {
    const st = m.noise < 3 ? 'ok' : m.noise < 6 ? 'warn' : 'bad';
    C.push(chk('rauschen','Bildrauschen', st, 'σ ' + m.noise, (st === 'ok' ? 'Sauber' : st === 'warn' ? 'Sichtbares Rauschen möglich' : 'Starkes Rauschen') + (a.exif && a.exif.iso ? ' · ISO ' + a.exif.iso : '') + ' · Schätzung (feine Texturen können als Rauschen zählen)'));
  }
  const bpp = a.w && a.h ? a.size * 8 / (a.w * a.h) : 0; const wa = /whatsapp|-wa\d{3,}/i.test(a.name);
  if (['jpg','jpeg'].includes(a.ext)) {
    let st = 'ok', n = 'Kaum Kompressionsspuren';
    // Primär Blockartefakte; niedrige Bits/Pixel allein sind kein Fehler (weiche Motive komprimieren natürlich stark)
    const bl = m.block || 1;
    if (bl > 1.7 || (bpp < 0.35 && bl > 1.25)) { st = 'bad'; n = 'Stark komprimiert (Blockartefakte)'; }
    else if (bl > 1.3 || (bpp < 0.7 && bl > 1.12)) { st = 'warn'; n = 'Sichtbare Kompression möglich'; }
    if (wa) { st = st === 'ok' ? 'warn' : st; n += ' · über WhatsApp verschickt — Original anfragen'; }
    C.push(chk('kompression','Kompression', st, bpp ? bpp.toFixed(1) + ' bpp' : '', n));
  } else if (a.kind === 'image') C.push(chk('kompression','Kompression', wa ? 'warn' : 'ok', a.ext.toUpperCase(), wa ? 'Über WhatsApp verschickt — Original anfragen' : 'Verlustarmes Format oder moderne Kompression'));
  if (a.w && a.h && a.kind !== 'graphic') {
    const ar = a.w / a.h;
    C.push(chk('format','Filmformat', 'ok', ar > 1.05 ? 'Quer' : ar < 0.95 ? 'Hoch' : 'Quadrat',
      ar > 1.6 ? 'Passt direkt in 16:9; für 9:16 starker Crop' : ar > 1.05 ? 'Gut für 16:9, für 9:16 Crop nötig' : ar < 0.62 ? 'Passt direkt in 9:16; für 16:9 Parallax/Hintergrund nötig' : ar < 0.95 ? 'Gut für 9:16 (leichter Crop), für 16:9 Parallax nötig' : 'Für beide Formate Crop nötig'));
  }
  if (a.meta && a.meta.aiHint) C.push(chk('meta_ki','KI-Hinweis in Metadaten','warn', '', 'Gefunden: ' + a.meta.aiHint + ' — Bild ist evtl. KI-generiert oder bearbeitet'));
  else C.push(chk('meta_ki','KI-Hinweis in Metadaten','na', '', 'Keine Kennzeichnung gefunden — das beweist nicht, dass das Bild echt ist'));
  return C;
}

async function analyzeImage(a, file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    let w = img.naturalWidth, h = img.naturalHeight;
    if (a.kind === 'graphic' && (!w || !h)) { w = 1200; h = 1200; }
    a.w = w; a.h = h; a.decoded = true;
    let m = {};
    try { m = pixelMetrics(img, w, h, {native: a.kind === 'image' && Math.max(w, h) > 0, jpeg: ['jpg','jpeg'].includes(a.ext)}); }
    catch (e) { m = {tainted: true}; }
    a.metrics = m;
    const c = m.color || {};
    a.hasAlpha = (c.alpha || 0) > 1;
    a.isGraphicLike = a.kind === 'graphic' || a.hasAlpha || ((c.uniq || 999) < 140 && (c.flat || 0) > 55 && !(a.exif && a.exif.make) && !(m.expo && (m.expo.mean < 50 || (m.noise || 0) > 4)));
    a.isScreenshot = SCREEN_DIMS.has(w + 'x' + h) && (a.ext === 'png' || !a.exif || !a.exif.make) || /screenshot|bildschirmfoto|bildschirmaufnahme/i.test(a.name);
    a.thumb = await makeThumb(img, w, h, a.hasAlpha || a.kind === 'graphic');
    a.checks = imageChecks(a);
  } catch (e) {
    a.decoded = false;
    a.checks = [chk('decode','Vorschau','na','', (['heic','heif'].includes(a.ext) ? 'HEIC kann dieser Browser nicht öffnen (Safari auf iPhone/iPad/Mac kann es). ' : 'Datei konnte nicht geöffnet werden. ') + NA_TXT + ' — Datei bleibt erhalten.')];
  } finally { URL.revokeObjectURL(url); }
}

function loadMedia(tag, url) {
  return new Promise((res, rej) => {
    const el = document.createElement(tag); el.preload = tag === 'video' ? 'auto' : 'metadata'; el.muted = true;
    if (tag === 'video') { el.playsInline = true; el.setAttribute('playsinline', ''); }
    const t = setTimeout(() => rej(new Error('timeout')), 20000);
    el.onloadedmetadata = () => { clearTimeout(t); res(el); }; el.onerror = () => { clearTimeout(t); rej(new Error('decode')); };
    el.src = url; try { el.load(); } catch (e) {}
  });
}
function seekTo(v, t) { return new Promise(res => { const to = setTimeout(res, 7000); v.onseeked = () => { clearTimeout(to); setTimeout(res, 60); }; try { v.currentTime = t; } catch (e) { clearTimeout(to); res(); } }); }

async function analyzeVideo(a, file) {
  const url = URL.createObjectURL(file);
  try {
    const v = await loadMedia('video', url);
    a.duration = v.duration; a.w = v.videoWidth; a.h = v.videoHeight;
    if (!a.w || !a.h) throw new Error('nodim');
    const frames = []; const hashes = [];
    for (const f of [0.15, 0.5, 0.85]) {
      await seekTo(v, Math.max(0.05, Math.min(a.duration - 0.05, a.duration * f)));
      const c = canvas(Math.min(a.w, 1280), Math.min(a.w, 1280) * a.h / a.w); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      frames.push(c); hashes.push(dhash(c));
    }
    const mid = frames[1];
    const m = pixelMetrics(mid, mid.width, mid.height, {native: false});
    if (m.expo.std === 0 && m.expo.mean === 0) throw new Error('blank');
    m.motion = r1((hamming(hashes[0], hashes[1]) + hamming(hashes[1], hashes[2])) / 2);
    m.frameHashes = hashes;
    a.metrics = m; a.decoded = true; a.thumb = await makeThumb(mid, mid.width, mid.height, false);
    const L = Math.max(a.w, a.h); const mbps = a.duration ? a.size * 8 / a.duration / 1e6 : 0;
    const C = [];
    C.push(chk('aufloesung','Auflösung', L >= 1920 ? 'ok' : L >= 1280 ? 'warn' : 'bad', a.w + '×' + a.h, L >= 3840 ? '4K' : L >= 1920 ? 'Full HD' : L >= 1280 ? 'HD — knapp für Full-HD-Film' : 'Zu klein'));
    C.push(chk('dauer','Länge', a.duration >= 2 ? 'ok' : 'warn', fmtDur(a.duration), a.duration >= 2 ? '' : 'Sehr kurz — nur als Insert nutzbar'));
    C.push(chk('bitrate','Bitrate', mbps >= (L >= 1920 ? 6 : 3) ? 'ok' : 'warn', mbps.toFixed(1) + ' Mbit/s', mbps >= (L >= 1920 ? 6 : 3) ? '' : 'Niedrige Bitrate — evtl. komprimiert (Messenger/Social Download)'));
    const sm = m.sharp.max; C.push(chk('schaerfe','Schärfe (Standbild)', sm >= 80 ? 'ok' : sm >= 30 ? 'warn' : 'bad', Math.round(sm), 'Gemessen am mittleren Frame · Bewegungsunschärfe kann normal sein'));
    const e = m.expo; C.push(chk('belichtung','Belichtung (Standbild)', e.clipHi > 12 || e.clipLo > 30 ? 'bad' : e.clipHi > 4 || e.clipLo > 14 ? 'warn' : 'ok', 'Ø ' + Math.round(e.mean), ''));
    C.push(chk('bewegung','Bewegung im Clip', 'ok', m.motion < 4 ? 'ruhig' : m.motion < 14 ? 'mittel' : 'stark', m.motion < 4 ? 'Ruhiger Clip — gut als Hintergrund/Hero' : m.motion < 14 ? 'Moderate Bewegung' : 'Viel Bewegung oder Schnitte'));
    C.push(chk('ton','Ton im Video','na','', NA_TXT + ' (Ton wird nicht analysiert)'));
    a.checks = C;
  } catch (e) {
    a.decoded = false;
    a.checks = [chk('decode','Vorschau','na','', 'Video konnte in diesem Browser nicht geöffnet werden (z. B. HEVC/ProRes außerhalb von Safari). ' + NA_TXT + ' — Datei bleibt erhalten.')];
  } finally { URL.revokeObjectURL(url); }
}

async function analyzeAudio(a, file) {
  const url = URL.createObjectURL(file);
  const C = [];
  try {
    const el = await loadMedia('audio', url); a.duration = el.duration; a.decoded = true;
    C.push(chk('dauer','Länge', a.duration >= 3 ? 'ok' : 'warn', fmtDur(a.duration), ''));
    if (file.size <= 80e6) {
      const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC();
      const ab = await file.arrayBuffer();
      const buf = await new Promise((res, rej) => { const p = ac.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
      const ch = buf.getChannelData(0); const fr = 2048; const rms = []; let peak = 0, clip = 0;
      for (let i = 0; i < ch.length; i += fr) { let s = 0; const e = Math.min(ch.length, i + fr); for (let j = i; j < e; j++) { const x = ch[j]; s += x * x; const ax = Math.abs(x); if (ax > peak) peak = ax; if (ax > 0.989) clip++; } rms.push(Math.sqrt(s / (e - i))); }
      try { ac.close(); } catch (e) {}
      const db = x => x > 0 ? 20 * Math.log10(x) : -120;
      const sorted = [...rms].sort((x, y) => x - y); const floor = db(sorted[Math.floor(sorted.length * 0.1)] || 0); const loud = db(sorted[Math.floor(sorted.length * 0.9)] || 0);
      const clipPct = clip / ch.length * 100;
      a.metrics = {peak: r1(db(peak)), loud: r1(loud), floor: r1(floor), clipPct: Math.round(clipPct * 1000) / 1000, sampleRate: buf.sampleRate, channels: buf.numberOfChannels};
      C.push(chk('pegel','Lautstärke', loud > -30 ? 'ok' : loud > -40 ? 'warn' : 'bad', loud.toFixed(0) + ' dBFS', loud > -30 ? 'Gut ausgesteuert' : 'Sehr leise aufgenommen'));
      C.push(chk('clipping','Übersteuerung', clipPct < 0.01 ? 'ok' : clipPct < 0.5 ? 'warn' : 'bad', clipPct.toFixed(2) + '%', clipPct < 0.01 ? 'Keine Übersteuerung' : 'Verzerrte Stellen möglich'));
      const snr = loud - floor;
      C.push(chk('rauschen','Grundrauschen', floor < -55 || snr > 30 ? 'ok' : snr > 18 ? 'warn' : 'bad', floor.toFixed(0) + ' dBFS', 'Schätzung aus leisesten Passagen' + (snr <= 18 ? ' — Raumhall/Störgeräusche wahrscheinlich' : '')));
      C.push(chk('samplerate','Abtastrate', buf.sampleRate >= 44100 ? 'ok' : 'warn', (buf.sampleRate / 1000) + ' kHz', ''));
    } else C.push(chk('pegel','Pegel','na','', NA_TXT + ' (Datei zu groß für Browser-Analyse)'));
  } catch (e) {
    if (!a.decoded) C.push(chk('decode','Wiedergabe','na','', 'Audio konnte nicht geöffnet werden. ' + NA_TXT));
  } finally { URL.revokeObjectURL(url); }
  C.push(chk('verstaendlichkeit','Sprachverständlichkeit','na','', NA_TXT + ' — bitte anhören'));
  a.checks = C;
}

// Lokale Kategorie-Erkennung: Dateityp → Dateiname → Bildmerkmale. Konfidenz wird ehrlich ausgewiesen.
function localCategory(a) {
  const t = tokens(a.name); const has = list => list.some(w => t.includes(w) || (w.length >= 5 && t.some(x => x.startsWith(w))));
  if (a.kind === 'video') return {cat:'VIDEOS', conf:'hoch', why:'Dateityp Video'};
  if (a.kind === 'audio') {
    if (has(MUSIC_WORDS)) return {cat:'SONSTIGES', conf:'mittel', why:'Audio · Dateiname deutet auf Musik'};
    return {cat:'VOICEOVER', conf: has(KEYWORDS['VOICEOVER']) ? 'hoch' : 'mittel', why: has(KEYWORDS['VOICEOVER']) ? 'Audio · Dateiname' : 'Audio-Datei (vermutlich Sprachaufnahme)'};
  }
  if (a.kind === 'document') return {cat: has(KEYWORDS['LOGO']) ? 'LOGO' : 'BRAND ELEMENTS', conf:'niedrig', why:'Dokument/Designdatei'};
  if (a.kind === 'other') return {cat:'SONSTIGES', conf:'hoch', why:'Unbekannter Dateityp'};
  for (const cat of ['LOGO','VERPACKUNG','KUNDENREFERENZEN','BEHIND THE SCENES','ARBEITSPLATZ','DETAILS','PORTRAITS','LIFESTYLE','RÄUME','MOOD / ATMOSPHÄRE','BRAND ELEMENTS','PRODUKTE'])
    if (has(KEYWORDS[cat])) return {cat, conf:'mittel', why:'Dateiname enthält Hinweis'};
  if (a.kind === 'graphic') return {cat:'LOGO', conf:'mittel', why:'Vektorgrafik (SVG)'};
  if (a.isScreenshot) return {cat:'SONSTIGES', conf:'mittel', why:'Screenshot (Bildschirmauflösung) — evtl. Kundenreferenz'};
  const c = (a.metrics && a.metrics.color) || {};
  if (a.hasAlpha && (c.uniq || 999) < 400) return {cat:'LOGO', conf:'mittel', why:'Transparenter Hintergrund, wenige Farben'};
  if (a.isGraphicLike) return {cat:'BRAND ELEMENTS', conf:'niedrig', why:'Flächige Grafik (wenige Farben)'};
  if ((c.skin || 0) > 14 && a.h > a.w) return {cat:'PORTRAITS', conf:'niedrig', why:'Viele Hauttöne, Hochformat'};
  if ((c.skin || 0) > 6) return {cat:'LIFESTYLE', conf:'niedrig', why:'Person(en) wahrscheinlich im Bild'};
  return {cat:'SONSTIGES', conf:'unbekannt', why:'Motiv lokal nicht bestimmbar — KI-Analyse oder manuell zuordnen'};
}

async function analyzeAsset(a, file) {
  a.pipeline = 'analyse';
  if (a.kind === 'image' || a.kind === 'graphic') { a.meta = await readMeta(file); a.exif = a.meta; }
  const h = await sha256(file); a.hash = h.hash; a.hashPartial = h.partial;
  if (a.kind === 'image' || a.kind === 'graphic') await analyzeImage(a, file);
  else if (a.kind === 'video') await analyzeVideo(a, file);
  else if (a.kind === 'audio') await analyzeAudio(a, file);
  else { a.decoded = false; a.checks = [chk('typ','Dateityp','na','', 'Wird nicht inhaltlich analysiert — bleibt als Datei erhalten')]; }
  a.taken = exifTime(a.exif && a.exif.date) || a.lastModified || null;
  a.local = localCategory(a);
  if (!a.categoryManual && !(a.ai && a.ai.kategorie)) a.category = a.local.cat;
  a.pipeline = 'analysiert';
}

// ─── SCORES & STATUS ─────────────────────────────────────────────────────
function stateOf(a, k) { const c = (a.checks || []).find(x => x.k === k); return c ? c.s : null; }
const PEN = {ok:0, warn:1, bad:2, na:0};
function techQuality(a) {
  if (!a.decoded) return null;
  if (a.kind === 'audio') {
    if (!a.metrics) return null;
    let q = 9.5; q -= [0,1.5,3.5][PEN[stateOf(a,'clipping')] || 0]; q -= [0,1.5,3][PEN[stateOf(a,'pegel')] || 0]; q -= [0,1.2,2.5][PEN[stateOf(a,'rauschen')] || 0]; q -= stateOf(a,'samplerate') === 'warn' ? 0.8 : 0;
    return r1(clamp(q, 1, 10));
  }
  if (a.kind === 'graphic') return 9.5;
  const L = Math.max(a.w, a.h); let q = 10;
  if (a.kind === 'video') {
    q -= L >= 3840 ? 0 : L >= 1920 ? 0.5 : L >= 1280 ? 2.5 : 4.5;
    q -= [0,1,2.5][PEN[stateOf(a,'schaerfe')] || 0]; q -= [0,1,2.5][PEN[stateOf(a,'belichtung')] || 0]; q -= stateOf(a,'bitrate') === 'warn' ? 1 : 0; q -= stateOf(a,'dauer') === 'warn' ? 0.8 : 0;
    return r1(clamp(q, 1, 10));
  }
  if (a.isGraphicLike) { q = L >= 2000 ? 9 : L >= 1000 ? 7.5 : L >= 500 ? 5.5 : 3.5; if (a.hasAlpha) q += 0.5; return r1(clamp(q, 1, 10)); }
  q -= L >= 3000 ? 0 : L >= 2400 ? 0.5 : L >= 1600 ? 1.8 : L >= 1080 ? 3.2 : L >= 720 ? 4.5 : 6;
  q -= [0,1.6,3.6][PEN[stateOf(a,'schaerfe')] || 0];
  q -= [0,1,2.6][PEN[stateOf(a,'belichtung')] || 0];
  q -= [0,0.7,1.7][PEN[stateOf(a,'rauschen')] || 0];
  q -= [0,0.7,1.7][PEN[stateOf(a,'kompression')] || 0];
  return r1(clamp(q, 1, 10));
}
// Lokale Cinematic-Schätzung: bewusst auf max. 8 begrenzt — echte Bildwirkung kann nur visuell beurteilt werden.
function localCinematic(a) {
  if (!a.decoded || a.kind === 'audio' || a.isGraphicLike || a.kind === 'graphic') return null;
  const m = a.metrics || {}; let c = 5; const L = Math.max(a.w, a.h);
  if (L >= 3000) c += 0.8; else if (L < 1600) c -= 1;
  if (m.sharp && m.sharp.ratio > 6 && m.sharp.max >= 80) c += 1;
  if (m.expo && m.expo.std >= 42 && m.expo.std <= 78) c += 0.7; else if (m.expo && m.expo.std < 30) c -= 0.8;
  if (m.color && m.color.warmth > 4) c += 0.5;
  if (m.color && m.color.sat > 55) c -= 0.5;
  if (stateOf(a,'schaerfe') === 'bad') c -= 1.5; if (stateOf(a,'belichtung') === 'bad') c -= 1;
  if (a.isScreenshot) c = 2;
  if (a.kind === 'video') { c += 0.5; if (m.motion != null && m.motion < 8) c += 0.3; }
  return r1(clamp(c, 1, 8));
}
function hardFail(a) {
  const R = [];
  if (!a.decoded) return R;
  if ((a.kind === 'image') && !a.isGraphicLike && Math.max(a.w, a.h) < 640) R.push('Auflösung unter 640 px');
  if (a.metrics && a.metrics.sharp && a.kind === 'image' && !a.isGraphicLike && a.metrics.sharp.max < 14) R.push('Stark unscharf');
  if (a.kind === 'audio' && a.metrics && a.metrics.clipPct > 2) R.push('Stark übersteuert');
  if (a.ai && a.ai.unbrauchbar) R.push('KI: ' + (a.ai.grund || 'nicht verwendbar'));
  return R;
}
function computeScores(a) {
  const tq = techQuality(a); const ai = a.ai || null; const S2 = {}, src = {};
  if (tq == null && !ai) { a.scores = {quality:null, brand:null, cinematic:null, premium:null, usability:null}; a.scoreSrc = {}; return; }
  S2.quality = ai && ai.qualitaet != null && tq != null ? r1(0.55 * tq + 0.45 * ai.qualitaet) : tq != null ? tq : ai ? ai.qualitaet : null;
  src.quality = ai && ai.qualitaet != null ? 'Messung + KI' : 'Lokale Messung';
  S2.cinematic = ai && ai.cinematic != null ? ai.cinematic : localCinematic(a); src.cinematic = ai && ai.cinematic != null ? 'KI' : S2.cinematic != null ? 'Lokale Schätzung' : '';
  S2.brand = ai && ai.markenpassung != null ? ai.markenpassung : null; src.brand = S2.brand != null ? 'KI · projektbezogen' : '';
  S2.premium = ai && ai.premium != null ? ai.premium : null; src.premium = S2.premium != null ? 'KI' : '';
  // Verwendbarkeit = Qualität + Wirkung − Abzüge (Duplikat, Lichtstimmung, harte Fehler)
  const parts = [S2.brand, S2.cinematic, S2.premium].filter(v => v != null);
  let u = S2.quality != null ? 0.6 * S2.quality + 0.4 * (parts.length ? parts.reduce((x, y) => x + y, 0) / parts.length : S2.quality) : null;
  if (u != null) {
    if (a.groupRole === 'duplicate') u = Math.min(u, 3);
    else if (a.groupRole === 'similar') u -= 1;
    if (a.lightOutlier) u -= 0.8;
    if (hardFail(a).length) u = 1;
    u = r1(clamp(u, 1, 10));
  }
  S2.usability = u; src.usability = u != null ? (ai ? 'Berechnet (Messung + KI)' : 'Berechnet (lokal)') : '';
  a.scores = S2; a.scoreSrc = src;
}
function composite(a) {
  const s = a.scores || {}; const v = ['quality','brand','cinematic','premium','usability'].map(k => s[k]).filter(x => x != null);
  return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null;
}
function computeStatus(a) {
  if (a.statusManual && a.status) return;
  if (!a.decoded || (a.scores && a.scores.quality == null)) { a.status = UNCHECKED; return; }
  if (hardFail(a).length) { a.status = 'NICHT VERWENDBAR'; return; }
  const c = composite(a); const s = a.scores;
  const coreBad = ['aufloesung','schaerfe','belichtung'].some(k => stateOf(a, k) === 'bad');
  if (c >= 7.8 && s.quality >= 7 && s.usability >= 7 && !coreBad && (a.ai || (s.cinematic || 0) >= 7)) a.status = 'TOP ASSET';
  else if (c >= 6.5) a.status = 'GUT VERWENDBAR';
  else if (c >= 5) a.status = 'NUR ERGÄNZEND';
  else if (c >= 3.5) a.status = 'SCHWACH';
  else a.status = 'NICHT VERWENDBAR';
}

// ─── DUPLIKATE & SERIEN ──────────────────────────────────────────────────
function seqNum(n) { const m = n.match(/(\d{3,})(?!.*\d)/); return m ? +m[1] : null; }
function rankScore(a) {
  const s = a.scores || {}; const m = a.metrics || {};
  return (s.quality || 0) + 0.6 * (s.cinematic || 0) + 0.5 * (s.brand || 0) + 0.3 * (s.premium || 0) + Math.min(1, ((m.sharp && m.sharp.max) || 0) / 400) + Math.min(0.5, Math.max(a.w || 0, a.h || 0) / 8000);
}
function buildGroups(list) {
  const parent = new Map(); const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const union = (x, y) => { const a = find(x), b = find(y); if (a !== b) parent.set(b, a); };
  list.forEach(a => parent.set(a.id, a.id));
  const kindRel = new Map(); // id-pair → beziehung
  const rel = (x, y, r) => { const k = x < y ? x + '|' + y : y + '|' + x; const o = kindRel.get(k); const order = {identisch:3, 'fast identisch':2, serie:1}; if (!o || order[r] > order[o]) kindRel.set(k, r); };
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.hash && a.hash === b.hash && a.size === b.size) { union(a.id, b.id); rel(a.id, b.id, 'identisch'); continue; }
    if (!a.decoded || !b.decoded || !a.metrics || !b.metrics || !a.metrics.dhash || !b.metrics.dhash) continue;
    const va = a.kind === 'video', vb = b.kind === 'video'; if (va !== vb || a.kind === 'audio' || b.kind === 'audio') continue;
    let d = hamming(a.metrics.dhash, b.metrics.dhash);
    if (va && a.metrics.frameHashes && b.metrics.frameHashes) a.metrics.frameHashes.forEach(h1 => b.metrics.frameHashes.forEach(h2 => { d = Math.min(d, hamming(h1, h2)); }));
    const close = (a.taken && b.taken && Math.abs(a.taken - b.taken) < 120000) || (seqNum(a.name) != null && seqNum(b.name) != null && Math.abs(seqNum(a.name) - seqNum(b.name)) <= 12);
    if (d <= 4) { union(a.id, b.id); rel(a.id, b.id, 'fast identisch'); }
    else if (d <= 10 || (d <= 15 && close)) { union(a.id, b.id); rel(a.id, b.id, 'serie'); }
  }
  const map = new Map(); list.forEach(a => { const r = find(a.id); if (!map.has(r)) map.set(r, []); map.get(r).push(a); });
  const groups = []; let n = 0;
  list.forEach(a => { a.groupId = null; a.groupRole = null; a.dupOf = null; a.bestReasons = null; });
  [...map.values()].filter(g => g.length > 1).forEach(g => {
    n++;
    const pinned = g.find(x => x.bestPick && x.bestPick.by === 'manual') || g.find(x => x.bestPick && x.bestPick.by === 'ki');
    const best = pinned || [...g].sort((x, y) => rankScore(y) - rankScore(x))[0];
    let type = 'serie'; let allIdent = true;
    g.forEach(x => { if (x === best) return; const k = x.id < best.id ? x.id + '|' + best.id : best.id + '|' + x.id; const r = kindRel.get(k); if (r !== 'identisch') allIdent = false; });
    if (allIdent) type = 'identisch'; else if (g.length <= 3 && g.every(x => x === best || ['identisch','fast identisch'].includes(kindRel.get(x.id < best.id ? x.id + '|' + best.id : best.id + '|' + x.id)))) type = 'fast identisch';
    const id = 'G' + String(n).padStart(2, '0');
    g.forEach(x => { x.groupId = id; if (x === best) x.groupRole = 'best'; else { const k = x.id < best.id ? x.id + '|' + best.id : best.id + '|' + x.id; x.groupRole = kindRel.get(k) === 'identisch' ? 'duplicate' : 'similar'; x.dupOf = best.id; } });
    best.bestReasons = bestReasons(best, g);
    groups.push({id, type, members: g, best, label: (type === 'identisch' ? 'DUPLIKAT ' : 'SERIE ') + String(n).padStart(2, '0')});
  });
  return groups;
}
function bestReasons(best, g) {
  if (best.bestPick && best.bestPick.reasons && best.bestPick.reasons.length) return best.bestPick.reasons;
  const R = []; const others = g.filter(x => x !== best && x.decoded); if (!others.length) return ['Identische Datei — eine Version genügt'];
  const mx = f => others.every(o => f(best) >= f(o));
  const sh = x => (x.metrics && x.metrics.sharp && x.metrics.sharp.max) || 0;
  if (mx(sh) && sh(best) > 0) R.push('beste Schärfe');
  const ex = x => x.metrics && x.metrics.expo ? -Math.abs(x.metrics.expo.mean - 128) - (x.metrics.expo.clipHi + x.metrics.expo.clipLo) * 2 : -999;
  if (mx(ex)) R.push('sauberste Belichtung');
  if (mx(x => (x.w || 0) * (x.h || 0)) && others.some(o => (o.w || 0) * (o.h || 0) < (best.w || 0) * (best.h || 0))) R.push('höchste Auflösung');
  if (mx(x => -((x.metrics && x.metrics.noise) || 0)) && best.metrics && best.metrics.noise != null) R.push('geringstes Rauschen');
  if (best.scores && best.scores.brand != null && mx(x => (x.scores && x.scores.brand) || 0)) R.push('stärkste Markenwirkung');
  if (!R.length) R.push('beste Gesamtbewertung');
  return R;
}

// Lichtstimmung: Ausreißer gegenüber dem Rest des Sets (lokal messbar)
function markLightOutliers(list) {
  const photos = list.filter(a => a.decoded && (a.kind === 'image' || a.kind === 'video') && !a.isGraphicLike && a.metrics && a.metrics.color && a.groupRole !== 'duplicate');
  list.forEach(a => { a.lightOutlier = null; });
  if (photos.length < 5) return;
  const mw = median(photos.map(a => a.metrics.color.warmth)), ml = median(photos.map(a => a.metrics.expo.mean)), msat = median(photos.map(a => a.metrics.color.sat));
  photos.forEach(a => {
    const dw = a.metrics.color.warmth - mw, dl = a.metrics.expo.mean - ml, ds = a.metrics.color.sat - msat;
    const R = [];
    if (Math.abs(dw) > 14) R.push(dw > 0 ? 'deutlich wärmer' : 'deutlich kühler');
    if (Math.abs(dl) > 55) R.push(dl > 0 ? 'viel heller' : 'viel dunkler');
    if (Math.abs(ds) > 28) R.push(ds > 0 ? 'viel bunter' : 'viel entsättigter');
    if (R.length) a.lightOutlier = R.join(', ') + ' als der Rest des Materials';
  });
}

function recompute() {
  const list = S.assets;
  list.forEach(a => computeScores(a));            // 1. Vorläufige Scores für Bestauswahl
  S.groups = buildGroups(list);                   // 2. Gruppen + Rollen
  markLightOutliers(list);                        // 3. Lichtstimmung
  list.forEach(a => {
    a.checks = (a.checks || []).filter(c => c.k !== 'lichtstimmung' && c.k !== 'visuell');
    if (!a.ai && a.decoded && ['image','graphic','video'].includes(a.kind)) a.checks.push(chk('visuell','Visuelle Prüfungen','na','', NA_TXT + ' ohne KI-Analyse: ' + AI_CHECKS.map(x => x[1]).join(', ')));
    if (a.lightOutlier) a.checks.push(chk('lichtstimmung','Lichtstimmung im Set','warn','', 'Passt nicht zur restlichen Lichtstimmung: ' + a.lightOutlier));
    else if (a.decoded && a.kind !== 'audio' && !a.isGraphicLike) a.checks.push(chk('lichtstimmung','Lichtstimmung im Set','ok','', 'Fügt sich in die Lichtstimmung des Materials ein'));
    computeScores(a); computeStatus(a);
    if (!a.categoryManual) a.category = (a.ai && a.ai.kategorie && CATS.includes(a.ai.kategorie)) ? a.ai.kategorie : (a.local ? a.local.cat : 'SONSTIGES');
  });
  S.gaps = computeGaps();
}
function visible(a) { return a.groupRole !== 'duplicate' && a.groupRole !== 'similar'; }
function usable(a) { return visible(a) && ['TOP ASSET','GUT VERWENDBAR','NUR ERGÄNZEND'].includes(a.status); }
function counts() {
  const L = S.assets; const vis = L.filter(visible);
  return {
    total: L.length, top: vis.filter(a => a.status === 'TOP ASSET').length, gut: vis.filter(a => a.status === 'GUT VERWENDBAR').length,
    erg: vis.filter(a => a.status === 'NUR ERGÄNZEND').length, dup: L.length - vis.length,
    weak: vis.filter(a => a.status === 'SCHWACH').length, bad: vis.filter(a => a.status === 'NICHT VERWENDBAR').length,
    unchecked: vis.filter(a => a.status === UNCHECKED).length, analyzing: L.filter(a => a.pipeline === 'analyse' || a.pipeline === 'neu').length,
    ai: L.filter(a => a.ai).length,
  };
}

// ─── MATERIAL-LÜCKEN ─────────────────────────────────────────────────────
// Prioritäten je Paket: [Brand Presence, Brand Story, Brand Impact] · 1 = SEHR WICHTIG, 2 = SINNVOLL, 3 = OPTIONAL
const MOTIFS = [
  {k:'portrait', cats:['PORTRAITS'], prio:[1,1,1], miss:'Es fehlt noch ein klares Portrait der Gründerin bzw. des Gründers.', ask:'ein ruhiges, klares Portrait von dir — gern bei Tageslicht am Fenster', why:'Gesicht der Marke für Hook, Intro oder emotionalen Einstieg.'},
  {k:'produkt', cats:['PRODUKTE'], prio:[1,1,1], miss:'Es fehlt eine klare Aufnahme vom Produkt bzw. der Leistung.', ask:'ein Foto deines Produkts (oder deiner Leistung) vor ruhigem Hintergrund', why:'Ohne klares Produktbild bleibt unklar, was verkauft wird.'},
  {k:'detail', cats:['DETAILS'], min:2, prio:[2,2,1], miss:'Es gibt zu wenige Detail- und Nahaufnahmen.', ask:'zwei, drei Nahaufnahmen von Details (Material, Struktur, Verarbeitung)', why:'Details tragen Premium-Wirkung und sanfte Kamerabewegungen.'},
  {k:'arbeit', cats:['ARBEITSPLATZ','BEHIND THE SCENES'], prio:[2,1,2], miss:'Für die Brand Story fehlt ein persönlicher Arbeitsmoment.', ask:'ein Foto von deinem Arbeitsplatz oder dir bei der Arbeit — bei natürlichem Licht', why:'Zeigt Handwerk, Haltung und Nahbarkeit hinter der Marke.'},
  {k:'nutzung', cats:['LIFESTYLE'], prio:[3,2,1], miss:'Es fehlt eine Nahaufnahme vom Produkt in Benutzung.', ask:'eine Nahaufnahme deines Produkts in Benutzung (z. B. getragen oder in der Hand)', why:'Macht das Produkt erlebbar und schafft den emotionalen Moment.'},
  {k:'logo', cats:['LOGO'], prio:[1,1,1], miss:'Es fehlt das Logo für die Endcard.', ask:'dein Logo als Originaldatei (am besten PNG mit transparentem Hintergrund oder SVG)', why:'Für Endcard und CTA — wird niemals verändert.'},
  {k:'mood', cats:['MOOD / ATMOSPHÄRE','RÄUME'], prio:[2,2,2], miss:'Es fehlen Atmosphäre-Bilder (Raum, Licht, Stimmung).', ask:'ein, zwei Stimmungsbilder deiner Räume oder deines Umfelds', why:'Für Übergänge und ruhige Momente zwischen den Szenen.'},
  {k:'referenz', cats:['KUNDENREFERENZEN'], prio:[3,3,2], miss:'Es gibt noch keine Kundenreferenz.', ask:'ein Foto oder Screenshot einer Kundenstimme, die du zeigen darfst', why:'Social Proof stärkt den Abschluss.'},
  {k:'verpackung', cats:['VERPACKUNG'], prio:[3,3,3], onlyIf:'PRODUKTE', miss:'Es fehlt ein Bild der Verpackung.', ask:'ein Foto deiner Verpackung', why:'Schöner Abschluss-/Unboxing-Moment.'},
  {k:'voice', cats:['VOICEOVER'], prio:[2,2,2], miss:'Es gibt noch keine Sprachaufnahme.', ask:'eine kurze Sprachaufnahme in ruhiger Umgebung (Handy-Sprachmemo reicht), falls deine eigene Stimme im Film vorkommen soll', why:'Nur nötig, wenn die Stimme der Kundin genutzt wird.'},
];
function computeGaps() {
  const p = currentProject(); const code = pkgCode(p) || 'bs'; const pi = {bp:0, bs:1, bi:2}[code];
  const use = S.assets.filter(usable); const pool = use.filter(a => a.kind !== 'audio');
  const unknown = use.filter(a => !a.ai && a.local && ['unbekannt','niedrig'].includes(a.local.conf) && !a.categoryManual).length;
  const certain = a => a.ai || a.categoryManual || (a.local && ['hoch','mittel'].includes(a.local.conf));
  const has = cats => use.filter(a => cats.includes(a.category));
  const G = [];
  MOTIFS.forEach(m => {
    if (m.onlyIf && !has([m.onlyIf]).length) return;
    const found = has(m.cats); const need = m.min || 1;
    if (found.length >= need && found.some(certain)) return;
    const prio = m.prio[pi];
    G.push({k: m.k, prio, title: found.length && found.length < need ? m.miss.replace('Es fehlt', 'Es fehlt noch mehr') : m.miss, why: m.why, ask: m.ask, uncertain: found.length > 0 && !found.some(certain), provisional: unknown > 0});
  });
  // starkes Abschlussbild / Hero
  const hero = pool.filter(a => (a.scores && a.scores.cinematic >= 8) || (a.ai && (a.ai.szenen || []).some(s => s === 'HERO SHOT' || s === 'ENDCARD')));
  if (pool.length && !hero.length) G.push({k:'hero', prio: code === 'bp' ? 2 : 1, title:'Es gibt aktuell kein starkes Abschlussbild.', why:'Für Hero Shot und letzte Szene braucht es ein Bild mit hoher Bildwirkung.', ask:'ein ruhiges, hochwertiges Bild, das deine Marke auf den Punkt bringt (z. B. dein Produkt im schönsten Licht)', provisional: !S.assets.some(a => a.ai)});
  // Balance Details vs. Emotion
  const det = has(['DETAILS','PRODUKTE']).length; const emo = has(['PORTRAITS','LIFESTYLE','KUNDENREFERENZEN','BEHIND THE SCENES']).length;
  if (det >= 4 && emo <= 1) G.push({k:'balance', prio:2, title:'Es gibt genug Detailshots, aber zu wenig emotionale Bilder.', why:'Der Film braucht Menschen und Momente, nicht nur Produkte.', ask:'ein, zwei persönliche Momente (du mit deinem Produkt, mit Kundinnen oder bei der Arbeit)'});
  // Menge
  const min = PKG[code].minUsable; const nVis = pool.length;
  if (S.assets.length && nVis < min) G.push({k:'menge', prio: nVis < min / 2 ? 1 : 2, title: 'Insgesamt noch wenig verwendbares Material (' + nVis + ' von empfohlen ' + min + ').', why:'Mehr Auswahl = ruhigere Schnitte und bessere Szenen.', ask:''});
  // KI-Report ergänzt
  if (S.report && S.report.luecken) S.report.luecken.forEach(l => { if (!G.some(g => norm(g.title) === norm(l.motiv))) G.push({k:'ki-' + norm(l.motiv).slice(0, 20), prio: l.prio === 'SEHR WICHTIG' ? 1 : l.prio === 'SINNVOLL' ? 2 : 3, title: l.motiv, why: l.warum || '', ask: l.anfrage || '', ai: true}); });
  G.sort((a, b) => a.prio - b.prio);
  return {list: G, unknown, code};
}
function requestText() {
  const k = projectContext(); const gaps = (S.gaps && S.gaps.list || []).filter(g => g.ask && g.prio <= 2).slice(0, 5);
  if (!gaps.length) return '';
  const hi = k.firstName ? 'Hallo ' + k.firstName + ',' : 'Hallo,';
  const wa = S.assets.some(a => /whatsapp|-wa\d{3,}/i.test(a.name));
  const film = k.pkgName ? 'deinen Markenfilm (' + k.pkgName + ')' : 'deinen Markenfilm';
  return hi + '\n\nfür ' + film + ' fehlt mir noch etwas Material, damit die Story rund wird:\n\n' + gaps.map((g, i) => (i + 1) + '. ' + g.ask).join('\n') +
    '\n\nHandybilder reichen vollkommen aus.' + (wa ? ' Bitte schick mir die Fotos als Originaldatei (nicht über WhatsApp), damit die Qualität erhalten bleibt.' : '') + '\n\nDanke dir!\nIvana';
}

// ─── FILM BOARD ──────────────────────────────────────────────────────────
const BOARD_TPL = {
  bp: [['HOOK','Hook — erster Blick',['DETAILS','PORTRAITS','MOOD / ATMOSPHÄRE']],['BRAND STORY','Wer steht dahinter',['PORTRAITS','ARBEITSPLATZ']],['PRODUKTDETAIL','Produktdetail',['DETAILS','PRODUKTE']],['HERO SHOT','Hero Shot',['PRODUKTE','LIFESTYLE','RÄUME']],['ENDCARD','Endcard · Logo',['LOGO','BRAND ELEMENTS']]],
  bs: [['HOOK','Hook — erster Blick',['PORTRAITS','MOOD / ATMOSPHÄRE','DETAILS']],['INTRO','Portrait · Wer steht dahinter',['PORTRAITS']],['BRAND STORY','Story-Aufbau · Arbeitsmoment',['ARBEITSPLATZ','BEHIND THE SCENES','RÄUME']],['PRODUKTDETAIL','Produktdetail',['DETAILS','PRODUKTE']],['EMOTIONALER MOMENT','Emotionaler Höhepunkt',['LIFESTYLE','KUNDENREFERENZEN','PORTRAITS']],['HERO SHOT','Hero Shot',['PRODUKTE','LIFESTYLE','RÄUME','DETAILS']],['ENDCARD','Endcard · Logo',['LOGO','BRAND ELEMENTS']]],
  bi: [['HOOK','Hook — Aufmerksamkeit',['DETAILS','MOOD / ATMOSPHÄRE','PORTRAITS']],['INTRO','Intro · Marke',['PORTRAITS','RÄUME']],['PROBLEM','Problem / Ausgangslage',['MOOD / ATMOSPHÄRE','LIFESTYLE','ARBEITSPLATZ']],['BRAND STORY','Brand Story',['ARBEITSPLATZ','BEHIND THE SCENES','PORTRAITS']],['PRODUKTDETAIL','Produktdetail I',['DETAILS','PRODUKTE']],['PRODUKTDETAIL','Produktdetail II',['DETAILS','PRODUKTE','VERPACKUNG']],['EMOTIONALER MOMENT','Emotionaler Moment',['LIFESTYLE','KUNDENREFERENZEN','PORTRAITS']],['TRANSITION','Übergang',['MOOD / ATMOSPHÄRE','RÄUME','VIDEOS']],['HERO SHOT','Hero Shot',['PRODUKTE','LIFESTYLE','RÄUME']],['CTA','Call to Action',['PORTRAITS','PRODUKTE','LIFESTYLE']],['ENDCARD','Endcard · Logo',['LOGO','BRAND ELEMENTS']]],
};
const MOTION_TPL = {
  'PORTRAITS':'Langsamer Push-In auf das Gesicht, leichte Parallax zwischen Person und Hintergrund, weiches Fensterlicht.',
  'DETAILS':'Sehr langsamer Makro-Push-In, minimale Tiefenbewegung, ein Lichtreflex gleitet über die Oberfläche.',
  'PRODUKTE':'Ruhiger Orbit von 10–15° um das Produkt, sanfter Lichtwechsel, Produkt bleibt unverändert.',
  'ARBEITSPLATZ':'Seitlicher Slide entlang des Arbeitsplatzes, leichte Parallax, warmes Tageslicht.',
  'RÄUME':'Langsamer Dolly-Forward in den Raum, Lichtflecken bewegen sich minimal.',
  'LIFESTYLE':'Handheld-Gefühl mit sehr sanfter Bewegung, Push-In auf den Moment.',
  'BEHIND THE SCENES':'Dokumentarischer, leicht schwebender Kamerablick, natürliches Licht.',
  'KUNDENREFERENZEN':'Ruhiger Zoom auf die Kernaussage, weicher Fokuswechsel.',
  'MOOD / ATMOSPHÄRE':'Sehr langsame Drift, atmendes Licht, als Übergang nutzbar.',
  'VERPACKUNG':'Top-Down mit langsamer Rotation, Lichtkante wandert über die Verpackung.',
  'LOGO':'Statisch oder minimaler Scale-In (101 → 104 %), Logo wird nicht verändert.',
  'BRAND ELEMENTS':'Sanfter Scale-In, Textur-Overlay, Elemente unverändert.',
  'VIDEOS':'Clip ruhig schneiden, ggf. leicht verlangsamen (Slow Motion).',
};
function motionFor(a) { if (!a) return ''; if (a.ai && a.ai.bewegung && a.ai.bewegung.kamera) return a.ai.bewegung.kamera; return MOTION_TPL[a.category] || 'Langsamer Push-In, geringe Tiefenbewegung, warmes Licht.'; }
function buildBoard() {
  const code = pkgCode(currentProject()) || 'bs'; const tpl = BOARD_TPL[code];
  const pool = S.assets.filter(a => usable(a) && a.kind !== 'audio'); const used = new Set();
  const scenes = tpl.map(([role, title, prefs], i) => {
    let best = null, bs = -1;
    pool.forEach(a => {
      if (used.has(a.id)) return;
      let s = 0; const ci = prefs.indexOf(a.category); const roleHit = a.ai && (a.ai.szenen || []).includes(role);
      if (ci < 0 && !roleHit) return;
      if (ci >= 0) s += 3 - ci * 0.5; if (roleHit) s += 3;
      s += (composite(a) || 5) / 2; if (role === 'HERO SHOT') s += (a.scores.cinematic || 0) / 2;
      if (s > bs) { bs = s; best = a; }
    });
    if (best) used.add(best.id);
    return {id: uid(), role, title, assetId: best ? best.id : null, note: best ? sceneNote(best, role) : 'Material fehlt — siehe Material-Lücken', motion: best ? motionFor(best) : ''};
  });
  return {scenes, manual: false, source: 'lokal', updatedAt: Date.now()};
}
function sceneNote(a, role) { if (a.ai && a.ai.szenenNotiz) return a.ai.szenenNotiz; return a.category.charAt(0) + a.category.slice(1).toLowerCase() + ' · ' + role.charAt(0) + role.slice(1).toLowerCase(); }

// ─── KI (nur wo nötig: Bildbedeutung, Markenpassung, Szenen, Qualitätseindruck, Lücken) ───
function blobToB64(blob) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); }); }
async function thumbBlob(id) { const r = await DB.get('blobs', 't:' + id); return r ? r.blob : null; }
function parseJSON(t) { try { const s = String(t).replace(/```json|```/g, ''); return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)); } catch (e) { return null; } }
S.usage = {inT: 0, outT: 0};
async function aiCall(system, content, maxTokens) {
  const key = getKey(); if (!key) throw new Error('Kein API Key — tippe auf 🔑');
  const model = S.model;
  const body = {model, max_tokens: maxTokens || 12000, system, messages: [{role: 'user', content}]};
  if (model === 'claude-opus-5-5') body.output_config = {effort: 'low'};
  const base = {'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true'};
  let fb = model === 'claude-opus-5-5';   // serverseitiger Fallback bei Ablehnung durch Sicherheitsfilter
  for (let attempt = 0; attempt < 4; attempt++) {
    const b = Object.assign({}, body), h = Object.assign({}, base);
    if (fb) { b.fallbacks = 'default'; h['anthropic-beta'] = 'server-side-fallback-2026-07-01'; }
    let r;
    try { r = await fetch('https://api.anthropic.com/v1/messages', {method: 'POST', headers: h, body: JSON.stringify(b)}); }
    catch (e) { if (fb) { fb = false; continue; } if (attempt < 3) { await sleep(2000 * (attempt + 1)); continue; } throw new Error('Verbindungsfehler'); }
    if (r.status === 400 && fb) { fb = false; continue; }
    if (r.status === 429 || r.status === 529 || r.status >= 500) { await sleep(4000 * (attempt + 1)); continue; }
    if (!r.ok) { let msg = ''; try { msg = (await r.json()).error.message; } catch (e) {} throw new Error('API-Fehler ' + r.status + (msg ? ': ' + msg : '')); }
    const d = await r.json();
    if (d.usage) { S.usage.inT += d.usage.input_tokens || 0; S.usage.outT += d.usage.output_tokens || 0; }
    if (d.stop_reason === 'refusal') throw new Error('Die KI hat diese Anfrage abgelehnt.');
    return (d.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
  }
  throw new Error('KI aktuell nicht erreichbar — später erneut versuchen');
}
const SYS_BASE = 'Du bist der MINDÉA ASSET SORTER: erfahrene Creative Directorin und Bildredakteurin für cinematic Markenfilme. Mindéa ist ein Premium-KI-Video-Studio, das aus Kundenfotos und Stimme ruhige, hochwertige Brand-Filme macht (Stil: Quiet Luxury, warmes Licht, viel Ruhe). '
  + 'REGELN: Bewerte projektbezogen, nicht allgemein. Erfinde nichts: was auf der Vorschau (max. 640 px) nicht sicher erkennbar ist, gilt als nicht beurteilbar. Feine Schärfe, Rauschen und Auflösung wurden lokal gemessen — diese Messwerte stehen beim Asset. '
  + 'KI-Artefakte (unnatürliche Hände, Gesichter, Materialien, falsche Schrift, falsches Logo, optische Inkonsistenzen) nur melden, wenn sie sichtbar sind. Logos und Produktdesign dürfen in Vorschlägen niemals verändert werden. Antworte auf Deutsch, knapp, nur mit JSON.';
function assetLine(a) {
  const c = (a.checks || []).filter(x => ['aufloesung','schaerfe','belichtung','rauschen','kompression','lichtstimmung'].includes(x.k)).map(x => x.l + ': ' + x.s + (x.v ? ' (' + x.v + ')' : '')).join(', ');
  return 'ASSET id=' + a.id + ' · Datei: ' + a.name + ' · ' + (a.kind === 'video' ? 'Standbild aus Video (' + fmtDur(a.duration) + ')' : a.kind === 'graphic' || a.isGraphicLike ? 'Grafik' : 'Foto') + ' · lokale Messung: ' + (c || '–') + ' · lokale Kategorie: ' + (a.local ? a.local.cat + ' (' + a.local.conf + ')' : '–');
}
async function aiAnalyzeBatch(batch) {
  const content = [];
  for (const a of batch) { const b = await thumbBlob(a.id); if (!b) continue; content.push({type: 'text', text: assetLine(a)}); content.push({type: 'image', source: {type: 'base64', media_type: 'image/jpeg', data: await blobToB64(b)}}); }
  if (!content.length) return;
  content.push({type: 'text', text: 'Analysiere jedes Asset oben. Antworte NUR mit JSON in genau diesem Format:\n{"assets":[{"id":"…","kategorie":"eine aus KATEGORIEN","beschreibung":"max. 16 Wörter: was zu sehen ist","motive":["Stichworte, z. B. Schmuck, Gründerin, Hände"],"qualitaet":1-10,"markenpassung":1-10,"cinematic":1-10,"premium":1-10,"szenen":["0–3 aus SZENEN"],"szenenNotiz":"1 projektbezogener Satz, z. B. Dieses Portrait eignet sich für den emotionalen Einstieg.","pruefungen":{' + AI_CHECKS.map(([k]) => '"' + k + '":{"s":"ok|auffaellig|problem|nicht_beurteilbar|nicht_relevant","n":"max. 10 Wörter"}').join(',') + '},"bewegung":{"kamera":"","zoom":"","parallax":"","motion3d":"","licht":"","uebergang":""},"verbesserung":["max. 3 kurze Vorschläge"],"unbrauchbar":false,"grund":""}]}\nScores ganzzahlig. Sei streng: alltägliche Handyfotos erreichen selten über 7 bei Premium. unbrauchbar=true nur bei klaren Ausschlussgründen (z. B. falsches Logo, starke KI-Artefakte, Motiv unkenntlich).'});
  const sys = SYS_BASE + '\nKATEGORIEN: ' + CATS.join(', ') + '\nSZENEN: ' + SCENES.join(', ') + '\n\nPROJEKTKONTEXT:\n' + contextText(2500);
  const out = parseJSON(await aiCall(sys, content, 12000));
  if (!out || !Array.isArray(out.assets)) throw new Error('KI-Antwort nicht lesbar');
  out.assets.forEach(r => { const a = S.assets.find(x => x.id === r.id); if (a) applyAI(a, r); });
}
function sc10(v) { const n = Math.round(Number(v)); return isFinite(n) && n >= 1 ? clamp(n, 1, 10) : null; }
function applyAI(a, r) {
  a.ai = {
    kategorie: CATS.includes(r.kategorie) ? r.kategorie : null, beschreibung: String(r.beschreibung || '').slice(0, 200), motive: (r.motive || []).slice(0, 8).map(String),
    qualitaet: sc10(r.qualitaet), markenpassung: sc10(r.markenpassung), cinematic: sc10(r.cinematic), premium: sc10(r.premium),
    szenen: (r.szenen || []).filter(s => SCENES.includes(s)).slice(0, 3), szenenNotiz: String(r.szenenNotiz || '').slice(0, 240),
    bewegung: r.bewegung || {}, verbesserung: (r.verbesserung || []).slice(0, 4).map(String), unbrauchbar: !!r.unbrauchbar, grund: String(r.grund || ''),
    model: S.model, at: Date.now(),
  };
  const keys = AI_CHECKS.map(x => x[0]); a.checks = (a.checks || []).filter(c => !keys.includes(c.k) && c.k !== 'visuell');
  const map = {ok: 'ok', auffaellig: 'warn', problem: 'bad', nicht_beurteilbar: 'na'};
  AI_CHECKS.forEach(([k, l]) => { const p = (r.pruefungen || {})[k]; if (!p || p.s === 'nicht_relevant') return; const s = map[p.s] || 'na'; a.checks.push(chk(k, l, s, 'KI', s === 'na' ? NA_TXT + (p.n ? ' — ' + p.n : '') : (p.n || ''))); });
}
async function aiCompareGroup(g) {
  const cand = [...g.members].filter(x => x.decoded && S.urls.has(x.id)).sort((x, y) => rankScore(y) - rankScore(x)).slice(0, 4);
  if (cand.length < 2) return;
  const content = [];
  for (const a of cand) { const b = await thumbBlob(a.id); if (!b) continue; content.push({type: 'text', text: 'BILD id=' + a.id + ' (' + a.name + ') · ' + assetLine(a)}); content.push({type: 'image', source: {type: 'base64', media_type: 'image/jpeg', data: await blobToB64(b)}}); }
  content.push({type: 'text', text: 'Diese Bilder sind eine Serie ähnlicher Aufnahmen. Wähle das stärkste für den Markenfilm. Kriterien: Schärfe auf dem Motiv (lokale Messwerte beachten), Handhaltung, Gesichtsausdruck, ruhige Komposition, Licht, Markenwirkung. JSON: {"best":"id","gruende":["max. 4 kurze Gründe, z. B. beste Schärfe, sauberste Handhaltung, ruhigste Komposition, stärkste Markenwirkung"]}'});
  const out = parseJSON(await aiCall(SYS_BASE + '\n\nPROJEKTKONTEXT:\n' + contextText(1200), content, 4000));
  const best = out && g.members.find(x => x.id === out.best);
  if (best && !g.members.some(x => x.bestPick && x.bestPick.by === 'manual')) { g.members.forEach(x => { if (x.bestPick && x.bestPick.by === 'ki') x.bestPick = null; }); best.bestPick = {by: 'ki', reasons: (out.gruende || []).slice(0, 4).map(String)}; }
}
async function aiFilmReport() {
  const list = S.assets.filter(a => visible(a) && a.decoded).map(a => a.id + ' | ' + a.name + ' | ' + a.category + ' | ' + a.status + ' | Q' + (a.scores.quality || '–') + ' M' + (a.scores.brand || '–') + ' C' + (a.scores.cinematic || '–') + ' P' + (a.scores.premium || '–') + ' | ' + ((a.ai && a.ai.beschreibung) || (a.kind === 'audio' ? 'Audio ' + fmtDur(a.duration) : 'nicht KI-analysiert')) + ' | Szenen: ' + ((a.ai && a.ai.szenen || []).join('/') || '–')).join('\n');
  const code = pkgCode(currentProject()) || 'bs'; const n = BOARD_TPL[code].length;
  const local = (S.gaps.list || []).map(g => '- [' + g.prio + '] ' + g.title).join('\n') || '–';
  const prompt = 'MATERIAL (' + S.assets.length + ' Dateien, Duplikate/Serien bereits zusammengefasst):\n' + list + '\n\nLOKAL ERKANNTE LÜCKEN:\n' + local
    + '\n\nAufgabe: 1) Welche wichtigen Motive fehlen für diesen Film (projektbezogen, konkret, z. B. "Es fehlt noch ein klares Portrait der Gründerin.")? Prüfe auch die Balance (Details vs. emotionale Bilder) und ob ein starkes Abschlussbild existiert. 2) Formuliere eine kurze, warme Nachricht von Ivana an die Kundin (Du-Form, max. 5 nummerierte Punkte, endet mit "Handybilder reichen vollkommen aus."). 3) Erstelle ein Film Board mit ca. ' + n + ' Szenen in sinnvoller Reihenfolge, nur mit vorhandenen asset-IDs (oder assetId null, wenn Material fehlt). 4) Nenne Bilder, die nicht zur restlichen Lichtstimmung passen.\n'
    + 'JSON: {"fazit":"2 Sätze","luecken":[{"prio":"SEHR WICHTIG|SINNVOLL|OPTIONAL","motiv":"Satz","warum":"kurz","anfrage":"Formulierung für die Kundin"}],"anfrage":"Nachrichtentext","board":[{"rolle":"eine aus SZENEN","titel":"kurz","assetId":"id oder null","notiz":"wofür im Film","bewegung":"Kamerabewegung"}],"lichtAusreisser":[{"id":"…","grund":"…"}]}';
  const out = parseJSON(await aiCall(SYS_BASE + '\nSZENEN: ' + SCENES.join(', ') + '\n\nPROJEKTKONTEXT:\n' + contextText(5000), [{type: 'text', text: prompt}], 16000));
  if (!out) throw new Error('KI-Film-Analyse nicht lesbar');
  const ids = new Set(S.assets.map(a => a.id));
  S.report = {fazit: String(out.fazit || ''), luecken: (out.luecken || []).filter(l => l && l.motiv).slice(0, 10), anfrage: String(out.anfrage || ''), at: Date.now(), model: S.model,
    board: (out.board || []).map(b => { const ok = ids.has(b.assetId) && !hardFail(S.assets.find(x => x.id === b.assetId)).length; return {id: uid(), role: SCENES.includes(b.rolle) ? b.rolle : 'TRANSITION', title: String(b.titel || b.rolle || 'Szene'), assetId: ok ? b.assetId : null, note: String(ok ? (b.notiz || '') : 'Material fehlt' + (b.notiz ? ' — ' + b.notiz : '')), motion: String(b.bewegung || '')}; }),
    licht: (out.lichtAusreisser || []).filter(l => ids.has(l.id))};
  S.report.licht.forEach(l => { const a = S.assets.find(x => x.id === l.id); if (a && !a.lightOutlier) { a.checks = (a.checks || []).filter(c => c.k !== 'licht_ki'); a.checks.push(chk('licht_ki', 'Lichtstimmung (KI)', 'warn', 'KI', 'Dieses Bild passt nicht zur restlichen Lichtstimmung: ' + l.grund)); } });
  await saveMeta('report', S.report);
  if (!S.board || !S.board.manual) { S.board = {scenes: S.report.board, manual: false, source: 'ki', updatedAt: Date.now()}; await saveMeta('board', S.board); }
}
function aiTodo(force) { return S.assets.filter(a => a.decoded && ['image','graphic','video'].includes(a.kind) && visible(a) && S.urls.has(a.id) && (force || !a.ai) && !(hardFail(a).length && !a.ai)); }
function estimate(n) { const m = MODELS[S.model]; const inT = n * 700 + Math.ceil(n / AI_BATCH) * 1800 + 4000; const outT = n * 650 + 3500; return (inT * m.inP + outT * m.outP) / 1e6; }
async function runAI(force) {
  if (S.busy) return;
  if (!getKey()) { toast('🔑 Bitte zuerst den API Key hinterlegen'); try { openKeyModal(); } catch (e) {} return; }
  if (!S.ctx.aiConsent) {
    const ok = confirm('KI-Analyse für dieses Projekt erlauben?\n\nEs werden nur verkleinerte Vorschaubilder (max. 640 px) und der Projektkontext an die Anthropic-API gesendet — keine Originaldateien, keine Audiodateien. Laut Anthropic-API-Bedingungen werden API-Daten standardmäßig nicht zum Training verwendet (bitte selbst prüfen).\n\nDie Freigabe gilt nur für dieses Projekt.');
    if (!ok) return; S.ctx.aiConsent = true; await saveMeta('ctx', S.ctx);
  }
  const todo = aiTodo(force); const batches = []; for (let i = 0; i < todo.length; i += AI_BATCH) batches.push(todo.slice(i, i + AI_BATCH));
  const groups = S.groups.filter(g => g.type !== 'identisch' && !g.members.some(x => x.bestPick)).slice(0, 8);
  const steps = batches.length + groups.length + 1; let done = 0; const errs = [];
  S.busy = 'ai'; S.usage = {inT: 0, outT: 0}; setProgress('KI-Analyse läuft', 0, steps); render();
  for (const b of batches) { try { await aiAnalyzeBatch(b); } catch (e) { errs.push(e.message); if (/API Key|401/.test(e.message)) break; } setProgress('KI analysiert Bildbedeutung, Markenpassung und Szenen', ++done, steps); }
  recompute();
  for (const g of groups) { try { await aiCompareGroup(g); } catch (e) { errs.push(e.message); } setProgress('KI vergleicht ähnliche Bilder', ++done, steps); }
  recompute();
  try { setProgress('KI prüft Material-Lücken und baut das Film Board', done, steps); await aiFilmReport(); } catch (e) { errs.push(e.message); }
  recompute(); await saveAll();
  S.busy = null; S.progress = null; render();
  const cost = (S.usage.inT * MODELS[S.model].inP + S.usage.outT * MODELS[S.model].outP) / 1e6;
  toast(errs.length ? '⚠️ ' + errs[0] : '✨ KI-Analyse fertig · ca. $' + cost.toFixed(2));
}

// ─── SPEICHERN / LADEN ───────────────────────────────────────────────────
function serialize(a) { const o = Object.assign({}, a); delete o.thumb; return o; }
async function saveAll() { try { await DB.putMany('assets', S.assets.map(serialize)); } catch (e) { toast('⚠️ Speichern fehlgeschlagen: ' + e.message); } publishStatus(); }
async function saveMeta(kind, v) { try { await DB.put('meta', {key: kind + ':' + S.projectId, v}); } catch (e) {} }
async function loadMeta(kind, pid) { try { const r = await DB.get('meta', kind + ':' + pid); return r ? r.v : null; } catch (e) { return null; } }
async function getMany(keys) { const d = await DB.open(); return new Promise(res => { const out = []; const tx = d.transaction('blobs', 'readonly'); const st = tx.objectStore('blobs'); keys.forEach(k => { const rq = st.get(k); rq.onsuccess = () => { if (rq.result) out.push(rq.result); }; }); tx.oncomplete = () => res(out); tx.onerror = () => res(out); }); }
async function loadProject(pid) {
  S.projectId = pid; prefSet('project', pid);
  S.urls.forEach(u => URL.revokeObjectURL(u)); S.urls.clear(); S.selected.clear(); S.selectMode = false;
  S.assets = await DB.byProject(pid);
  (await getMany(S.assets.filter(a => a.hasThumb).map(a => 't:' + a.id))).forEach(b => S.urls.set(b.id.slice(2), URL.createObjectURL(b.blob)));
  S.ctx = (await loadMeta('ctx', pid)) || {}; S.board = await loadMeta('board', pid); S.report = await loadMeta('report', pid);
  recompute();
  if (!S.board && S.assets.some(usable)) { S.board = buildBoard(); await saveMeta('board', S.board); }
  publishStatus();
  render();
  resumePending();
}
async function resumePending() {
  const pend = S.assets.filter(a => (a.pipeline === 'neu' || a.pipeline === 'analyse') && a.originalStored);
  if (!pend.length || S.busy) return;
  const files = []; for (const a of pend) { const r = await DB.get('blobs', 'f:' + a.id); if (r) files.push([a, r.blob]); }
  if (files.length) await analyzeQueue(files);
}

// ─── IMPORT ──────────────────────────────────────────────────────────────
async function ingest(fileList, opts) {
  opts = opts || {}; const pid = String(opts.projectId || S.projectId || NONE);
  const files = [...fileList].filter(f => f && f.size > 0 && !/^\./.test(f.name) && !/^(thumbs\.db|desktop\.ini)$/i.test(f.name));
  if (!files.length) return [];
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  const pairs = []; const here = pid === S.projectId;
  if (here) { S.busy = 'local'; setProgress('Dateien werden lokal gesichert', 0, files.length); }
  for (const f of files) {
    const a = {id: uid(), projectId: pid, name: f.name, size: f.size, type: f.type, ext: extOf(f.name), kind: kindOf(f), lastModified: f.lastModified || null, addedAt: Date.now(), source: opts.source || 'upload', pipeline: 'neu', consent: {}, originalStored: false};
    if (f.size <= MAX_ORIGINAL) { try { await DB.put('blobs', {id: 'f:' + a.id, blob: f}); a.originalStored = true; } catch (e) { a.originalStored = false; } }
    await DB.put('assets', serialize(a)); pairs.push([a, f]);
    if (here) setProgress('Dateien werden lokal gesichert · ' + f.name, pairs.length, files.length);
  }
  if (here) S.busy = null;
  if (pid !== S.projectId) { toast('📥 ' + files.length + ' Dateien im Projekt gespeichert'); publishStatus(pid, 'NEU'); return pairs.map(p => p[0].id); }
  S.assets.push(...pairs.map(p => p[0])); render();
  await analyzeQueue(pairs);
  return pairs.map(p => p[0].id);
}
async function analyzeQueue(pairs) {
  S.busy = 'local'; setProgress('Analyse läuft · Metadaten, Hash, Schärfe, Belichtung', 0, pairs.length); render();
  let i = 0;
  for (const [a, f] of pairs) {
    try { await analyzeAsset(a, f); }
    catch (e) { a.pipeline = 'analysiert'; a.decoded = false; a.checks = [chk('err', 'Analyse', 'na', '', 'Analyse fehlgeschlagen (' + e.message + '). ' + NA_TXT)]; a.local = {cat: 'SONSTIGES', conf: 'unbekannt', why: 'Analyse fehlgeschlagen'}; a.category = a.category || 'SONSTIGES'; }
    if (a.thumb) { try { await DB.put('blobs', {id: 't:' + a.id, blob: a.thumb}); a.hasThumb = true; S.urls.set(a.id, URL.createObjectURL(a.thumb)); } catch (e) {} delete a.thumb; }
    try { await DB.put('assets', serialize(a)); } catch (e) {}
    setProgress('Analyse läuft · ' + a.name, ++i, pairs.length);
    if (i % 6 === 0) await sleep(0);
  }
  recompute();
  if (!S.board || !S.board.manual) { S.board = buildBoard(); await saveMeta('board', S.board); }
  await saveAll();
  S.busy = null; S.progress = null; render();
  const c = counts(); toast('✅ ' + pairs.length + ' Dateien analysiert · ' + c.top + ' Top Assets');
}
function setProgress(label, done, total) { S.progress = {label, done, total}; const el = document.getElementById('as-progress'); if (el) el.outerHTML = progressHtml(); }
function pipelineStatus() {
  if (!S.assets.length) return null;
  if (S.busy || S.assets.some(a => a.pipeline === 'analyse')) return 'ANALYSE LÄUFT';
  if (S.assets.every(a => a.pipeline === 'neu')) return 'NEU';
  const g = (S.gaps && S.gaps.list) || [];
  if (!S.assets.some(a => a.ai) && S.gaps && S.gaps.unknown > 0) return 'ANALYSIERT';
  if (g.some(x => x.prio === 1)) return 'FEHLT NOCH MATERIAL';
  return S.board && S.board.scenes.length && S.board.scenes.every(s => s.assetId) ? 'BEREIT FÜR PRODUKTION' : 'VERWENDBAR';
}
// Lokale Statusübersicht je Projekt (für Projekte-/Kundenportal-Anzeige; wird nicht synchronisiert)
function publishStatus(pid, st) { try { const m = JSON.parse(localStorage.getItem('mindea-as-status') || '{}'); m[pid || S.projectId] = {status: st || pipelineStatus(), assets: pid && pid !== S.projectId ? undefined : S.assets.length, at: Date.now()}; localStorage.setItem('mindea-as-status', JSON.stringify(m)); } catch (e) {} }

// ─── UI: HILFEN ──────────────────────────────────────────────────────────
const KIND_LABEL = {image: 'Foto', graphic: 'Grafik', video: 'Video', audio: 'Audio', document: 'Dokument', other: 'Datei'};
const STATUS_CLS = {'TOP ASSET': 'top', 'GUT VERWENDBAR': '', 'NUR ERGÄNZEND': '', 'SCHWACH': '', 'NICHT VERWENDBAR': '', [UNCHECKED]: ''};
function scoreTxt(v) { return v == null ? '–' : String(Math.round(v)); }
function catLabel(a) {
  const low = !a.ai && !a.categoryManual && a.local && ['niedrig', 'unbekannt'].includes(a.local.conf);
  return esc(a.category || 'SONSTIGES') + (a.categoryManual ? ' · manuell' : low ? ' · lokal geschätzt' : '');
}
function thumbHtml(a, cls) {
  const u = S.urls.get(a.id); const contain = a.isGraphicLike || a.kind === 'graphic';
  if (u) return '<div class="' + (cls || 'as-thumb') + (contain ? ' contain' : '') + '"><img src="' + u + '" alt="' + esc(a.name) + '" loading="lazy" draggable="false">';
  const ic = a.kind === 'audio' ? '♪' : a.kind === 'video' ? '▶' : a.kind === 'document' ? '▤' : (a.ext || '?').toUpperCase();
  return '<div class="' + (cls || 'as-thumb') + '"><div class="as-thumb-ph"><b>' + esc(ic) + '</b>' + esc(a.kind === 'audio' ? fmtDur(a.duration) : a.pipeline === 'neu' || a.pipeline === 'analyse' ? 'Analyse …' : 'Keine Vorschau') + '</div>';
}
function cardHtml(a, big) {
  const g = a.groupId && S.groups.find(x => x.id === a.groupId);
  const sel = S.selected.has(a.id); const s = a.scores || {};
  const st = a.pipeline === 'neu' || a.pipeline === 'analyse' ? 'ANALYSE …' : (a.status || '');
  let right = '';
  if (a.kind === 'video') right = 'VIDEO · ' + fmtDur(a.duration); else if (a.kind === 'audio') right = 'AUDIO';
  else if (g && a.groupRole === 'best') right = (g.type === 'identisch' ? '×' : '◆ ') + g.members.length + ' ähnlich';
  else if (a.groupRole === 'duplicate') right = 'DUPLIKAT'; else if (a.groupRole === 'similar') right = 'ÄHNLICH';
  const scene = a.ai && (a.ai.szenenNotiz || (a.ai.szenen || []).join(' · '));
  return '<div class="as-card' + (sel ? ' sel' : '') + '" data-act="open" data-id="' + a.id + '">' + thumbHtml(a)
    + (st ? '<span class="as-badge ' + (STATUS_CLS[st] || '') + '">' + esc(st) + '</span>' : '')
    + (S.selectMode ? '<span class="as-check">' + (sel ? '✓' : '') + '</span>' : right ? '<span class="as-badge r">' + esc(right) + '</span>' : '')
    + '</div><div class="as-card-body"><div class="as-card-cat">' + catLabel(a) + '</div><div class="as-card-name">' + esc(a.name) + '</div>'
    + (big && scene ? '<div class="as-card-scene">' + esc(scene) + '</div>' : '')
    + (a.decoded ? '<div class="as-mini-scores"><span>Q <b>' + scoreTxt(s.quality) + '</b></span><span>M <b>' + scoreTxt(s.brand) + '</b></span><span>C <b>' + scoreTxt(s.cinematic) + '</b></span><span>P <b>' + scoreTxt(s.premium) + '</b></span><span>V <b>' + scoreTxt(s.usability) + '</b></span></div>' : '')
    + '</div></div>';
}
function progressHtml() {
  const p = S.progress; if (!p) return '<div id="as-progress"></div>';
  const pct = p.total ? Math.round(p.done / p.total * 100) : 0;
  return '<div id="as-progress" class="as-progress"><div style="display:flex;justify-content:space-between;gap:10px;font-size:12px"><span><span class="as-spin"></span> &nbsp;' + esc(p.label) + '</span><span class="as-small">' + p.done + ' / ' + p.total + '</span></div><div class="as-bar"><i style="width:' + pct + '%"></i></div></div>';
}

// ─── UI: HAUPTANSICHT ────────────────────────────────────────────────────
function render() {
  if (!S.root || !document.body.contains(S.root)) return;
  const k = projectContext(); const c = counts();
  const projs = projects(); const st = pipelineStatus();
  const opts = projs.map(p => '<option value="' + esc(p.id) + '"' + (String(p.id) === String(S.projectId) ? ' selected' : '') + '>' + esc(p.name) + (PKG_ALIAS[p.pkg] ? ' — ' + PKG[PKG_ALIAS[p.pkg]].name : '') + (p.status === 'final' ? ' (final)' : '') + '</option>').join('')
    + '<option value="' + NONE + '"' + (S.projectId === NONE ? ' selected' : '') + '>Ohne Projekt · allgemeines Material</option>';
  const chip = (ok, t) => '<span class="as-chip ' + (ok ? 'ok' : 'off') + '">' + (ok ? '✓ ' : '– ') + esc(t) + '</span>';
  const cons = S.ctx.consent || {}; const anyCons = Object.values(cons).some(Boolean);
  const todo = aiTodo(false).length;
  const ai = S.busy === 'ai' ? '<button class="as-btn gold" disabled><span class="as-spin"></span> KI-Analyse läuft</button>'
    : todo ? '<button class="as-btn gold" data-act="ai" ' + (S.busy ? 'disabled' : '') + '>✦ KI-Analyse starten · ' + todo + ' Assets · ca. $' + Math.max(0.01, estimate(todo)).toFixed(2) + '</button>'
    : c.total ? '<button class="as-btn ondark" data-act="ai-report" ' + (S.busy ? 'disabled' : '') + '>✦ Film-Analyse aktualisieren</button>' : '';
  const stat = (v, l, gold) => '<div class="as-stat' + (gold ? ' gold' : '') + '"><div class="as-stat-v">' + v + '</div><div class="as-stat-l">' + l + '</div></div>';
  S.root.innerHTML = '<div class="as-wrap"><div class="as-top"><div>'
    + '<div class="as-eyebrow">Mindéa · Asset Sorter</div>'
    + '<div class="as-label" style="margin-top:20px">Projekt</div><select class="as-select as-proj-select" data-act="project">' + opts + '</select>'
    + (projs.length ? '' : '<div class="as-note" style="margin-top:10px">Noch keine Kundenprojekte. Lege sie im Modul <button class="as-link" data-act="openmod" data-id="briefing">Briefing</button> oder <button class="as-link" data-act="openmod" data-id="projekte">Projekte</button> an — der Asset Sorter nutzt diese Daten automatisch.</div>')
    + '<h1 class="as-h1">' + esc(k.project ? k.project.name : 'Allgemeines Material') + '</h1>'
    + '<div class="as-eyebrow as-gold">' + esc((k.pkgName || 'Paket nicht festgelegt').toUpperCase()) + (k.status ? ' · ' + esc(k.status) : '') + '</div>'
    + '<div class="as-chips">' + chip(!!k.briefing, 'Briefing') + chip(!!k.script, 'Skript' + (k.scriptSource ? ' (' + k.scriptSource + ')' : '')) + chip(!!k.voiceover || S.assets.some(a => a.category === 'VOICEOVER'), 'Voiceover') + chip(!!(k.stil || k.wirkung), 'Markenstil / Wirkung')
    + '<span class="as-chip ' + (anyCons ? 'warn' : 'gold') + '">' + (anyCons ? 'Freigaben erteilt' : '🔒 Keine Freigaben') + '</span>' + (S.ctx.aiConsent ? '<span class="as-chip gold">KI erlaubt</span>' : '') + '</div>'
    + '<div class="as-btn-row" style="margin-top:14px"><button class="as-btn sm" data-act="ctx">Film-Kontext & Freigaben</button>' + (S.assets.length ? '<button class="as-btn sm ghost" data-act="export-json">Analyse exportieren</button>' : '') + '</div>'
    + '</div><div class="as-status"><div class="as-eyebrow">Materialstatus</div><div class="as-stat-grid">'
    + stat(c.total, 'Assets') + stat(c.top, 'Top Assets', true) + stat(c.gut, 'Gut verwendbar') + stat(c.erg, 'Ergänzend') + stat(c.dup, 'Doppelt / ähnlich') + stat(c.weak + c.bad, 'Schwach / unbrauchbar')
    + '</div>' + (st ? '<div class="as-pipe"><i></i>' + esc(st) + '</div>' : '')
    + (c.unchecked ? '<div class="as-small" style="color:rgba(251,247,240,.6);margin-top:10px">' + c.unchecked + ' Datei(en) in diesem Browser nicht beurteilbar — bleiben erhalten.</div>' : '')
    + (ai ? '<div class="as-btn-row" style="margin-top:16px;align-items:center">' + ai + (todo && !S.busy ? '<select class="as-select" data-act="model" style="width:auto;min-height:34px;font-size:11px;background-color:transparent;color:var(--as-ivory);border-color:rgba(251,247,240,.25)">' + Object.entries(MODELS).map(([id, m]) => '<option value="' + id + '"' + (id === S.model ? ' selected' : '') + ' style="color:#2b1e14">' + m.label + '</option>').join('') + '</select>' : '') + '</div>' : '')
    + (c.total && c.ai < c.total ? '<div class="as-small" style="color:rgba(251,247,240,.55);margin-top:8px">Lokale Analyse ist kostenlos. KI wird nur für Bildbedeutung, Markenpassung, Szenen und Lücken genutzt — Duplikate und Serien-Doppel werden nicht gesendet.</div>' : '')
    + '</div></div>'
    + '<div class="as-drop" id="as-drop"><div><div class="as-drop-title">Material hinzufügen</div><div class="as-muted">Fotos, Videos, Logos, Grafiken, Screenshots, Voiceover — einzeln oder als Ordner. Die Analyse startet automatisch. Nichts wird verändert oder gelöscht.</div></div>'
    + '<div class="as-btn-row"><label class="as-btn primary as-file-btn">Fotos & Videos<input type="file" multiple accept="image/*,video/*" data-act="files"></label><label class="as-btn as-file-btn">Dateien<input type="file" multiple data-act="files"></label>'
    + (!IS_IOS ? '<label class="as-btn as-file-btn">Ordner<input type="file" multiple webkitdirectory data-act="files"></label>' : '') + '</div></div>'
    + progressHtml()
    + tabsHtml(c) + '<div id="as-tab">' + tabBody() + '</div></div>';
  bindDrop();
}
function tabsHtml(c) {
  const g = (S.gaps && S.gaps.list) || []; const t = (id, l, n) => '<button class="as-tab' + (S.tab === id ? ' on' : '') + '" data-act="tab" data-id="' + id + '">' + l + (n != null ? '<b>' + n + '</b>' : '') + '</button>';
  return '<div class="as-tabs">' + t('overview', 'Übersicht') + t('library', 'Alle Assets', c.total) + t('gaps', 'Material-Lücken', g.filter(x => x.prio === 1).length || null) + t('board', 'Film Board', S.board ? S.board.scenes.length : null) + t('series', 'Serien & Duplikate', S.groups.length || null) + '</div>';
}
function tabBody() {
  if (!S.assets.length) return '<div class="as-empty"><div class="as-h2">Noch kein Material in diesem Projekt</div>Lade Kundenmaterial hoch — der Asset Sorter sortiert, bewertet und baut daraus einen ersten Filmaufbau.<br><span class="as-small">Unterstützt: JPG, PNG, HEIC, WebP, GIF, SVG, MP4, MOV, M4V, WebM, MP3, M4A, WAV, AAC und weitere.</span></div>';
  if (S.tab === 'library') return libraryHtml();
  if (S.tab === 'gaps') return gapsHtml();
  if (S.tab === 'board') return boardHtml();
  if (S.tab === 'series') return seriesHtml(S.groups);
  return overviewHtml();
}
function sortByStrength(list) { return [...list].sort((a, b) => (composite(b) || 0) - (composite(a) || 0)); }
function overviewHtml() {
  let h = '';
  if (S.report && S.report.fazit) h += '<div class="as-note" style="margin-top:22px"><b class="as-gold">Einschätzung · </b>' + esc(S.report.fazit) + '</div>';
  const top = sortByStrength(S.assets.filter(a => visible(a) && a.status === 'TOP ASSET'));
  const fill = top.length < 6 ? sortByStrength(S.assets.filter(a => visible(a) && a.status === 'GUT VERWENDBAR')).slice(0, 6 - top.length) : [];
  h += '<div class="as-sec"><div class="as-sec-head"><div><div class="as-eyebrow">Das sind deine stärksten Assets</div><div class="as-h2">Top Assets</div></div><button class="as-link" data-act="tab" data-id="library">Alle ansehen</button></div>';
  h += top.length || fill.length ? '<div class="as-grid big">' + top.slice(0, 9).concat(fill).map(a => cardHtml(a, true)).join('') + '</div>' + (!top.length ? '<div class="as-small" style="margin-top:10px">Noch keine Top Assets — gezeigt werden die besten gut verwendbaren.</div>' : '') : '<div class="as-empty">' + (S.busy ? 'Analyse läuft …' : 'Noch keine verwendbaren Assets erkannt.') + '</div>';
  h += '</div>';
  const g = (S.gaps && S.gaps.list) || []; const sw = g.filter(x => x.prio === 1);
  h += '<div class="as-sec"><div class="as-sec-head"><div><div class="as-eyebrow">Was fehlt noch?</div><div class="as-h2">Material-Lücken</div></div><button class="as-link" data-act="tab" data-id="gaps">Details</button></div><div class="as-panel">'
    + '<div class="as-gap-big">' + (sw.length ? sw.length + (sw.length === 1 ? ' wichtiges Motiv fehlt.' : ' wichtige Motive fehlen.') : g.length ? 'Alles Wichtige ist da — ' + g.length + ' Ergänzung' + (g.length > 1 ? 'en' : '') + ' möglich.' : 'Das Material ist vollständig.') + '</div>'
    + (S.gaps && S.gaps.unknown ? '<div class="as-small" style="margin-top:6px">Vorläufig: ' + S.gaps.unknown + ' Foto(s) konnten lokal keinem Motiv zugeordnet werden. KI-Analyse starten oder Kategorie manuell setzen.</div>' : '')
    + (sw.length ? '<div style="margin-top:12px;display:grid;gap:6px">' + sw.slice(0, 4).map(x => '<div style="font-size:13px">— ' + esc(x.title) + '</div>').join('') + '</div>' : '')
    + (g.some(x => x.ask && x.prio <= 2) ? '<div class="as-btn-row" style="margin-top:16px"><button class="as-btn primary" data-act="tab" data-id="gaps" data-scroll="as-request">Anfrage vorbereiten</button></div>' : '') + '</div></div>';
  h += '<div class="as-sec"><div class="as-sec-head"><div><div class="as-eyebrow">Hier ist ein erster Filmaufbau</div><div class="as-h2">Film Board</div></div><button class="as-link" data-act="tab" data-id="board">Bearbeiten</button></div>' + boardStrip() + '</div>';
  if (S.groups.length) h += '<div class="as-sec"><div class="as-sec-head"><div><div class="as-eyebrow">Automatisch das stärkste gewählt</div><div class="as-h2">Serien & Duplikate</div></div><button class="as-link" data-act="tab" data-id="series">Alle ' + S.groups.length + '</button></div>' + seriesHtml(S.groups.slice(0, 4)) + '</div>';
  return h;
}
function boardStrip() {
  if (!S.board || !S.board.scenes.length) return '<div class="as-empty">Noch kein Film Board — es entsteht automatisch aus verwendbarem Material.</div>';
  return '<div class="as-strip">' + S.board.scenes.map((s, i) => { const a = s.assetId && S.assets.find(x => x.id === s.assetId); const u = a && S.urls.get(a.id);
    return '<div class="as-strip-item" data-act="' + (a ? 'open' : 'tab') + '" data-id="' + (a ? a.id : 'gaps') + '"><div class="as-strip-img' + (a ? '' : ' empty') + '">' + (u ? '<img src="' + u + '" alt="" draggable="false">' : a ? esc(a.name) : 'Material fehlt') + '</div><div class="as-scene-n" style="margin-top:8px">SZENE ' + (i + 1) + '</div><div style="font-size:12px;font-weight:600;margin-top:2px">' + esc(s.title) + '</div><div class="as-small">' + esc(a ? a.name : s.role) + '</div></div>'; }).join('') + '</div>';
}

// ─── BIBLIOTHEK: SUCHE, FILTER, BATCH ────────────────────────────────────
const STOP = new Set(['zeig','zeige','zeigt','mir','alle','alles','nur','mit','ohne','bilder','bild','fotos','foto','material','fur','fuer','die','der','das','den','dem','von','und','oder','assets','asset','ich','brauche','suche','finde','welche','gib','dateien','datei','einen','eine','ein','im','in','am','an','auf','sind','ist','fuers']);
function queryFilter(q) {
  let rest = ' ' + norm(q) + ' '; const preds = []; let similar = false;
  const take = (re, fn) => { const m = rest.match(re); if (m) { preds.push(fn(m)); rest = rest.replace(re, ' '); } };
  take(/szene\s*(\d+)/, m => { const sc = S.board && S.board.scenes[+m[1] - 1]; const tpl = BOARD_TPL[pkgCode(currentProject()) || 'bs'].find(t => sc && t[0] === sc.role); return a => !!sc && (a.id === sc.assetId || (a.ai && (a.ai.szenen || []).includes(sc.role)) || (!!tpl && tpl[2].includes(a.category) && usable(a))); });
  take(/hero\s*-?\s*shots?|\bheros?\b/, () => a => (a.ai && (a.ai.szenen || []).includes('HERO SHOT')) || (!!S.board && S.board.scenes.some(s => s.role === 'HERO SHOT' && s.assetId === a.id)));
  take(/nicht verwendbar\w*|unbrauchbar\w*/, () => a => a.status === 'NICHT VERWENDBAR');
  take(/schwach\w*|schlecht\w*/, () => a => ['SCHWACH', 'NICHT VERWENDBAR'].includes(a.status));
  take(/\btop\b( assets?)?|\bbeste\w*|starkste\w*|staerkste\w*/, () => a => a.status === 'TOP ASSET');
  take(/duplikat\w*|doppelt\w*|ahnlich\w*|aehnlich\w*|serien?\b/, () => { similar = true; return a => !!a.groupId; });
  take(/\bvideos?\b|\bclips?\b/, () => a => a.kind === 'video');
  take(/voice\s*-?\s*overs?|sprachaufnahme\w*|\baudio\w*/, () => a => a.kind === 'audio' || a.category === 'VOICEOVER');
  take(/\blogos?\b/, () => a => a.category === 'LOGO');
  take(/grunderin\w*|gruenderin\w*|grunder\w*|founder\w*|portraits?|portraets?|portrats?/, () => a => a.category === 'PORTRAITS' || (!!a.ai && a.ai.motive.some(m => /grunder|founder|portr/.test(norm(m)))));
  const words = rest.split(/\s+/).filter(w => w && w.length > 1 && !STOP.has(w));
  words.forEach(w => { const stem = w.length > 5 ? w.slice(0, w.length - 1) : w; preds.push(a => norm([a.name, a.category, a.ai && a.ai.beschreibung, a.ai && a.ai.motive.join(' '), a.ai && a.ai.szenen.join(' '), a.ai && a.ai.szenenNotiz].join(' ')).includes(stem)); });
  return {pred: a => preds.every(p => p(a)), similar, empty: !preds.length};
}
function filtered() {
  const f = S.filters; const q = queryFilter(S.query || '');
  return S.assets.filter(a => {
    if (!S.showSimilar && !q.similar && f.cat !== 'DUPLIKATE' && !visible(a)) return false;
    if (f.kind && (f.kind === 'image' ? !['image', 'graphic'].includes(a.kind) : a.kind !== f.kind)) return false;
    if (f.cat === 'DUPLIKATE') { if (!a.groupRole || a.groupRole === 'best') return false; }
    else if (f.cat === 'SCHWACHE QUALITÄT') { if (a.status !== 'SCHWACH') return false; }
    else if (f.cat === 'NICHT VERWENDBAR') { if (a.status !== 'NICHT VERWENDBAR') return false; }
    else if (f.cat && a.category !== f.cat) return false;
    if (f.status && a.status !== f.status) return false;
    const s = a.scores || {};
    for (const k of ['quality', 'brand', 'premium', 'cinematic', 'usability']) if (f[k] && !(s[k] != null && s[k] >= +f[k])) return false;
    return q.pred(a);
  });
}
function libraryHtml() {
  const sel = (key, label, opts) => '<select class="as-select" data-act="filter" data-k="' + key + '"><option value="">' + label + '</option>' + opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return '<option value="' + esc(v) + '"' + (String(S.filters[key] || '') === String(v) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>';
  const min = [['5', 'ab 5'], ['6', 'ab 6'], ['7', 'ab 7'], ['8', 'ab 8'], ['9', 'ab 9']];
  const hints = ['Zeig mir alle Bilder mit Schmuck', 'Zeig mir Gründerinnen-Portraits', 'Zeig mir alle schwachen Bilder', 'Zeig mir nur Hero Shots', 'Zeig mir Material für Szene 5'];
  return '<div class="as-sec" style="margin-top:22px"><div class="as-tools">'
    + '<div class="as-search"><span>⌕</span><input class="as-input" type="search" placeholder="Suchen — z. B. „Zeig mir alle Bilder mit Schmuck“" value="' + esc(S.query) + '" data-act="search" enterkeyhint="search"></div>'
    + '<div class="as-hint-chips">' + hints.map(t => '<button data-act="hint" data-q="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>'
    + '<div class="as-filters">' + sel('kind', 'Dateityp', [['image', 'Fotos & Grafiken'], ['video', 'Videos'], ['audio', 'Audio'], ['document', 'Dokumente']])
    + sel('cat', 'Kategorie', CATS.concat(SPECIAL_CATS)) + sel('status', 'Status', STATUSES.concat([UNCHECKED]))
    + sel('quality', 'Qualität', min) + sel('brand', 'Markenpassung', min) + sel('premium', 'Premium-Wirkung', min) + sel('cinematic', 'Cinematic', min) + sel('usability', 'Verwendbarkeit', min)
    + '<select class="as-select" data-act="project">' + projects().map(p => '<option value="' + esc(p.id) + '"' + (String(p.id) === String(S.projectId) ? ' selected' : '') + '>Projekt: ' + esc(p.name) + '</option>').join('') + '<option value="' + NONE + '"' + (S.projectId === NONE ? ' selected' : '') + '>Projekt: ohne</option></select></div>'
    + '<div class="as-btn-row" style="align-items:center"><button class="as-btn sm' + (S.selectMode ? ' primary' : '') + '" data-act="selectmode">' + (S.selectMode ? 'Auswahl beenden' : 'Mehrere auswählen') + '</button>'
    + '<label class="as-small" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" data-act="similar"' + (S.showSimilar ? ' checked' : '') + ' style="accent-color:var(--as-gold)"> Ähnliche & Duplikate einblenden</label>'
    + (Object.values(S.filters).some(Boolean) || S.query ? '<button class="as-btn sm ghost" data-act="reset-filter">Filter zurücksetzen</button>' : '') + '</div></div>'
    + '<div id="as-results">' + resultsHtml() + '</div></div>';
}
function resultsHtml() {
  const list = sortByStrength(filtered());
  const head = '<div class="as-small" style="margin-bottom:10px">' + list.length + ' von ' + S.assets.length + ' Assets' + (S.selectMode ? ' · ' + S.selected.size + ' ausgewählt' : '') + '</div>';
  const grid = list.length ? '<div class="as-grid">' + list.map(a => cardHtml(a)).join('') + '</div>' : '<div class="as-empty">Keine Treffer.' + (S.assets.some(a => !a.ai) ? '<br><span class="as-small">Tipp: Inhaltliche Suche (z. B. „Schmuck“) wird nach der KI-Analyse genauer — vorher wird nur im Dateinamen gesucht.</span>' : '') + '</div>';
  return head + grid + (S.selectMode ? batchHtml(list) : '');
}
function batchHtml(list) {
  const n = S.selected.size;
  return '<div class="as-batch"><b style="font-size:12px;letter-spacing:1px">' + n + ' AUSGEWÄHLT</b>'
    + '<button class="as-btn sm" data-act="select-all" data-ids="' + list.map(a => a.id).join(',') + '">Alle</button><button class="as-btn sm" data-act="select-none">Keine</button>'
    + '<select class="as-select" data-act="b-cat"' + (n ? '' : ' disabled') + '><option value="">Kategorie ändern …</option><option value="__auto">Automatisch</option>' + CATS.map(c => '<option>' + esc(c) + '</option>').join('') + '</select>'
    + '<select class="as-select" data-act="b-status"' + (n ? '' : ' disabled') + '><option value="">Status ändern …</option><option value="__auto">Automatisch</option>' + STATUSES.map(c => '<option>' + esc(c) + '</option>').join('') + '</select>'
    + '<select class="as-select" data-act="b-proj"' + (n ? '' : ' disabled') + '><option value="">Projekt zuweisen …</option>' + projects().map(p => '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>').join('') + '<option value="' + NONE + '">Ohne Projekt</option></select>'
    + '<button class="as-btn sm" data-act="b-board"' + (n ? '' : ' disabled') + '>＋ Film Board</button><button class="as-btn sm" data-act="b-zip"' + (n ? '' : ' disabled') + '>↓ Download vorbereiten</button>'
    + '<button class="as-btn sm" data-act="b-delete"' + (n ? '' : ' disabled') + ' title="Nur manuell — nichts wird automatisch gelöscht">Entfernen …</button></div>';
}
function refreshResults() { const el = document.getElementById('as-results'); if (el) el.innerHTML = resultsHtml(); }

// ─── LÜCKEN & ANFRAGE ────────────────────────────────────────────────────
function gapsHtml() {
  const g = (S.gaps && S.gaps.list) || [];
  const col = (p, t, cls, sub) => '<div class="as-gap-col ' + cls + '"><h4>' + t + '</h4><div class="as-small" style="margin:-6px 0 10px">' + sub + '</div>' + (g.filter(x => x.prio === p).map(x => '<div class="as-gap"><div class="as-gap-t">' + esc(x.title) + '</div>' + (x.why ? '<div class="as-gap-w">' + esc(x.why) + '</div>' : '') + (x.uncertain ? '<div class="as-gap-w as-gold">Evtl. vorhanden, aber lokal nicht sicher erkannt.</div>' : '') + (x.ai ? '<div class="as-gap-w as-gold">KI-Hinweis</div>' : '') + '</div>').join('') || '<div class="as-small">Nichts offen.</div>') + '</div>';
  const txt = S.reqDraft != null ? S.reqDraft : (S.report && S.report.anfrage) || requestText();
  return '<div class="as-sec" style="margin-top:22px">'
    + (S.gaps && S.gaps.unknown ? '<div class="as-note warn" style="margin-bottom:16px">Vorläufige Einschätzung: ' + S.gaps.unknown + ' Foto(s) konnten lokal keinem Motiv zugeordnet werden. Für eine zuverlässige Lückenanalyse die KI-Analyse starten oder Kategorien manuell setzen.</div>' : '')
    + '<div class="as-gaps">' + col(1, 'SEHR WICHTIG', 'p1', 'fehlt unbedingt') + col(2, 'SINNVOLL', 'p2', 'würde den Film verbessern') + col(3, 'OPTIONAL', 'p3', 'nice to have') + '</div></div>'
    + '<div class="as-sec" id="as-request"><div class="as-sec-head"><div><div class="as-eyebrow">Automatische Anfrage an die Kundin</div><div class="as-h2">Nachricht vorbereiten</div></div></div>'
    + (txt ? '<textarea class="as-request" data-act="req-edit">' + esc(txt) + '</textarea><div class="as-btn-row" style="margin-top:12px"><button class="as-btn primary" data-act="copy-req">Text kopieren</button><button class="as-btn" data-act="req-reset">Neu erzeugen</button></div><div class="as-small" style="margin-top:8px">Text ist frei bearbeitbar. Es wird nichts automatisch verschickt.</div>'
      : '<div class="as-empty">Keine Anfrage nötig — es fehlt nichts Wichtiges.</div>') + '</div>';
}

// ─── SERIEN ──────────────────────────────────────────────────────────────
function seriesHtml(groups) {
  if (!groups.length) return '<div class="as-empty" style="margin-top:22px">Keine Duplikate oder Serien erkannt.</div>';
  return '<div class="as-series" style="margin-top:22px">' + groups.map(g => { const b = g.best; const u = S.urls.get(b.id);
    return '<div class="as-serie"><div class="as-serie-img" data-act="open" data-id="' + b.id + '" style="cursor:pointer">' + (u ? '<img src="' + u + '" alt="">' : '') + '</div><div style="min-width:0">'
      + '<div class="as-scene-n">' + esc(g.label) + ' · ' + g.members.length + (g.type === 'identisch' ? ' identische Dateien' : g.type === 'fast identisch' ? ' fast identische Bilder' : ' ähnliche Bilder') + '</div>'
      + '<div class="as-small" style="margin-top:6px;letter-spacing:1.5px;font-weight:600">EMPFOHLEN' + (b.bestPick ? (b.bestPick.by === 'manual' ? ' · von dir gewählt' : ' · KI-Vergleich') : '') + '</div><div class="as-scene-t" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(b.name) + '</div>'
      + '<div class="as-scene-m">Warum: ' + esc((b.bestReasons || []).join(', ')) + '</div>'
      + '<div class="as-serie-strip">' + g.members.map(m => { const mu = S.urls.get(m.id); return mu ? '<img src="' + mu + '" class="' + (m === b ? 'best' : '') + '" data-act="pick-best" data-id="' + m.id + '" title="' + esc(m.name) + ' — als bestes festlegen" alt="">' : ''; }).join('') + '</div>'
      + '<div class="as-btn-row" style="margin-top:8px"><button class="as-btn sm" data-act="show-group" data-id="' + g.id + '">Alle ansehen</button>' + (g.type !== 'identisch' ? '<button class="as-btn sm ghost" data-act="ai-group" data-id="' + g.id + '"' + (S.busy ? ' disabled' : '') + '>✦ KI vergleichen</button>' : '') + '</div>'
      + '<div class="as-small" style="margin-top:6px">Die anderen sind als ähnlich markiert — nichts wird gelöscht.</div></div></div>'; }).join('') + '</div>';
}

// ─── FILM BOARD ──────────────────────────────────────────────────────────
function boardHtml() {
  const B = S.board;
  let h = '<div class="as-sec" style="margin-top:22px"><div class="as-btn-row" style="margin-bottom:14px;align-items:center"><button class="as-btn sm" data-act="board-rebuild">Neu aus Material erstellen</button>'
    + (S.report && S.report.board && S.report.board.length && B && B.source !== 'ki' ? '<button class="as-btn sm" data-act="board-ai">✦ KI-Vorschlag übernehmen</button>' : '')
    + '<button class="as-btn sm ghost" data-act="board-add">＋ Szene</button><span class="as-small">Ziehen am ⋮⋮ zum Sortieren' + (B && B.manual ? ' · manuell bearbeitet' : B ? ' · ' + (B.source === 'ki' ? 'KI-Vorschlag' : 'automatisch erstellt') : '') + '</span></div>';
  if (!B || !B.scenes.length) return h + '<div class="as-empty">Noch keine Szenen.</div></div>';
  h += '<div class="as-board" id="as-board">' + B.scenes.map((s, i) => { const a = s.assetId && S.assets.find(x => x.id === s.assetId); const u = a && S.urls.get(a.id);
    return '<div class="as-scene" data-idx="' + i + '"><div class="as-handle" aria-label="Verschieben">⋮⋮</div>'
      + '<button class="as-scene-img' + (a ? '' : ' empty') + '" data-act="scene-pick" data-i="' + i + '">' + (u ? '<img src="' + u + '" alt="" draggable="false">' : a ? esc(a.name) : 'Material fehlt · wählen') + '</button>'
      + '<div style="min-width:0"><div class="as-scene-n">SZENE ' + (i + 1) + ' · ' + esc(s.role) + '</div><div class="as-scene-t">' + esc(s.title) + '</div><div class="as-scene-m">' + esc(a ? a.name : '') + (s.note ? (a ? ' — ' : '') + esc(s.note) : '') + '</div>' + (s.motion ? '<div class="as-scene-m" style="font-style:italic">↗ ' + esc(s.motion) + '</div>' : '') + '</div>'
      + '<div class="as-scene-act"><button class="as-btn sm ghost" data-act="scene-up" data-i="' + i + '" aria-label="Nach oben">↑</button><button class="as-btn sm ghost" data-act="scene-down" data-i="' + i + '" aria-label="Nach unten">↓</button><button class="as-btn sm ghost" data-act="scene-edit" data-i="' + i + '">Bearbeiten</button><button class="as-btn sm ghost" data-act="scene-del" data-i="' + i + '" aria-label="Szene entfernen">✕</button></div></div>'; }).join('') + '</div>';
  return h + '</div>';
}

// ─── SHEETS (Detail, Kontext, Szenen-Auswahl) ────────────────────────────
let sheetEl = null;
function openSheet(html, narrow) {
  closeSheet();
  sheetEl = document.createElement('div'); sheetEl.className = 'as-sheet-wrap';
  sheetEl.innerHTML = '<div class="as-sheet' + (narrow ? ' narrow' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
  sheetEl.addEventListener('click', e => { if (e.target === sheetEl) closeSheet(); else onAct(e); });
  sheetEl.addEventListener('change', onAct); sheetEl.addEventListener('input', onInput);
  document.body.appendChild(sheetEl);
}
function closeSheet() { if (sheetEl) { sheetEl.querySelectorAll('[data-objurl]').forEach(el => URL.revokeObjectURL(el.getAttribute('data-objurl'))); sheetEl.remove(); sheetEl = null; S.sheetId = null; } }
function sheetHead(t, sub) { return '<div class="as-sheet-head"><div class="t"><div>' + esc(t) + '</div><div class="as-small">' + sub + '</div></div><button class="as-x" data-act="close" aria-label="Schließen">✕</button></div>'; }
const SCORE_ROWS = [['quality', 'Qualität'], ['brand', 'Markenpassung'], ['cinematic', 'Cinematic Potential'], ['premium', 'Premium-Wirkung'], ['usability', 'Verwendbarkeit']];
async function openAsset(id) {
  const a = S.assets.find(x => x.id === id); if (!a) return; S.sheetId = id;
  let pv = '';
  const f = a.originalStored ? await DB.get('blobs', 'f:' + a.id) : null;
  const u = f ? URL.createObjectURL(f.blob) : null;
  if (a.kind === 'video' && u) pv = '<video src="' + u + '" data-objurl="' + u + '" controls playsinline preload="metadata"></video>';
  else if (a.kind === 'audio' && u) pv = '<div style="padding:30px 18px"><div class="as-h2" style="text-align:center">♪ ' + esc(a.name) + '</div><audio src="' + u + '" data-objurl="' + u + '" controls preload="metadata"></audio></div>';
  else if (a.decoded && u && !['heic', 'heif'].includes(a.ext) || (u && IS_IOS)) pv = '<img src="' + u + '" data-objurl="' + u + '" alt="' + esc(a.name) + '">';
  else if (S.urls.get(a.id)) pv = '<img src="' + S.urls.get(a.id) + '" alt="' + esc(a.name) + '">';
  else pv = '<div class="as-empty">Keine Vorschau verfügbar.</div>';
  if (u && !pv.includes(u)) URL.revokeObjectURL(u);
  const g = a.groupId && S.groups.find(x => x.id === a.groupId); const s = a.scores || {}; const src = a.scoreSrc || {};
  const scores = '<div class="as-scores">' + SCORE_ROWS.map(([k, l]) => '<div class="as-score"><span class="as-score-l">' + l + '</span><span class="as-score-t"><i style="width:' + (s[k] != null ? s[k] * 10 : 0) + '%"></i></span><span class="as-score-v">' + scoreTxt(s[k]) + '</span><span class="as-score-src">' + esc(s[k] != null ? src[k] : NA_TXT + (a.decoded && a.kind !== 'audio' ? ' — KI-Analyse nötig' : '')) + '</span></div>').join('') + '</div>';
  const checks = '<div class="as-checks">' + (a.checks || []).map(c => '<div class="as-chk"><span class="as-dot ' + c.s + '"></span><div><div class="as-chk-l">' + esc(c.l) + '</div>' + (c.n ? '<div class="as-chk-n">' + esc(c.n) + '</div>' : '') + '</div><div class="as-chk-v">' + esc(c.s === 'na' && !c.v ? 'n. b.' : c.v) + '</div></div>').join('') + '</div>';
  const b = (a.ai && a.ai.bewegung) || {}; const tpl = !(a.ai && b.kamera);
  const mv = [['Kamerabewegung', b.kamera || motionFor(a)], ['Zoom', b.zoom], ['Parallax', b.parallax], ['3D Motion', b.motion3d], ['Lichtbewegung', b.licht], ['Übergang', b.uebergang]].filter(x => x[1]);
  const visual = ['image', 'graphic', 'video'].includes(a.kind) && a.decoded;
  const cons = a.consent || {}; const pc = S.ctx.consent || {};
  const tog = (k, l) => '<label class="as-toggle"><span>' + l + '</span><input type="checkbox" data-act="consent" data-id="' + a.id + '" data-k="' + k + '"' + (cons[k] || pc[k] ? ' checked' : '') + (pc[k] ? ' disabled title="Für das ganze Projekt freigegeben"' : '') + '></label>';
  const html = sheetHead(a.name, catLabel(a) + ' · ' + esc(a.status || ''))
    + '<div class="as-sheet-body split"><div><div class="as-preview' + (a.isGraphicLike || a.kind === 'graphic' ? ' contain' : '') + '">' + pv + '</div>'
    + '<dl class="as-kv" style="margin-top:14px">' + [['Typ', (a.kind === 'image' && a.isGraphicLike ? 'Grafik' : a.isScreenshot ? 'Screenshot' : KIND_LABEL[a.kind]) + ' · ' + (a.ext || '').toUpperCase()], ['Größe', fmtBytes(a.size)], ['Maße', a.w ? a.w + ' × ' + a.h + ' px' : ''], ['Dauer', a.duration ? fmtDur(a.duration) : ''], ['Kamera', a.exif && (a.exif.make || a.exif.model) ? [a.exif.make, a.exif.model].filter(Boolean).join(' ') : ''], ['Aufnahme', a.exif && a.exif.date ? a.exif.date : ''], ['Quelle', a.source === 'portal' ? 'Kundenportal' : 'Upload'], ['Original', a.originalStored ? 'lokal gespeichert' : 'nicht gespeichert (zu groß) — für Download erneut hochladen'], ['Hash', a.hash ? a.hash.slice(0, 12) + (a.hashPartial ? ' (Stichprobe)' : '') : '']].filter(x => x[1]).map(x => '<dt>' + x[0] + '</dt><dd>' + esc(x[1]) + '</dd>').join('') + '</dl></div>'
    + '<div style="display:grid;gap:22px;min-width:0">'
    + '<div><div class="as-two" style="gap:10px"><div><span class="as-label" style="margin-top:0">Kategorie</span><select class="as-select" data-act="set-cat" data-id="' + a.id + '"><option value="__auto">Automatisch' + (a.local ? ' (' + esc(a.ai && a.ai.kategorie || a.local.cat) + ')' : '') + '</option>' + CATS.map(c => '<option' + (a.categoryManual && a.category === c ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></div>'
    + '<div><span class="as-label" style="margin-top:0">Status</span><select class="as-select" data-act="set-status" data-id="' + a.id + '"><option value="__auto">Automatisch</option>' + STATUSES.map(c => '<option' + (a.statusManual && a.status === c ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></div></div>'
    + (a.local && !a.ai ? '<div class="as-small" style="margin-top:6px">Lokale Zuordnung: ' + esc(a.local.why) + '</div>' : '')
    + '<div class="as-btn-row" style="margin-top:12px"><button class="as-btn sm primary" data-act="to-board" data-id="' + a.id + '">＋ Film Board</button>' + (g && a.groupRole !== 'best' ? '<button class="as-btn sm" data-act="pick-best" data-id="' + a.id + '">Als bestes der Serie festlegen</button>' : '') + '<button class="as-btn sm ghost" data-act="del-one" data-id="' + a.id + '">Entfernen …</button></div>'
    + (g ? '<div class="as-note" style="margin-top:12px">' + (a.groupRole === 'best' ? '<b>Empfohlen</b> in ' + esc(g.label) + ' (' + g.members.length + ' Bilder) · Warum: ' + esc((a.bestReasons || []).join(', ')) : 'Als <b>' + (a.groupRole === 'duplicate' ? 'Duplikat' : 'ähnlich') + '</b> markiert — empfohlen ist <button class="as-link" data-act="open" data-id="' + g.best.id + '">' + esc(g.best.name) + '</button>') + '</div>' : '')
    + (hardFail(a).length ? '<div class="as-note warn" style="margin-top:12px">Nicht verwendbar: ' + esc(hardFail(a).join(', ')) + ' · Datei bleibt erhalten.</div>' : '') + '</div>'
    + '<div><div class="as-eyebrow">Szenen-Potenzial</div>' + (a.ai && (a.ai.szenen.length || a.ai.szenenNotiz) ? '<div class="as-chips">' + a.ai.szenen.map(x => '<span class="as-chip gold">' + esc(x) + '</span>').join('') + '</div>' + (a.ai.szenenNotiz ? '<div class="as-card-scene" style="font-size:15px;margin-top:8px">' + esc(a.ai.szenenNotiz) + '</div>' : '') + (a.ai.beschreibung ? '<div class="as-small" style="margin-top:6px">' + esc(a.ai.beschreibung) + '</div>' : '') : '<div class="as-small" style="margin-top:6px">' + (visual ? NA_TXT + ' ohne KI-Analyse.' : 'Für diesen Dateityp nicht relevant.') + '</div>') + '</div>'
    + '<div><div class="as-eyebrow" style="margin-bottom:10px">Bewertung</div>' + scores + '</div>'
    + '<div><div class="as-eyebrow" style="margin-bottom:6px">Qualitätsprüfung</div>' + checks + '</div>'
    + (visual ? '<div><div class="as-eyebrow">KI-Vorschläge · Bewegung' + (tpl ? ' <span class="as-small">(Vorlage, ohne KI)</span>' : '') + '</div><dl class="as-kv" style="margin-top:8px;grid-template-columns:110px 1fr">' + mv.map(x => '<dt>' + x[0] + '</dt><dd style="text-align:left">' + esc(x[1]) + '</dd>').join('') + '</dl></div>'
      + '<div><div class="as-eyebrow" style="margin-bottom:8px">Video-Prompt</div><div class="as-seg">' + TOOLS.map(t => '<button data-act="tool" data-id="' + t + '" class="' + (S.tool === t ? 'on' : '') + '">' + t + '</button>').join('') + '</div>'
      + '<div class="as-btn-row" style="margin-top:10px"><button class="as-btn sm primary" data-act="vprompt" data-id="' + a.id + '">Video-Prompt erstellen</button><button class="as-btn sm" data-act="improve" data-id="' + a.id + '">Bild verbessern</button></div><div id="as-gen" style="margin-top:10px"></div></div>' : '')
    + '<div><div class="as-eyebrow">Datenschutz · Freigaben</div><div class="as-small" style="margin:4px 0 4px">Standard: alles gesperrt. Kundenmaterial wird ohne ausdrückliche Freigabe nicht anderweitig genutzt.</div>' + tog('andereKunden', 'Für andere Kunden') + tog('oeffentlich', 'Für öffentliche Inhalte') + tog('training', 'Für Trainingsdaten') + tog('portfolio', 'Für Portfolio / Showcase') + '</div>'
    + '</div></div>';
  openSheet(html);
}
function openContext() {
  const k = projectContext(); const c = S.ctx; const p = k.project; const pc = c.consent || {};
  const f = (key, l, ph, area, val) => '<label class="as-label">' + l + '</label>' + (area ? '<textarea class="as-textarea" data-ctx="' + key + '" placeholder="' + esc(ph) + '">' + esc(val != null ? val : c[key] || '') + '</textarea>' : '<input class="as-input" data-ctx="' + key + '" placeholder="' + esc(ph) + '" value="' + esc(val != null ? val : c[key] || '') + '">');
  const tog = (key, l) => '<label class="as-toggle"><span>' + l + '</span><input type="checkbox" data-cons="' + key + '"' + (pc[key] ? ' checked' : '') + '></label>';
  const html = sheetHead('Film-Kontext', esc(p ? p.name : 'Ohne Projekt'))
    + '<div class="as-sheet-body"><div class="as-note">Automatisch übernommen aus Mindéa: ' + [p ? 'Projekt' : null, k.briefing ? 'Briefing (' + esc(k.briefing.date || '') + ')' : null, k.scriptSource === 'Mindéa-Modul' ? 'Skript aus ' + esc(k.pkgName) : null].filter(Boolean).join(' · ') + (p || k.briefing ? '' : 'nichts') + '. Hier nur ergänzen, was fehlt — es entsteht keine zweite Kundendatenbank.</div><div>'
    + (!p || !PKG_ALIAS[p.pkg] ? '<label class="as-label">Paket</label><select class="as-select" data-ctx="pkg"><option value="">–</option>' + Object.entries(PKG).map(([id, x]) => '<option value="' + id + '"' + (c.pkg === id ? ' selected' : '') + '>' + x.name + '</option>').join('') + '</select>' : '')
    + f('marke', 'Marke', 'z. B. Sternenauge') + f('branche', 'Branche', (k.briefing && k.briefing.branche) || 'z. B. Schmuckmanufaktur') + f('ziel', 'Ziel', (k.briefing && k.briefing.beschreibung) || 'Was soll der Film erreichen?', true)
    + f('wirkung', 'Gewünschte Wirkung', (k.briefing && k.briefing.gefuehl) || 'z. B. ruhig, persönlich, wertig') + f('stil', 'Markenstil', 'z. B. warmes Naturlicht, Creme, Gold, viel Ruhe')
    + f('story', 'Story', 'Kernstory in 2–3 Sätzen', true) + f('szenen', 'Bestehende Szenen', 'z. B. 1 Hook Portrait · 2 Atelier · 3 Makro · 4 Braut', true)
    + f('voiceover', 'Voiceover', 'Voiceover-Text (falls vorhanden)', true) + f('skript', 'Bestehendes Skript', k.scriptSource === 'Mindéa-Modul' ? 'Automatisch erkannt — hier überschreiben' : 'Skript einfügen', true, c.skript || '')
    + (k.scriptSource === 'Mindéa-Modul' && !c.skript ? '<div class="as-small">Erkannt: ' + esc(k.script.slice(0, 220)) + ' …</div>' : '')
    + '</div><div><div class="as-eyebrow">Datenschutz · Freigaben für das ganze Projekt</div><div class="as-small" style="margin:4px 0">Ohne Freigabe wird Kundenmaterial nicht für andere Kunden, öffentliche Inhalte, Trainingsdaten oder Portfolio verwendet.</div>'
    + tog('andereKunden', 'Für andere Kunden') + tog('oeffentlich', 'Für öffentliche Inhalte') + tog('training', 'Für Trainingsdaten') + tog('portfolio', 'Für Portfolio / Showcase')
    + '<label class="as-toggle"><span>KI-Analyse (Vorschaubilder an Anthropic-API)</span><input type="checkbox" data-cons="__ai"' + (c.aiConsent ? ' checked' : '') + '></label></div>'
    + '<div class="as-btn-row"><button class="as-btn primary" data-act="ctx-save">Speichern</button><button class="as-btn" data-act="close">Abbrechen</button></div></div>';
  openSheet(html, true);
}
function openScenePicker(i) {
  const pool = sortByStrength(S.assets.filter(a => visible(a) && a.decoded && a.kind !== 'audio'));
  openSheet(sheetHead('Asset für Szene ' + (i + 1), esc(S.board.scenes[i].title)) + '<div class="as-sheet-body"><div class="as-grid">' + pool.map(a => cardHtml(a).replace('data-act="open"', 'data-act="scene-set" data-i="' + i + '"')).join('') + '</div></div>');
}
function openSceneEdit(i) {
  const s = S.board.scenes[i];
  openSheet(sheetHead('Szene ' + (i + 1) + ' bearbeiten', '') + '<div class="as-sheet-body"><div><label class="as-label">Titel</label><input class="as-input" id="as-se-title" value="' + esc(s.title) + '">'
    + '<label class="as-label">Funktion im Film</label><select class="as-select" id="as-se-role">' + SCENES.map(r => '<option' + (r === s.role ? ' selected' : '') + '>' + r + '</option>').join('') + '</select>'
    + '<label class="as-label">Notiz</label><textarea class="as-textarea" id="as-se-note">' + esc(s.note || '') + '</textarea><label class="as-label">Kamerabewegung</label><input class="as-input" id="as-se-motion" value="' + esc(s.motion || '') + '"></div>'
    + '<div class="as-btn-row"><button class="as-btn primary" data-act="scene-save" data-i="' + i + '">Speichern</button>' + (s.assetId ? '<button class="as-btn" data-act="scene-clear" data-i="' + i + '">Asset entfernen</button>' : '') + '</div></div>', true);
}

// ─── VIDEO-PROMPT & BILD VERBESSERN ──────────────────────────────────────
const MOTION_EN = {'PORTRAITS': 'slow push-in towards the face, subtle parallax between person and background', 'DETAILS': 'very slow macro push-in, minimal depth movement, a soft light reflection glides across the surface', 'PRODUKTE': 'gentle 10–15° orbit around the product', 'ARBEITSPLATZ': 'slow lateral slide along the workspace with light parallax', 'RÄUME': 'slow dolly forward into the room', 'LIFESTYLE': 'soft handheld feel, gentle push-in on the moment', 'BEHIND THE SCENES': 'documentary-style floating camera', 'MOOD / ATMOSPHÄRE': 'very slow drift, breathing light', 'VERPACKUNG': 'top-down view with slow rotation', 'LOGO': 'static frame with a minimal scale-in', 'BRAND ELEMENTS': 'subtle scale-in', 'KUNDENREFERENZEN': 'slow zoom towards the key statement'};
function localPrompt(a, tool) {
  const k = projectContext(); const cam = MOTION_EN[a.category] || 'slow cinematic push-in, minimal depth movement';
  const desc = (a.ai && a.ai.beschreibung) ? 'the scene from the reference image (' + a.ai.beschreibung + ')' : 'the scene from the reference image';
  const keep = 'Keep the logo, product design, text and proportions exactly as in the reference image. No new objects, no morphing.';
  const light = 'warm soft window light, golden highlights, calm premium mood';
  if (tool === 'Runway') return 'Camera: ' + cam + '. Subject: subtle, natural movement only. Lighting: ' + light + '. Smooth, realistic motion. ' + keep;
  if (tool === 'Pika') return cam + ', ' + light + ', subtle realistic motion, cinematic. ' + keep;
  if (tool === 'Krea') return desc + ', ' + cam + ', ' + light + ', shallow depth of field, film grain, premium commercial look. ' + keep;
  return 'Cinematic shot of ' + desc + '. Camera: ' + cam + '. Lighting: ' + light + '. Mood: ' + (k.wirkung || 'calm, intimate, high-end') + '. One continuous shot, 5–8 seconds, shallow depth of field, gentle film grain, premium brand film look. ' + keep;
}
async function genPrompt(a) {
  const out = document.getElementById('as-gen'); if (!out) return; const tool = S.tool;
  if (!getKey() || !S.ctx.aiConsent || !S.urls.has(a.id)) {
    const p = localPrompt(a, tool);
    out.innerHTML = '<div class="as-prompt">' + esc(p) + '</div><div class="as-btn-row" style="margin-top:8px"><button class="as-btn sm" data-act="copy" data-text="' + esc(p) + '">Kopieren</button></div><div class="as-small" style="margin-top:6px">Vorlage ohne KI' + (!S.ctx.aiConsent ? ' — KI-Analyse für dieses Projekt nicht freigegeben' : '') + '.</div>';
    return;
  }
  out.innerHTML = '<div class="as-small"><span class="as-spin"></span> Prompt für ' + tool + ' wird erstellt …</div>';
  try {
    const guide = {Veo: 'Veo: filmischer Fließtext (Motiv, Kamera, Licht, Stimmung, Tempo), ein durchgehender Shot, 5–8 s.', Runway: 'Runway (Image-to-Video): Das Bild ist die Referenz. Beschreibe NUR die Bewegung von Kamera und Motiv, kurz und präzise, Bildinhalt nicht wiederholen.', Pika: 'Pika: kurz (1–2 Sätze), klare Kamerabewegung, subtile Bewegung.', Krea: 'Krea: knapper Prompt mit Motiv, Bewegung, Licht und Stil-Stichworten.'}[tool];
    const b = await thumbBlob(a.id);
    const txt = await aiCall(SYS_BASE + '\n\nPROJEKTKONTEXT:\n' + contextText(1500), [{type: 'image', source: {type: 'base64', media_type: 'image/jpeg', data: await blobToB64(b)}}, {type: 'text', text: 'Schreibe einen Image-to-Video-Prompt für ' + tool + ' zu diesem Asset (Kategorie ' + a.category + (a.ai && a.ai.szenen.length ? ', Szene ' + a.ai.szenen.join('/') : '') + '). ' + guide + ' Mindéa-Stil: warm, ruhig, cinematic, Quiet Luxury. Pflicht: Logo, Produktdesign und Schrift bleiben exakt unverändert, keine Verformung, realistische Physik. JSON: {"prompt":"auf Englisch","negativ":"optional, Englisch","hinweis":"1 Satz Deutsch"}'}], 4000);
    const r = parseJSON(txt) || {prompt: txt}; const p = String(r.prompt || '').trim(); const full = p + (r.negativ ? '\n\nNegative: ' + r.negativ : '');
    a.prompts = Object.assign({}, a.prompts, {[tool]: full}); await DB.put('assets', serialize(a));
    out.innerHTML = '<div class="as-prompt">' + esc(full) + '</div>' + (r.hinweis ? '<div class="as-small" style="margin-top:6px">' + esc(r.hinweis) + '</div>' : '') + '<div class="as-btn-row" style="margin-top:8px"><button class="as-btn sm" data-act="copy" data-text="' + esc(full) + '">Kopieren</button></div>';
  } catch (e) { out.innerHTML = '<div class="as-note warn">' + esc(e.message) + '</div><div class="as-prompt" style="margin-top:8px">' + esc(localPrompt(a, tool)) + '</div><div class="as-small">Vorlage ohne KI.</div>'; }
}
function localImprove(a) {
  const R = []; const st = k => stateOf(a, k);
  const fmt = (a.checks || []).find(c => c.k === 'format'); if (fmt) R.push(['Cropping', fmt.n]);
  if (st('belichtung') === 'warn' || st('belichtung') === 'bad') R.push(['Licht', ((a.checks || []).find(c => c.k === 'belichtung') || {}).n + ' — Lichter/Schatten behutsam angleichen, Weißabgleich warm halten.']);
  if (a.lightOutlier) R.push(['Licht', 'Color Grading an das Set angleichen: ' + a.lightOutlier + '.']);
  if (st('rauschen') !== 'ok' && st('rauschen')) R.push(['Retusche', 'Leichte Rauschreduzierung, Details nicht weichzeichnen.']);
  if (st('kompression') === 'bad' || st('kompression') === 'warn') R.push(['Retusche', 'Kompressionsartefakte sichtbar — besser Originaldatei anfragen als KI-Upscaling.']);
  if (st('aufloesung') === 'warn' || st('aufloesung') === 'bad') R.push(['Auflösung', 'Vorsichtiges Upscaling (max. 2×) — Logo/Schrift danach unbedingt prüfen.']);
  return R;
}
async function genImprove(a) {
  const out = document.getElementById('as-gen'); if (!out) return;
  const rule = '<div class="as-note" style="margin-top:8px">Regel: Markenlogo und Produktdesign werden ohne klare Vorgabe niemals verändert.</div>';
  const loc = localImprove(a); const locH = loc.length ? '<dl class="as-kv" style="grid-template-columns:110px 1fr">' + loc.map(x => '<dt>' + esc(x[0]) + '</dt><dd style="text-align:left">' + esc(x[1]) + '</dd>').join('') + '</dl>' : '<div class="as-small">Technisch keine Auffälligkeiten.</div>';
  if (!getKey() || !S.ctx.aiConsent || !S.urls.has(a.id)) { out.innerHTML = '<div class="as-eyebrow">Aus lokaler Messung</div>' + locH + '<div class="as-small" style="margin-top:6px">Bildinhaltliche Vorschläge (Hintergrund, Produktposition, Materialrealismus): ' + NA_TXT + ' ohne KI.</div>' + rule; return; }
  out.innerHTML = '<div class="as-small"><span class="as-spin"></span> Verbesserungsvorschläge werden erstellt …</div>';
  try {
    const b = await thumbBlob(a.id);
    const r = parseJSON(await aiCall(SYS_BASE + '\n\nPROJEKTKONTEXT:\n' + contextText(1200), [{type: 'image', source: {type: 'base64', media_type: 'image/jpeg', data: await blobToB64(b)}}, {type: 'text', text: 'Lokale Messung: ' + assetLine(a) + '\nSchlage konkrete Bildverbesserungen für den Markenfilm vor. Markenlogo und Produktdesign niemals verändern. Wenn nichts nötig ist: "keine Änderung nötig". JSON: {"cropping":"","licht":"","hintergrund":"","retusche":"","materialrealismus":"","produktposition":"","hinweis":""}'}], 4000)) || {};
    const rows = [['Cropping', r.cropping], ['Licht', r.licht], ['Hintergrund', r.hintergrund], ['Retusche', r.retusche], ['Materialrealismus', r.materialrealismus], ['Produktposition', r.produktposition]].filter(x => x[1]);
    out.innerHTML = '<div class="as-eyebrow">KI-Vorschläge</div><dl class="as-kv" style="grid-template-columns:120px 1fr;margin-top:6px">' + rows.map(x => '<dt>' + x[0] + '</dt><dd style="text-align:left">' + esc(x[1]) + '</dd>').join('') + '</dl>' + (r.hinweis ? '<div class="as-small" style="margin-top:6px">' + esc(r.hinweis) + '</div>' : '') + '<div class="as-eyebrow" style="margin-top:14px">Aus lokaler Messung</div>' + locH + rule;
  } catch (e) { out.innerHTML = '<div class="as-note warn">' + esc(e.message) + '</div>' + locH + rule; }
}

// ─── ZIP (Download vorbereiten, ohne Kompression, ohne Bibliothek) ───────
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
async function makeZip(entries) {
  const enc = new TextEncoder(); const parts = [], central = []; let off = 0; const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const e of entries) {
    const data = new Uint8Array(await e.blob.arrayBuffer()); const crc = crc32(data); const nm = enc.encode(e.name); const n = data.length;
    const lh = new DataView(new ArrayBuffer(30)); [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, time, 2], [12, date, 2], [14, crc, 4], [18, n, 4], [22, n, 4], [26, nm.length, 2], [28, 0, 2]].forEach(([o, v, s]) => s === 4 ? lh.setUint32(o, v, true) : lh.setUint16(o, v, true));
    const ch = new DataView(new ArrayBuffer(46)); [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, time, 2], [14, date, 2], [16, crc, 4], [20, n, 4], [24, n, 4], [28, nm.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, off, 4]].forEach(([o, v, s]) => s === 4 ? ch.setUint32(o, v, true) : ch.setUint16(o, v, true));
    parts.push(lh.buffer, nm, e.blob); central.push(ch.buffer, nm); off += 30 + nm.length + n;
  }
  const cdSize = central.reduce((s, p) => s + (p.byteLength != null ? p.byteLength : p.length), 0);
  const end = new DataView(new ArrayBuffer(22)); [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, entries.length, 2], [10, entries.length, 2], [12, cdSize, 4], [16, off, 4], [20, 0, 2]].forEach(([o, v, s]) => s === 4 ? end.setUint32(o, v, true) : end.setUint16(o, v, true));
  return new Blob(parts.concat(central, [end.buffer]), {type: 'application/zip'});
}
function download(blob, name) { const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); }
function csvRow(v) { return v.map(x => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"').join(';'); }
async function prepareDownload(ids) {
  const list = S.assets.filter(a => ids.includes(a.id)); const total = list.reduce((s, a) => s + (a.originalStored ? a.size : 0), 0);
  if (total > 3.5e9) { toast('⚠️ Auswahl zu groß (max. ca. 3,5 GB pro ZIP)'); return; }
  S.busy = 'zip'; setProgress('Download wird vorbereitet', 0, list.length);
  const entries = [], used = new Set(); const rows = [csvRow(['Datei', 'Kategorie', 'Status', 'Qualität', 'Markenpassung', 'Cinematic', 'Premium', 'Verwendbarkeit', 'Szenen', 'Notiz', 'Im ZIP'])];
  let i = 0;
  for (const a of list) {
    const f = a.originalStored ? await DB.get('blobs', 'f:' + a.id) : null;
    let nm = (a.category || 'SONSTIGES').replace(/[\/\\:]+/g, '-').replace(/\s+/g, ' ') + '/' + a.name; let k = 2; while (used.has(nm)) nm = nm.replace(/(\.[^.]+)?$/, m => '-' + (k++) + m); used.add(nm);
    if (f) entries.push({name: nm, blob: f.blob});
    const s = a.scores || {}; rows.push(csvRow([a.name, a.category, a.status, scoreTxt(s.quality), scoreTxt(s.brand), scoreTxt(s.cinematic), scoreTxt(s.premium), scoreTxt(s.usability), a.ai ? a.ai.szenen.join(' / ') : '', a.ai ? a.ai.szenenNotiz : '', f ? 'ja' : 'nein (Original nicht gespeichert)']));
    setProgress('Download wird vorbereitet · ' + a.name, ++i, list.length);
  }
  entries.push({name: 'asset-report.csv', blob: new Blob(['﻿' + rows.join('\n')], {type: 'text/csv'})});
  try { const z = await makeZip(entries); const p = currentProject(); download(z, 'mindea-assets-' + norm(p ? p.name : 'allgemein').replace(/[^a-z0-9]+/g, '-') + '-' + new Date().toISOString().slice(0, 10) + '.zip'); toast('📦 ZIP mit ' + (entries.length - 1) + ' Dateien bereit'); }
  catch (e) { toast('⚠️ ZIP fehlgeschlagen: ' + e.message); }
  S.busy = null; S.progress = null; render();
}
function exportJSON() {
  const p = currentProject();
  const data = {tool: 'Mindéa Asset Sorter', projekt: p ? p.name : 'ohne', exportiert: new Date().toISOString(), hinweis: 'Nur Analyse-Metadaten, keine Bilddateien.', board: S.board, report: S.report,
    assets: S.assets.map(a => ({name: a.name, kind: a.kind, size: a.size, w: a.w, h: a.h, duration: a.duration, kategorie: a.category, status: a.status, scores: a.scores, gruppe: a.groupId, rolle: a.groupRole, ki: a.ai, pruefungen: a.checks}))};
  download(new Blob([JSON.stringify(data, null, 1)], {type: 'application/json'}), 'mindea-asset-analyse-' + new Date().toISOString().slice(0, 10) + '.json');
}

// ─── AKTIONEN ────────────────────────────────────────────────────────────
async function setProject(pid) { if (S.busy) { toast('Bitte warten, bis die Analyse fertig ist'); render(); return; } S.filters = {}; S.query = ''; S.reqDraft = null; await loadProject(pid); }
async function removeAssets(ids) {
  for (const id of ids) { await DB.del('assets', id); await DB.del('blobs', 't:' + id); await DB.del('blobs', 'f:' + id); const u = S.urls.get(id); if (u) URL.revokeObjectURL(u); S.urls.delete(id); S.selected.delete(id); }
  S.assets = S.assets.filter(a => !ids.includes(a.id));
  if (S.board) { S.board.scenes.forEach(s => { if (ids.includes(s.assetId)) { s.assetId = null; s.note = 'Material fehlt'; } }); await saveMeta('board', S.board); }
  recompute(); await saveAll(); render(); toast('Entfernt: ' + ids.length);
}
function addToBoard(ids) {
  if (!S.board) S.board = {scenes: [], manual: true, source: 'manuell'};
  ids.forEach(id => { const a = S.assets.find(x => x.id === id); if (!a || S.board.scenes.some(s => s.assetId === id)) return; const role = (a.ai && a.ai.szenen[0]) || 'TRANSITION'; S.board.scenes.push({id: uid(), role, title: (a.ai && a.ai.beschreibung ? a.ai.beschreibung.split(/[,.]/)[0] : a.category.charAt(0) + a.category.slice(1).toLowerCase()).slice(0, 48), assetId: id, note: sceneNote(a, role), motion: motionFor(a)}); });
  S.board.manual = true; S.board.updatedAt = Date.now(); saveMeta('board', S.board); toast('🎬 Zum Film Board hinzugefügt');
}
function boardChanged() { S.board.manual = true; S.board.updatedAt = Date.now(); saveMeta('board', S.board); publishStatus(); render(); }
async function copyText(t) { try { await navigator.clipboard.writeText(t); toast('📋 Kopiert'); } catch (e) { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('📋 Kopiert'); } catch (e2) { toast('Kopieren nicht möglich'); } ta.remove(); } }

async function onAct(e) {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.getAttribute('data-act'); const id = el.getAttribute('data-id'); const i = +el.getAttribute('data-i');
  if (e.type === 'click' && ['project', 'filter', 'model', 'files', 'similar', 'b-cat', 'b-status', 'b-proj', 'set-cat', 'set-status', 'consent', 'search', 'req-edit'].includes(act)) return;
  if (e.type === 'change' && !['project', 'filter', 'model', 'files', 'similar', 'b-cat', 'b-status', 'b-proj', 'set-cat', 'set-status', 'consent'].includes(act)) return;
  const a = id && S.assets.find(x => x.id === id);
  switch (act) {
    case 'close': closeSheet(); break;
    case 'tab': closeSheet(); S.tab = id; render(); { const sc = el.getAttribute('data-scroll'); if (sc) setTimeout(() => { const t = document.getElementById(sc); if (t) t.scrollIntoView({behavior: 'smooth', block: 'start'}); }, 50); } break;
    case 'open':
      if (S.selectMode && !sheetEl && S.tab === 'library') { S.selected.has(id) ? S.selected.delete(id) : S.selected.add(id); refreshResults(); break; }
      openAsset(id); break;
    case 'project': await setProject(el.value); break;
    case 'openmod': try { openMod(id); } catch (x) {} break;
    case 'files': { const fl = [...el.files]; el.value = ''; if (fl.length) ingest(fl); } break;
    case 'model': S.model = el.value; prefSet('model', el.value); render(); break;
    case 'ai': runAI(false); break;
    case 'ai-report': if (!getKey()) { toast('🔑 Bitte API Key hinterlegen'); break; } if (!S.ctx.aiConsent) { runAI(false); break; } S.busy = 'ai'; setProgress('KI prüft Material-Lücken und baut das Film Board', 0, 1); render(); try { await aiFilmReport(); } catch (x) { toast('⚠️ ' + x.message); } S.busy = null; S.progress = null; recompute(); await saveAll(); render(); break;
    case 'ai-group': { const g = S.groups.find(x => x.id === id); if (!g) break; if (!getKey() || !S.ctx.aiConsent) { toast('KI-Analyse erst freigeben (Film-Kontext & Freigaben)'); break; } S.busy = 'ai'; el.innerHTML = '<span class="as-spin"></span> vergleicht …'; try { await aiCompareGroup(g); } catch (x) { toast('⚠️ ' + x.message); } S.busy = null; recompute(); await saveAll(); render(); } break;
    case 'pick-best': if (!a) break; S.assets.filter(x => x.groupId === a.groupId).forEach(x => { if (x.bestPick && x.bestPick.by === 'manual') x.bestPick = null; }); a.bestPick = {by: 'manual', reasons: ['von dir gewählt']}; recompute(); await saveAll(); closeSheet(); render(); toast('✓ Als bestes festgelegt'); break;
    case 'show-group': S.tab = 'library'; S.showSimilar = true; S.query = ''; S.filters = {}; render(); { const g = S.groups.find(x => x.id === id); if (g) { const el2 = document.getElementById('as-results'); if (el2) el2.innerHTML = '<div class="as-small" style="margin-bottom:10px">' + esc(g.label) + ' · ' + g.members.length + ' Dateien</div><div class="as-grid">' + g.members.map(m => cardHtml(m)).join('') + '</div>'; } } break;
    case 'filter': S.filters[el.getAttribute('data-k')] = el.value; refreshResults(); break;
    case 'similar': S.showSimilar = el.checked; refreshResults(); break;
    case 'reset-filter': S.filters = {}; S.query = ''; render(); break;
    case 'hint': S.query = el.getAttribute('data-q'); { const inp = S.root.querySelector('[data-act="search"]'); if (inp) inp.value = S.query; } refreshResults(); break;
    case 'selectmode': S.selectMode = !S.selectMode; if (!S.selectMode) S.selected.clear(); render(); break;
    case 'select-all': (el.getAttribute('data-ids') || '').split(',').filter(Boolean).forEach(x => S.selected.add(x)); refreshResults(); break;
    case 'select-none': S.selected.clear(); refreshResults(); break;
    case 'b-cat': case 'b-status': case 'b-proj': {
      const v = el.value; if (!v) break; const ids = [...S.selected];
      if (act === 'b-proj') { if (v === S.projectId) break; ids.forEach(x => { const o = S.assets.find(y => y.id === x); if (o) o.projectId = v; }); await saveAll(); S.assets = S.assets.filter(x => !ids.includes(x.id)); S.selected.clear(); recompute(); await saveAll(); render(); toast('→ ' + ids.length + ' Assets verschoben'); break; }
      ids.forEach(x => { const o = S.assets.find(y => y.id === x); if (!o) return; if (act === 'b-cat') { if (v === '__auto') o.categoryManual = false; else { o.category = v; o.categoryManual = true; } } else { if (v === '__auto') o.statusManual = false; else { o.status = v; o.statusManual = true; } } });
      recompute(); await saveAll(); render(); toast('✓ ' + ids.length + ' Assets geändert'); } break;
    case 'b-board': addToBoard([...S.selected]); render(); break;
    case 'b-zip': prepareDownload([...S.selected]); break;
    case 'b-delete': { const ids = [...S.selected]; if (ids.length && confirm(ids.length + ' Datei(en) aus dem Asset Sorter entfernen?\n\nDas löscht die lokal gespeicherte Kopie und Analyse in diesem Browser. Deine Originale auf dem Gerät bleiben unberührt.')) await removeAssets(ids); } break;
    case 'del-one': if (a && confirm('„' + a.name + '“ aus dem Asset Sorter entfernen?\n\nNur die lokale Kopie in diesem Browser wird gelöscht.')) { closeSheet(); await removeAssets([a.id]); } break;
    case 'set-cat': if (!a) break; if (el.value === '__auto') a.categoryManual = false; else { a.category = el.value; a.categoryManual = true; } recompute(); await saveAll(); render(); break;
    case 'set-status': if (!a) break; if (el.value === '__auto') a.statusManual = false; else { a.status = el.value; a.statusManual = true; } recompute(); await saveAll(); render(); break;
    case 'consent': if (!a) break; a.consent = Object.assign({}, a.consent, {[el.getAttribute('data-k')]: el.checked}); await DB.put('assets', serialize(a)); break;
    case 'to-board': addToBoard([id]); render(); break;
    case 'tool': S.tool = id; prefSet('tool', id); el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); break;
    case 'vprompt': if (a) genPrompt(a); break;
    case 'improve': if (a) genImprove(a); break;
    case 'copy': copyText(el.getAttribute('data-text')); break;
    case 'copy-req': { const ta = S.root.querySelector('[data-act="req-edit"]'); copyText(ta ? ta.value : ''); } break;
    case 'req-reset': S.reqDraft = null; if (S.report) S.report.anfrage = ''; S.reqDraft = requestText(); render(); break;
    case 'ctx': openContext(); break;
    case 'ctx-save': {
      const c = Object.assign({}, S.ctx); sheetEl.querySelectorAll('[data-ctx]').forEach(x => { c[x.getAttribute('data-ctx')] = x.value.trim(); });
      c.consent = {}; sheetEl.querySelectorAll('[data-cons]').forEach(x => { const k = x.getAttribute('data-cons'); if (k === '__ai') c.aiConsent = x.checked; else c.consent[k] = x.checked; });
      S.ctx = c; await saveMeta('ctx', c); closeSheet(); recompute(); render(); toast('✓ Film-Kontext gespeichert'); } break;
    case 'export-json': exportJSON(); break;
    case 'board-rebuild': if (S.board && S.board.manual && !confirm('Manuelle Änderungen am Film Board überschreiben?')) break; S.board = buildBoard(); await saveMeta('board', S.board); render(); break;
    case 'board-ai': S.board = {scenes: S.report.board.map(s => Object.assign({}, s, {id: uid()})), manual: false, source: 'ki', updatedAt: Date.now()}; await saveMeta('board', S.board); render(); break;
    case 'board-add': if (!S.board) S.board = {scenes: []}; S.board.scenes.push({id: uid(), role: 'TRANSITION', title: 'Neue Szene', assetId: null, note: '', motion: ''}); boardChanged(); break;
    case 'scene-up': if (i > 0) { const s = S.board.scenes; [s[i - 1], s[i]] = [s[i], s[i - 1]]; boardChanged(); } break;
    case 'scene-down': { const s = S.board.scenes; if (i < s.length - 1) { [s[i + 1], s[i]] = [s[i], s[i + 1]]; boardChanged(); } } break;
    case 'scene-del': S.board.scenes.splice(i, 1); boardChanged(); break;
    case 'scene-pick': openScenePicker(i); break;
    case 'scene-set': { const s = S.board.scenes[i]; const x = S.assets.find(y => y.id === id); if (s && x) { s.assetId = id; s.note = sceneNote(x, s.role); s.motion = motionFor(x); } closeSheet(); boardChanged(); } break;
    case 'scene-edit': openSceneEdit(i); break;
    case 'scene-save': { const s = S.board.scenes[i]; s.title = document.getElementById('as-se-title').value.trim() || s.title; s.role = document.getElementById('as-se-role').value; s.note = document.getElementById('as-se-note').value.trim(); s.motion = document.getElementById('as-se-motion').value.trim(); closeSheet(); boardChanged(); } break;
    case 'scene-clear': { const s = S.board.scenes[i]; s.assetId = null; s.note = 'Material fehlt'; closeSheet(); boardChanged(); } break;
  }
}
let searchT = null;
function onInput(e) {
  const el = e.target.closest('[data-act]'); if (!el) return; const act = el.getAttribute('data-act');
  if (act === 'search') { S.query = el.value; clearTimeout(searchT); searchT = setTimeout(refreshResults, 140); }
  else if (act === 'req-edit') S.reqDraft = el.value;
}

// Drag & Drop für Dateien (Desktop) inkl. Ordner
function bindDrop() {
  const z = document.getElementById('as-drop'); if (!z) return;
  ['dragenter', 'dragover'].forEach(t => z.addEventListener(t, e => { e.preventDefault(); z.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => z.addEventListener(t, () => z.classList.remove('over')));
  z.addEventListener('drop', async e => {
    e.preventDefault(); const items = e.dataTransfer.items; const out = [];
    const walk = entry => new Promise(res => {
      if (entry.isFile) entry.file(f => { out.push(f); res(); }, () => res());
      else if (entry.isDirectory) { const rd = entry.createReader(); const all = []; const next = () => rd.readEntries(async ents => { if (!ents.length) { for (const en of all) await walk(en); res(); } else { all.push(...ents); next(); } }, () => res()); next(); }
      else res();
    });
    if (items && items.length && items[0].webkitGetAsEntry) { const ents = [...items].map(it => it.webkitGetAsEntry()).filter(Boolean); for (const en of ents) await walk(en); }
    else out.push(...e.dataTransfer.files);
    if (out.length) ingest(out);
  });
}

// Film Board: Sortieren per Pointer Events (Maus, Finger, Apple Pencil)
function bindBoardDrag(root) {
  root.addEventListener('pointerdown', e => {
    const h = e.target.closest('.as-handle'); if (!h) return; const list = h.closest('#as-board'); if (!list) return;
    e.preventDefault();
    const items = [...list.querySelectorAll('.as-scene')]; const item = h.closest('.as-scene'); const from = items.indexOf(item);
    const rects = items.map(x => x.getBoundingClientRect()); const scroller = document.getElementById('detail-body') || document.scrollingElement;
    const sy = e.clientY, ss = scroller.scrollTop; const gap = items.length > 1 ? rects[1].top - rects[0].bottom : 10; const hgt = rects[from].height + gap;
    let to = from, raf = null, lastY = sy;
    item.classList.add('dragging'); items.forEach(x => { if (x !== item) x.style.transition = 'transform .18s'; });
    try { h.setPointerCapture(e.pointerId); } catch (x) {}
    const update = () => {
      const dy = lastY - sy + (scroller.scrollTop - ss); item.style.transform = 'translateY(' + dy + 'px)';
      const center = rects[from].top + rects[from].height / 2 + dy; to = 0;
      items.forEach((x, j) => { if (j !== from && rects[j].top + rects[j].height / 2 < center) to++; });
      items.forEach((x, j) => { if (j === from) return; let t = 0; if (from < to && j > from && j <= to) t = -hgt; if (from > to && j >= to && j < from) t = hgt; x.style.transform = t ? 'translateY(' + t + 'px)' : ''; });
    };
    const auto = () => { const r = scroller.getBoundingClientRect ? scroller.getBoundingClientRect() : {top: 0, bottom: innerHeight}; if (lastY < r.top + 60) scroller.scrollTop -= 8; else if (lastY > r.bottom - 60) scroller.scrollTop += 8; update(); raf = requestAnimationFrame(auto); };
    const move = ev => { lastY = ev.clientY; update(); };
    const up = () => {
      cancelAnimationFrame(raf); h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
      items.forEach(x => { x.style.transform = ''; x.style.transition = ''; }); item.classList.remove('dragging');
      if (to !== from) { const s = S.board.scenes; const [m] = s.splice(from, 1); s.splice(to, 0, m); boardChanged(); }
    };
    h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up); raf = requestAnimationFrame(auto);
  });
}

// ─── EINSTIEG ────────────────────────────────────────────────────────────
async function renderAssetSorter(body) {
  body.style.padding = '0';
  const root = document.createElement('div'); root.className = 'as-root'; body.appendChild(root); S.root = root;
  root.addEventListener('click', onAct); root.addEventListener('change', onAct); root.addEventListener('input', onInput);
  bindBoardDrag(root);
  if (!window.indexedDB) { root.innerHTML = '<div class="as-empty">Dieser Browser unterstützt keinen lokalen Speicher (IndexedDB). Bitte Safari oder Chrome im normalen Modus nutzen.</div>'; return; }
  root.innerHTML = '<div class="as-empty"><span class="as-spin"></span> Asset Sorter wird geladen …</div>';
  let pid = S.projectId || prefGet('project', null);
  const projs = projects();
  if (!pid || (pid !== NONE && !projs.some(p => String(p.id) === String(pid)))) { const act = projs.find(p => p.status !== 'final') || projs[0]; pid = act ? String(act.id) : NONE; }
  try { await DB.open(); if (S.busy && S.projectId === pid) render(); else await loadProject(pid); }
  catch (e) { root.innerHTML = '<div class="as-empty">Lokaler Speicher nicht verfügbar (' + esc(e.message) + '). Im privaten Modus ist IndexedDB teils gesperrt.</div>'; }
}
window.renderAssetSorter = renderAssetSorter;
// Schnittstelle für das spätere Kundenportal: Dateien landen automatisch im Asset Sorter (Status NEU → ANALYSE LÄUFT → …)
window.MindeaAssets = {
  ingest: (files, opts) => ingest(files, Object.assign({source: 'portal'}, opts || {})),
  status: pid => { try { return (JSON.parse(localStorage.getItem('mindea-as-status') || '{}')[pid] || {}).status || null; } catch (e) { return null; } },
  pipelineStates: PIPE.slice(),
};
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetEl) closeSheet(); });
})();
