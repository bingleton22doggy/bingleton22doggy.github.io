import { mulberry32 } from './rng';

export const TS = 64;

function hex(c) {
  const v = c.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function cl(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function paint(w, h, fn) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  fn(ctx, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  return { w, h, data: img.data };
}

function baseNoise(ctx, w, h, color, amp, seed) {
  const [r, g, b] = hex(color);
  const rng = mulberry32(seed);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < w * h; i++) {
    const n = (rng() - 0.5) * amp;
    const n2 = (rng() - 0.5) * amp * 0.35;
    d[i * 4] = cl(r + n);
    d[i * 4 + 1] = cl(g + n + n2);
    d[i * 4 + 2] = cl(b + n);
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function grimeBottom(ctx, w, h, strength = 0.45) {
  const g = ctx.createLinearGradient(0, h * 0.55, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
}

function vignetteEdges(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.42)');
  g.addColorStop(0.2, 'rgba(0,0,0,0)');
  g.addColorStop(0.8, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function blotches(ctx, seed, count, color, maxA) {
  const rng = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = rng() * TS;
    const y = rng() * TS;
    const r = 2 + rng() * 11;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace('A', (maxA * (0.4 + rng() * 0.6)).toFixed(3)));
    g.addColorStop(1, color.replace('A', '0'));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 7);
    ctx.fill();
  }
}

function crack(ctx, seed) {
  const rng = mulberry32(seed);
  let x = 6 + rng() * 50;
  let y = rng() * 10;
  ctx.strokeStyle = 'rgba(15,14,12,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i < 10; i++) {
    x += (rng() - 0.5) * 8;
    y += 5 + rng() * 3;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function styleWall(style, p, variant) {
  const base = variant ? p.wall2 : p.wall;
  return paint(TS, TS, (ctx, w, h) => {
    baseNoise(ctx, w, h, base, variant ? 24 : 18, variant ? 71 : 13);
    if (style === 'concrete') {
      ctx.strokeStyle = 'rgba(0,0,0,0.32)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 21.5);
      ctx.lineTo(64, 21.5);
      ctx.moveTo(0, 43.5);
      ctx.lineTo(64, 43.5);
      ctx.stroke();
      blotches(ctx, variant ? 91 : 17, 9, 'rgba(0,0,0,A)', 0.3);
      crack(ctx, variant ? 44 : 21);
      grimeBottom(ctx, w, h, 0.4);
    } else if (style === 'tile') {
      const rng = mulberry32(variant ? 33 : 55);
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          ctx.fillStyle = `rgba(0,0,0,${(rng() * 0.12).toFixed(3)})`;
          ctx.fillRect(x * 16 + 1, y * 16 + 1, 14, 14);
        }
      }
      ctx.strokeStyle = 'rgba(30,34,30,0.55)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 16 + 0.5, 0);
        ctx.lineTo(i * 16 + 0.5, 64);
        ctx.moveTo(0, i * 16 + 0.5);
        ctx.lineTo(64, i * 16 + 0.5);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(230,240,230,0.10)';
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 16 + 1.5, 0);
        ctx.lineTo(i * 16 + 1.5, 64);
        ctx.stroke();
      }
      blotches(ctx, variant ? 12 : 88, 7, 'rgba(20,30,22,A)', 0.4);
      grimeBottom(ctx, w, h, 0.5);
    } else if (style === 'wood') {
      const rng = mulberry32(variant ? 3 : 8);
      for (let x = 0; x < 64; x += 8) {
        ctx.fillStyle = `rgba(0,0,0,${(0.06 + rng() * 0.16).toFixed(3)})`;
        ctx.fillRect(x, 0, 8, 64);
        ctx.fillStyle = 'rgba(15,10,6,0.55)';
        ctx.fillRect(x, 0, 1.5, 64);
      }
      ctx.strokeStyle = 'rgba(20,12,7,0.28)';
      for (let i = 0; i < 18; i++) {
        const y = rng() * 64;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(20, y + (rng() - 0.5) * 5, 40, y + (rng() - 0.5) * 5, 64, y);
        ctx.stroke();
      }
      grimeBottom(ctx, w, h, 0.45);
    } else if (style === 'paper') {
      const rng = mulberry32(variant ? 23 : 41);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let x = 0; x < 64; x += 16) ctx.fillRect(x, 0, 7, 64);
      ctx.strokeStyle = 'rgba(60,52,44,0.25)';
      ctx.lineWidth = 1;
      for (let y = 8; y < 64; y += 16) {
        for (let x = 8; x < 64; x += 16) {
          ctx.beginPath();
          ctx.moveTo(x, y - 4);
          ctx.lineTo(x + 4, y);
          ctx.lineTo(x, y + 4);
          ctx.lineTo(x - 4, y);
          ctx.closePath();
          ctx.stroke();
        }
      }
      const px = 8 + rng() * 34;
      const py = 6 + rng() * 20;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 20, py + 6);
      ctx.lineTo(px + 14, py + 26);
      ctx.lineTo(px - 4, py + 18);
      ctx.closePath();
      ctx.fill();
      blotches(ctx, variant ? 7 : 19, 8, 'rgba(48,34,20,A)', 0.32);
      grimeBottom(ctx, w, h, 0.5);
    } else {
      const rng = mulberry32(variant ? 5 : 9);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 32.5);
      ctx.lineTo(64, 32.5);
      ctx.moveTo(32.5, 0);
      ctx.lineTo(32.5, 32);
      ctx.stroke();
      for (let y = 0; y < 64; y += 32) {
        for (let x = 0; x < 64; x += 32) {
          const cx = x + 5;
          const cy = y + 5;
          ctx.fillStyle = 'rgba(200,205,200,0.18)';
          ctx.beginPath();
          ctx.arc(cx, cy, 1.6, 0, 7);
          ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.beginPath();
          ctx.arc(cx, cy + 0.8, 1.3, 0, 7);
          ctx.fill();
        }
      }
      for (let i = 0; i < 7; i++) {
        const x = rng() * 64;
        const g = ctx.createLinearGradient(x, 0, x, 64);
        g.addColorStop(0, 'rgba(90,50,26,0.30)');
        g.addColorStop(1, 'rgba(90,50,26,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, 2 + rng() * 3, 64);
      }
      grimeBottom(ctx, w, h, 0.35);
    }
    vignetteEdges(ctx, w, h);
  });
}

