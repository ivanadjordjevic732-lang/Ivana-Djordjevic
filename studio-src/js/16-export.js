/* ═══════════════════════════════════════════════════════════════════════
   MODULE: EXPORT CENTER — PNG/JPG (single, all pages, ZIP) and video
   (MediaRecorder, real-time, MP4 where supported, honest 4K handling).
   Safe zones and editor guides are never exported.
   ═══════════════════════════════════════════════════════════════════════ */
function slug(s) { return String(s || 'mindea').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'mindea'; }
function openExport() {
  const p = App.project; if (!p) { toast('Öffne zuerst ein Projekt.', 'info'); return; }
  if (p.type === 'video') videoExportDialog(p); else designExportDialog(p);
}
async function shareFile(blob, name) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return true; } catch (e) { if (e.name !== 'AbortError') toast(friendlyError(e), 'error'); return false; } }
  toast('Teilen wird von diesem Browser nicht unterstützt – die Datei wurde heruntergeladen.', 'info'); downloadBlob(blob, name); return false;
}
function designExportDialog(p) {
  const st = { type: 'png', scale: 1, q: 0.92, transparent: false, pages: p.pages.length > 1 ? 'all' : 'current', zip: true };
  const body = h('div');
  const f = p.format;
  const draw = () => {
    clear(body);
    const px = s => `${Math.round(f.w * s)} × ${Math.round(f.h * s)}`;
    body.append(
      h('div', { class: 'lbl', style: { marginBottom: '6px' } }, 'Dateiformat'), seg([{ v: 'png', l: 'PNG' }, { v: 'jpg', l: 'JPG' }], st.type, v => { st.type = v; draw(); }),
      h('div', { class: 'lbl', style: { margin: '14px 0 6px' } }, 'Größe'), chips([{ v: 0.5, l: '0,5× · ' + px(0.5) }, { v: 1, l: '1× · ' + px(1) }, { v: 2, l: '2× · ' + px(2) }], st.scale, v => st.scale = v),
      st.type === 'jpg' ? h('div', { style: { marginTop: '12px' } }, slider('Qualität', Math.round(st.q * 100), 50, 100, 1, v => st.q = v / 100)) : toggle('Transparenter Hintergrund', st.transparent, v => st.transparent = v, { tip: 'Hintergrundfarbe/-bild wird weggelassen' }),
      p.pages.length > 1 ? h('div', null, h('div', { class: 'lbl', style: { margin: '14px 0 6px' } }, 'Seiten'), seg([{ v: 'current', l: 'Aktuelle Seite' }, { v: 'all', l: `Alle ${p.pages.length} Seiten` }], st.pages, v => { st.pages = v; draw(); }), st.pages === 'all' ? toggle('Als ZIP-Datei bündeln', st.zip, v => st.zip = v) : null) : null,
      h('p', { class: 'tiny muted' }, 'Safe Zones und Hilfslinien werden nicht exportiert.'));
    if (p.pages.length > 1) body.append(h('div', { class: 'hr' }), h('div', { class: 'row wrap' }, h('span', { class: 'small muted grow' }, 'Karussell als animiertes Reel?'), btn('Als Reel animieren', () => { m.close(); carouselToReel(p); }, { cls: 'sm', icon: 'video' })));
  };
  draw();
  const run = async (share) => {
    const kill = toast('Export wird erstellt …', 'info', { duration: 60000 });
    try {
      await preloadPageMedia(p.pages); if (document.fonts) await document.fonts.ready;
      let scale = st.scale; if (f.w * f.h * scale * scale > 16.5e6) { scale = Math.sqrt(16.5e6 / (f.w * f.h)); toast('Größe wurde auf das Browser-Maximum begrenzt.', 'info'); }
      const list = st.pages === 'all' ? p.pages.map((pg, i) => [pg, i]) : [[p.pages[App.page], App.page]];
      const files = [];
      for (const [pg, i] of list) {
        const c = renderPageToCanvas(pg, f, f.w * scale, { transparent: st.type === 'png' && st.transparent });
        if (st.type === 'jpg') { const c2 = makeCanvas(c.width, c.height); const x = c2.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c2.width, c2.height); x.drawImage(c, 0, 0); files.push({ name: `${slug(p.name)}-${String(i + 1).padStart(2, '0')}.jpg`, blob: await canvasToBlob(c2, 'image/jpeg', st.q) }); }
        else files.push({ name: `${slug(p.name)}-${String(i + 1).padStart(2, '0')}.png`, blob: await canvasToBlob(c, 'image/png') });
        c.width = c.height = 0;
      }
      kill();
      if (share) { if (files.length === 1) await shareFile(files[0].blob, files[0].name); else { const fs = files.map(x => new File([x.blob], x.name, { type: x.blob.type })); if (navigator.canShare && navigator.canShare({ files: fs })) await navigator.share({ files: fs }).catch(() => { }); else toast('Mehrere Dateien teilen wird nicht unterstützt – lade sie stattdessen herunter.', 'info'); } return; }
      if (files.length > 1 && st.zip) downloadBlob(await makeZip(files), slug(p.name) + '.zip');
      else for (const fl of files) { downloadBlob(fl.blob, fl.name); await sleep(350); }
      toast(files.length > 1 ? `${files.length} Seiten exportiert` : 'Export fertig', 'success');
    } catch (e) { kill(); toast(friendlyError(e, 'Export'), 'error', { duration: 9000 }); }
  };
  const m = modal({ title: 'Exportieren', icon: 'download', content: body, actions: [{ label: 'Teilen', icon: 'share', onClick: () => run(true) }, { label: 'Herunterladen', primary: true, icon: 'download', onClick: () => run(false) }] });
}

