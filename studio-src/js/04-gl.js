/* ═══════════════════════════════════════════════════════════════════════
   MODULE: COLOR ENGINE — WebGL color grading for images and video frames
   (works on iOS Safari; no ctx.filter dependency). Looks + manual sliders.
   ═══════════════════════════════════════════════════════════════════════ */
const ADJ_KEYS = [
  { k: 'brightness', l: 'Helligkeit' }, { k: 'contrast', l: 'Kontrast' }, { k: 'saturation', l: 'Sättigung' }, { k: 'warmth', l: 'Wärme' },
  { k: 'highlights', l: 'Highlights' }, { k: 'shadows', l: 'Schatten' }, { k: 'sharpness', l: 'Schärfe', min: 0 },
  { k: 'vignette', l: 'Vignette', min: 0 }, { k: 'grain', l: 'Film Grain', min: 0 }, { k: 'fade', l: 'Fade (matte Schwärzen)', min: 0 },
];
const LOOKS = {
  original: { l: 'Original' },
  warm: { l: 'Mindéa Warm', warmth: 18, saturation: -6, contrast: 6, highlights: -8, shadows: 6, hiT: '#F1D9B0', hiA: 10, shT: '#3A2A1C', shA: 8 },
  quiet: { l: 'Quiet Luxury', saturation: -18, contrast: -4, fade: 12, warmth: 10, highlights: -10, shadows: 10, hiT: '#F4E6CC', hiA: 8 },
  editorial: { l: 'Editorial', contrast: 14, saturation: -14, warmth: 4, shadows: -6, highlights: -4, vignette: 10 },
  cinematic: { l: 'Cinematic', contrast: 10, saturation: -8, warmth: 8, highlights: -14, shadows: 8, fade: 6, vignette: 18, shT: '#2A1E14', shA: 10, hiT: '#F3DDB5', hiA: 8 },
  mcine: { l: 'Mindéa Cinematic', warmth: 10, contrast: 8, saturation: -6, highlights: -12, shadows: 6, fade: 4, vignette: 12, hiT: '#F3DDB5', hiA: 6 },
  cream: { l: 'Cream', brightness: 6, contrast: -10, saturation: -14, warmth: 14, fade: 14, hiT: '#F8EBD3', hiA: 12 },
  soft: { l: 'Soft', brightness: 4, contrast: -12, highlights: -12, shadows: 14, saturation: -6, fade: 8 },
  moody: { l: 'Moody', brightness: -8, contrast: 16, saturation: -20, warmth: 6, highlights: -12, shadows: -10, vignette: 25 },
  dark: { l: 'Dark Luxury', brightness: -10, contrast: 18, saturation: -16, warmth: 10, highlights: -10, shadows: -14, vignette: 30, hiT: '#D9C393', hiA: 8 },
  bw: { l: 'Schwarzweiß', saturation: -100, contrast: 14, fade: 6 },
};
const IMAGE_LOOKS = ['original', 'warm', 'editorial', 'soft', 'cream', 'dark', 'bw'];
const VIDEO_LOOKS = ['original', 'warm', 'quiet', 'editorial', 'cinematic', 'cream', 'moody', 'bw', 'mcine'];

function effAdj(look, adj, extra) {
  const L = LOOKS[look] || LOOKS.original; const o = {};
  for (const { k } of ADJ_KEYS) o[k] = clamp((L[k] || 0) + ((adj && adj[k]) || 0) + ((extra && extra[k]) || 0), -100, 100);
  o.hiT = L.hiT || '#808080'; o.hiA = L.hiA || 0; o.shT = L.shT || '#808080'; o.shA = L.shA || 0;
  return o;
}
function adjNeutral(e) { for (const { k } of ADJ_KEYS) if (Math.abs(e[k]) > 0.01) return false; return !e.hiA && !e.shA; }
function adjKey(e) { return ADJ_KEYS.map(a => Math.round(e[a.k])).join(',') + e.hiT + e.hiA + e.shT + e.shA; }

