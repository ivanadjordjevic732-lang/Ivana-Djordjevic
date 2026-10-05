'use strict';
/* ═══════════════════════════════════════════════════════════════════════
   MODULE: UTIL — DOM helpers, icons, dialogs, toasts, formatting
   ═══════════════════════════════════════════════════════════════════════ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const round = (v, d = 0) => { const m = Math.pow(10, d); return Math.round(v * m) / m; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
const uid = (p = 'id') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const deepClone = o => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeInOut = t => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const isTouch = () => matchMedia('(pointer:coarse)').matches;
const isPhone = () => matchMedia('(max-width:760px)').matches;
const isNarrow = () => matchMedia('(max-width:1023px)').matches;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? '⌘' : 'Strg';

function debounce(fn, ms) { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = (...a) => { clearTimeout(t); fn(...a); }; d.cancel = () => clearTimeout(t); return d; }
function throttleRAF(fn) { let q = false, args; return (...a) => { args = a; if (q) return; q = true; requestAnimationFrame(() => { q = false; fn(...args); }); }; }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/** Element builder: h('div', {class:'x', onclick:fn}, child, ...) */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  appendKids(el, kids);
  return el;
}
function appendKids(el, kids) {
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
function frag(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

/* ── Icons (line, 24px grid, 1.5 stroke) ─────────────────────────────── */
const ICONS = {
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
  design: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 9h17M9 20.5V9"/>',
  video: '<rect x="3" y="5.5" width="13" height="13" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
  wand: '<path d="m4 20 11-11M14 4v3M12.5 5.5h3M19 9v2M18 10h2M18 3.5v1.5M17.25 4.25h1.5"/><path d="m13.5 7.5 3 3"/>',
  captions: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 11.5h4M13 11.5h4M7 15h7M16 15h1"/>',
  carousel: '<rect x="6.5" y="4.5" width="11" height="15" rx="1.5"/><path d="M3.5 7v10M20.5 7v10"/>',
  media: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5.5-5.5L5 20"/>',
  templates: '<rect x="3.5" y="3.5" width="7" height="9" rx="1"/><rect x="13.5" y="3.5" width="7" height="5" rx="1"/><rect x="13.5" y="11.5" width="7" height="9" rx="1"/><rect x="3.5" y="15.5" width="7" height="5" rx="1"/>',
  brand: '<path d="M12 3.5 14.4 9l5.6.5-4.3 3.7 1.3 5.6L12 15.9l-5 2.9 1.3-5.6L4 9.5 9.6 9z"/>',
  ai: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><path d="M12 7.5c.6 2.4 2.1 3.9 4.5 4.5-2.4.6-3.9 2.1-4.5 4.5-.6-2.4-2.1-3.9-4.5-4.5 2.4-.6 3.9-2.1 4.5-4.5z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', chevR: '<path d="m9 5 7 7-7 7"/>', chevL: '<path d="m15 5-7 7 7 7"/>', chevD: '<path d="m5 9 7 7 7-7"/>', chevU: '<path d="m5 15 7-7 7 7"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.6A10 10 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>', unlock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 7.7-1.5"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5L18.5 7M9 7V4.5h6V7"/>',
  more: '<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M4.5 19.5h15"/>', upload: '<path d="M12 20V9M7 13.5l5-5 5 5M4.5 4.5h15"/>',
  share: '<path d="M12 15V3.5M8 7.5l4-4 4 4"/><path d="M7 11H5.5v9.5h13V11H17"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>', pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
  skipB: '<path d="M6 5v14M19 5.5v13L9 12z"/>', skipF: '<path d="M18 5v14M5 5.5v13L15 12z"/>',
  scissors: '<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/><path d="M8.2 8.3 20 18M8.2 15.7 20 6"/>',
  text: '<path d="M5 6.5V4.5h14v2M12 4.5v15M9 19.5h6"/>', shapes: '<circle cx="8" cy="8" r="4.5"/><rect x="11.5" y="11.5" width="9" height="9" rx="1"/>',
  sparkle: '<path d="M12 3c.8 4.4 3.6 7.2 8 8-4.4.8-7.2 3.6-8 8-.8-4.4-3.6-7.2-8-8 4.4-.8 7.2-3.6 8-8z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5.5-5.5L5 20"/>',
  layers: '<path d="m12 3.5 9 4.8-9 4.7-9-4.7z"/><path d="m3 12.5 9 4.7 9-4.7M3 16.5l9 4.7 9-4.7"/>',
  bg: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="m3.5 14 5-5 11.5 11.5M14 3.5l6.5 6.5M9 3.5l11.5 11.5"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 1.8-.9 1.4-2-.5-1.3.3-2.5 1.7-2.5h2.2a3.2 3.2 0 0 0 3.2-3.2C20.5 7.2 16.7 3.5 12 3.5z"/><circle cx="7.8" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="8" r="1"/>',
  music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  volume: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
  speed: '<path d="M4.5 16a8 8 0 1 1 15 0"/><path d="m12 13 4-4.5"/><circle cx="12" cy="13.5" r="1.2"/>',
  crop: '<path d="M6.5 3v14.5H21M3 6.5h14.5V21"/>', flipH: '<path d="M12 3v18M8.5 7 4 17h4.5zM15.5 7 20 17h-4.5z"/>', flipV: '<path d="M3 12h18M7 8.5 17 4v4.5zM7 15.5 17 20v-4.5z"/>',
  rotate: '<path d="M20 11.5A8 8 0 1 1 17.5 6"/><path d="M20.5 4v4.5H16"/>',
  alignL: '<path d="M4 4v16M8 8h10M8 12h6M8 16h11"/>', alignC: '<path d="M12 4v16M6 8h12M8.5 12h7M5.5 16h13"/>', alignR: '<path d="M20 4v16M6 8h10M10 12h6M5 16h11"/>',
  alignT: '<path d="M4 4h16M8 8v10M12 8v6M16 8v11"/>', alignM: '<path d="M4 12h16M8 6v12M12 8.5v7M16 5.5v13"/>', alignB: '<path d="M4 20h16M8 6v10M12 10v6M16 5v11"/>',
  tAlignL: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>', tAlignC: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>', tAlignR: '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
  front: '<rect x="8" y="8" width="12" height="12" rx="1.5" fill="currentColor" fill-opacity=".18"/><path d="M16 5V4H4v12h1"/>', back: '<rect x="4" y="4" width="12" height="12" rx="1.5"/><path d="M8 18v2h12V8h-2" />',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  grid: '<path d="M4 9h16M4 15h16M9 4v16M15 4v16"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>', monitor: '<rect x="3" y="4" width="18" height="12.5" rx="2"/><path d="M8.5 20.5h7M12 16.5v4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
  heartF: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z" fill="currentColor"/>',
  tag: '<path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8 8a1.5 1.5 0 0 1 0 2.1l-6.9 6.9a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8" cy="8" r="1.4"/>',
  folder: '<path d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4.3l2 2.5H19a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/>',
  file: '<path d="M6 3.5h8l4.5 4.5v12.5H6z"/><path d="M14 3.5V8h4.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>', warn: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17v.2"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.5 3.8 3.8 0 0 1-.5 7.5z"/>', shield: '<path d="M12 3.5 19.5 6v6c0 4.6-3.2 7.6-7.5 9-4.3-1.4-7.5-4.4-7.5-9V6z"/><path d="m8.8 12 2.2 2.2 4.3-4.4"/>',
  resize: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>', frame: '<rect x="3.5" y="3.5" width="17" height="17" rx="1"/><rect x="7.5" y="7.5" width="9" height="9"/>',
  film: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M7.5 3.5v17M16.5 3.5v17M3.5 8h4M3.5 12h4M3.5 16h4M16.5 8h4M16.5 12h4M16.5 16h4"/>',
  pen: '<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="m13.5 7 3 3"/>',
  quote: '<path d="M6 17c2.5-1 3.5-3 3.5-6V7H5v4.5h4.5M14.5 17c2.5-1 3.5-3 3.5-6V7h-4.5v4.5H18"/>',
  arrow: '<path d="M4 12h15M14 7l5 5-5 5"/>', line: '<path d="M4 12h16"/>', circle: '<circle cx="12" cy="12" r="8"/>', square: '<rect x="4" y="4" width="16" height="16" rx="1"/>',
  rounded: '<rect x="4" y="5" width="16" height="14" rx="4"/>', badge: '<rect x="3.5" y="8" width="17" height="8" rx="4"/>',
  callout: '<path d="M4.5 5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H11l-4.5 3.5V16h-2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
  chevron: '<path d="m8 4 8 8-8 8"/>', divider: '<path d="M3 12h7M14 12h7"/><path d="m12 10 2 2-2 2-2-2z"/>',
  bulb: '<path d="M9 17.5h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.5.4.5 1 .5 1.6V17.5h6v-2c0-.6 0-1.2.5-1.6A6 6 0 0 0 12 3z"/>',
  wave: '<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7M17 6l2.5 2.5M14.5 8.5l2 2"/>', link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  zoomIn: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4M11 8v6M8 11h6"/>', zoomOut: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4M8 11h6"/>',
  compare: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M12 2.5v19"/>', magnet: '<path d="M5 4.5h4v7a3 3 0 0 0 6 0v-7h4v7a7 7 0 0 1-14 0z"/><path d="M5 8.5h4M15 8.5h4"/>',
  record: '<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>', stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor" stroke="none"/>',
  transition: '<path d="M4 5h7v14H4zM13 5h7v14h-7" /><path d="m9 9 6 6M15 9l-6 6" opacity=".5"/>',
  person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20.5c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>', star: '<path d="M12 4.5 14 10l5.5.2-4.4 3.4 1.6 5.4L12 15.8 7.3 19l1.6-5.4L4.5 10.2 10 10z"/>',
  layout: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 10h17M10 10v10.5"/>', repurpose: '<path d="M4 8.5A8 8 0 0 1 18.5 6M20 15.5A8 8 0 0 1 5.5 18"/><path d="M18.5 2.5v3.5H15M5.5 21.5V18H9"/>',
  type: '<path d="M4 7V4.5h16V7M9 20h6M12 4.5V20"/>', drag: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>', present: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20.5h8"/>',
  pin: '<path d="M12 21s-6.5-5.5-6.5-11a6.5 6.5 0 0 1 13 0c0 5.5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
};
function icon(name, cls = '') { return `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`; }
function iconEl(name, cls) { return frag(icon(name, cls)); }

/* ── Buttons ─────────────────────────────────────────────────────────── */
function ibtn(name, tip, onclick, opts = {}) {
  const b = h('button', { class: 'ibtn ' + (opts.cls || ''), 'aria-label': tip, 'data-tip': tip + (opts.kbd ? '|' + opts.kbd : ''), onclick, type: 'button' });
  b.innerHTML = icon(name, opts.size || '');
  if (opts.disabled) b.disabled = true;
  return b;
}
function btn(label, onclick, opts = {}) {
  const b = h('button', { class: 'btn ' + (opts.cls || ''), onclick, type: 'button', 'aria-label': opts.aria || null, 'data-tip': opts.tip || null });
  b.innerHTML = (opts.icon ? icon(opts.icon, 's') : '') + `<span class="bl">${escapeHtml(label)}</span>`;
  if (opts.disabled) b.disabled = true;
  return b;
}
function chip(label, on, onclick, opts = {}) {
  const c = h('button', { class: 'chip' + (on ? ' on' : ''), type: 'button', onclick, 'aria-pressed': on ? 'true' : 'false', 'data-tip': opts.tip || null });
  c.innerHTML = (opts.icon ? icon(opts.icon, 's') : '') + escapeHtml(label);
  return c;
}
function chips(options, value, onChange, opts = {}) {
  const wrap = h('div', { class: 'chips', role: 'group', 'aria-label': opts.aria || null });
  const render = () => {
    clear(wrap);
    options.forEach(o => {
      const v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o;
      wrap.appendChild(chip(l, v === value, () => { value = v; render(); onChange(v); }, { tip: o.tip, icon: o.icon }));
    });
  };
  render();
  wrap.setValue = v => { value = v; render(); };
  return wrap;
}
function seg(options, value, onChange) {
  const wrap = h('div', { class: 'seg', role: 'group' });
  const render = () => {
    clear(wrap);
    options.forEach(o => {
      const b = h('button', { type: 'button', class: o.v === value ? 'on' : '', 'aria-pressed': o.v === value ? 'true' : 'false', onclick: () => { value = o.v; render(); onChange(o.v); }, 'data-tip': o.tip || null, 'aria-label': o.aria || o.tip || null });
      b.innerHTML = o.icon ? icon(o.icon, 's') + (o.l ? ' ' + escapeHtml(o.l) : '') : escapeHtml(o.l);
      wrap.appendChild(b);
    });
  };
  render();
  return wrap;
}
/** Labeled slider. onInput fires live, onCommit at release. */
function slider(label, value, min, max, step, onInput, onCommit, opts = {}) {
  const wrap = h('div', { class: 'range' });
  const lbl = h('div', { class: 'rl' }, h('span', null, label));
  const r = h('input', { type: 'range', min, max, step, value, 'aria-label': label });
  const n = h('input', { class: 'num', type: 'number', min, max, step, value: fmtNum(value, step), 'aria-label': label + ' Wert' });
  if (opts.reset != null) lbl.appendChild(h('button', { type: 'button', onclick: () => { set(opts.reset); onInput(opts.reset); onCommit && onCommit(opts.reset); } }, 'Zurücksetzen'));
  const set = v => { r.value = v; n.value = fmtNum(+v, step); };
  r.addEventListener('input', () => { n.value = fmtNum(+r.value, step); onInput(+r.value); });
  r.addEventListener('change', () => onCommit && onCommit(+r.value));
  n.addEventListener('change', () => { const v = clamp(+n.value || 0, +min, +max); set(v); onInput(v); onCommit && onCommit(v); });
  wrap.append(lbl, r, n);
  wrap.set = set;
  return wrap;
}
function fmtNum(v, step) { const d = String(step).includes('.') ? String(step).split('.')[1].length : 0; return (+v).toFixed(d); }
function toggle(label, checked, onChange, opts = {}) {
  const id = uid('tg');
  const w = h('label', { class: 'toggle', for: id, 'data-tip': opts.tip || null });
  const inp = h('input', { type: 'checkbox', id, role: 'switch' });
  inp.checked = !!checked;
  inp.addEventListener('change', () => onChange(inp.checked));
  w.append(h('span', null, label), inp, h('span', { class: 'tg', 'aria-hidden': 'true' }));
  if (opts.disabled) { inp.disabled = true; w.style.opacity = .5; }
  return w;
}
function field(label, control) { return h('div', { class: 'field' }, h('label', null, label), control); }
function selectEl(options, value, onChange, opts = {}) {
  const s = h('select', { class: 'select ' + (opts.cls || ''), 'aria-label': opts.aria || null });
  options.forEach(o => { const v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o; const op = h('option', { value: v }, l); if (v === value) op.selected = true; s.appendChild(op); });
  s.addEventListener('change', () => onChange(s.value));
  return s;
}

/* ── Tooltips ────────────────────────────────────────────────────────── */
(function initTooltips() {
  let tEl, timer, cur;
  const show = target => {
    tEl = tEl || document.getElementById('tooltip');
    if (!tEl) return;
    const [txt, kbd] = target.dataset.tip.split('|');
    tEl.innerHTML = escapeHtml(txt) + (kbd ? `<span class="kbd">${escapeHtml(kbd)}</span>` : '');
    const r = target.getBoundingClientRect();
    tEl.classList.add('show');
    const tw = tEl.offsetWidth, th = tEl.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2, y = r.bottom + 8;
    if (y + th > innerHeight - 8) y = r.top - th - 8;
    x = clamp(x, 8, innerWidth - tw - 8);
    tEl.style.left = x + 'px'; tEl.style.top = y + 'px';
  };
  const hide = () => { clearTimeout(timer); cur = null; tEl && tEl.classList.remove('show'); };
  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t === cur) return;
    hide();
    if (!t || !t.dataset.tip) return;
    cur = t; timer = setTimeout(() => cur === t && show(t), 450);
  });
  document.addEventListener('pointerdown', hide, true);
  document.addEventListener('scroll', hide, true);
})();

