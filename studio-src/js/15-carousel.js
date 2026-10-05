/* ═══════════════════════════════════════════════════════════════════════
   MODULE: SMART CAROUSEL — text engine (local structure engine or Claude),
   slide intelligence, smart image matching & ranking, variants A/B/C,
   video→carousel, carousel→reel, content repurpose hub.
   ═══════════════════════════════════════════════════════════════════════ */
const CAR_STYLES = {
  editorial: { l: 'Mindéa Editorial', bg: [C.ivory, C.black], text: [C.black, C.ivory], muted: [C.espresso, C.sand], accent: C.gold, head: FONT_HEAD },
  quiet: { l: 'Quiet Luxury', bg: [C.cream, C.sand], text: [C.espresso, C.espresso], muted: ['#6B5B4A', '#5A4A3A'], accent: C.gold, head: FONT_HEAD },
  notes: { l: 'Founder Notes', bg: [C.cream, C.ivory], text: [C.espresso, C.espresso], muted: ['#6B5B4A', '#6B5B4A'], accent: C.espresso, head: FONT_HEAD, italic: true, paper: true },
  expert: { l: 'Expert', bg: [C.white, C.black], text: [C.black, C.ivory], muted: ['#4A4038', C.sand], accent: C.black, accent2: C.lightgold, head: FONT_ALT },
  story: { l: 'Storytelling', bg: [C.espresso, C.black], text: [C.ivory, C.ivory], muted: [C.sand, C.sand], accent: C.lightgold, head: FONT_HEAD, photo: 1 },
  portfolio: { l: 'Portfolio', bg: [C.white, C.ivory], text: [C.black, C.black], muted: [C.espresso, C.espresso], accent: C.gold, head: FONT_HEAD, photo: 2 },
  casestudy: { l: 'Case Study', bg: [C.ivory, C.cream], text: [C.black, C.black], muted: [C.espresso, C.espresso], accent: C.gold, head: FONT_ALT },
  educational: { l: 'Educational', bg: [C.cream, C.ivory], text: [C.espresso, C.espresso], muted: ['#6B5B4A', '#6B5B4A'], accent: C.gold, head: FONT_BODY, headWeight: 400 },
};
const ROLE_CUES = {
  problem: /(problem|fehler|schwierig|kämpf|frust|unsichtbar|niemand|keine?n? |nicht |ohne |angst|zweifel|monatelang|stress|zu viel|verloren|struggle|hard|mistake)/i,
  thought: /(erkannt|gemerkt|verstanden|wahrheit|eigentlich|wichtig|der punkt|lektion|gelernt|realisiert|plötzlich|insight|realized)/i,
  solution: /(lösung|deshalb|stattdessen|heute|seitdem|so habe|hilft|der weg|tipp|entscheid|angefangen|begonnen|fokus|klarheit|solution|instead|now)/i,
  example: /(zum beispiel|z\. ?b\.|beispiel|kundin|kunde|projekt|als ich|letzte woche|neulich|story|case|example)/i,
};
const CTAS = [
  { re: /(marke|brand|sichtbar|auftritt|film|video)/i, t: 'Schreib mir, wenn du deine Marke sichtbar machen möchtest.' },
  { re: /(tipp|fehler|schritt|regel|checkliste|wie du)/i, t: 'Speichere dir den Beitrag für später.' },
  { re: /(ich|mein|gründ|geschichte|weg)/i, t: 'Was davon kennst du von dir?' },
];
const CarouselEngine = {
  shorten(s, maxW = 9, keepPunct = true) {
    let t = String(s).trim().replace(/^(und|aber|also|denn|doch|nun|ja|so|okay|ok),?\s+/i, '');
    t = t.replace(/\b(eigentlich|einfach|wirklich|halt|irgendwie|quasi|sozusagen|ja|mal|eben|total|super)\b\s*/gi, '').replace(/\s+/g, ' ').trim();
    const end = /[?!]$/.test(t) ? t.slice(-1) : '';
    const clauses = t.split(/\s*[,;:–—]\s+/).map(x => x.trim()).filter(Boolean);
    const conj = /^(weil|denn|aber|und|doch|dass|die|der|das|wenn|als|sondern|damit|obwohl|während|bis|ob|because|but|and|which|that|when)\b/i;
    if (clauses.length > 1 && clauses[0].split(' ').length >= 4 && t.split(' ').length > maxW && conj.test(clauses[1])) t = clauses[0];
    else if (t.split(' ').length > maxW && t.split(' ').length <= maxW + 3) maxW += 3;
    let w = t.replace(/[.!?…]+$/, '').split(' ');
    if (w.length > maxW) { w = w.slice(0, maxW); while (w.length > 3 && CapEngine.FUNC.has(CapEngine.clean(w[w.length - 1]))) w.pop(); }
    while (w.length > 3 && /^[,;:–—-]+$/.test(w[w.length - 1])) w.pop();
    let out = w.join(' ').replace(/\s*[,;:–—]$/, '').trim();
    if (keepPunct && end && w.length === t.replace(/[.!?…]+$/, '').split(' ').length) out += end;
    return out.charAt(0).toUpperCase() + out.slice(1);
  },
  body(s, maxW = 24) { const w = String(s).replace(/\s+/g, ' ').trim().split(' '); if (w.length <= maxW) return w.join(' '); let cut = w.slice(0, maxW).join(' '); const lp = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(', ')); if (lp > cut.length * 0.55) cut = cut.slice(0, lp); return cut.replace(/[,;:]$/, '') + ' …'; },
  /** Local structure engine – no AI, deterministic, honest. */
  local(text, n) {
    const sents = splitSentences(text).filter(s => s.split(' ').length >= 3);
    if (sents.length < 3) return null;
    const freq = new Map(); contentWords(text).forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
    const top = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(x => x[0]);
    const score = (s, i) => { const cw = contentWords(s); let sc = cw.filter(w => top.includes(w)).length / Math.max(3, cw.length) * 4; if (i === 0) sc += 1.2; const L = s.split(' ').length; if (L >= 6 && L <= 22) sc += 1; if (/\?/.test(s)) sc += 0.6; return sc; };
    const items = sents.map((s, i) => ({ s, i, sc: score(s, i) }));
    // enumerations → numbered content slides
    const listItems = String(text).split('\n').map(l => l.trim()).filter(l => /^(\d+[.)]|[-•–*]|erstens|zweitens|drittens)\s+/i.test(l));
    n = clamp(n || Math.min(8, Math.max(5, Math.round(sents.length / 2) + 2)), 5, 10);
    const used = new Set();
    const firstLine = String(text).trim().split('\n')[0].trim();
    const titleLike = firstLine.split(' ').length <= 10 && /\n/.test(String(text).trim()) && sents[0] && sents[0].startsWith(firstLine.replace(/[.!?…]+$/, '').slice(0, 20));
    const hb = x => x.sc + (/\?|\d/.test(x.s) ? 1 : 0) + (x.i === 0 ? 1.4 : x.i === 1 ? 0.6 : 0);
    const hookIt = titleLike ? items[0] : items.slice().sort((a, b) => hb(b) - hb(a))[0];
    used.add(hookIt.i);
    const slides = [{ role: 'hook', headline: this.shorten(hookIt.s, 9), body: '', src: hookIt.i }];
    const mid = n - 2;
    if (listItems.length >= 3) {
      listItems.slice(0, mid).forEach((l, k) => { const c = l.replace(/^(\d+[.)]|[-•–*]|erstens|zweitens|drittens)\s+/i, ''); slides.push({ role: 'tip', number: String(k + 1).padStart(2, '0'), headline: this.shorten(c, 8), body: this.body(c.split(' ').length > 8 ? c : '', 20) }); });
    } else {
      const order = ['problem', 'thought', 'solution', 'example', 'solution', 'thought', 'example', 'solution'].slice(0, mid);
      const picks = [];
      for (const role of order) {
        const cand = items.filter(x => !used.has(x.i)).map(x => ({ ...x, r: x.sc + (ROLE_CUES[role] && ROLE_CUES[role].test(x.s) ? 2 : 0) })).sort((a, b) => b.r - a.r)[0];
        if (!cand) break; used.add(cand.i); picks.push({ role, it: cand });
      }
      picks.sort((a, b) => a.it.i - b.it.i);
      for (const { role, it } of picks) {
        const next = items.find(x => x.i === it.i + 1 && !used.has(x.i));
        const firstClauseLen = it.s.split(/[,;:–—]/)[0].split(' ').length;
        let body = '';
        const headWords = this.shorten(it.s, role === 'thought' ? 14 : 8).replace(/[?!]$/, '').split(' ').length;
        if (it.s.split(' ').length > headWords + 3) { const rest = it.s.split(' ').slice(headWords).join(' ').replace(/^[,;:–—\s]+/, '').trim(); body = rest.split(' ').length >= 4 ? this.body(rest.charAt(0).toUpperCase() + rest.slice(1), 22) : ''; }
        if ((!body || body.split(' ').length < 6) && next) { body = this.body(next.s, 22); used.add(next.i); }
        slides.push({ role: role === 'thought' && it.s.split(' ').length <= 16 ? 'quote' : role, headline: this.shorten(it.s, role === 'thought' ? 14 : 8), body: role === 'thought' && it.s.split(' ').length <= 16 ? '' : body, src: it.i });
      }
    }
    const ctaT = (CTAS.find(c => c.re.test(text)) || CTAS[1]).t;
    slides.push({ role: 'cta', headline: ctaT, body: '' });
    const topicTags = textToTags(text);
    slides.forEach(s => { s.tags = new Map([...Array.from(topicTags.entries()).map(([k, v]) => [k, v * 0.4]), ...textToTags(s.headline + ' ' + s.body)]); if (/\b\d+\b/.test(s.headline) && s.role !== 'cta' && !s.number) s.hasNumber = true; });
    return { slides, caption: null, engine: 'Lokale Struktur-Engine' };
  },
  async ai(text, n, style) {
    const r = await AI.json(`Erstelle aus folgendem Inhalt ein Instagram-Karussell${n ? ' mit genau ' + n + ' Slides' : ' (5–10 Slides, so viele wie inhaltlich sinnvoll)'}. Stil: ${CAR_STYLES[style].l}. Regeln: Eine Slide = eine Hauptaussage. Slide 1 = Hook (max 9 Wörter). Letzte Slide = CTA passend zum Thema. Headlines max 8 Wörter, Body max 25 Wörter (oder leer). Rollen: hook, problem, thought, solution, example, tip, quote, number, beforeafter, cta.
Inhalt:\n"""${text.slice(0, 14000)}"""\nJSON: {"slides": [{"role": "...", "headline": "...", "body": "...", "number": "optional z. B. 01 oder 3×", "image_tags": ["nur aus: ${Object.keys(TAGS).join(', ')}"], "needs_image": true|false}], "caption": {"hook": "...", "body": "...", "cta": "...", "hashtags": ["#..."]}}`, { maxTokens: 4000 });
    const slides = (r.slides || []).slice(0, 10).map(s => ({ role: s.role || 'solution', headline: s.headline || '', body: s.body || '', number: s.number || null, needsImage: s.needs_image, tags: new Map([...(s.image_tags || []).map(t => [String(t).toLowerCase(), 1.2]), ...textToTags((s.headline || '') + ' ' + (s.body || ''))]) }));
    if (slides.length < 3) throw new Error('Die KI hat zu wenige Slides geliefert. Bitte erneut versuchen.');
    return { slides, caption: r.caption || null, engine: 'KI (Claude)' };
  },
};