const GL = {
  canvas: null, gl: null, prog: null, tex: null, ok: null, loc: {}, buf: null,
  init() {
    if (this.ok !== null) return this.ok;
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, alpha: true });
      if (!gl) { this.ok = false; return false; }
      const vs = `attribute vec2 p;attribute vec2 uv;varying vec2 v;void main(){v=uv;gl_Position=vec4(p,0.,1.);}`;
      const fs = `precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec2 px;
uniform float b,c,s,w,hi,sh,shp,vig,gr,fd,seed,hiA,shA;uniform vec3 hiT,shT;uniform vec2 res;
float luma(vec3 q){return dot(q,vec3(.2126,.7152,.0722));}
float hash(vec2 q){return fract(sin(dot(q,vec2(12.9898,78.233))+seed)*43758.5453);}
void main(){vec2 vc=gl_FragCoord.xy/res;vec4 src=texture2D(t,v);vec3 col=src.rgb;
if(shp>0.){vec3 bl=(texture2D(t,v+vec2(px.x,0.)).rgb+texture2D(t,v-vec2(px.x,0.)).rgb+texture2D(t,v+vec2(0.,px.y)).rgb+texture2D(t,v-vec2(0.,px.y)).rgb)*.25;col+=(col-bl)*shp*2.2;}
col*=1.+b*.32;col+=b*.04;
col.r+=w*.055;col.g+=w*.012;col.b-=w*.065;
float l=luma(col);
col+=sh*.24*(1.-smoothstep(0.,.55,l));
col+=hi*.24*smoothstep(.45,1.,l);
col=(col-.5)*(1.+c*.55)+.5;
l=luma(col);col=mix(vec3(l),col,1.+s);
l=clamp(luma(col),0.,1.);
col+=(shT-.5)*shA*(1.-l)*.5;col+=(hiT-.5)*hiA*l*.5;
col=fd*.11+col*(1.-fd*.11);
float d=distance(vc,vec2(.5))*1.4142;col*=1.-vig*.62*smoothstep(.32,1.05,d);
col+=(hash(vc*vec2(997.,1013.))-.5)*gr*.13;
gl_FragColor=vec4(clamp(col,0.,1.),src.a);}`;
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
      gl.useProgram(prog);
      this.buf = gl.createBuffer();
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      ['t', 'px', 'b', 'c', 's', 'w', 'hi', 'sh', 'shp', 'vig', 'gr', 'fd', 'seed', 'hiA', 'shA', 'hiT', 'shT', 'res'].forEach(n => this.loc[n] = gl.getUniformLocation(prog, n));
      this.locP = gl.getAttribLocation(prog, 'p'); this.locUV = gl.getAttribLocation(prog, 'uv');
      c.addEventListener('webglcontextlost', e => { e.preventDefault(); this.ok = null; this.gl = null; });
      Object.assign(this, { canvas: c, gl, prog, tex }); this.ok = true;
    } catch (e) { console.warn('WebGL nicht verfügbar – Farbanpassungen eingeschränkt', e); this.ok = false; }
    return this.ok;
  },
  /**
   * Grade `src` (image/video/canvas). crop = source rect in px; out = output size.
   * Returns the shared GL canvas (draw it immediately) or null if unavailable.
   */
  process(src, e, crop, outW, outH, opts = {}) {
    if (!this.init()) return null;
    const gl = this.gl, c = this.canvas;
    outW = Math.max(1, Math.round(outW)); outH = Math.max(1, Math.round(outH));
    if (c.width !== outW || c.height !== outH) { c.width = outW; c.height = outH; }
    gl.viewport(0, 0, outW, outH);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); } catch (err) { return null; }
    const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height;
    let u0 = crop.x / sw, u1 = (crop.x + crop.w) / sw, v0 = crop.y / sh, v1 = (crop.y + crop.h) / sh;
    if (opts.flipX) [u0, u1] = [u1, u0];
    if (opts.flipY) [v0, v1] = [v1, v0];
    // clip-space quad, texture v grows downward (no UNPACK_FLIP) → map top of screen to v0
    const data = new Float32Array([-1, -1, u0, v1, 1, -1, u1, v1, -1, 1, u0, v0, 1, 1, u1, v0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.locP); gl.vertexAttribPointer(this.locP, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(this.locUV); gl.vertexAttribPointer(this.locUV, 2, gl.FLOAT, false, 16, 8);
    const L = this.loc, k = v => v / 100;
    gl.uniform1i(L.t, 0); gl.uniform2f(L.px, 1 / sw * Math.max(1, sw / outW * 0.7), 1 / sh * Math.max(1, sh / outH * 0.7));
    gl.uniform1f(L.b, k(e.brightness)); gl.uniform1f(L.c, k(e.contrast)); gl.uniform1f(L.s, k(e.saturation)); gl.uniform1f(L.w, k(e.warmth));
    gl.uniform1f(L.hi, k(e.highlights)); gl.uniform1f(L.sh, k(e.shadows)); gl.uniform1f(L.shp, k(e.sharpness)); gl.uniform1f(L.vig, k(e.vignette));
    gl.uniform1f(L.gr, k(e.grain)); gl.uniform1f(L.fd, k(e.fade)); gl.uniform1f(L.seed, opts.seed || 0);
    gl.uniform1f(L.hiA, k(e.hiA)); gl.uniform1f(L.shA, k(e.shA));
    gl.uniform3fv(L.hiT, hexToRgb(e.hiT).map(v => v / 255)); gl.uniform3fv(L.shT, hexToRgb(e.shT).map(v => v / 255));
    gl.uniform2f(L.res, outW, outH); // vignette + grain in output space
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return c;
  },
};
/** Image-result cache (LRU) so graded stills are not re-processed every frame. */
const GLCache = {
  map: new Map(), max: 36,
  get(key) { const v = this.map.get(key); if (v) { this.map.delete(key); this.map.set(key, v); } return v; },
  set(key, c) { this.map.set(key, c); while (this.map.size > this.max) { const k = this.map.keys().next().value; const old = this.map.get(k); old.width = old.height = 0; this.map.delete(k); } },
  dropMedia(id) { for (const k of Array.from(this.map.keys())) if (k.startsWith(id + '|')) { this.map.get(k).width = 0; this.map.delete(k); } },
};