/* ── Toasts ──────────────────────────────────────────────────────────── */
function toast(msg, type = 'info', opts = {}) {
  const box = document.getElementById('toasts');
  const ic = type === 'error' ? 'warn' : type === 'success' ? 'check' : 'info';
  const t = h('div', { class: 'toast ' + type, role: type === 'error' ? 'alert' : 'status' });
  t.innerHTML = `<span class="ti">${icon(ic, 's')}</span><span>${escapeHtml(msg)}</span>`;
  if (opts.action) { const a = h('button', { class: 'ta', type: 'button', onclick: () => { opts.action.fn(); kill(); } }, opts.action.label); t.appendChild(a); }
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 260); };
  setTimeout(kill, opts.duration || (type === 'error' ? 6500 : 3200));
  return kill;
}

/* ── Modals & dialogs ────────────────────────────────────────────────── */
const ModalStack = [];
function modal({ title, content, actions = [], cls = '', onClose, closable = true, icon: ic }) {
  const ov = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Dialog' });
  const m = h('div', { class: 'modal ' + cls });
  const head = h('div', { class: 'modal-h' });
  if (ic) head.appendChild(iconEl(ic, 'l'));
  head.appendChild(h('h3', null, title || ''));
  if (closable) head.appendChild(ibtn('x', 'Schließen', () => close()));
  const body = h('div', { class: 'modal-b' });
  if (content) appendKids(body, [content]);
  m.append(h('div', { class: 'sheet-handle' }), head, body);
  let foot;
  if (actions.length) {
    foot = h('div', { class: 'modal-f' });
    actions.forEach(a => foot.appendChild(btn(a.label, async () => { if (a.onClick) { const r = await a.onClick(); if (r === false) return; } if (a.close !== false) close(a.value); }, { cls: a.cls || (a.primary ? 'primary' : ''), icon: a.icon, disabled: a.disabled })));
    m.appendChild(foot);
  }
  ov.appendChild(m);
  let closed = false, resolve;
  const done = new Promise(r => resolve = r);
  const close = val => { if (closed) return; closed = true; ov.remove(); ModalStack.splice(ModalStack.indexOf(api), 1); onClose && onClose(val); resolve(val); };
  ov.addEventListener('pointerdown', e => { if (e.target === ov && closable) close(); });
  const api = { el: m, body, foot, close, done, closable };
  ModalStack.push(api);
  document.body.appendChild(ov);
  setTimeout(() => { const f = m.querySelector('input:not([type=hidden]),textarea,select'); if (f && !isTouch()) f.focus(); else m.querySelector('.modal-f .btn.primary, .modal-f .btn')?.focus?.(); }, 40);
  return api;
}
function confirmDialog({ title = 'Bist du sicher?', text = '', ok = 'Bestätigen', danger = false, cancel = 'Abbrechen' } = {}) {
  return new Promise(res => {
    const m = modal({ title, content: h('p', { style: { margin: '4px 0 6px', color: 'var(--text2)', lineHeight: 1.6 } }, text), actions: [
      { label: cancel, value: false },
      { label: ok, value: true, cls: danger ? 'danger' : 'primary' }], onClose: v => res(!!v) });
    m.done.then(v => res(!!v));
  });
}
function promptDialog({ title, label, value = '', ok = 'Speichern', placeholder = '' }) {
  return new Promise(res => {
    const inp = h('input', { class: 'input', value, placeholder, 'aria-label': label || title });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); m.close(inp.value.trim() || null); } });
    const m = modal({ title, content: field(label || '', inp), actions: [{ label: 'Abbrechen', value: null }, { label: ok, primary: true, onClick: () => { m.close(inp.value.trim() || null); return false; } }], onClose: v => res(v ?? null) });
    setTimeout(() => { inp.focus(); inp.select(); }, 60);
  });
}
function popMenu(anchor, items) {
  document.querySelectorAll('.menu').forEach(m => m.remove());
  const m = h('div', { class: 'menu', role: 'menu' });
  items.forEach(it => {
    if (it === '-') { m.appendChild(h('div', { class: 'sep' })); return; }
    const b = h('button', { type: 'button', role: 'menuitem', class: it.danger ? 'danger' : '', onclick: () => { m.remove(); it.fn(); } });
    b.innerHTML = (it.icon ? icon(it.icon, 's') : '') + escapeHtml(it.label);
    m.appendChild(b);
  });
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect();
  const mw = m.offsetWidth, mh = m.offsetHeight;
  m.style.left = clamp(r.right - mw, 8, innerWidth - mw - 8) + 'px';
  m.style.top = (r.bottom + mh + 8 > innerHeight ? Math.max(8, r.top - mh - 6) : r.bottom + 6) + 'px';
  setTimeout(() => {
    const off = e => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); } };
    document.addEventListener('pointerdown', off, true);
  });
  m.querySelector('button')?.focus();
  return m;
}