/* ── Slide layouts ───────────────────────────────────────────────────── */
function carLayoutFor(slide, variant, idx, total, hasImg) {
  const r = slide.role;
  if (r === 'cta') return 'cta';
  if (r === 'hook') return variant === 'A' ? (hasImg ? 'cover-photo' : 'cover-text') : variant === 'B' ? (hasImg ? 'cover-split' : 'cover-text') : 'cover-text';
  if (r === 'beforeafter' && hasImg) return 'beforeafter';
  if (slide.number || slide.hasNumber || r === 'tip' || r === 'number') return variant === 'A' && hasImg && idx % 2 ? 'photo-box' : 'number';
  if (r === 'quote' || r === 'thought') return 'quote';
  if (variant === 'C') return r === 'example' && hasImg ? 'split' : 'text';
  if (variant === 'B') return r === 'example' && hasImg ? 'photo-box' : (idx % 3 === 2 && hasImg ? 'split' : 'text');
  if (!hasImg) return 'text';
  return ['split', 'full-photo', 'photo-box'][idx % 3];
}
function buildCarouselPage(slide, layout, fmt, style, idx, total, media) {
  const st = CAR_STYLES[style] || CAR_STYLES.editorial; const b = TB(fmt.w, fmt.h);
  const dark = layout === 'cta' ? 1 : (style === 'story' ? idx % 2 : (layout === 'quote' && style === 'editorial' ? 1 : 0));
  const bg = st.bg[dark], tc = st.text[dark], mc = st.muted[dark], ac = dark && st.accent2 ? st.accent2 : (dark && st.accent === C.black ? C.lightgold : st.accent);
  const pg = newPage('Slide ' + (idx + 1), bg);
  const E = pg.elements; const hw = st.headWeight || 500;
  const head = (txt, o) => b.t('headline', txt, Object.assign({ font: st.head, color: tc, weight: hw, italic: !!st.italic }, o));
  const bod = (txt, o) => b.t('body', txt, Object.assign({ color: mc }, o));
  const m0 = media[0];
  const pageNo = () => b.t('subheadline', `${String(idx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, { x: 0.62, w: 0.3, y: 0.92, size: 18, align: 'right', color: mc, ls: 0.18 });
  const handleEl = (color) => b.t('subheadline', handle(), { x: 0.08, w: 0.5, y: 0.92, size: 18, align: 'left', color: color || mc });
  const img = (m, x, y, w, hh, o = {}) => { const e = b.img(x, y, w, hh, o); if (m) { e.mediaId = m.id; e.name = m.name; e.alts = slide.alts || null; } return e; };
  if (st.paper && !['cover-photo', 'full-photo'].includes(layout)) E.push(b.g('paper', 0.5, 0.5, 2.2, { color: C.cream }));
  switch (layout) {
    case 'cover-photo': {
      pg.bg = Object.assign(pg.bg, { type: 'image', mediaId: m0.id, dim: 0, alts: slide.alts || null });
      const z = textZoneFor(m0); const top = z.zone === 'top';
      E.push(b.s('scrim', 0, top ? 0 : 0.45, 1, 0.55, { fill: C.black, strength: 0.62, dir: top ? 'down' : 'up' }));
      const hd = head(slide.headline, { x: 0.08, w: 0.84, size: 96, align: 'left', color: C.ivory }); hd.y = Math.round(top ? fmt.h * 0.1 : fmt.h * 0.86 - hd.h);
      E.push(hd, b.t('subheadline', 'Swipe →', { x: 0.6, w: 0.32, y: top ? 0.9 : 0.06, size: 18, align: 'right', color: C.lightgold }));
      break;
    }
    case 'cover-split': {
      E.push(img(m0, 0, 0, 1, 0.56));
      E.push(b.t('subheadline', handle(), { x: 0.08, w: 0.6, y: 0.61, size: 18, align: 'left', color: ac }), head(slide.headline, { x: 0.08, w: 0.84, y: 0.65, size: 84, align: 'left' }), b.t('subheadline', 'Swipe →', { x: 0.6, w: 0.32, y: 0.92, size: 18, align: 'right', color: ac }));
      break;
    }
    case 'cover-text': {
      E.push(b.t('subheadline', handle(), { x: 0.08, w: 0.6, y: 0.07, size: 18, align: 'left', color: mc }), head(slide.headline, { x: 0.08, w: 0.84, yc: 0.48, size: 108, align: 'left' }), b.s('line', 0.08, 0.72, 0.16, 0.002, { stroke: ac, strokeW: 3 }), b.t('subheadline', 'Swipe →', { x: 0.6, w: 0.32, y: 0.92, size: 18, align: 'right', color: ac }));
      break;
    }
    case 'split': {
      E.push(img(m0, 0, 0, 1, 0.5));
      const hd = head(slide.headline, { x: 0.08, w: 0.84, y: 0.56, size: 70, align: 'left' }); E.push(hd);
      if (slide.body) { const bd = bod(slide.body, { x: 0.08, w: 0.8, size: 30, align: 'left' }); bd.y = hd.y + hd.h + Math.round(fmt.h * 0.025); E.push(bd); }
      E.push(pageNo());
      break;
    }
    case 'full-photo': {
      pg.bg = Object.assign(pg.bg, { type: 'image', mediaId: m0.id, dim: 0, alts: slide.alts || null });
      const z = textZoneFor(m0); const top = z.zone === 'top';
      E.push(b.s('scrim', 0, top ? 0 : 0.4, 1, 0.6, { fill: C.black, strength: 0.66, dir: top ? 'down' : 'up' }));
      const hd = head(slide.headline, { x: 0.08, w: 0.84, size: 72, align: 'left', color: C.ivory }); const bd = slide.body ? bod(slide.body, { x: 0.08, w: 0.8, size: 28, align: 'left', color: C.cream }) : null;
      const blockH = hd.h + (bd ? bd.h + fmt.h * 0.02 : 0); const y0 = top ? fmt.h * 0.08 : fmt.h * 0.88 - blockH;
      hd.y = Math.round(y0); E.push(hd); if (bd) { bd.y = Math.round(hd.y + hd.h + fmt.h * 0.02); E.push(bd); }
      break;
    }
    case 'photo-box': {
      pg.bg = Object.assign(pg.bg, { type: 'image', mediaId: m0.id, dim: 0, alts: slide.alts || null });
      const z = textZoneFor(m0); const top = z.zone === 'top';
      const hd = head(slide.headline, { x: 0.13, w: 0.74, size: 58, align: 'left', color: C.black, font: st.head });
      const bd = slide.body ? bod(slide.body, { x: 0.13, w: 0.74, size: 26, align: 'left', color: C.espresso }) : null;
      const boxH = hd.h + (bd ? bd.h + fmt.h * 0.02 : 0) + fmt.h * 0.07; const by = top ? fmt.h * 0.07 : fmt.h * 0.92 - boxH;
      E.push(b.s('roundrect', 0.08, by / fmt.h, 0.84, boxH / fmt.h, { fill: C.ivory, radius: 18 * b.S, opacity: 0.94 }));
      hd.y = Math.round(by + fmt.h * 0.035); E.push(hd); if (bd) { bd.y = Math.round(hd.y + hd.h + fmt.h * 0.02); E.push(bd); }
      if (slide.number) E.push(b.t('number', slide.number, { x: 0.13, w: 0.3, y: by / fmt.h - 0.07, size: 70, align: 'left', color: C.ivory }));
      break;
    }
    case 'number': {
      const num = slide.number || (slide.headline.match(/\b\d+[×x%]?\b/) || [String(idx).padStart(2, '0')])[0];
      E.push(b.t('number', num, { x: 0.08, w: 0.6, y: 0.1, size: 190, align: 'left', color: ac, font: st.head }));
      const hd = head(slide.number ? slide.headline : slide.headline, { x: 0.08, w: 0.84, y: 0.4, size: 70, align: 'left' }); E.push(hd);
      if (slide.body) { const bd = bod(slide.body, { x: 0.08, w: 0.8, size: 30, align: 'left' }); bd.y = hd.y + hd.h + Math.round(fmt.h * 0.03); E.push(bd); }
      E.push(pageNo());
      break;
    }
    case 'quote': {
      E.push(b.g('quote', 0.5, 0.24, 0.13, { color: ac }), b.t('quote', '„' + slide.headline.replace(/^[„"“]|[“"”]$/g, '') + '“', { w: 0.8, yc: 0.5, size: 76, font: st.head, color: tc }));
      if (slide.body) E.push(bod(slide.body, { w: 0.7, yc: 0.72, size: 26 }));
      E.push(pageNo());
      break;
    }
    case 'beforeafter': {
      E.push(img(media[0], 0.06, 0.08, 0.88, 0.36), img(media[1] || media[0], 0.06, 0.47, 0.88, 0.36));
      E.push(b.t('badge', 'Vorher', { x: 0.09, w: 0.24, y: 0.1, size: 18, color: C.black, bg: { color: C.ivory, radius: 999 } }), b.t('badge', 'Nachher', { x: 0.09, w: 0.26, y: 0.49, size: 18, color: C.ivory, bg: { color: C.black, radius: 999 } }), head(slide.headline, { x: 0.08, w: 0.84, y: 0.86, size: 44, align: 'left' }));
      break;
    }
    case 'cta': {
      E.push(b.g('sparkle', 0.5, 0.26, 0.05, { color: ac }), head(slide.headline, { w: 0.8, yc: 0.45, size: 82 }));
      if (slide.body) E.push(bod(slide.body, { w: 0.7, yc: 0.62, size: 28 }));
      E.push(b.t('cta', 'Folge ' + handle(), { w: 0.56, yc: 0.76, size: 22, color: dark ? C.black : C.ivory, bg: { color: dark ? C.lightgold : C.black, radius: 999 } }));
      break;
    }
    default: {
      const hd = head(slide.headline, { x: 0.08, w: 0.84, y: 0.2, size: 78, align: 'left' }); E.push(b.t('subheadline', ({ problem: 'Das Problem', thought: 'Der Gedanke', solution: 'Die Lösung', example: 'Ein Beispiel', tip: 'Tipp' })[slide.role] || '', { x: 0.08, w: 0.6, y: 0.12, size: 18, align: 'left', color: ac }), hd);
      if (slide.body) { const bd = bod(slide.body, { x: 0.08, w: 0.8, size: 32, align: 'left' }); bd.y = hd.y + hd.h + Math.round(fmt.h * 0.04); E.push(bd); }
      E.push(b.s('line', 0.08, 0.86, 0.12, 0.002, { stroke: ac, strokeW: 2 }), handleEl(), pageNo());
    }
  }
  return pg;
}
/** Assign images to slides: relevance first, never the same image twice, alternatives kept. */
function assignCarouselMedia(slides, fmt, variant, styleKey) {
  const used = new Set(); const st = CAR_STYLES[styleKey] || {};
  const imgCount = Media.byKind('image').length;
  const wantImage = (s, i) => {
    if (s.role === 'cta' || s.role === 'quote' || s.role === 'thought') return false;
    if (variant === 'C') return s.role === 'example' || (s.role === 'hook' && false);
    if (variant === 'B') return s.role === 'hook' || s.role === 'example' || i % 3 === 2;
    return true;
  };
  slides.forEach((s, i) => {
    s.media = []; s.alts = null;
    if (!imgCount || s.needsImage === false && variant !== 'A') return;
    if (!wantImage(s, i) && !(st.photo && variant !== 'C' && s.role !== 'cta')) return;
    const ranked = Media.rank(s.tags || new Map(), { aspect: s.role === 'hook' && variant === 'A' ? fmt.w / fmt.h : 1.4, exclude: used });
    let best = ranked.filter(r => r.rel > 0);
    if (!best.length && (s.role === 'hook' && variant === 'A')) best = ranked.slice(0, 6); // purely visual choice for the cover
    if (!best.length) return;
    s.media = [best[0].m]; used.add(best[0].m.id);
    if (s.role === 'beforeafter' && best[1]) { s.media.push(best[1].m); used.add(best[1].m.id); }
    s.alts = ranked.slice(0, 8).map(r => r.m.id);
  });
}
function buildCarouselVariant(analysis, fmt, styleKey, variant) {
  const slides = analysis.slides.map(s => ({ ...s, tags: s.tags }));
  assignCarouselMedia(slides, fmt, variant, styleKey);
  return slides.map((s, i) => { const layout = carLayoutFor(s, variant, i, slides.length, s.media && s.media.length > 0); const pg = buildCarouselPage(s, layout, fmt, styleKey, i, slides.length, s.media || []); pg.name = ({ hook: 'Hook', problem: 'Problem', thought: 'Gedanke', quote: 'Gedanke', solution: 'Lösung', example: 'Beispiel', tip: 'Tipp', number: 'Zahl', beforeafter: 'Vorher/Nachher', cta: 'CTA' }[s.role] || 'Slide'); pg._layout = layout; pg._slide = i; return pg; });
}

/* ── Carousel UI ─────────────────────────────────────────────────────── */
const CarouselUI = {
  root: null, prefill: null, res: null, variant: 'A', opts: { n: 0, style: 'editorial', fmt: 'post45', engine: 'local' }, text: '',
  mount(root) { this.root = root; this.sc = h('div', { class: 'scroll', style: { flex: 1 } }); root.appendChild(this.sc); },
  show() {
    if (this.prefill) { this.text = this.prefill.text || this.text; if (this.prefill.useAI && AI.connected()) this.opts.engine = 'ai'; const auto = this.prefill.autoRun; this.prefill = null; this.render(); if (auto) this.generate(); return; }
    this.render();
  },
  render() {
    const sc = clear(this.sc); const w = h('div', { class: 'page' }); sc.appendChild(w);
    w.appendChild(h('div', { class: 'hero' }, h('div', null, h('div', { class: 'eyebrow' }, 'Smart Carousel'), h('h1', { class: 'h1' }, 'Aus Gedanken wird ein ', h('em', null, 'Karussell'), '.'), h('p', { class: 'lead' }, 'Text einfügen – Mindéa erkennt Kernaussagen, kürzt, wählt passende eigene Bilder und baut fertige Slides im Mindéa-Layout.'))));
    const imgs = Media.byKind('image'); const tagged = imgs.filter(m => (m.tags && m.tags.length) || (m.aiTags && m.aiTags.length)).length;
    const card = h('div', { class: 'card' });
    const ta = h('textarea', { class: 'textarea', style: { minHeight: '170px' }, placeholder: 'Füge hier deinen Text, deine Caption, Notizen, ein Skript oder Transkript ein …', 'aria-label': 'Ausgangstext' }); ta.value = this.text; ta.oninput = () => this.text = ta.value;
    const vids = Projects.cache.filter(p => p.type === 'video');
    card.append(h('div', { class: 'row', style: { justifyContent: 'space-between', flexWrap: 'wrap' } }, h('h4', null, 'Inhalt'), h('div', { class: 'row wrap' }, vids.length ? btn('Aus Video-Transkript', async () => { const p = await chooseProjectDialog(vids, 'Video wählen'); if (p) { const full = await DB.get('projects', p.id); const t = projectText(full); if (t) { this.text = t; this.render(); } else { toast('Dieses Video hat noch kein Transkript. Öffne es und nutze „Automatisch transkribieren“ im Caption Studio.', 'info', { duration: 6000 }); } } }, { cls: 'sm ghost', icon: 'video' }) : null)), ta);
    card.append(h('div', { class: 'grid2', style: { marginTop: '12px' } },
      field('Anzahl Slides', selectEl([{ v: '0', l: 'Automatisch' }, ...[5, 6, 7, 8, 9, 10].map(n => ({ v: String(n), l: n + ' Slides' }))], String(this.opts.n), v => this.opts.n = +v)),
      field('Format', selectEl([{ v: 'post45', l: 'Instagram 4:5 (1080 × 1350)' }, { v: 'square', l: 'Quadrat 1:1' }, { v: 'liportrait', l: 'LinkedIn 4:5' }], this.opts.fmt, v => this.opts.fmt = v))));
    card.append(h('div', { class: 'lbl', style: { margin: '8px 0 6px' } }, 'Stil'), chips(Object.entries(CAR_STYLES).map(([k, s]) => ({ v: k, l: s.l })), this.opts.style, v => { this.opts.style = v; if (this.res) this.rebuild(); }),
      h('div', { class: 'lbl', style: { margin: '14px 0 6px' } }, 'Text-Engine'),
      seg([{ v: 'local', l: 'Lokale Struktur-Engine' }, { v: 'ai', l: AI.connected() ? 'KI (Claude)' : 'KI – Verbindung erforderlich' }], this.opts.engine, v => { if (v === 'ai' && !AI.connected()) { AI.requireConnection(); this.render(); return; } this.opts.engine = v; }),
      h('p', { class: 'tiny muted' }, this.opts.engine === 'ai' ? 'Claude versteht den Inhalt, formuliert Headlines und schlägt Bildthemen vor. Der Text wird dafür an Anthropic übertragen.' : 'Lokal: Sätze werden nach Kernaussagen gewichtet, in Hook → Problem → Gedanke → Lösung → Beispiel → CTA strukturiert und gekürzt. Für reine Themen ohne Text ist KI nötig.'),
      h('div', { class: 'notice', style: { margin: '10px 0' } }, iconEl('image', 's'), h('span', null, `Mediathek: ${imgs.length} Bilder, davon ${tagged} mit Tags. Smart Matching nutzt Tags (Dateiname, Ordner, manuell oder KI-Bildanalyse). `, imgs.length && tagged < imgs.length ? h('a', { href: '#', onclick: e => { e.preventDefault(); showView('media'); } }, 'Jetzt taggen →') : null)),
      btn('Karussell automatisch erstellen', () => this.generate(), { cls: 'gold lg', icon: 'wand' }));
    w.appendChild(card);
    this.resBox = h('div', { style: { marginTop: '20px' } }); w.appendChild(this.resBox);
    if (this.res) this.renderResult();
  },
  async generate() {
    const text = (this.text || '').trim(); if (!text) { toast('Bitte zuerst einen Text einfügen.', 'info'); return; }
    clear(this.resBox).appendChild(h('div', { class: 'card row' }, h('div', { class: 'spinner' }), h('span', null, this.opts.engine === 'ai' ? 'Claude strukturiert deinen Inhalt …' : 'Inhalt wird analysiert …')));
    try {
      let a;
      if (this.opts.engine === 'ai') { if (!(await AI.consent('cloud'))) { this.render(); return; } a = await CarouselEngine.ai(text, this.opts.n, this.opts.style); }
      else { a = CarouselEngine.local(text, this.opts.n); if (!a) { clear(this.resBox).appendChild(h('div', { class: 'notice warn' }, iconEl('warn', 's'), h('span', null, 'Der Text ist zu kurz für die lokale Engine (mind. 3 Sätze). Füge mehr Text ein oder nutze die KI-Engine – für ein reines Thema ist eine KI-Verbindung erforderlich.'))); return; } }
      await Promise.all(Media.byKind('image').slice(0, 80).map(m => Media.img(m.id).catch(() => null)));
      this.analysis = a; this.rebuild();
    } catch (e) { clear(this.resBox).appendChild(h('div', { class: 'notice warn' }, iconEl('warn', 's'), h('span', null, friendlyError(e)))); }
  },
  rebuild() {
    const f = FORMATS[this.opts.fmt]; const fmt = { w: f.w, h: f.h };
    this.res = { fmt, variants: { A: buildCarouselVariant(this.analysis, fmt, this.opts.style, 'A'), B: buildCarouselVariant(this.analysis, fmt, this.opts.style, 'B'), C: buildCarouselVariant(this.analysis, fmt, this.opts.style, 'C') }, caption: this.analysis.caption, engine: this.analysis.engine };
    this.renderResult();
  },
  renderResult() {
    const box = clear(this.resBox), r = this.res;
    box.appendChild(h('div', { class: 'sec-h' }, h('h2', { class: 'h2' }, `${r.variants.A.length} Slides · 3 Varianten`), h('span', { class: 'badge' }, r.engine)));
    const names = { A: 'Variante A – bildstark', B: 'Variante B – textstark', C: 'Variante C – minimalistisch' };
    ['A', 'B', 'C'].forEach(k => {
      const pages = r.variants[k]; const vEl = h('div', { class: 'variant' + (this.variant === k ? ' on' : '') });
      vEl.appendChild(h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap' } }, h('b', { class: 'serif', style: { fontSize: '19px' } }, names[k]), h('div', { class: 'row' }, btn(this.variant === k ? 'Ausgewählt' : 'Auswählen', () => { this.variant = k; this.renderResult(); }, { cls: 'sm' + (this.variant === k ? ' primary' : ''), icon: this.variant === k ? 'check' : null }), btn('Im Editor öffnen', () => this.open(k), { cls: 'sm', icon: 'design' }))));
      const row = h('div', { class: 'slides-row' });
      pages.forEach((pg, i) => {
        const c = renderPageToCanvas(pg, r.fmt, 336); c.style.width = '168px'; c.style.height = Math.round(168 * r.fmt.h / r.fmt.w) + 'px';
        const sc = h('div', { class: 'slide-card' }, c);
        const imgEl = pg.elements.find(e => e.type === 'image' && e.alts) || (pg.bg.type === 'image' ? { bg: true, mediaId: pg.bg.mediaId, alts: pg.bg.alts } : null);
        const alts = imgEl ? (imgEl.alts || []) : [];
        if (alts.length > 1) {
          const ar = h('div', { class: 'alt-row', 'aria-label': 'Alternative Bilder' });
          alts.slice(0, 6).map(id => Media.get(id)).filter(Boolean).forEach(am => { const im = h('img', { src: Media.thumbURL(am), alt: am.name, class: am.id === imgEl.mediaId ? 'on' : '', role: 'button', tabindex: '0', title: am.name });
            im.onclick = () => { const dup = r.variants[k].some((o, j) => j !== i && ((o.bg.type === 'image' && o.bg.mediaId === am.id) || o.elements.some(e => e.mediaId === am.id))); if (dup) toast('Dieses Bild wird bereits auf einer anderen Slide verwendet.', 'info'); if (imgEl.bg) pg.bg.mediaId = am.id; else { imgEl.mediaId = am.id; imgEl.name = am.name; } Media.img(am.id).then(() => this.renderResult()); }; ar.appendChild(im); });
          sc.appendChild(ar);
        }
        row.appendChild(sc);
      });
      vEl.appendChild(row); box.appendChild(vEl);
    });
    const capBox = h('div', { class: 'card', style: { marginTop: '6px' } }, h('h4', null, 'Instagram Caption'));
    if (r.caption) capBox.appendChild(h('div', { class: 'ai-out', style: { marginTop: '8px' } }, [['Hook', r.caption.hook], ['Text', r.caption.body], ['CTA', r.caption.cta], ['Hashtags', (r.caption.hashtags || []).join(' ')]].filter(x => x[1]).map(([t, x]) => h('div', { class: 'blk' }, h('h6', null, t), h('div', null, x)))), btn('Caption kopieren', () => copyText([r.caption.hook, r.caption.body, r.caption.cta, (r.caption.hashtags || []).join(' ')].filter(Boolean).join('\n\n')), { cls: 'sm', icon: 'copy' }));
    else capBox.append(h('p', { class: 'small muted' }, AI.connected() ? 'Erzeuge zusätzlich Hook, Caption, CTA und Hashtags.' : 'Caption, Hook und Hashtags benötigen eine KI-Verbindung.'), btn(AI.connected() ? 'Caption erstellen' : 'KI-Verbindung erforderlich', async (ev) => {
      if (!AI.requireConnection() || !(await AI.consent('cloud'))) return; const b = ev.currentTarget; setBtnBusy(b, true);
      try { const slides = this.analysis.slides.map((s, i) => `${i + 1}. ${s.headline}${s.body ? ' – ' + s.body : ''}`).join('\n'); r.caption = await AI.json(`Schreibe die Instagram-Caption zu diesem Karussell:\n${slides}\nJSON: {"hook": "...", "body": "...", "cta": "...", "hashtags": ["#..."]}`, { maxTokens: 1200 }); this.renderResult(); }
      catch (e) { toast(friendlyError(e), 'error'); setBtnBusy(b, false); }
    }, { cls: 'sm', icon: 'ai' }));
    box.appendChild(capBox);
  },
  async open(k) {
    const r = this.res; const pages = r.variants[k].map(pg => { const c = deepClone(pg); delete c._layout; delete c._slide; return c; });
    const name = (this.analysis.slides[0].headline || 'Karussell').slice(0, 60);
    const p = Projects.create({ type: 'carousel', formatKey: this.opts.fmt, name, pages });
    if (r.caption) p.caption = r.caption;
    await Projects.put(p); await setProject(p, 'design');
    toast('Karussell geöffnet – alle Slides sind frei bearbeitbar. Alternative Bilder findest du im Bild-Inspektor.', 'success', { duration: 5200 });
  },
};

/* ── Bridges between formats ─────────────────────────────────────────── */
function projectText(p) {
  if (!p || !p.video) return '';
  if (p.video.transcript && p.video.transcript.text) return p.video.transcript.text;
  if (p.video.captions.length) return p.video.captions.map(c => c.text).join(' ').replace(/([^.!?])\s*$/, '$1.');
  return p.video._script || '';
}
async function videoToCarousel(p) {
  let text = projectText(p);
  if (!text) {
    const ok = await confirmDialog({ title: 'Video zuerst transkribieren?', text: 'Für ein Karussell aus dem Video wird der gesprochene Text benötigt. Jetzt transkribieren (Einstellung im KI Studio: ' + (STT_ENGINES.find(e => e.v === AI.cfg.stt)?.l) + ')?', ok: 'Transkribieren' });
    if (!ok) return;
    const k = toast('Transkription läuft …', 'info', { duration: 600000 });
    try { await transcribeProject(p, s => { }); text = projectText(p); } catch (e) { k(); toast(friendlyError(e, 'Transkription'), 'error', { duration: 9000 }); return; }
    k();
  }
  CarouselUI.prefill = { text, useAI: AI.connected(), autoRun: true }; CarouselUI.text = text;
  showView('carousel');
}
async function carouselToReel(p) {
  if (!p || !p.pages || p.pages.length < 2) { toast('Für ein Reel braucht das Design mindestens 2 Seiten.', 'info'); return; }
  const kill = toast('Slides werden animiert …', 'info', { duration: 60000 });
  try {
    await preloadPageMedia(p.pages);
    const R = FORMATS.reel; const f = p.format; const scale = R.w / f.w; const offY = (R.h - f.h * scale) / 2;
    const np = Projects.create({ type: 'video', formatKey: 'reel', name: p.name + ' · Reel' });
    const v = np.video; v.bg = p.pages[0].bg.color || C.ivory; let t = 0; const per = 3.4;
    for (let i = 0; i < p.pages.length; i++) {
      const pg = p.pages[i];
      const texts = pg.elements.filter(e => e.type === 'text');
      const c = renderPageToCanvas(pg, f, f.w, { skip: new Set(texts.map(e => e.id)) });
      const blob = await canvasToBlob(c, 'image/jpeg', 0.92);
      const m = await Media.addGenerated(blob, `Slide ${i + 1} – ${p.name}.jpg`, ['carousel-slide']);
      const clip = newClip(m, { out: per, fit: 'fit', kb: true, name: 'Slide ' + (i + 1) });
      if (i) clip.trans = { type: 'cross', dur: 0.45 };
      v.main.push(clip);
      const start = Math.max(0, t - (i ? 0.45 : 0));
      texts.forEach((te, k) => { const el = deepClone(te); el.id = uid('el'); el.x = el.x * scale; el.y = el.y * scale + offY; el.w *= scale; el.size *= scale; el.h = textMetrics(el).h; v.items.push(newItem('text', { start: round(start + 0.35 + k * 0.18, 2), dur: round(per - 0.5 - k * 0.18, 2), el, anim: k === 0 ? 'slideUp' : 'fade', name: (te.text || '').slice(0, 30) })); });
      t = start + per;
    }
    const music = Media.byKind('audio').find(m => (m.moods || []).some(x => ['Elegant', 'Luxury', 'Calm'].includes(x)));
    if (music) v.items.push(newItem('audio', { mediaId: music.id, name: music.name, start: 0, dur: Math.min(t, music.duration || t), volume: 0.5, fadeIn: 0.8, fadeOut: 1.5 }));
    v.fadeOut = 0.6;
    await Projects.put(np); kill(); await setProject(np, 'video');
    toast('Reel aus Karussell erstellt' + (music ? ' (mit Musik aus deiner Mediathek)' : ' – füge im Video Studio noch Musik hinzu') + '.', 'success', { duration: 5000 });
  } catch (e) { kill(); toast(friendlyError(e, 'Reel erstellen'), 'error'); }
}
/** Grab a real frame of a video file at time t (full resolution) → library image. */
async function grabFrame(mediaId, t, name) {
  const url = await Media.url(mediaId); const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
  await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; setTimeout(res, 6000); });
  await new Promise(res => { v.onseeked = res; v.currentTime = clamp(t, 0, (v.duration || 1) - 0.05); setTimeout(res, 3000); });
  const c = makeCanvas(v.videoWidth, v.videoHeight); c.getContext('2d').drawImage(v, 0, 0); v.removeAttribute('src'); v.load();
  const blob = await canvasToBlob(c, 'image/jpeg', 0.92); return Media.addGenerated(blob, name || 'Frame.jpg', ['portrait', 'founder']);
}
async function createCoverFromImage(m, fmtKey = 'reel', title) {
  const f = FORMATS[fmtKey]; const t = TEMPLATES.find(x => x.id === 'reel-cover'); const pg = buildTemplatePage(t, { w: f.w, h: f.h }, { fillMedia: false });
  pg.bg.type = 'image'; pg.bg.mediaId = m.id; pg.bg.dim = 25;
  if (title) { const hd = pg.elements.find(e => e.role === 'headline'); if (hd) { hd.text = title; hd.h = textMetrics(hd).h; } }
  const p = Projects.create({ type: 'design', formatKey: fmtKey, name: (title || 'Reel Cover').slice(0, 50), pages: [pg] });
  await Projects.put(p); await setProject(p, 'design');
}
async function buildQuotePost(quote, fmtKey = 'post45') {
  const f = FORMATS[fmtKey]; const pg = buildTemplatePage(TEMPLATES.find(t => t.id === 'founder-quote'), { w: f.w, h: f.h });
  const q = pg.elements.find(e => e.role === 'quote'); if (q) { q.text = '„' + String(quote).replace(/^[„"“]|[“"”]$/g, '') + '“'; q.h = textMetrics(q).h; q.y = Math.round(f.h * 0.48 - q.h / 2); }
  const p = Projects.create({ type: 'design', formatKey: fmtKey, name: 'Quote · ' + String(quote).slice(0, 40), pages: [pg] });
  await Projects.put(p); await setProject(p, 'design');
}
function repurposeHub(p) {
  const text = projectText(p); const main = p.video && p.video.main.find(c => c.kind === 'video');
  const sentences = splitSentences(text); const best = localKeyStatements(sentences.map((s, i) => ({ text: s, s: i, e: i })));
  const hookTitle = (p.video.items.find(i => i.track === 'text' && i.el)?.el.text) || (best.hook) || (sentences[0] ? CarouselEngine.shorten(sentences[0], 8) : p.name);
  const quote = sentences.slice().sort((a, b) => Math.abs(a.split(' ').length - 12) - Math.abs(b.split(' ').length - 12))[0];
  const g = h('div', { class: 'opt-grid' }); const m = modal({ title: 'Content Repurpose', icon: 'repurpose', cls: 'wide', content: [h('p', { class: 'muted', style: { marginTop: 0 } }, 'Aus einem Video mehrere Assets – alles lokal erzeugt und danach frei bearbeitbar.' + (text ? '' : ' Tipp: Mit Transkript werden Texte automatisch übernommen.')), g] });
  const add = (l, d, fn, dis) => g.appendChild(h('button', { class: 'opt', type: 'button', disabled: dis || null, style: dis ? { opacity: .5 } : null, onclick: async () => { m.close(); try { await fn(); } catch (e) { toast(friendlyError(e), 'error'); } } }, h('b', null, l), h('span', null, d)));
  const frame = async (name) => main ? grabFrame(main.mediaId, main.in + Math.min(1.5, (main.out - main.in) / 2), name) : null;
  add('Karussell', 'Kernaussagen → Slides mit deinen Bildern', () => videoToCarousel(p));
  add('Reel Cover', 'Standbild + Hook-Titel (9:16)', async () => { const fm = await frame('Cover-Frame.jpg'); if (fm) createCoverFromImage(fm, 'reel', hookTitle); else toast('Kein Video gefunden.', 'error'); }, !main);
  add('Quote Post', 'Stärkste Aussage als Zitat (4:5)', () => quote ? buildQuotePost(CarouselEngine.shorten(quote, 18)) : toast('Kein Text vorhanden – erst transkribieren.', 'info'), !quote);
  add('Story', 'Frame + Aussage + CTA (9:16)', async () => { const fm = await frame('Story-Frame.jpg'); const f = FORMATS.story; const b = TB(f.w, f.h); const pg = newPage('Story', C.black); pg.bg = Object.assign(pg.bg, { type: 'image', mediaId: fm.id, dim: 35 }); pg.elements.push(b.t('headline', hookTitle, { w: 0.84, yc: 0.42, size: 90, color: C.ivory }), b.t('cta', 'Jetzt ansehen', { w: 0.5, yc: 0.62, size: 22, color: C.black, bg: { color: C.lightgold, radius: 999 } })); const np = Projects.create({ type: 'design', formatKey: 'story', name: 'Story · ' + hookTitle.slice(0, 40), pages: [pg] }); await Projects.put(np); await setProject(np, 'design'); }, !main);
  add('Pinterest Pin', 'Hochformat 1000 × 1500 mit Titel', async () => { const fm = await frame('Pin-Frame.jpg'); const f = FORMATS.pin; const b = TB(f.w, f.h); const pg = newPage('Pin', C.ivory); pg.elements.push(b.img(0, 0, 1, 0.62, { name: 'Bild' }), b.t('subheadline', 'Mindéa', { yc: 0.68, size: 20, color: C.gold }), b.t('headline', hookTitle, { w: 0.84, yc: 0.79, size: 80 })); pg.elements[0].mediaId = fm.id; const np = Projects.create({ type: 'design', formatKey: 'pin', name: 'Pin · ' + hookTitle.slice(0, 40), pages: [pg] }); await Projects.put(np); await setProject(np, 'design'); }, !main);
  add('Untertitelversion', 'Kopie mit kräftigen Untertiteln', async () => { const c = deepClone(p); c.id = uid('pr'); c.name = p.name + ' · Untertitel'; c.createdAt = c.updatedAt = Date.now(); c.video.cap.style = 'bold'; c.video.cap.show = true; await Projects.put(c); await setProject(c, 'captions'); }, !(p.video.captions.length));
  add('Instagram Caption', AI.connected() ? 'Hook, Text, CTA, Hashtags (KI)' : 'KI-Verbindung erforderlich', async () => { if (!AI.requireConnection() || !(await AI.consent('cloud'))) return; const r = await AI.json(`Schreibe eine Instagram-Caption zu diesem Reel-Transkript:\n"""${text.slice(0, 8000)}"""\nJSON: {"hook": "...", "body": "...", "cta": "...", "hashtags": ["#..."]}`, { maxTokens: 1200 }); const all = [r.hook, r.body, r.cta, (r.hashtags || []).join(' ')].filter(Boolean).join('\n\n'); modal({ title: 'Instagram Caption', content: h('div', { class: 'ai-out' }, all), actions: [{ label: 'Kopieren', primary: true, icon: 'copy', onClick: () => copyText(all) }] }); }, !text);
}
async function chooseProjectDialog(list, title) {
  return new Promise(res => { const g = h('div', { class: 'col' }); const m = modal({ title, content: g, onClose: () => res(null) }); list.forEach(p => g.appendChild(h('button', { class: 'opt', type: 'button', onclick: () => { res(p); m.close(); } }, h('b', null, p.name), h('span', null, fmtRel(p.updatedAt) + (p.duration ? ' · ' + fmtTime(p.duration, false) : ''))))); });
}
