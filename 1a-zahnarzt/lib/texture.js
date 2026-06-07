import * as THREE from 'three';

// Edle Platzhalter-Textur für eine Karte (Dark Luxury, Goldrahmen).
// Klar als Platzhalter erkennbar, damit echte Fotos eingesetzt werden.
export function makePlaceholderTexture(card, index) {
  const w = 768;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#1b1b20');
  bg.addColorStop(1, '#0b0b0d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.62, h * 0.26, 0, w * 0.62, h * 0.26, w * 0.9);
  glow.addColorStop(0, 'rgba(201,162,75,0.22)');
  glow.addColorStop(0.5, 'rgba(201,162,75,0.05)');
  glow.addColorStop(1, 'rgba(201,162,75,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // feiner Goldrahmen
  ctx.strokeStyle = 'rgba(216,185,120,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, w - 80, h - 80);

  // große, dezente Indexnummer
  ctx.fillStyle = 'rgba(237,231,219,0.06)';
  ctx.font = '700 360px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(index + 1).padStart(2, '0'), w / 2, h / 2);

  // Kicker
  ctx.fillStyle = '#d8b978';
  ctx.font = '500 30px Inter, Arial, sans-serif';
  ctx.fillText((card.kicker || '').toUpperCase(), w / 2, h * 0.6);

  // Hinweis
  ctx.fillStyle = 'rgba(237,231,219,0.45)';
  ctx.font = '400 22px Inter, Arial, sans-serif';
  ctx.fillText('Platzhalter · Bild einsetzen', w / 2, h - 90);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Lädt ein echtes Bild (jpg/png/webp/svg) als Textur. Promise-basiert.
export function loadImageTexture(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || 768;
      c.height = img.naturalHeight || 1024;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      resolve(tex);
    };
    img.onerror = reject;
    img.src = url;
  });
}
