import * as THREE from 'three';

/**
 * The Mindéa butterfly is painted to canvas textures — gold gradient, radiating
 * veins and soft edges — so it reads like the logo, then mapped onto thin planes
 * (two flapping wing halves + a static body). This is far more logo-faithful
 * than bare extruded gold, while staying lightweight and GPU-friendly.
 *
 * These builders run on the client only (the 3D bundle is loaded with
 * `ssr: false`), so `document` is always available here.
 */

const TEX = 1024;

/** Full butterfly wing pair (left + right) painted onto one square canvas. */
export function makeWingTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = TEX;
  const g = cv.getContext('2d')!;
  const cx = TEX / 2;
  const cy = TEX / 2;

  const drawWing = (side: 1 | -1) => {
    g.save();
    g.translate(cx, cy);
    g.scale(side, 1);

    // Forewing (upper)
    g.beginPath();
    g.moveTo(14, -96);
    g.bezierCurveTo(70, -250, 240, -300, 322, -198);
    g.bezierCurveTo(356, -150, 350, -70, 284, -34);
    g.bezierCurveTo(214, -6, 110, -4, 58, -30);
    g.bezierCurveTo(30, -46, 18, -66, 14, -96);
    g.closePath();
    const f = g.createLinearGradient(20, -110, 330, -40);
    f.addColorStop(0.0, '#f3da93');
    f.addColorStop(0.5, '#ca9c3f');
    f.addColorStop(1.0, '#90691f');
    g.fillStyle = f;
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(78,52,16,0.55)';
    g.stroke();

    // Hindwing (lower)
    g.beginPath();
    g.moveTo(34, -6);
    g.bezierCurveTo(168, -6, 286, 70, 248, 186);
    g.bezierCurveTo(224, 262, 150, 286, 96, 250);
    g.bezierCurveTo(60, 224, 40, 138, 34, -6);
    g.closePath();
    const h = g.createLinearGradient(34, 0, 250, 250);
    h.addColorStop(0.0, '#eccb78');
    h.addColorStop(0.55, '#bf9438');
    h.addColorStop(1.0, '#87631d');
    g.fillStyle = h;
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(78,52,16,0.55)';
    g.stroke();

    // Veins fanning out from the body
    g.lineWidth = 2.4;
    g.strokeStyle = 'rgba(96,64,22,0.38)';
    const tips: [number, number][] = [
      [300, -205],
      [345, -120],
      [270, -40],
      [245, 180],
      [150, 278],
      [88, 244],
    ];
    tips.forEach(([tx, ty]) => {
      g.beginPath();
      g.moveTo(26, -12);
      g.quadraticCurveTo(tx * 0.5, ty * 0.5 - 14, tx, ty);
      g.stroke();
    });

    // Soft inner highlight near the body
    const hi = g.createRadialGradient(40, -40, 4, 40, -40, 150);
    hi.addColorStop(0, 'rgba(255,245,210,0.45)');
    hi.addColorStop(1, 'rgba(255,245,210,0)');
    g.fillStyle = hi;
    g.beginPath();
    g.arc(40, -40, 150, 0, Math.PI * 2);
    g.fill();

    g.restore();
  };

  drawWing(1);
  drawWing(-1);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Slim body + antennae painted onto its own canvas. */
export function makeBodyTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = TEX;
  const g = cv.getContext('2d')!;
  const cx = TEX / 2;
  const cy = TEX / 2;

  const bodyTop = cy - 150;
  const bodyBot = cy + 250;
  const w = 15;

  const bg = g.createLinearGradient(cx - w, 0, cx + w, 0);
  bg.addColorStop(0.0, '#6a4c1d');
  bg.addColorStop(0.5, '#d4ab55');
  bg.addColorStop(1.0, '#6a4c1d');
  g.fillStyle = bg;
  g.beginPath();
  g.moveTo(cx, bodyTop);
  g.bezierCurveTo(cx + w, bodyTop + 40, cx + w, bodyBot - 70, cx, bodyBot);
  g.bezierCurveTo(cx - w, bodyBot - 70, cx - w, bodyTop + 40, cx, bodyTop);
  g.closePath();
  g.fill();

  // Head
  g.beginPath();
  g.fillStyle = '#7a5a26';
  g.ellipse(cx, bodyTop - 6, 13, 16, 0, 0, Math.PI * 2);
  g.fill();

  // Antennae with club tips
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(70,48,18,0.9)';
  g.lineCap = 'round';
  ([-1, 1] as const).forEach((s) => {
    g.beginPath();
    g.moveTo(cx + s * 4, bodyTop - 14);
    g.quadraticCurveTo(cx + s * 70, bodyTop - 120, cx + s * 96, bodyTop - 188);
    g.stroke();
    g.beginPath();
    g.fillStyle = '#5e3f15';
    g.ellipse(cx + s * 96, bodyTop - 188, 7, 9, 0, 0, Math.PI * 2);
    g.fill();
  });

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