/* ── Video export ────────────────────────────────────────────────────── */
function pickVideoMime() {
  if (!window.MediaRecorder) return null;
  const list = [['video/mp4;codecs=avc1.640028,mp4a.40.2', 'mp4'], ['video/mp4;codecs=avc1,mp4a.40.2', 'mp4'], ['video/mp4;codecs="avc1.42E01E, mp4a.40.2"', 'mp4'], ['video/mp4', 'mp4'], ['video/webm;codecs=vp9,opus', 'webm'], ['video/webm;codecs=vp8,opus', 'webm'], ['video/webm', 'webm']];
  for (const [t, ext] of list) { try { if (MediaRecorder.isTypeSupported(t)) return { mime: t, ext }; } catch (e) { } }
  return null;
}
function maxSourceShortSide(p) {
  let mx = 0; p.video.main.forEach(c => { const m = Media.get(c.mediaId); if (m) mx = Math.max(mx, Math.min(m.origW || m.w || 0, m.origH || m.h || 0)); }); return mx;
}
function videoExportDialog(p) {
  const d = videoDuration(p);
  if (d <= 0) { toast('Die Timeline ist leer – füge zuerst Clips hinzu.', 'info'); return; }
  const mime = pickVideoMime(); const canCapture = !!HTMLCanvasElement.prototype.captureStream;
  const body = h('div');
  if (!mime || !canCapture) {
    body.append(h('div', { class: 'notice warn' }, iconEl('warn', 's'), h('span', null, 'Dein Browser unterstützt keinen Videoexport (MediaRecorder/Canvas-Stream fehlt). Nutze bitte Chrome, Edge oder Safari ab Version 14.1. Alternativ kannst du das aktuelle Bild als PNG exportieren.')));
    modal({ title: 'Video exportieren', icon: 'video', content: body, actions: [{ label: 'Aktuelles Bild als PNG', primary: true, onClick: () => exportVideoFrame(p) }] }); return;
  }
  const src = maxSourceShortSide(p); const can4k = src >= 2000;
  const st = { res: 1080, fps: 30, q: 'high', caps: p.video.cap.show !== false, monitor: false };
  const f = p.format; const dims = r => { const s = r / Math.min(f.w, f.h); return [Math.round(f.w * s / 2) * 2, Math.round(f.h * s / 2) * 2]; };
  const draw = () => {
    clear(body);
    body.append(h('div', { class: 'lbl', style: { marginBottom: '6px' } }, 'Auflösung'),
      chips([{ v: 720, l: '720p · ' + dims(720).join('×') }, { v: 1080, l: '1080p · ' + dims(1080).join('×') }, { v: 2160, l: can4k ? '4K · ' + dims(2160).join('×') : '4K – nur mit 4K-Quellmaterial' }], st.res, v => { if (v === 2160 && !can4k) { toast('Dein Quellmaterial hat weniger als 4K-Auflösung. Hochskalieren würde keine echten Details erzeugen – wähle 1080p.', 'info', { duration: 6000 }); draw(); return; } st.res = v; draw(); }),
      h('div', { class: 'lbl', style: { margin: '14px 0 6px' } }, 'Bildrate'), seg([{ v: 30, l: '30 FPS' }, { v: 60, l: '60 FPS' }], st.fps, v => { st.fps = v; draw(); }),
      st.fps === 60 ? h('p', { class: 'tiny muted', style: { margin: '6px 0 0' } }, '60 FPS ist nur bei 60-fps-Quellmaterial sinnvoll und erfordert ein leistungsstarkes Gerät.') : null,
      h('div', { class: 'lbl', style: { margin: '14px 0 6px' } }, 'Qualität'), seg([{ v: 'std', l: 'Standard' }, { v: 'high', l: 'Hoch' }, { v: 'max', l: 'Maximum' }], st.q, v => st.q = v),
      h('div', { style: { height: '10px' } }), toggle('Untertitel einbrennen', st.caps, v => st.caps = v), toggle('Ton während des Exports abspielen', st.monitor, v => st.monitor = v),
      h('div', { class: 'notice', style: { marginTop: '8px' } }, iconEl('info', 's'), h('span', null, `Format: ${mime.ext.toUpperCase()}${mime.ext === 'webm' ? ' (dein Browser kann kein MP4 aufnehmen – für Instagram ggf. in MP4 umwandeln)' : ''}. Der Export läuft in Echtzeit (${fmtTime(d, false)}) – bitte den Tab geöffnet und sichtbar lassen.${src ? ` Quellmaterial: ${src}p.` : ''}`)));
  };
  draw();
  modal({ title: 'Video exportieren', icon: 'video', content: body, actions: [{ label: 'Cover (PNG)', icon: 'image', onClick: () => exportVideoFrame(p) }, { label: 'Export starten', primary: true, icon: 'download', onClick: () => { runVideoExport(p, st, mime, dims(st.res)); } }] });
}
async function exportVideoFrame(p) {
  const f = p.format; const c = makeCanvas(f.w, f.h); VE.renderFrame(c.getContext('2d'), VE.t);
  downloadBlob(await canvasToBlob(c, 'image/png'), slug(p.name) + '-frame.png'); toast('Bild exportiert', 'success');
}
async function runVideoExport(p, st, mime, [W, H]) {
  VE.pause(); VE.override = null;
  const d = videoDuration(p), f = p.format;
  const bitrates = { 720: { std: 5e6, high: 8e6, max: 12e6 }, 1080: { std: 8e6, high: 14e6, max: 22e6 }, 2160: { std: 25e6, high: 40e6, max: 60e6 } };
  const c = makeCanvas(W, H); const ctx = c.getContext('2d'); const s = W / f.w;
  const g = VE.graph(); let dest = null;
  const stream = c.captureStream(st.fps);
  if (g) { try { if (g.ctx.state !== 'running') await g.ctx.resume(); dest = g.ctx.createMediaStreamDestination(); g.limiter.connect(dest); dest.stream.getAudioTracks().forEach(t => stream.addTrack(t)); if (!st.monitor) g.limiter.disconnect(g.ctx.destination); } catch (e) { } }
  let rec;
  try { rec = new MediaRecorder(stream, { mimeType: mime.mime, videoBitsPerSecond: bitrates[st.res][st.q] * (st.fps === 60 ? 1.5 : 1), audioBitsPerSecond: 192000 }); }
  catch (e) { try { rec = new MediaRecorder(stream); } catch (e2) { cleanup(); toast('Videoexport konnte nicht gestartet werden: Dein Browser lehnt dieses Format ab.', 'error', { duration: 9000 }); return; } }
  const chunks = []; rec.ondataavailable = e => e.data && e.data.size && chunks.push(e.data);
  let cancelled = false, failed = null;
  const prog = h('div', { class: 'progress', style: { height: '6px' } }, h('div', { style: { width: '0%' } })); const lbl = h('div', { class: 'small muted', style: { marginTop: '8px' } }, 'Medien werden vorbereitet …');
  const m = modal({ title: 'Export läuft', icon: 'video', closable: false, content: [h('p', { class: 'muted', style: { marginTop: 0 } }, `${W} × ${H} · ${st.fps} FPS · ${mime.ext.toUpperCase()}`), prog, lbl], actions: [{ label: 'Abbrechen', close: false, onClick: () => { cancelled = true; VE.pause(); finish(); } }] });
  const prevShow = p.video.cap.show; p.video.cap.show = st.caps;
  VE.exporting = true;
  const onVis = () => { if (document.hidden && rec.state === 'recording') { failed = 'Der Export wurde angehalten, weil der Tab in den Hintergrund ging. Bitte den Tab während des Exports sichtbar lassen.'; VE.pause(); finish(); } };
  document.addEventListener('visibilitychange', onVis);
  function cleanup() {
    VE.exportHook = null; VE.exporting = false; p.video.cap.show = prevShow;
    if (g) { try { if (dest) g.limiter.disconnect(dest); } catch (e) { } try { g.limiter.connect(g.ctx.destination); } catch (e) { } }
    document.removeEventListener('visibilitychange', onVis);
    stream.getTracks().forEach(t => t.stop());
  }
  let finished = false;
  function finish() {
    if (finished) return; finished = true;
    const done = () => {
      cleanup(); m.close();
      if (cancelled) { toast('Export abgebrochen.', 'info'); return; }
      if (failed) { toast(failed, 'error', { duration: 9000 }); return; }
      const blob = new Blob(chunks, { type: mime.mime.split(';')[0] });
      if (!blob.size) { toast('Der Export hat keine Daten erzeugt. Bitte erneut versuchen oder eine geringere Auflösung wählen.', 'error', { duration: 9000 }); return; }
      const name = `${slug(p.name)}-${st.res}p.${mime.ext}`;
      downloadBlob(blob, name);
      modal({ title: 'Export fertig', icon: 'check', content: [h('p', { style: { marginTop: 0 } }, `${name} · ${fmtBytes(blob.size)}`), h('p', { class: 'small muted' }, 'Die Datei wurde heruntergeladen. Auf dem iPhone findest du sie unter „Dateien“ › Downloads.')], actions: [{ label: 'Erneut herunterladen', icon: 'download', onClick: () => downloadBlob(blob, name), close: false }, { label: 'Teilen', primary: true, icon: 'share', onClick: () => shareFile(blob, name), close: false }] });
    };
    if (rec.state !== 'inactive') { rec.onstop = done; try { rec.requestData(); } catch (e) { } setTimeout(() => { try { rec.stop(); } catch (e) { done(); } }, 250); } else done();
  }
  // prepare: seek to 0 and wait until first frames are decodable
  VE.seek(0); await sleep(150);
  for (let i = 0; i < 30; i++) { const r = Array.from(VE.els.values()); if (!r.length || r.every(x => x.v.readyState >= 2)) break; await sleep(100); }
  if (cancelled) return;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  VE.renderFrame(ctx, 0);
  VE.exportHook = t => { ctx.setTransform(s, 0, 0, s, 0, 0); VE.renderFrame(ctx, t); prog.firstChild.style.width = (t / d * 100).toFixed(1) + '%'; lbl.textContent = `${fmtTime(t)} / ${fmtTime(d)} · Echtzeit-Export`; };
  const onEnd = () => { if (VE.exporting && !finished) setTimeout(finish, 150); };
  Bus.on('vend', onEnd);
  rec.onerror = e => { failed = 'Fehler beim Aufnehmen: ' + friendlyError(e.error || e); VE.pause(); finish(); };
  rec.start(1000);
  await VE.play();
  if (!VE.playing && !finished) { failed = 'Die Wiedergabe konnte nicht gestartet werden.'; finish(); }
}