/**
 * Draw a (possibly graded) source into ctx at dx,dy,dw,dh using source crop sx,sy,sw,sh.
 * Stills are cached; video frames are graded live.
 */
function drawGraded(ctx, src, crop, dx, dy, dw, dh, e, opts = {}) {
  if (!e || adjNeutral(e)) {
    ctx.save();
    if (opts.flipX || opts.flipY) { ctx.translate(dx + dw / 2, dy + dh / 2); ctx.scale(opts.flipX ? -1 : 1, opts.flipY ? -1 : 1); dx = -dw / 2; dy = -dh / 2; }
    ctx.drawImage(src, crop.x, crop.y, crop.w, crop.h, dx, dy, dw, dh);
    ctx.restore(); return;
  }
  // device pixel size of the destination (cap to keep it fast)
  const m = ctx.getTransform ? ctx.getTransform() : { a: 1, d: 1 };
  const sc = Math.min(1, 2048 / Math.max(Math.abs(dw * m.a), Math.abs(dh * m.d)));
  const ow = Math.max(2, Math.min(crop.w, Math.abs(dw * m.a)) * sc), oh = Math.max(2, Math.min(crop.h, Math.abs(dh * m.d)) * sc);
  let out = null;
  if (opts.cacheKey) {
    const key = opts.cacheKey + '|' + adjKey(e) + '|' + Math.round(ow / 32) + 'x' + Math.round(oh / 32) + '|' + [crop.x, crop.y, crop.w, crop.h].map(Math.round).join(',') + (opts.flipX ? 'fx' : '') + (opts.flipY ? 'fy' : '');
    out = GLCache.get(key);
    if (!out) {
      const g = GL.process(src, e, crop, ow, oh, opts);
      if (g) { out = makeCanvas(g.width, g.height); out.getContext('2d').drawImage(g, 0, 0); GLCache.set(key, out); }
    }
  } else out = GL.process(src, e, crop, ow, oh, opts);
  if (out) ctx.drawImage(out, 0, 0, out.width, out.height, dx, dy, dw, dh);
  else { // fallback without WebGL
    ctx.save();
    if ('filter' in ctx) ctx.filter = `brightness(${1 + e.brightness / 200}) contrast(${1 + e.contrast / 150}) saturate(${1 + e.saturation / 100}) sepia(${Math.max(0, e.warmth) / 400})`;
    ctx.drawImage(src, crop.x, crop.y, crop.w, crop.h, dx, dy, dw, dh);
    ctx.restore();
  }
}