function styleFloor(style, p) {
  return paint(TS, TS, (ctx, w, h) => {
    baseNoise(ctx, w, h, p.floor, 20, 31);
    if (style === 'concrete') {
      blotches(ctx, 61, 12, 'rgba(0,0,0,A)', 0.35);
      ctx.fillStyle = 'rgba(40,60,70,0.18)';
      ctx.beginPath();
      ctx.ellipse(24, 40, 14, 7, 0.4, 0, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,10,10,0.4)';
      ctx.beginPath();
      ctx.moveTo(0, 12.5);
      ctx.lineTo(64, 12.5);
      ctx.stroke();
    } else if (style === 'tile') {
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          ctx.fillStyle = x % 2 === y % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
          ctx.fillRect(x * 16, y * 16, 16, 16);
        }
      }
      ctx.strokeStyle = 'rgba(15,18,16,0.6)';
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 16 + 0.5, 0);
        ctx.lineTo(i * 16 + 0.5, 64);
        ctx.moveTo(0, i * 16 + 0.5);
        ctx.lineTo(64, i * 16 + 0.5);
        ctx.stroke();
      }
      blotches(ctx, 77, 6, 'rgba(10,20,12,A)', 0.4);
    } else if (style === 'wood') {
      const rng = mulberry32(19);
      for (let y = 0; y < 64; y += 8) {
        ctx.fillStyle = `rgba(0,0,0,${(0.05 + rng() * 0.12).toFixed(3)})`;
        ctx.fillRect(0, y, 64, 8);
        ctx.fillStyle = 'rgba(10,6,3,0.5)';
        ctx.fillRect(0, y, 64, 1);
      }
    } else if (style === 'paper') {
      const rng = mulberry32(29);
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = `rgba(${140 + rng() * 60},${120 + rng() * 50},${100 + rng() * 40},0.05)`;
        ctx.fillRect(rng() * 64, rng() * 64, 2, 1);
      }
      blotches(ctx, 5, 5, 'rgba(0,0,0,A)', 0.3);
    } else {
      const rng = mulberry32(37);
      ctx.strokeStyle = 'rgba(190,200,205,0.09)';
      ctx.lineWidth = 1;
      for (let y = 0; y < 64; y += 8) {
        for (let x = 0; x < 64; x += 8) {
          ctx.beginPath();
          ctx.moveTo(x + (y % 16 === 0 ? 0 : 4), y);
          ctx.lineTo(x + (y % 16 === 0 ? 4 : 8), y + 8);
          ctx.stroke();
        }
      }
      blotches(ctx, 12, 5, 'rgba(0,0,0,A)', 0.35);
    }
  });
}