/* ── Formatting ──────────────────────────────────────────────────────── */
function fmtTime(s, withFrac = true) {
  if (!isFinite(s)) s = 0;
  s = Math.max(0, s);
  const m = Math.floor(s / 60), sec = s - m * 60;
  return withFrac ? `${m}:${sec.toFixed(1).padStart(4, '0')}` : `${m}:${String(Math.floor(sec)).padStart(2, '0')}`;
}
function fmtRel(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 45) return 'gerade eben';
  if (d < 3600) return `vor ${Math.round(d / 60)} Min.`;
  if (d < 86400) return `vor ${Math.round(d / 3600)} Std.`;
  if (d < 86400 * 7) return `vor ${Math.round(d / 86400)} Tag${Math.round(d / 86400) > 1 ? 'en' : ''}`;
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtBytes(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(0) + ' KB'; if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB'; return (b / 1073741824).toFixed(2) + ' GB'; }

/* ── Files ───────────────────────────────────────────────────────────── */
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name, style: { display: 'none' } });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function pickFiles(accept, multiple = true, opts = {}) {
  return new Promise(res => {
    const inp = h('input', { type: 'file', accept, style: { display: 'none' } });
    if (multiple) inp.multiple = true;
    if (opts.folder) { inp.setAttribute('webkitdirectory', ''); inp.setAttribute('directory', ''); }
    inp.addEventListener('change', () => { res(Array.from(inp.files || [])); inp.remove(); });
    inp.addEventListener('cancel', () => { res([]); inp.remove(); });
    document.body.appendChild(inp); inp.click();
  });
}
function blobToDataURL(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); }); }
function canvasToBlob(c, type = 'image/png', q) { return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Canvas-Export fehlgeschlagen')), type, q)); }
function loadImageURL(url) { return new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => rej(new Error('Bild konnte nicht geladen werden')); i.src = url; }); }
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