function styleCeil(style, p) {
  return paint(TS, TS, (ctx, w, h) => {
    baseNoise(ctx, w, h, p.ceil, 16, 97);
    if (style === 'tile') {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      for (let i = 0; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 32 + 0.5, 0);
        ctx.lineTo(i * 32 + 0.5, 64);
        ctx.moveTo(0, i * 32 + 0.5);
        ctx.lineTo(64, i * 32 + 0.5);
        ctx.stroke();
      }
      blotches(ctx, 66, 5, 'rgba(30,25,15,A)', 0.45);
    } else {
      blotches(ctx, 43, 10, 'rgba(0,0,0,A)', 0.32);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.moveTo(0, 30.5);
      ctx.lineTo(64, 30.5);
      ctx.stroke();
    }
  });
}

function texDoor(p, exit) {
  return paint(TS, TS, (ctx) => {
    baseNoise(ctx, 64, 64, exit ? '#4a4d4e' : p.wall2, 16, exit ? 101 : 57);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, 64, 3);
    ctx.fillRect(0, 61, 64, 3);
    ctx.fillRect(0, 0, 3, 64);
    ctx.fillRect(61, 0, 3, 64);
    const g = ctx.createLinearGradient(4, 0, 60, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.30)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.05)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.02)');
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(4, 4, 56, 56);
    if (exit) {
      ctx.strokeStyle = 'rgba(220,190,120,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 8, 44, 22);
      ctx.fillStyle = 'rgba(180,190,190,0.10)';
      ctx.fillRect(10, 24, 44, 34);
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 4; j++) {
          ctx.fillStyle = 'rgba(210,215,215,0.22)';
          ctx.beginPath();
          ctx.arc(12 + i * 8, 32 + j * 8, 1.3, 0, 7);
          ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(20,20,18,0.8)';
      ctx.fillRect(22, 12, 20, 12);
      ctx.fillStyle = 'rgba(210,180,110,0.55)';
      ctx.font = '9px monospace';
      ctx.fillText('EXIT', 25, 21);
      ctx.fillStyle = 'rgba(180,60,40,0.75)';
      ctx.beginPath();
      ctx.arc(52, 52, 2.2, 0, 7);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(9, 8, 46, 22);
      ctx.strokeRect(9, 34, 46, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(10, 9, 44, 20);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.arc(54, 32, 2.6, 0, 7);
      ctx.fill();
      ctx.fillStyle = 'rgba(215,205,180,0.55)';
      ctx.beginPath();
      ctx.arc(53.4, 31.2, 1.8, 0, 7);
      ctx.fill();
    }
    vignetteEdges(ctx, 64, 64);
  });
}

function texWindow(p, frame) {
  return paint(TS, TS, (ctx) => {
    baseNoise(ctx, 64, 64, p.wall2, 18, 77);
    ctx.fillStyle = '#241f1a';
    ctx.fillRect(5, 3, 54, 54);
    const g = ctx.createLinearGradient(0, 4, 0, 55);
    g.addColorStop(0, '#1d2a33');
    g.addColorStop(0.45, '#33474f');
    g.addColorStop(1, '#151d22');
    ctx.fillStyle = g;
    ctx.fillRect(8, 6, 48, 48);
    const rng = mulberry32(11 + frame * 7);
    ctx.strokeStyle = 'rgba(190,220,230,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const x = 8 + rng() * 48;
      const y = 6 + rng() * 48;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 1.6, y + 5 + rng() * 3);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(10, 52);
    ctx.lineTo(40, 8);
    ctx.stroke();
    ctx.fillStyle = '#241f1a';
    ctx.fillRect(31, 6, 2, 48);
    ctx.fillRect(8, 29, 48, 2);
    ctx.fillStyle = '#37302a';
    ctx.fillRect(3, 53, 58, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(3, 58, 58, 2);
    vignetteEdges(ctx, 64, 64);
  });
}

const cache = new Map();

export function getTextures(map) {
  if (cache.has(map.id)) return cache.get(map.id);
  const p = map.palette;
  const style = map.style;
  const set = {
    wall: styleWall(style, p, 0),
    wall2: styleWall(style, p, 1),
    floor: styleFloor(style, p),
    ceil: styleCeil(style, p),
    door: texDoor(p, false),
    exit: texDoor(p, true),
    windows: [0, 1, 2, 3].map((f) => texWindow(p, f)),
  };
  cache.set(map.id, set);
  return set;
}