/** Translate internal errors into human language — never show stack traces. */
function friendlyError(e, ctx = '') {
  const m = String(e && (e.message || e.name || e) || '');
  if (/Quota|quota|NS_ERROR_DOM_QUOTA|storage.*full/i.test(m) || (e && e.name === 'QuotaExceededError')) return 'Der lokale Speicher deines Browsers ist voll. Lösche nicht mehr benötigte Medien oder Projekte und versuche es erneut.';
  if (/NotAllowedError|Permission/i.test(m)) return 'Der Browser hat den Zugriff verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.';
  if (/NotSupported|not supported|DECODE|decode|EncodingError/i.test(m)) return (ctx ? ctx + ': ' : '') + 'Dieses Dateiformat wird von deinem Browser nicht unterstützt. Tipp: Exportiere die Datei als MP4 (H.264), JPG/PNG oder MP3/M4A.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Keine Verbindung möglich. Prüfe deine Internetverbindung bzw. den API-Schlüssel.';
  if (/AbortError|aborted/i.test(m)) return 'Vorgang abgebrochen.';
  return (ctx ? ctx + ' – ' : '') + (m.length && m.length < 160 && !/at\s|\.js:|undefined|null/.test(m) ? m : 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
}

/* ── Tiny event bus ──────────────────────────────────────────────────── */
const Bus = { m: {}, on(e, f) { (this.m[e] = this.m[e] || []).push(f); }, emit(e, d) { (this.m[e] || []).forEach(f => { try { f(d); } catch (err) { console.error(err); } }); } };

/* ── Color helpers ───────────────────────────────────────────────────── */
function hexToRgb(hex) { hex = String(hex || '#000').replace('#', ''); if (hex.length === 3) hex = hex.split('').map(c => c + c).join(''); const n = parseInt(hex.slice(0, 6), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase(); }
function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
function luminance(hex) { const [r, g, b] = hexToRgb(hex).map(v => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }

/* ── Seeded random (stable hand-drawn wobble) ────────────────────────── */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h1 = 2166136261; for (let i = 0; i < s.length; i++) { h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 16777619); } return h1 >>> 0; }

/* ── Minimal ZIP writer (store, no compression) for multi-page export ── */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
async function makeZip(files) {
  const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0;
  for (const f of files) {
    const data = new Uint8Array(await f.blob.arrayBuffer()); const name = enc.encode(f.name); const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(lh.buffer, name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
    ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
    central.push(ch.buffer, name);
    offset += 30 + name.length + data.length;
  }
  const cSize = central.reduce((s, p) => s + (p.byteLength ?? p.length), 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}

/* ── Text helpers (German/English) ───────────────────────────────────── */
const STOPWORDS = new Set(('der die das den dem des ein eine einer eines einem einen und oder aber doch wenn weil dass daß als wie so zu zum zur im in an am auf aus bei mit nach von vor über unter für gegen ohne um durch bis seit ist sind war waren bin bist sein hat habe haben hatte hatten wird werden wurde kann können muss müssen soll sollte will wollte ich du er sie es wir ihr mich mir dich dir sich uns euch mein meine meinen meiner dein deine sein seine ihre ihr unser nicht kein keine keinen auch noch nur schon sehr mehr viel viele dann denn da hier dort jetzt immer nie man was wer wo warum welche welcher dies diese dieser dieses jede jeder alle alles etwas einfach eigentlich wirklich halt ja nein mal also eben gerade ganz vielleicht dabei damit darum dafür daran davon deshalb trotzdem sondern ob einmal heute morgen gestern the a an and or but if of to in on at for with from by is are was were be been it this that these those i you he she we they me my your our their not no so as do does did have has had will would can could should just very really also only then than there here what which who how why when where about into over after before up out').split(' '));
function tokenize(s) { return String(s || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(Boolean); }
function contentWords(s) { return tokenize(s).filter(w => w.length > 2 && !STOPWORDS.has(w)); }
function splitSentences(text) {
  // no regex lookbehind (older iOS Safari would fail to parse the whole script)
  const marked = String(text || '').replace(/\r/g, '')
    .replace(/\n{2,}/g, '\u0001')
    .replace(/([.!?…])\s+(?=[„"»A-ZÄÖÜ0-9])/g, '$1\u0001')
    .replace(/\n(?=[-•–*\d])/g, '\u0001');
  return marked.split('\u0001').map(s => s.replace(/^[-•–*]\s*/, '').replace(/\s+/g, ' ').trim()).filter(s => s.length > 1);
}
